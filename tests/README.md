# Testing Strategy & Suites

The test suite is organised into three tiers:

1. **`tests/unit/`** — Fast, pure-TypeScript unit tests with zero external I/O:
   - `grid-engine.test.ts`: Metabase-style 12-column collision push-down, gravity compaction, and responsive projection.
   - Timezone slot slicing, pricing rules, RBAC matrix checks, and HMAC signature verification.
2. **`tests/integration/`** *(added in Booking Engine sprint)* — Real PostgreSQL tests validating:
   - 23 parallel transactions racing on a single `exclusive_resource` (`SQLSTATE 23P01` exclusion guarantee).
   - 23 parallel transactions racing on the final seats of a `capacity_session` (`SELECT ... FOR UPDATE` + `CHECK` invariant).
   - Duplicate Razorpay webhook replay (`ON CONFLICT (provider, provider_event_id) DO NOTHING`).
   - Late payment capture after hold TTL expiry (`SAVEPOINT` recovery vs automatic refund).
3. **`tests/e2e/`** *(Playwright, added in UI sprints)* — Multi-tenant domain routing, visual editor drag/resize/publish, and end-customer booking checkout.
