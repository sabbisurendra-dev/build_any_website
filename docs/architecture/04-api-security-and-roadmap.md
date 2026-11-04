# 04 — API/Domain Boundaries, Security Architecture & Implementation Roadmap

## 1. API & Server Action Boundary Specification

Internal authenticated mutations use **Next.js Server Actions** (or internal typed route handlers) delegating to `src/modules/*` services; public customer booking interactions, webhooks, and cron sweeps use **REST Route Handlers (`/api/...`)** with explicit rate limits and idempotency keys.

| Domain | Operation | Transport / Path | Auth Required | Permitted Roles / Verification |
| :--- | :--- | :--- | :--- | :--- |
| **Tenancy** | Provision tenant + starter website | Server Action `provisionTenantAction` | Yes | `platform_super_admin`, `internal_configurator` |
| **Tenancy** | Manage memberships, plans & suspension | Server Action `manageTenantAdminAction` | Yes | `platform_super_admin` (`platform:tenants:manage`) |
| **Website Builder** | Create/delete/reorder pages | Server Action `manageWebsitePagesAction` | Yes | `platform_super_admin`, `internal_configurator` (`websites:write_draft`) |
| **Website Builder** | Save draft `page_layouts` & widget configs | Server Action `savePageDraftAction` | Yes | `platform_super_admin`, `internal_configurator` (`websites:write_draft`) |
| **Website Builder** | Configure custom domain & subdomain | Server Action `configureDomainAction` | Yes | `platform_super_admin`, `internal_configurator` (`websites:domains:manage`) |
| **Publishing** | Publish immutable `website_versions` / Rollback | Server Action `publishWebsiteAction` | Yes | `platform_super_admin`, `internal_configurator` (`websites:publish`) |
| **Catalog & Rules** | CRUD resources, services, staff, schedules | Server Action `manageCatalogAction` | Yes | `platform_super_admin`, `internal_configurator`, `business_owner` |
| **Availability** | Query open slots (`Model A / B / C`) | `GET /api/public/v1/availability` | Public (Rate-limited) | Scoped to published `tenantId` + `locationId` |
| **Booking Holds** | Acquire concurrency-safe temporary hold | `POST /api/public/v1/holds` | Public + `Idempotency-Key` | Rate-limited (`10/min/IP`), server-enforced GiST / `FOR UPDATE` |
| **Payments** | Create Razorpay/Cashfree order for active hold | `POST /api/public/v1/checkout/orders` | Hold Token + `Idempotency-Key` | Requires valid un-expired `holdToken` matching `bookingId` |
| **Booking Confirm** | Verify synchronous checkout callback signature | `POST /api/public/v1/checkout/verify` | Hold Token + HMAC sig | Constant-time `verifyClientCallbackSignature` |
| **Webhooks** | Asynchronous payment/refund reconciliation | `POST /api/webhooks/razorpay` | HMAC Webhook Signature | `x-razorpay-signature` + `x-razorpay-event-id` idempotency |
| **Cancel / Reschedule** | Cancel or reschedule confirmed booking | `POST /api/public/v1/bookings/[id]/cancel` or Dashboard Action | Yes | `business_owner`, permitted `business_staff`, or OTP-verified `end_customer` within cutoff |
| **Refunds** | Initiate full/partial gateway refund | Server Action `initiateRefundAction` | Yes + `Idempotency-Key` | `platform_super_admin`, `business_owner` (`payments:refund`) |
| **Dashboard** | Bookings list, revenue, utilisation & staff KPIs | RSC Loader + `GET /api/dashboard/v1/metrics` | Yes | `business_owner` (`analytics:read`), `business_staff` (own schedule only) |
| **Housekeeping** | Sweep expired holds (`expires_at <= now()`) | `POST /api/internal/cron/expire-holds` | Bearer `CRON_SECRET` | Constant-time `CRON_SECRET` header check |

---

## 2. Security & Reliability Controls

1. **Strict Tenant Isolation**: Dual-enforced via mandatory `tenantId` service parameters (resolved from verified host or server session, never trusted blindly from client payloads) + PostgreSQL transaction-scoped `SET LOCAL app.current_tenant_id` RLS policies.
2. **Server-Side RBAC (`src/modules/auth/rbac.ts`)**: UI visibility checks are cosmetic only; every Server Action and Route Handler calls `assertTenantPermission` or `assertPlatformPermission` before touching the database.
3. **Input & Config Validation**: Every API query/body AND every visual editor widget `config` object is parsed through strict **Zod** schemas (`CORE_WIDGET_REGISTRY`). Raw HTML injection is disallowed in widget configs to prevent stored XSS across tenant domains.
4. **Secure Session & CSRF Protection**:
   - Auth cookies managed via `@supabase/ssr` using `HttpOnly`, `Secure`, `SameSite=Lax` flags.
   - Next.js Server Actions enforce built-in `Origin` vs `Host` header verification against CSRF.
5. **Rate Limiting (`src/lib/rate-limit.ts`)**: Sliding-window limits per `(IP, tenantId)` on slot availability (`120/min`), hold creation (`10/min`—prevents malicious inventory lockup/denial-of-inventory), and Phone OTP dispatch (`4/5min`).
6. **Payment & Webhook Security**:
   - Zero card PAN/CVV storage (PCI-DSS SAQ-A).
   - Constant-time `crypto.timingSafeEqual` HMAC-SHA256 verification over raw request bytes (`request.text()`).
   - Unique `(provider, provider_event_id)` constraint in `payment_webhook_events`.
7. **Audit Logging**: Append-only `audit_logs` table protected by PostgreSQL trigger `trg_audit_logs_immutable` blocking `UPDATE` and `DELETE`. Captures tenant provisioning, role grants, website publishes/rollbacks, cancellations, and refunds.
8. **Backups, DR & Observability**:
   - Supabase Point-in-Time Recovery (PITR) + automated daily encrypted backups in `ap-south-1`.
   - Structured JSON logging (`src/lib/logger.ts`) with automatic credential/PII redaction and error correlation IDs ready for Sentry / OpenTelemetry integration.

---

## 3. Phased Scope & MVP Implementation Sequence (Aligned with PRD §17, §20 & Market Research §2.4)

### Reference First Vertical
Per Market Research §2.4 & PRD §22, **Sports Facilities (specifically a two-ground Football Turf)** is the P0 reference validation vertical, built atop the generic 3-model booking engine so Fitness/Yoga (P1), Salons (P1), and Clinics (P2) reuse the exact same engine and editor without architectural changes.

### Execution Sequence (PRD §20)
1. **Step 1 — Architecture & Data Model Foundation** *(Completed in this phase)*: Drizzle 34-table schema, GiST/CHECK SQL invariants, multi-tenant middleware, RBAC matrix, and pure 12-column grid engine.
2. **Step 2 — Tenant Management & Internal Admin Console (P0)**: Supabase Auth SSR wiring, system role/permission seeding, client provisioning, and `tenant_onboarding_steps` 1–2 day turnaround telemetry.
3. **Step 3 — Grid Layout Engine & Reusable Widget Library (P0)**: SSR 12-column CSS Grid renderer, general/business widgets, and both unified (`booking.slot-picker`) and composable (`booking.calendar` + `booking.time-slots`) booking widgets synchronized via a scoped `BookingFlowContext`.
4. **Step 4 — Metabase-Inspired Visual Website Editor (P0)**: `@dnd-kit` drag-and-drop, pointer resize handles, row/section reordering, widget duplication, Zustand + Zundo undo/redo, schema-driven inspector, responsive breakpoint editor, preview, draft persistence, and atomic publish (`website_versions`).
5. **Step 5 — Generic Booking Engine Across Models A, B & C (P0)**: Locations, resources (min/max duration), services, staff, cross-midnight schedules/exceptions, timezone-aware availability generator, temporary holds, lazy + cron expiry, cancellations, rescheduling, and `booking_status_history`.
6. **Step 6 — Customer Booking Journey & Simulated/Sandbox Payments (P0)**: End-to-end public booking checkout integrated with `SimulatedPaymentGatewayAdapter` and Razorpay Sandbox (`RazorpayGatewayAdapter`), validating the **23-simultaneous-customers concurrency suite**.
7. **Step 7 — SMB Business Dashboard & Transactional Emails (P0)**: Configurable KPI grid (bookings, revenue, resource utilisation, staff performance, customer history), booking calendar, and Resend email confirmations.
8. **Phase 2 Commercial Readiness (P1)**: Live client-direct Razorpay/Cashfree merchant accounts (`tenant_payment_configs`), custom SSL domain verification UI, 1-click version rollback UI, WhatsApp Business API notifications, multi-location switching, coupons, memberships, and Model C waitlists.
9. **Phase 3 Expansion (P2)**: AI-assisted layout/website generation, healthcare compliance extensions (DPDP Act / clinical workflows), agency white-label sub-accounts, and external CRM/POS integrations.

---

## 4. Documented Reconciliations, Assumptions & Unresolved Decisions

1. **Payment Scope & Fund Custody (PRD §9 & §17 vs Boilerplate Prompt)**:
   - *Reconciliation*: PRD §17 specifies a **simulated/sandbox payment flow in P0** and **production payment gateways in P1**, and PRD §9 + Market Research §9.4 explicitly state: *"Initially, prefer direct client merchant accounts. Do not unnecessarily hold client funds centrally."* We implemented both [`SimulatedPaymentGatewayAdapter`](../../src/modules/payments/simulated.adapter.ts) (HMAC-verified, zero fake availability) for P0 and [`RazorpayGatewayAdapter`](../../src/modules/payments/razorpay.adapter.ts) + `tenant_payment_configs` for P0 sandbox / P1 client-direct merchant credentials.
   - *Open Decision*: Confirm whether any managed clients will opt into platform-collected payments via Razorpay Route split settlements in P1, or if 100% of clients will onboard their own Razorpay/Cashfree merchant IDs.
2. **Custom Domains & Version Rollback Phasing (PRD §13 & §17)**:
   - *Reconciliation*: PRD §17 lists Website Publishing on platform subdomains in P0 and Custom Domains + Version Rollback in P1. The database (`websites.custom_domain`, `website_versions`) and `middleware.ts` already support both so P1 requires only domain-verification UI/API wiring, zero schema migration.
3. **End-Customer Checkout Authentication (PRD §10.1)**:
   - *MVP Default*: Configurable per tenant—supports frictionless guest/mobile-verified checkout (`Name + E.164 Phone`) as well as customer login for booking history, cancellations, and rescheduling.
4. **Healthcare Privacy Boundary (PRD §6.2)**:
   - *Constraint*: Clinics are supported for **appointment scheduling only** (`customers` stores contact details, never clinical diagnoses, prescriptions, or EHR data). Clinical data storage is deferred until dedicated healthcare privacy/ABDM & DPDP compliance review in P2.
5. **Default Booking Hold TTL**:
   - *MVP Default*: **480 seconds (8 minutes)** via `BOOKING_HOLD_TTL_SECONDS` to accommodate mobile UPI app-switching without starving court/slot inventory.
