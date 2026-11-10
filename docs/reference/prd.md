# Master Product Requirements Document (PRD v3.0)
## Universal Commerce, Slot Booking & Entitlement Platform ("Build Any Website — Sell Any Item, Grant Any Right")

- **Document Version**: `3.0.0` (Universal Commerce & Entitlement Upgrade)
- **Production URL**: [https://build-any-website.vercel.app](https://build-any-website.vercel.app)
- **Repository**: [https://github.com/sabbisurendra-dev/build_any_website](https://github.com/sabbisurendra-dev/build_any_website)
- **Target Launch SLA**: 1–2 Days per Tenant Storefront

---

## 1. Executive Summary & Product Vision

### 1.1 The Unifying Concept: "Sell an Item, Grant a Right"
Originally conceived as a multi-tenant website builder and tri-model slot booking platform for sports turfs, clinics, and fitness studios, the platform has evolved into a **Universal Commerce & Entitlement Platform**.

Any business (`Entity`) and its divisions/branches (`Sub_entity`) can launch a custom drag-and-drop website (`Domain`) in 1–2 days, publish a structured catalogue of offerings (`Category`, `Item_name`, `Flag_1`, `Flag_2`), and let customers purchase, reserve, or subscribe to **any combination of**:

| Business Example | What It Offers (`CatalogueItem`) | What the Customer Receives (`Fulfilment` / `Entitlement`) |
| :--- | :--- | :--- |
| **Dairy / Grocery Store** | 1 Litre Farm Fresh Milk (`physical_product`) | Physical quantity reserved at checkout (`inventory_reservations`) & delivered (`fulfilments`) |
| **Electronics Store** | ProBook 15 Laptop (`physical_product`) | Stock locked during checkout, shipped via courier or prepared for store pickup |
| **Cricket Turf / Badminton Arena** | Turf 1 from 7:00 PM – 8:00 PM (`bookable_resource`) | Exclusive time-slot booking (`booking_items` GiST lock) + time-window `entitlement` |
| **Doctor Clinic / Salon** | 30-Min Dental Consultation (`service_appointment`) | Practitioner calendar slot (`staff_members` + sterilization buffer) + appointment `entitlement` |
| **Gym / Yoga Studio** | 7:00 AM Ashtanga Yoga Batch (`capacity_session`) | Guaranteed seat (`1 of 20`) in `booking_sessions` + attendance `entitlement` |
| **Online EdTech Academy** | Full-Stack Python Course (`digital_content`) | Time-bounded viewing permission (`entitlement` with `valid_until = now() + 90 days`) |
| **Co-Working / OTT / Pro Club** | Monthly All-Access Membership (`subscription_plan`) | Recurring `customer_subscription` that automatically extends/expires linked `entitlements` |
| **Hybrid Super-Merchant** | Mixed Cart (Laptop + 90-Day Python Course + Turf Slot) | Single atomic checkout & payment that dispatches physical delivery, instant course access, and turf reservation simultaneously |

---

## 2. Normalised Domain Architecture & Master Data Projection

### 2.1 Why Normalised Core Tables + Master Projection View (`v_universal_commerce_master`)
To support both **strict transactional integrity** (preventing double-bookings, oversold laptops, or premature course expiry) and **unified flat reporting**, the platform implements:
1. **Normalised Transactional Tables (48 Total Tables = 32 Existing + 16 Universal Commerce Tables)**:
   - **Organisation & Routing**: `tenants` (`Entity`), `business_units` (`Sub_entity`), `locations`, `websites`, `website_domains` (`Domain`).
   - **Catalogue & Pricing**: `categories` (`Category`), `catalogue_items` (`Item_name`, `flag_1`, `flag_2`, `status`), `product_variants`, `price_plans`, `catalogue_bundle_items`, `digital_contents`.
   - **Physical Inventory Engine**: `inventory_items`, `inventory_reservations`, `inventory_movements`, `fulfilments`, `fulfilment_items`.
   - **Booking Engine (Models A, B, C)**: `resources`, `services`, `staff_members`, `availability_rules`, `availability_exceptions`, `booking_sessions`, `bookings`, `booking_holds`, `booking_items`.
   - **Unified Transaction & Entitlement Engine**: `carts`, `cart_items`, `orders`, `order_lines`, `payments`, `refunds`, `entitlements` (`permission_timeslot_start`, `permission_timeslot_end`, `status`), `entitlement_usages`, `customer_subscriptions`.
2. **Master Data Table Projection (`v_universal_commerce_master`)**:
   - Exposes every offering and active permission window in the unified flat structure:
     - `entity` | `sub_entity` | `domain` | `category` | `flag_1` | `flag_2` | `item_name` | `permission_timeslot_start` | `permission_timeslot_end` | `status` (`dormant`, `unavailable`, `available`/`active`, `sold`/`sold_out`, `ready_to_upgrade`, `expired`) | `price_minor` | `stock_available`.

---

## 3. Orthogonal Lifecycle & Status Models

| Lifecycle Domain | Valid States | Key Transitions & Business Rules |
| :--- | :--- | :--- |
| **Catalogue Item Status** | `draft`, `dormant`, `active` (`available`), `unavailable`, `ready_to_upgrade`, `archived` | `dormant` items are pre-configured for seasonal/upcoming launches; `ready_to_upgrade` flags items with a newer version/plan. |
| **Inventory Stock Status** | `in_stock`, `low_stock`, `sold_out` (`sold`) | Derived in real time from `quantity_available = quantity_on_hand - quantity_reserved`. |
| **Checkout Hold / Reservation** | `active`, `committed` (`converted`), `expired`, `released` | 8-minute TTL lock on both time slots (`booking_holds`) and physical stock (`inventory_reservations`). |
| **Order Status** | `draft`, `awaiting_payment`, `confirmed`, `partially_fulfilled`, `fulfilled`, `cancelled`, `refunded` | Mixed carts (e.g., Laptop + Digital Course) become `partially_fulfilled` immediately when the course unlocks, and `fulfilled` once the laptop is delivered. |
| **Fulfilment Status** | `pending`, `packed`, `ready_for_pickup`, `out_for_delivery`, `in_transit`, `delivered`, `picked_up`, `failed_delivery`, `returned` | Tracks physical delivery of milk/groceries and shipment/pickup of electronics. |
| **Entitlement Status** | `pending`, `active`, `ready_to_upgrade`, `upgraded`, `exhausted`, `expired`, `suspended`, `revoked` | Governs customer permission between `valid_from` (`permission_timeslot_start`) and `valid_until` (`permission_timeslot_end`). Automatically transitions to `expired` when `now() >= valid_until`. |
| **Subscription Status** | `trialing`, `active`, `past_due`, `cancel_at_period_end`, `cancelled`, `expired`, `paused` | Cancellation sets `cancel_at_period_end`; customer retains active entitlement until `current_period_end`. |

---

## 4. Drag-and-Drop Website Builder Requirements (12-Column Visual Studio)

1. **Single-Slot Universal Inventory Widget (`commerce.inventory-slot`)**:
   - Can be dragged and dropped into **any single slot** on the 12-column canvas (from 3–4 columns wide up to 12 columns wide).
   - Uses CSS Container Queries (`@container`) to adapt its internal card grid to the exact width of its grid slot.
   - Configurable in the right-hand Property Inspector to filter by `itemType` (`all`, `physical_product`, `bookable_resource`, `service_appointment`, `capacity_session`, `digital_content`, `subscription_plan`), `category`, or custom flags (`flag_1`, `flag_2`), and to switch between **Card Grid**, **Compact Single-Slot Shelf**, and **Master Ledger Matrix (`v_universal_commerce_master`)** views.
2. **Specialised Commerce & Content Widgets**:
   - `commerce.product-catalog`: Physical retail shelf with live stock counters (`48 L available`, `Only 2 laptops left`) and delivery/pickup badges.
   - `content.course-catalog`: Digital course & content showcase with `90-Day Viewing Permission` badges and instant access unlock.
   - `commerce.subscription-plans`: Recurring membership tier cards with `ready_to_upgrade` highlights.
   - `commerce.master-ledger-slot`: Live interactive Master Data Table slot displaying `Entity | Sub-Entity | Category | Flag_1 | Flag_2 | Item | Permission Window | Status`.
   - Retained booking widgets: `hero.banner`, `booking.slot-picker`, `catalog.resource-grid`, `catalog.service-list`, `booking.calendar`, `booking.time-slots`, `content.faq`, `location.map-hours`.

---

## 5. Mandatory Validation Scenarios (Acceptance Criteria)

1. **Scenario 1 — Selling 2 Litres of Milk**: Stock reserves 2 units at checkout, deducts `quantity_on_hand` by 2 on payment, records an immutable `inventory_movements` ledger entry, and creates a `local_delivery` fulfilment.
2. **Scenario 2 — Selling a Laptop**: Last remaining laptop (`quantity_on_hand = 1`) is locked for 8 minutes during Customer A's checkout (`quantity_available = 0`), blocking Customer B (`409 OUT_OF_STOCK`) until committed or expired.
3. **Scenario 3 — Booking Cricket Turf 1 (7:00 PM – 8:00 PM)**: Prevents any overlapping booking (`19:00–20:00` or partial overlap `19:30–20:30`) while allowing adjacent slots (`18:00–19:00` and `20:00–21:00`).
4. **Scenario 4 — 23 Simultaneous Customers on Final Turf Slot**: Exactly 1 customer acquires the hold (`201`); 22 customers deterministically receive `409 SLOT_UNAVAILABLE` with zero double-bookings.
5. **Scenario 5 — 20-Person Yoga Class Capacity Ceiling**: Enforces `booked_count + held_count <= 20`. When 19 seats are booked and 12 customers race for the 20th seat, exactly 1 succeeds and 11 receive `409 SESSION_CAPACITY_EXCEEDED`.
6. **Scenario 6 — 90-Day Course Viewing Permission**: Grants an `entitlement` with `valid_until = valid_from + 90 days`. Access verification succeeds during the 90-day window, supports `ready_to_upgrade` near expiry, and automatically denies access (`status = 'expired'`) the instant `now() >= valid_until`.
7. **Scenario 7 — Mixed Cart (Physical Laptop + Digital Course)**: Single checkout and payment creates one `order` with two `order_lines`: the course entitlement unlocks (`active`) immediately (`order.status = 'partially_fulfilled'`), while the laptop enters the `fulfilments` shipping pipeline (`order.status = 'fulfilled'` upon delivery).
8. **Scenario 8 — Recurring Subscription Renewal & Cancellation**: Payment renews `current_period_end` and extends the linked `entitlement.valid_until`; cancellation marks `cancel_at_period_end = true` so access continues until the paid-through date and expires automatically thereafter.
