import { describe, it, expect, beforeEach } from 'vitest';
import {
  marketingAgent,
  MarketingCopyOutputSchema,
  CosCommerceReadBridge,
  approvalQueueService,
  modelRouter,
  CosStoreRepository,
  PolicyScopeViolationError,
} from '@/modules/ai-cos';
import { UniversalCommerceService } from '@/modules/commerce/commerce.service';
import { BookingServiceImpl } from '@/modules/booking/booking.impl';

describe('Phase 5: Real, Small, Separate AI-COS Verification Suite', () => {
  const testTenantId = 't-kickoff-01';

  beforeEach(() => {
    CosStoreRepository.resetForTests(true);
    UniversalCommerceService.resetStateForTests();
    BookingServiceImpl.resetStateForTests();
  });

  describe('5.1: Real Department Agent (marketing_growth) with Structured Output', () => {
    it('generates schema-valid structured output using read-only storefront context', async () => {
      const result = await marketingAgent.generateMarketingCopy({
        tenantId: testTenantId,
        userPrompt: 'Create high-converting hero copy for weekend football turf bookings',
        targetAudience: 'Football players and corporate leagues in Mumbai',
        modelTier: 'fast_cheap',
        autoSubmitApproval: true,
      });

      // 1. Verify structured output matches Zod schema
      expect(result.structuredOutput).toBeDefined();
      const parsed = MarketingCopyOutputSchema.safeParse(result.structuredOutput);
      expect(parsed.success).toBe(true);

      const output = result.structuredOutput;
      expect(output.draftContent.headline.length).toBeGreaterThanOrEqual(5);
      expect(output.draftContent.subheadline.length).toBeGreaterThanOrEqual(10);
      expect(output.draftContent.bodyMarkdown.length).toBeGreaterThanOrEqual(20);
      expect(output.draftContent.callToActionText.length).toBeGreaterThanOrEqual(2);
      expect(output.requiresHumanApproval).toBe(true);
      expect(output.confidence).toBeGreaterThan(0);
      expect(output.suggestedAction).toBe('update_hero_copy');

      // 2. Verify an approval action was created in the queue
      expect(result.pendingApproval).toBeDefined();
      expect(result.pendingApproval?.status).toBe('pending');
      expect(result.pendingApproval?.proposalHash).toHaveLength(64);
    });

    it('generates product-specific description copy when catalogueItemId is provided', async () => {
      const bridge = new CosCommerceReadBridge();
      const items = await bridge.listCatalogueItems(testTenantId);
      const targetItem = items[0];

      const result = await marketingAgent.generateMarketingCopy({
        tenantId: testTenantId,
        catalogueItemId: targetItem?.id,
        userPrompt: 'Rewrite product copy for online storefront',
        modelTier: 'slow_capable',
      });

      expect(result.structuredOutput.suggestedAction).toBe('update_product_description');
      expect(result.structuredOutput.draftContent.headline).toContain(targetItem?.name ?? '');
    });
  });

  describe('5.2: Model Router Fast/Cheap vs Slow/Capable Tiers', () => {
    it('routes to Tier 1 (fast/cheap) models for high-volume copy generation', () => {
      const selection = modelRouter.selectModelTier('fast_cheap', 'marketing_growth');
      expect(selection.tier).toBe('fast_cheap');
      expect(['gemini-1.5-flash', 'claude-3-5-haiku-latest', 'gpt-4o-mini']).toContain(
        selection.model,
      );
    });

    it('routes to Tier 2 (slow/capable) models for deep reasoning and architectural review', () => {
      const selection = modelRouter.selectModelTier('slow_capable', 'marketing_growth');
      expect(selection.tier).toBe('slow_capable');
      expect(['claude-3-5-sonnet-latest', 'gpt-4o', 'gemini-1.5-pro']).toContain(
        selection.model,
      );
    });

    it('respects avoidProviderModel to guarantee reviewer separation between QA and Engineering', () => {
      const selection = modelRouter.selectModelTier('slow_capable', 'qa_testing', {
        avoidProviderModel: 'anthropic/claude-3-5-sonnet-latest',
      });
      expect(`${selection.provider}/${selection.model}`).not.toBe(
        'anthropic/claude-3-5-sonnet-latest',
      );
    });
  });

  describe('5.3: Human-in-the-Loop Approval Workflows & Self-Approval Prevention', () => {
    it('blocks department agents from self-approving their own proposals (Rule 9 / Invariant 1.4)', () => {
      const pending = approvalQueueService.submitPendingAction({
        tenantId: testTenantId,
        proposedByAgent: 'marketing_growth',
        actionType: 'update_hero_copy',
        title: 'Hero Copy Revision',
        payload: { headline: 'New Turf Headline' },
      });

      expect(pending.status).toBe('pending');

      // 1. Agent attempts self-approval -> BLOCKED (403 PolicyScopeViolationError)
      expect(() =>
        approvalQueueService.decidePendingAction({
          approvalId: pending.id,
          actorRole: 'department_agent',
          actorIdentity: 'marketing_growth',
          decision: 'approved',
          expectedProposalHash: pending.proposalHash,
        }),
      ).toThrow(PolicyScopeViolationError);

      // 2. Creator attempting approval as founder -> BLOCKED by self-approval check
      expect(() =>
        approvalQueueService.decidePendingAction({
          approvalId: pending.id,
          actorRole: 'founder',
          actorIdentity: 'marketing_growth', // Same identity as proposer!
          decision: 'approved',
          expectedProposalHash: pending.proposalHash,
        }),
      ).toThrow(PolicyScopeViolationError);
    });

    it('allows Human Founder to approve or reject pending proposals with hash verification', () => {
      const pending = approvalQueueService.submitPendingAction({
        tenantId: testTenantId,
        proposedByAgent: 'marketing_growth',
        actionType: 'update_hero_copy',
        title: 'Hero Copy Revision',
        payload: { headline: 'New Turf Headline' },
      });

      // Mismatched hash -> rejected
      expect(() =>
        approvalQueueService.decidePendingAction({
          approvalId: pending.id,
          actorRole: 'founder',
          actorIdentity: 'human-founder-01',
          decision: 'approved',
          expectedProposalHash: 'mismatched_sha256_hash_value',
        }),
      ).toThrow(PolicyScopeViolationError);

      // Correct hash -> approved
      const approved = approvalQueueService.decidePendingAction({
        approvalId: pending.id,
        actorRole: 'founder',
        actorIdentity: 'human-founder-01',
        decision: 'approved',
        expectedProposalHash: pending.proposalHash,
        decisionNotes: 'Headline copy approved for publishing.',
      });

      expect(approved.status).toBe('approved');
    });

    it('blocks silent resubmission of rejected proposal hashes without material changes', () => {
      const pending = approvalQueueService.submitPendingAction({
        tenantId: testTenantId,
        proposedByAgent: 'marketing_growth',
        actionType: 'create_promotional_campaign',
        title: '50% Off Flash Sale',
        payload: { discountBps: 5000 },
      });

      // Founder rejects
      approvalQueueService.decidePendingAction({
        approvalId: pending.id,
        actorRole: 'founder',
        actorIdentity: 'human-founder-01',
        decision: 'rejected',
        expectedProposalHash: pending.proposalHash,
        decisionNotes: 'Margin too thin for 50% discount.',
      });

      // Resubmitting identical scope -> BLOCKED
      expect(() =>
        approvalQueueService.submitPendingAction({
          tenantId: testTenantId,
          proposedByAgent: 'marketing_growth',
          actionType: 'create_promotional_campaign',
          title: '50% Off Flash Sale',
          payload: { discountBps: 5000 },
        }),
      ).toThrow(PolicyScopeViolationError);
    });
  });

  describe('5.4: Decoupled Read-Only Commerce Access & Performance Isolation', () => {
    it('read-only bridge cannot mutate inventory, bookings, or price plans', async () => {
      const bridge = new CosCommerceReadBridge();
      const initialSummary = await bridge.getStorefrontSummary(testTenantId);
      expect(initialSummary.totalItemCount).toBeGreaterThan(0);

      // Verify that bridge object has no write/mutate methods
      const bridgeMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(bridge));
      const writeMethods = bridgeMethods.filter(
        (m) =>
          m.includes('create') ||
          m.includes('update') ||
          m.includes('delete') ||
          m.includes('reserve') ||
          m.includes('hold') ||
          m.includes('checkout') ||
          m.includes('mutate'),
      );
      expect(writeMethods).toEqual([]);

      // Calling read methods multiple times leaves commerce state 100% unchanged
      const secondSummary = await bridge.getStorefrontSummary(testTenantId);
      expect(secondSummary.totalItemCount).toBe(initialSummary.totalItemCount);
    });
  });
});
