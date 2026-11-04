# 01 — Technology Stack Analysis & Architecture Decision Records (ADRs)

## 1. Comparative Technology Evaluation

Each candidate was evaluated against 10 platform criteria: multi-tenancy, SMB local SEO, dynamic website rendering, complex admin UIs, Metabase-style drag-and-drop editing, booking concurrency/transaction safety, developer velocity, India cost/latency economics, horizontal scalability, and Antigravity workspace compatibility.

### 1.1 Web Framework: Next.js (App Router) vs Astro vs Remix / React Router v7

| Dimension | Next.js 15 (App Router) | Astro 5 | Remix / React Router v7 |
| :--- | :--- | :--- | :--- |
| **Multi-tenant custom domains & subdomains** | Native via `middleware.ts` hostname rewrite + per-tenant `revalidateTag('website:' + domain)` | Possible via SSR adapter, but lacks unified React Server Actions & fine-grained cache tag invalidation across dynamic islands | Possible via Express/Node host routing, but requires custom CDN cache invalidation plumbing |
| **Public SMB SEO & Core Web Vitals** | Streaming SSR + cached immutable `website_versions` snapshots + dynamic `generateMetadata` + JSON-LD | Best-in-class zero-JS static islands, **but** live slot pickers + shared React widget components re-hydrate React anyway | Full SSR, good SEO, less granular per-tenant static-like caching out of the box |
| **Shared Widget Rendering (Public SSR + Visual Editor)** | **100% shared React component tree**—public sites render as Server Components; visual editor mounts the exact same components on canvas | Splits codebase between `.astro` templates and `.tsx` editor components or forces everything into React islands | 100% shared React tree, slightly heavier client bundle on purely static widgets |
| **Verdict** | **SELECTED** | Rejected (splits authoring model across static & heavy interactive SaaS surfaces) | Runner-up |

### 1.2 Language & Styling: TypeScript + Tailwind CSS v4 + shadcn/ui

- **TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`)**: Mandatory across database models, Zod widget schemas, booking state machines, and gateway webhooks. Eliminates runtime shape mismatches in JSONB widget configs.
- **Tailwind CSS v4 + CSS Custom Properties**: Enables per-tenant theming (`--brand-primary`, `--brand-accent`, `--brand-bg`, `--brand-radius`) injected on `<main>` at SSR time with zero runtime CSS-in-JS cost.
- **shadcn/ui + Radix UI**: Accessible, unstyled primitives owned directly inside `src/components/ui`—ideal for building dense internal configurator panels, inspector drawers, and accessible public booking dialogs without fighting opinionated component library styles.

### 1.3 Visual Editor Grid & Drag-and-Drop: Native CSS Grid + `@dnd-kit` vs `react-grid-layout`

| Option | Pros | Cons | Verdict |
| :--- | :--- | :--- | :--- |
| **`react-grid-layout` everywhere** | Out-of-the-box dashboard drag/resize | Uses absolute `transform: translate(px, px)` positioning via client JS; causes Layout Shift (poor CLS), hurts mobile responsiveness when text wraps, ships editor layout JS to public visitors | Rejected for public rendering |
| **Native 12-Col CSS Grid + `@dnd-kit` + Pure TS Grid Engine** | Public websites render pure semantic HTML + CSS Grid (`grid-column: X / span W`) with **0 KB drag-and-drop JS**; editor uses `@dnd-kit` pointer sensors + deterministic Metabase-style push-down collision math (`grid-engine.ts`) | Requires writing ~180 LOC of clean coordinate/collision math (already implemented in foundation) | **SELECTED** |

### 1.4 Database & Backend: PostgreSQL (Supabase `ap-south-1` Mumbai) vs Alternatives

- **PostgreSQL 16+ vs MySQL / MongoDB / DynamoDB**:
  - **PostgreSQL wins decisively** because `btree_gist` + `tstzrange` `EXCLUDE USING gist` enforces non-overlapping intervals (`[8:53 PM, 10:53 PM)`) inside the database index engine itself. Neither MySQL, MongoDB, nor DynamoDB provides native range-overlap exclusion constraints.
- **Supabase (Managed PostgreSQL + Auth + Storage) vs Separate Neon/RDS + Clerk/Auth0 + AWS S3**:
  - **Supabase (`ap-south-1` Mumbai)** consolidates low-latency Indian PostgreSQL hosting, Phone OTP / Email Auth, and S3-compatible CDN Storage under predictable pricing, while preserving 100% standard PostgreSQL wire compatibility (`postgres` driver + Drizzle ORM) so the platform has **zero proprietary database lock-in**.
  - *Crucial architectural nuance*: All server mutations and booking transactions run on the server via **Drizzle ORM** (`withTenantTransaction`) rather than exposing PostgREST directly to browser clients. Supabase RLS serves strictly as **defense-in-depth**, never as a substitute for server-side domain validation.

### 1.5 ORM: Drizzle ORM vs Prisma

| Dimension | Drizzle ORM | Prisma |
| :--- | :--- | :--- |
| **Serverless cold start & bundle** | Lightweight pure TypeScript (~0 binary overhead) | Ships heavy query engine binary / proxy |
| **PostgreSQL concurrency primitives** | First-class `.for('update')`, SQL expressions, seamless custom DDL migrations (`EXCLUDE USING gist`) | Requires `$queryRaw` escape hatches for row locks and manual migration edits for GiST exclusion constraints |
| **Type inference speed** | Instant TypeScript inference directly from schema files (`$inferSelect`) | Requires `prisma generate` codegen step on every schema edit |
| **Verdict** | **SELECTED** | Rejected |

### 1.6 Payments, Storage, Notifications & Hosting

- **Payments**: **Razorpay** (Primary) behind `PaymentGatewayPort`, with **Cashfree** adapter readiness. Razorpay leads Indian SMB adoption across **UPI Intent (GPay/PhonePe/Paytm)**, dynamic UPI QR, Cards, Netbanking, and **Razorpay Route (Linked Accounts)** when we later automate split payouts to SMB bank accounts.
- **File/Media Storage**: **Supabase Storage** (public CDN bucket for published tenant website images; private bucket with signed URLs for invoices/exports), isolated by path prefix `{tenantId}/{websiteId}/...`.
- **Notifications**: Transactional outbox table (`notifications`) + `NotificationDispatcherPort` using **Resend** for MVP transactional emails and pluggable adapters for **WhatsApp Business Cloud API / Gupshup / MSG91** (Phase 2).
- **Hosting**: **Vercel Pro (`bom1` Mumbai)** for wildcard subdomain routing (`*.platform.in`), programmatic custom domain SSL via Vercel Domains API, and tag-based ISR cache invalidation (`revalidateTag`), co-located in Mumbai alongside Supabase `ap-south-1`.

---

## 2. Definitive Stack Summary

| Layer | Selected Technology |
| :--- | :--- |
| **Application Framework** | Next.js 15 (App Router, React 19, Server Components + Server Actions + Route Handlers) |
| **Language** | TypeScript 5.8 (`strict: true`, `noUncheckedIndexedAccess: true`) |
| **Styling & UI** | Tailwind CSS v4 + CSS Theme Variables + shadcn/ui (Radix UI) |
| **Visual Editor Engine** | Native 12-Col CSS Grid + `@dnd-kit/core` + Pure TS Grid Collision Engine (`grid-engine.ts`) |
| **Client State** | TanStack Query v5 (live availability/server cache) + Zustand v5 & Zundo (editor canvas + undo/redo) + `nuqs` (URL filters) |
| **Forms & Validation** | React Hook Form + Zod (shared client/server/widget-registry validation) |
| **Database** | PostgreSQL 16+ on Supabase (`ap-south-1` Mumbai) with `btree_gist` & `pgcrypto` |
| **ORM & Migrations** | Drizzle ORM + `drizzle-kit` + `postgres` (`postgres.js`) |
| **Authentication** | Supabase Auth (`@supabase/ssr`) + Relational RBAC (`users`, `tenant_memberships`, `roles`, `permissions`) |
| **File Storage** | Supabase Storage (S3-compatible CDN buckets) |
| **Payments** | Razorpay (Primary: UPI, Cards, Netbanking) + Cashfree adapter readiness |
| **Notifications** | Resend (Email MVP) + Outbox architecture ready for WhatsApp & SMS |
| **Rate Limiting** | Upstash Redis sliding window (in-memory fallback in local dev) |
| **Testing** | Vitest (unit & DB concurrency integration) + Playwright (E2E) |
| **Deployment** | Vercel (`bom1` Mumbai) |

---

## 3. Architecture Decision Records (ADRs)

- **ADR-001: Modular Monolith over Microservices for MVP.** A single Next.js + modular `src/modules/*` TypeScript codebase eliminates distributed transaction sagas between website configuration, booking holds, and payment webhooks while enforcing clean port/adapter boundaries.
- **ADR-002: Immutable `website_versions` Snapshots for Public Rendering.** Public SMB traffic reads exclusively from immutable published JSON snapshots (`websites.published_version_id`) cached by hostname tag—decoupling live customer traffic from draft edits in `page_layouts` and enabling 1-click rollbacks.
- **ADR-003: Database-Enforced Concurrency via `EXCLUDE USING gist` & `FOR UPDATE`.** Application-level availability checks are advisory only; PostgreSQL GiST range exclusion constraints (`SQLSTATE 23P01`) and row locks on `booking_sessions` serve as the non-bypassable source of truth.
- **ADR-004: All Monetary Values in Integer Minor Units (`paise`).** Prices, taxes, discounts, payments, and refunds are stored as `integer` minor units (`Rs 1,200.00` = `120000` paise) paired with an explicit ISO-4217 `currency` code.
- **ADR-005: UTC Instants + Explicit Location IANA Timezone.** Every booked/held timestamp is stored as UTC `timestamptz`, while recurring schedules (`availability_rules`) store wall-clock `time` projected using `locations.timezone` (default `'Asia/Kolkata'`).
- **ADR-006: Zero Card Data Persistence (PCI-DSS SAQ-A).** Card entry occurs strictly inside Razorpay/Cashfree hosted/inline frames; platform servers store only gateway order/payment IDs, masked metadata, and verified HMAC status.
- **ADR-007: Delayed Webhook `SAVEPOINT` Reconciliation.** If a slow UPI callback arrives after a hold's TTL expired, the webhook processor attempts slot re-activation inside a PostgreSQL `SAVEPOINT`—confirming the booking if the slot remained free, or queuing an automatic refund (`captured_requires_refund`) if another customer already claimed it.
