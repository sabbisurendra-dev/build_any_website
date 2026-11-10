# AI Company Operating System (AI-COS) — Architecture & Design Specification

**Phase:** Phase 5 (Real, Small, Separate AI-COS)  
**Status:** PROPOSED — DESIGN GATE  
**Date:** 2026-11-11  
**Author:** Principal Software Architect & Senior Full-Stack Engineer  

---

## 1. Executive Summary & Design Principles

The **AI Company Operating System (AI-COS)** is an assistive capability within the *Build Any Website* platform designed to support merchants and founders with company-level analysis, marketing copy generation, customer support triage, and guided operations.

### Non-Negotiable Core Invariants

1. **Platform Priority Hierarchy (AGENTS.md / Master Prompt §1.2)**
   - Priority 1: Website Builder & 12-Column Responsive Rendering Engine.
   - Priority 2: Universal Commerce Engine (Physical products, bookings, entitlements, subscriptions).
   - Priority 3: Multi-Tenant SaaS Infrastructure (RLS, tenant isolation, authentication).
   - **Priority 4: AI Company Operating System (AI-COS)**.
   *AI-COS is strictly subordinate to the core platform. It must never dominate bundle size, database resources, or critical user journeys.*

2. **Decoupled Read-Only Commerce Boundary ("Read Commerce, Never Directly Mutate")**
   - AI-COS agents have **READ-ONLY** access to commerce entities (catalogue items, prices, active bookings, session schedules).
   - AI-COS agents possess **ZERO direct write permissions** to `inventory_items`, `inventory_reservations`, `booking_items`, `bookings`, `orders`, or `payments`.
   - Any proposed modification to public merchant state (e.g., updating site copy, publishing pages, creating discount promotions) must be enqueued as an approval request in the human-in-the-loop queue.

3. **Guarded Autonomy & Zero Self-Approval (Phase 1 Invariant 1.4)**
   - All state-altering proposals carry a cryptographic SHA-256 fingerprint (`proposalHash`).
   - Only human actors with role `founder` or `owner` can approve an action.
   - Any agent attempting self-approval or privilege escalation is immediately rejected with HTTP 403 `PolicyScopeViolationError`.

4. **Performance & Latency Isolation**
   - AI-COS operations must run asynchronously off the critical request paths.
   - A slow or failing LLM call must never degrade website rendering, slot booking holds, checkout, or payment verification.

---

## 2. Real Department Agent: Marketing Growth & Copy Generator (`marketing_growth`)

In place of synthetic mock department loops, Phase 5 introduces **exactly one real department agent**: the **Marketing Growth & Copy Specialist** (`marketing_growth`).

### 2.1 Agent Objective & Scope
The Marketing agent assists merchants in generating high-converting, vertical-aware website copy and catalogue descriptions (e.g., hero headlines for turf bookings, benefit-driven product copy for organic dairy, course syllabi summaries for 90-day digital passes).

### 2.2 Structured Output Schema (`zod`)
Every real LLM completion must adhere strictly to a typed schema enforced via structured outputs (`zod`):

```typescript
import { z } from 'zod';

export const MarketingCopyOutputSchema = z.object({
  suggestedAction: z.enum([
    'update_hero_copy',
    'update_product_description',
    'create_promotional_campaign',
    'draft_seo_meta_tags',
  ]),
  confidence: z.number().min(0).max(1),
  draftContent: z.object({
    headline: z.string().min(5).max(140),
    subheadline: z.string().min(10).max(300),
    bodyMarkdown: z.string().min(20).max(4000),
    callToActionText: z.string().min(2).max(40),
    seoMetaTitle: z.string().max(70).optional(),
    seoMetaDescription: z.string().max(160).optional(),
  }),
  targetAudience: z.string().min(3).max(200),
  reasoning: z.string().min(10).max(1000),
  estimatedImpact: z.string().min(5).max(300),
  requiresHumanApproval: z.literal(true),
});

export type MarketingCopyOutput = z.infer<typeof MarketingCopyOutputSchema>;
```

### 2.3 Provider Execution & Deterministic Fallback
- **Production Mode:** Uses Vercel AI SDK (`generateObject` with `@ai-sdk/openai`, `@ai-sdk/anthropic`, or `@ai-sdk/google`) or direct provider REST API.
- **Development/Test Mode:** If API keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY`) are unconfigured or in automated CI runs, the agent transparently falls back to a deterministic, schema-compliant mock adapter (`MockMarketingAgentAdapter`), guaranteeing zero flaky network calls during tests.

---

## 3. Lightweight Model Router (`ModelRouterService`)

To balance task execution speed, cost, and analytical depth, the model router categorises agent runs into two distinct operational tiers:

```
+--------------------------------------------------------------------------------+
|                             MODEL ROUTING MATRIX                               |
+--------------------------+------------------------------+----------------------+
| Tier                     | Candidate Models             | Workload Scope       |
+--------------------------+------------------------------+----------------------+
| Tier 1: Fast & Cheap     | Gemini 1.5 Flash             | Discovery, triage,   |
| (High volume, low token  | Claude 3.5 Haiku             | drafting copy, SEO   |
| budget: ~500-1500 tokens)| GPT-4o Mini                  | tags, summaries      |
+--------------------------+------------------------------+----------------------+
| Tier 2: Slow & Capable   | Claude 3.5 Sonnet            | Architectural review,|
| (Critical reasoning,     | GPT-4o                       | policy evaluation,   |
| token budget: ~4000 tok) | Gemini 1.5 Pro               | executive synthesis  |
+--------------------------+------------------------------+----------------------+
```

### Routing Policy Invariants:
1. **Department Separation:** QA testing runs (`qa_testing`) must use a distinct provider or model family from Engineering (`engineering`) to maintain objective reviewer separation (Rule 15.5).
2. **Budget Gating:** Each execution cycle tracks token consumption and minor-currency spend (`actualCostMinor`). If the cycle exceeds its declared budget, subsequent tasks pause with `BudgetExceededError`.
3. **Kill Switch:** If `globalKillSwitchActive === true`, the router refuses all dispatches and returns HTTP 423 `KillSwitchActiveError`.

---

## 4. Decoupled Read-Only Commerce Access & Approval Queue

### 4.1 Read-Only Interface
AI-COS agents interact with commerce data strictly via a read-only bridge (`CosCommerceReadPort`):

```typescript
export interface CosCommerceReadPort {
  getCatalogueItem(tenantId: UUID, itemId: UUID): Promise<Readonly<RuntimeCatalogueItem | null>>;
  listCatalogueItems(tenantId: UUID, filter?: { itemType?: string }): Promise<Readonly<RuntimeCatalogueItem[]>>;
  getStorefrontSummary(tenantId: UUID): Promise<{
    tenantName: string;
    itemCount: number;
    categories: string[];
    topItemNames: string[];
  }>;
}
```
*Direct imports of database mutation functions (`db.insert`, `db.update`, `db.delete`) into AI-COS department runtimes are strictly prohibited and prevented by ESLint architecture boundaries.*

### 4.2 Human-in-the-Loop Approval Queue (`cos_approvals`)
When the Marketing agent (or any future department agent) produces draft copy or suggests changes to a website or catalogue:

```
[Agent Execution] ──> [Structured Output Generated] ──> [SHA-256 Proposal Hash Computed]
                                                                   │
                                                                   ▼
[Action Blocked / Frozen] <── [Pending Action Enqueued in cos_approvals]
                                      │
                                      ▼
                        [Human Founder Review in UI]
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
     [Founder Approved]                              [Founder Rejected]
              │                                               │
              ▼                                               ▼
[Target Engine Receives Action]                  [Discarded / Reason Recorded]
(e.g., Website Builder Updates Draft)            (Hash Blocked from Silent Resubmit)
```

#### Database Schema:
- Table: `cos_approvals` (tenant-owned, RLS protected)
- Key Columns:
  - `id`: UUID (Primary Key)
  - `tenant_id`: UUID (Foreign Key to tenants)
  - `execution_cycle_id`: UUID
  - `department_code`: varchar(64) (e.g. `'marketing_growth'`)
  - `action_type`: varchar(96) (e.g. `'apply_website_hero_copy'`)
  - `proposed_payload`: jsonb (structured draft content)
  - `proposal_hash`: varchar(64) (SHA-256 fingerprint over canonical JSON)
  - `risk_level`: enum (`'low'`, `'medium'`, `'high'`)
  - `status`: enum (`'pending'`, `'approved'`, `'rejected'`, `'cancelled'`)
  - `decision_by`: uuid / string (must be Founder / Owner actor)
  - `decision_notes`: text
  - `created_at`, `decided_at`: timestamps

---

## 5. Performance & Infrastructure Isolation

1. **Dedicated Route Guards:**
   All AI-COS HTTP endpoints (`/api/cos/*`) enforce `requireFounder` authentication (established in Phase 1). Non-founder requests are rejected with HTTP 403.
2. **Tenant-Level Rate Limiting:**
   AI-COS execution dispatches are bounded by a dedicated rate limiter bucket:
   - Bucket: `cos:execution:${tenantId}`
   - Capacity: 5 cycle submissions per minute per tenant.
3. **Zero Impact on Synchronous Commerce:**
   Slot booking holds (`/api/public/v1/holds`), checkout (`/api/public/v1/checkout`), payment verification (`/api/public/v1/payments/verify`), and Visual Builder rendering canvases execute independently of the AI-COS module with zero cross-runtime lock contention.

---

## 6. Backward Compatibility & Test Suite Verification

- All 10 existing tests in `tests/unit/ai-cos-orchestration.test.ts` must remain 100% green:
  1. 10 company roles seeded.
  2. Rule 15.1: Instant knowledge response without spawning department runs.
  3. Rule 15.6: Constructive architectural challenge on anti-patterns (DEC-002).
  4. Workflow B: Medium-risk approval gate, SHA-256 proposal hash, and blocked self-approval.
  5. Approval Rules #8 & #13: Rejection hash tracking and invalidation on scope change.
  6. Workflow C: Turf slot concurrency bug autonomous fix with QA rework loop.
  7. External Antigravity handoff mode.
  8. Workflow F: Roadmap reprioritisation superseding previous decisions.
  9. Global Kill Switch (HTTP 423 `KillSwitchActiveError`).
  10. Mumbai Turf vs Playo benchmark analysis.
- New unit tests will be added in `tests/unit/aicos-real-loop.test.ts` to verify:
  - Real structured output parsing and schema validation.
  - Model routing matrix selection based on tier and department.
  - Read-only commerce data bridge isolation.
  - Approval workflow state transitions and immutable audit trails.

---

## 7. Implementation Plan (Post-Approval)

Upon Founder approval of this design specification, implementation will proceed on `feat/aicos-real-loop`:
1. `src/modules/ai-cos/departments/marketing-agent.ts`: Real marketing agent with `MarketingCopyOutputSchema` and structured output.
2. `src/modules/ai-cos/runtime/model-router.service.ts`: Model router with fast/cheap (Tier 1) vs slow/capable (Tier 2) selection.
3. `src/modules/ai-cos/core/commerce-bridge.ts`: Read-only commerce bridge consuming `CommerceRepositoryPort`.
4. `src/modules/ai-cos/policy/approval-queue.service.ts`: Human-in-the-loop pending actions queue with SHA-256 hashing and self-approval block.
5. `tests/unit/aicos-real-loop.test.ts`: Test suite verifying structured output, model routing, read-only coupling, and approval enforcement.
