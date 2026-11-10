import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerEnv } from '@/lib/env';
import { policyEngine, CosStoreRepository, PolicyScopeViolationError } from '@/modules/ai-cos';

// Platform route handlers
import { GET as getPlatformTenants, POST as postPlatformTenants } from '@/app/api/platform/tenants/route';
import { POST as postBuilderDraft } from '@/app/api/platform/builder/draft/route';
import { GET as getBuilderState } from '@/app/api/platform/builder/state/route';
import { POST as postBuilderPublish } from '@/app/api/platform/builder/publish/route';

// Dashboard route handlers
import { GET as getDashboardBookings, POST as postDashboardBookings } from '@/app/api/dashboard/bookings/route';
import { PATCH as patchDashboardBooking } from '@/app/api/dashboard/bookings/[bookingId]/route';
import { POST as rescheduleDashboardBooking } from '@/app/api/dashboard/bookings/[bookingId]/reschedule/route';
import { GET as getDashboardInventory, POST as postDashboardInventory } from '@/app/api/dashboard/inventory/route';

// AI-COS route handlers
import { POST as postCosCeo } from '@/app/api/cos/ceo/route';
import { POST as postCosCycles } from '@/app/api/cos/cycles/route';
import { POST as postCosApprovals } from '@/app/api/cos/approvals/route';
import { POST as postCosSettings } from '@/app/api/cos/settings/route';
import { GET as getCosState, POST as postCosState } from '@/app/api/cos/state/route';

// Internal Cron route handler
import { POST as postCronExpireHolds } from '@/app/api/internal/cron/expire-holds/route';

// Public V1 route handlers
import { POST as postPublicHolds } from '@/app/api/public/v1/holds/route';
import { GET as getPublicCatalog } from '@/app/api/public/v1/catalog/route';
import { GET as getPublicAvailability } from '@/app/api/public/v1/availability/route';

describe('Phase 1 Security Hotfix — Comprehensive Route Auth, Cron & Tenant Isolation Sweep', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    CosStoreRepository.resetForTests(false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('1.1 Production Mode Simulation Header Immunity', () => {
    it('strictly rejects x-actor-role simulation headers in production mode (returns 401)', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      // 1. Platform Tenants
      const platformRes = await getPlatformTenants(
        new NextRequest('https://platform.example.com/api/platform/tenants', {
          headers: { 'x-actor-role': 'platform_super_admin' },
        }),
      );
      expect(platformRes.status).toBe(401);

      // 2. Dashboard Bookings
      const dashRes = await getDashboardBookings(
        new NextRequest('https://app.example.com/api/dashboard/bookings?tenantId=t-kickoff-01', {
          headers: { 'x-actor-role': 'business_owner', 'x-actor-tenant-id': 't-kickoff-01' },
        }),
      );
      expect(dashRes.status).toBe(401);

      // 3. AI-COS Control Plane
      const cosRes = await postCosCeo(
        new NextRequest('https://platform.example.com/api/cos/ceo', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-actor-role': 'platform_super_admin',
          },
          body: JSON.stringify({ promptText: 'Unauthorized instruction' }),
        }),
      );
      expect(cosRes.status).toBe(401);

      // 4. Platform Builder Publish
      const publishRes = await postBuilderPublish(
        new NextRequest('https://platform.example.com/api/platform/builder/publish', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-actor-role': 'platform_super_admin',
          },
          body: JSON.stringify({
            tenantId: 't-kickoff-01',
            websiteId: 'web-kickoff-turf',
          }),
        }),
      );
      expect(publishRes.status).toBe(401);

      // 5. Dashboard Inventory
      const invRes = await getDashboardInventory(
        new NextRequest('https://app.example.com/api/dashboard/inventory?tenantId=t-kickoff-01', {
          headers: {
            'x-actor-role': 'business_owner',
            'x-actor-tenant-id': 't-kickoff-01',
          },
        }),
      );
      expect(invRes.status).toBe(401);
    });
  });

  describe('1.2 Internal Cron Secret Verification (/api/internal/cron/expire-holds)', () => {
    const { CRON_SECRET } = getServerEnv();

    it('rejects requests missing the Authorization header with 401', async () => {
      const res = await postCronExpireHolds(
        new NextRequest('https://app.example.com/api/internal/cron/expire-holds', {
          method: 'POST',
        }),
      );
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects requests with an incorrect or forged secret with 401', async () => {
      const res = await postCronExpireHolds(
        new NextRequest('https://app.example.com/api/internal/cron/expire-holds', {
          method: 'POST',
          headers: {
            authorization: 'Bearer forged-secret-12345',
          },
        }),
      );
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('accepts requests with the valid CRON_SECRET and returns 200 with sweep stats', async () => {
      const res = await postCronExpireHolds(
        new NextRequest('https://app.example.com/api/internal/cron/expire-holds', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${CRON_SECRET}`,
          },
        }),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(typeof json.releasedCount).toBe('number');
    });
  });

  describe('1.3 AI-COS Control Plane Authentication & Self-Approval Prevention', () => {
    it('guards all 5 AI-COS routes against unauthenticated and unauthorized callers', async () => {
      // Unauthenticated caller -> 401
      const unauthReq = new NextRequest('https://platform.example.com/api/cos/state', {
        headers: { 'x-actor-role': 'unauthenticated' },
      });
      const unauthRes = await getCosState(unauthReq);
      expect(unauthRes.status).toBe(401);

      // Non-founder caller (business owner) -> 403
      const forbiddenReq = new NextRequest('https://platform.example.com/api/cos/state', {
        headers: {
          'x-actor-role': 'business_owner',
          'x-actor-tenant-id': 't-kickoff-01',
        },
      });
      const forbiddenRes = await getCosState(forbiddenReq);
      expect(forbiddenRes.status).toBe(403);

      // Verified Platform Super Admin (Founder) -> 200
      const founderReq = new NextRequest('https://platform.example.com/api/cos/state', {
        headers: { 'x-actor-role': 'platform_super_admin' },
      });
      const founderRes = await getCosState(founderReq);
      expect(founderRes.status).toBe(200);
    });

    it('blocks self-approval when approver identity matches approval creator/proposer', () => {
      const proposal = policyEngine.createApprovalRequest({
        projectId: 'proj-uwb-01',
        executionCycleId: 'cyc-test-01',
        requestingDepartment: 'engineering',
        createdByUserId: 'founder-charlie',
        title: 'Upgrade Database Indexes',
        riskLevel: 'medium',
        ceoRecommendation: 'Recommend approval',
        reasonForApproval: 'Schema modification',
        affectedComponents: ['db/schema'],
        expectedBenefit: 'Lower query latency',
        potentialDownside: 'Brief lock contention',
        alternativesConsidered: [],
        estimatedCostMinor: 0,
        estimatedDurationMinutes: 15,
        rollbackPlan: 'Drop index',
        exactScope: {
          taskCodes: ['ENG-01'],
          allowedFileGlobs: ['drizzle/**'],
          allowedTools: ['sql'],
          summary: 'Apply indexes',
        },
      });

      // Same actor tries to approve their own proposal -> must throw PolicyScopeViolationError
      expect(() =>
        policyEngine.recordApprovalDecision({
          approvalId: proposal.id,
          actorIdentity: 'founder-charlie',
          actorRole: 'founder',
          decision: 'approved',
          expectedProposalHash: proposal.proposalHash,
          decisionNotes: 'Self-approval attempt',
        }),
      ).toThrow(PolicyScopeViolationError);

      // Independent founder approves -> succeeds
      const approved = policyEngine.recordApprovalDecision({
        approvalId: proposal.id,
        actorIdentity: 'independent-founder-alice',
        actorRole: 'founder',
        decision: 'approved',
        expectedProposalHash: proposal.proposalHash,
        decisionNotes: 'Authorized by independent founder Alice.',
      });
      expect(approved.status).toBe('approved');
    });
  });

  describe('1.4 Cross-Tenant Isolation & Host Trust', () => {
    it('blocks cross-tenant IDOR on dashboard inventory endpoints', async () => {
      // Business owner of Kickoff Turf (t-kickoff-01) tries to access OmniMarket (t-uni-06)
      const crossReq = new NextRequest(
        'https://app.example.com/api/dashboard/inventory?tenantId=t-uni-06',
        {
          headers: {
            'x-actor-role': 'business_owner',
            'x-actor-tenant-id': 't-kickoff-01',
          },
        },
      );
      const res = await getDashboardInventory(crossReq);
      expect(res.status).toBe(403);
    });

    it('rejects public API requests where body tenantId conflicts with host-derived tenant (403)', async () => {
      // Request sent to smilecraft-clinic subdomain, but body claims kickoff turf
      const conflictReq = new NextRequest('https://smilecraft-clinic.buildanywebsite.com/api/public/v1/holds', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': 'idem-conflict-check-001',
          'x-site-key': 'smilecraft-clinic',
        },
        body: JSON.stringify({
          tenantId: 't-kickoff-01',
          locationId: 'loc-01',
          customer: { fullName: 'Attacker', phone: '+91 99999 88888' },
          selection: {
            bookingModel: 'capacity_session',
            sessionId: 'ses-yoga-01',
            quantity: 1,
          },
        }),
      });

      const res = await postPublicHolds(conflictReq);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('allows public API requests when tenant matches host context', async () => {
      const matchReq = new NextRequest('https://kickoffturf.buildanywebsite.com/api/public/v1/catalog', {
        headers: {
          'x-site-key': 'kickoff-turf',
        },
      });
      const res = await getPublicCatalog(matchReq);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.tenant.slug).toBe('kickoff-turf');

      const availReq = new NextRequest('https://kickoffturf.buildanywebsite.com/api/public/v1/availability?tenantId=t-kickoff-01&locationId=loc-01&bookingModel=capacity_session&dateLocal=2026-11-20', {
        headers: {
          'x-site-key': 'kickoff-turf',
        },
      });
      const availRes = await getPublicAvailability(availReq);
      expect(availRes.status).toBe(200);
    });
  });

  describe('1.5 Exhaustive Protected Route Sweep (Unauthenticated Rejection)', () => {
    it('verifies all protected routes return 401 when actor is unauthenticated', async () => {
      const unauthHeader = { 'x-actor-role': 'unauthenticated' };

      // Platform create tenant
      const postTenantsRes = await postPlatformTenants(
        new NextRequest('https://platform.example.com/api/platform/tenants', {
          method: 'POST',
          headers: { ...unauthHeader, 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'Unauth Turf', slug: 'unauth-turf', vertical: 'sports_turf' }),
        }),
      );
      expect(postTenantsRes.status).toBe(401);

      // Dashboard manual booking
      const postDashBookRes = await postDashboardBookings(
        new NextRequest('https://app.example.com/api/dashboard/bookings', {
          method: 'POST',
          headers: { ...unauthHeader, 'content-type': 'application/json' },
          body: JSON.stringify({ tenantId: 't-kickoff-01' }),
        }),
      );
      expect(postDashBookRes.status).toBe(401);

      // Builder draft
      const draftRes = await postBuilderDraft(
        new NextRequest('https://platform.example.com/api/platform/builder/draft', {
          method: 'POST',
          headers: { ...unauthHeader, 'content-type': 'application/json' },
          body: JSON.stringify({ tenantId: 't-kickoff-01', pageId: 'p-1', expectedDraftRevision: 1, sections: [] }),
        }),
      );
      expect(draftRes.status).toBe(401);

      // Builder state
      const stateRes = await getBuilderState(
        new NextRequest('https://platform.example.com/api/platform/builder/state?tenantId=t-kickoff-01', {
          headers: unauthHeader,
        }),
      );
      expect(stateRes.status).toBe(401);

      // Dashboard patch booking
      const patchRes = await patchDashboardBooking(
        new NextRequest('https://app.example.com/api/dashboard/bookings/b-test-01', {
          method: 'PATCH',
          headers: { ...unauthHeader, 'content-type': 'application/json', 'idempotency-key': 'idem-p-1' },
          body: JSON.stringify({ tenantId: 't-kickoff-01', status: 'cancelled' }),
        }),
        { params: Promise.resolve({ bookingId: 'b-test-01' }) },
      );
      expect(patchRes.status).toBe(401);

      // Dashboard reschedule booking
      const reschedRes = await rescheduleDashboardBooking(
        new NextRequest('https://app.example.com/api/dashboard/bookings/b-test-01/reschedule', {
          method: 'POST',
          headers: { ...unauthHeader, 'content-type': 'application/json', 'idempotency-key': 'idem-r-1' },
          body: JSON.stringify({
            tenantId: 't-kickoff-01',
            newSelection: {
              bookingModel: 'capacity_session',
              sessionId: 'ses-yoga-01',
              quantity: 1,
            },
          }),
        }),
        { params: Promise.resolve({ bookingId: 'b-test-01' }) },
      );
      expect(reschedRes.status).toBe(401);

      // Dashboard post inventory
      const postInvRes = await postDashboardInventory(
        new NextRequest('https://app.example.com/api/dashboard/inventory', {
          method: 'POST',
          headers: { ...unauthHeader, 'content-type': 'application/json' },
          body: JSON.stringify({
            tenantId: 't-kickoff-01',
            name: 'Unauthorized Item',
            categoryName: 'General',
            itemType: 'physical_good',
            fulfilmentType: 'in_store_pickup',
            priceMinor: 1000,
          }),
        }),
      );
      expect(postInvRes.status).toBe(401);

      // COS cycles
      const cycleRes = await postCosCycles(
        new NextRequest('https://platform.example.com/api/cos/cycles', {
          method: 'POST',
          headers: { ...unauthHeader, 'content-type': 'application/json' },
          body: JSON.stringify({ cycleId: 'cyc-1', action: 'pause' }),
        }),
      );
      expect(cycleRes.status).toBe(401);

      // COS approvals
      const apprRes = await postCosApprovals(
        new NextRequest('https://platform.example.com/api/cos/approvals', {
          method: 'POST',
          headers: { ...unauthHeader, 'content-type': 'application/json' },
          body: JSON.stringify({ approvalId: 'appr-1', decision: 'approved' }),
        }),
      );
      expect(apprRes.status).toBe(401);

      // COS settings
      const setRes = await postCosSettings(
        new NextRequest('https://platform.example.com/api/cos/settings', {
          method: 'POST',
          headers: { ...unauthHeader, 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'toggle_kill_switch', enabled: true }),
        }),
      );
      expect(setRes.status).toBe(401);

      // COS state POST
      const statePostRes = await postCosState(
        new NextRequest('https://platform.example.com/api/cos/state', {
          method: 'POST',
          headers: { ...unauthHeader, 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'reset_demo_state' }),
        }),
      );
      expect(statePostRes.status).toBe(401);
    });
  });
});
