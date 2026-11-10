# Performance Baseline Report — Phase 0

**Project:** Build Any Website (Universal Commerce, Website Builder & AI-COS SaaS)  
**Date:** November 10, 2026  
**Environment:** Node.js v24.14.1, Next.js 15.2.4 (React 19.0.0), Vitest v3.2.7, macOS Darwin arm64  
**Commit Baseline:** `2acc195` (Branch: `main`)

---

## 1. Executive Summary & Measured Baselines

This document establishes the empirical performance, memory, bundle, and architecture baseline for the **Build Any Website** repository prior to executing the Phase 1–14 optimisation stages.

All measurements reflect exact, reproducible runs executed against the active repository without fabricated data.

---

## 2. Production Bundle Sizes (Next.js 15 Build)

Generated via `next build` with standard Turbopack / Webpack optimization:

| Route Path | Type | Route Code Size | First Load JS | Shared Framework Chunks |
|---|---|---|---|---|
| `/` (Homepage) | Static (○) | 174 B | 105 kB | 102 kB |
| `/_not-found` | Static (○) | 219 B | 102 kB | 102 kB |
| `/s/[siteKey]/[[...slug]]` (Public Tenant Storefront) | Dynamic (ƒ) | 20.1 kB | **150 kB** | 102 kB |
| `/platform/builder` (12-Column Visual Grid Editor) | Static (○) | 33.3 kB | **185 kB** | 102 kB |
| `/platform/tenants` (Platform Merchant Manager) | Static (○) | 7.7 kB | 160 kB | 102 kB |
| `/dashboard` (Merchant Operational Dashboard) | Static (○) | 12.2 kB | 160 kB | 102 kB |
| `/dashboard/inventory` (Universal Commerce Inventory) | Static (○) | 9.97 kB | 140 kB | 102 kB |
| `/dashboard/bookings` (Merchant Calendar & Booking List) | Static (○) | 8.74 kB | 153 kB | 102 kB |
| `/cos` (AI-COS Founder Command Centre) | Dynamic (ƒ) | 19.0 kB | 133 kB | 102 kB |
| `middleware` | Edge Middleware | 34.6 kB | — | — |
| **All API Routes (`/api/*`)** | Dynamic (ƒ) | 219 B | 102 kB | 102 kB |

### Initial Bundle Analysis
- **Shared First Load JS across all routes:** 102 kB (React 19, Next.js framework runtime, `@tanstack/react-query`).
- **Public Site View (`/s/[siteKey]`):** 150 kB First Load JS. Bundles `CustomerBookingJourney` and cart modal statically even when a visitor only views the landing page sections.
- **Visual Builder (`/platform/builder`):** 185 kB First Load JS. Bundles `EditorCanvas`, `EditorPropertyInspector`, `EditorWidgetPalette`, and `EditorTopbar` into one monolithic client bundle.
- **AI-COS (`/cos`):** 133 kB First Load JS. Bundles all 11 tabs into `founder-command-centre.tsx` (2,327 lines) upfront.

---

## 3. Microbenchmark Execution Baselines (Vitest In-Memory)

Measured using high-resolution monotonic timer (`performance.now()`) across repeated execution runs:

| Subsystem & Operation | Iterations | Total Time | Per-Operation Latency |
|---|---|---|---|
| **Website Service:** `getPublishedWebsiteBySiteKey` | 1,000 ops | 3.07 ms | **~0.0031 ms / op** |
| **Grid Engine:** `resolveWidgetsForBreakpoint` (3-breakpoint) | 10,000 ops (30k resolves) | 8.76 ms | **~0.0003 ms / resolve** |
| **Grid Engine:** `moveOrResizeWidget` (collision pushdown) | 10,000 ops | 10.82 ms | **~0.0011 ms / op** |
| **Commerce Engine:** `listCatalogue` (full catalog query) | 1,000 ops | 7.63 ms | **~0.0076 ms / op** |
| **Commerce Engine:** `getMasterDataProjection` (`v_universal_commerce_master`) | 1,000 ops | 10.93 ms | **~0.0109 ms / op** |
| **Commerce Engine:** `createOrderAndHold` (order + 8-min stock hold) | 40 sequential orders | 1.12 ms | **~0.0281 ms / order** |
| **AI-COS Orchestrator:** Direct Question (Fast Path Rule 15.1) | 50 queries | 3.95 ms | **~0.0790 ms / query** |
| **AI-COS Orchestrator:** Workflow C Full DAG Run (autonomous bug fix + QA) | 1 full DAG cycle | 4.21 ms | **~4.21 ms / cycle** |

---

## 4. State Serialization & File Persistence Overhead

In the active Next.js runtime (development & production server), state updates persist to local JSON files:

| Persistence Target | File Path | Payload Size | `JSON.stringify` Latency | Synchronous Disk I/O Cost |
|---|---|---|---|---|
| **Platform Runtime Snapshot** | `.runtime-state.json` | **250.67 KB** | ~0.65 ms | Synchronous `statSync` + `writeFileSync` on every mutation |
| **AI-COS Runtime Snapshot** | `.aicos-runtime-state.json` | **41.66 KB** | ~0.07 ms | Synchronous `statSync` + `writeFileSync` on every audit log / message |

### Persistence Bottlenecks
1. **Quarter-Megabyte JSON File Writes:** Every order creation, inventory stock deduction, widget config edit, or booking allocation triggers a synchronous `JSON.stringify(state, null, 2)` (250 KB) and synchronous `writeFileSync` to disk.
2. **Serverless Ephemeral Limitation:** On Vercel or AWS Lambda, the filesystem outside `/tmp` is read-only and ephemeral across lambdas, causing cross-request cache drift unless backed by PostgreSQL.
3. **Event Loop Blocking:** Synchronous disk writes block the Node.js event loop for all concurrent requests on the same worker.

---

## 5. Test Suite Verification Baseline

Executed via `pnpm test` (`vitest run`):
- **Test Files:** 8 passed (8 total)
- **Tests:** 49 passed (49 total)
- **Total Duration:** 875 ms (transform 734ms, collect 1.80s, tests 120ms)
- **TypeScript Typecheck:** `tsc --noEmit` exited with code 0 (clean, no type errors).

---

## 6. Unused Dependencies Baseline

Identified packages in `package.json` that are completely unimported across `src/` and `tests/`:
1. `@dnd-kit/core` (^6.3.1)
2. `@dnd-kit/modifiers` (^9.0.0)
3. `@dnd-kit/sortable` (^10.0.0)
4. `@dnd-kit/utilities` (^3.2.2)
5. `@hookform/resolvers` (^5.0.1)
6. `@radix-ui/react-popover` (^1.1.6)
7. `@supabase/ssr` (^0.6.1)
8. `@supabase/supabase-js` (^2.49.1)
9. `date-fns` (^4.1.0)
10. `date-fns-tz` (^3.2.0)
11. `immer` (^10.1.1)
12. `nuqs` (^2.4.1)
13. `react-hook-form` (^7.54.2)
14. `zundo` (^2.3.0)
15. `zustand` (^5.0.3)
