# AGENTS.md — Universal Commerce & Entitlement Platform Guidelines

## 1. Platform Overview
This repository powers a multi-tenant **Universal Commerce, Slot Booking & Entitlement Platform** (*"Sell an item, grant a right"*), combining:
1. **12-Column Metabase-Inspired Drag-and-Drop Website Builder** (`src/modules/website-builder/`, `src/components/editor/`).
2. **Universal Catalogue & Master Data Projection** (`catalogue_items`, `business_units`, `categories`, `product_variants`, `price_plans`, `v_universal_commerce_master`).
3. **Four Specialised Operational Engines** orchestrated by `UniversalCommerceService`:
   - **Physical Inventory & Fulfilment Engine** (stock holds, quantity deduction, delivery/pickup tracking for items like Milk & Laptops).
   - **Tri-Model Time-Slot & Session Booking Engine** (Model A exclusive resources like Cricket Turfs, Model B staff appointments like Doctors/Salons, Model C capacity sessions like 20-seat Yoga batches).
   - **Digital Content & Entitlement Engine** (time-bounded access windows such as 90-day courses, usage packs, and `ready_to_upgrade` states).
   - **Customer Subscription Engine** (recurring memberships with paid-through period expiry guarantees).

## 2. Core Engineering Rules
- **Tenant Isolation**: Every query and mutation must enforce `tenantId` isolation. Cross-tenant access must return `403` or `404`.
- **Minor Currency Units**: All monetary amounts (`priceMinor`, `totalMinor`, `amountMinor`) are stored and computed in integer minor units (paise for `INR`). Never use floating-point math for money.
- **Backward Compatibility**: Existing booking APIs (`/api/public/v1/holds`, `/api/public/v1/checkout`, `/api/public/v1/payments/verify`, `/api/dashboard/bookings`) and existing unit/concurrency tests in `tests/unit/` must remain 100% green.
- **Modern Web & CSS**:
  - **Browser Support**: Baseline Widely Available features (including CSS Grid and `@container` inline-size queries) are used natively; use progressive enhancement (`content-visibility: auto` with `contain: layout style paint` fallback) for complex grid canvases.
