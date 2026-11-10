---
name: universal-commerce-engine
description: >-
  Architectural guide, domain invariants, and runbook for the Universal Commerce &
  Entitlement Platform ("Sell an item, grant a right"). Activate whenever modifying
  catalogue items, physical inventory reservations, time-slot/session bookings,
  digital course access permissions, customer subscriptions, mixed-cart orders,
  or the v_universal_commerce_master projection.
---

# Universal Commerce & Entitlement Engine Skill

## 1. Core Abstraction: "Sell an Item, Grant a Right"
Every commercial offering in the platform is represented in `catalogue_items` and maps to a specific **reservation mechanism** during checkout and a **customer right (`entitlement`) or physical handoff (`fulfilment`)** upon payment capture:

| Offering Category | `item_type` | Checkout Lock Mechanism | Post-Payment Output |
| :--- | :--- | :--- | :--- |
| **Physical Goods** (e.g., 2L Milk, Laptop) | `physical_product` | `inventory_reservations` (`quantity_reserved` lock with 8-min TTL; `quantity_on_hand >= quantity_reserved`) | Stock deduction (`inventory_movements`) + `fulfilments` (`local_delivery` or `store_pickup`) |
| **Exclusive Physical Resource** (e.g., Cricket Turf 1) | `bookable_resource` | `booking_holds` + PostgreSQL GiST `EXCLUDE USING gist` interval overlap lock | `bookings` + `booking_items` + `entitlements` (`time_slot_access`, `valid_from`..`valid_until`) |
| **Staff Appointment** (e.g., Doctor, Salon Stylist) | `service_appointment` | `booking_holds` + practitioner GiST interval lock (including sterilization/prep buffers) | `bookings` + `booking_items` + `entitlements` (`time_slot_access`) |
| **Capacity Session** (e.g., 20-Seat Yoga Batch) | `capacity_session` | `booking_sessions` row lock (`booked_count + held_count <= max_capacity`) | `bookings` + `entitlements` (`session_attendance`) |
| **Time-Bounded Digital Content** (e.g., 90-Day Course) | `digital_content` | Instant availability verification (`status = 'active'`) | `entitlements` (`digital_content_access`, `valid_from = now()`, `valid_until = now() + 90 days`) |
| **Recurring Membership / Pass** | `subscription_plan` | Plan & pricing validation | `customer_subscriptions` + recurring `entitlements` (`membership_access`) |

---

## 2. Normalised Hierarchy & Master Table Projection (`v_universal_commerce_master`)
- **Hierarchy**: `tenants` (`Entity`) -> `business_units` (`Sub_entity`, optional) -> `locations` -> `website_domains` (`Domain`) -> `categories` (`Category`) -> `catalogue_items` (`Item_name`, `flag_1`, `flag_2`).
- **Master Projection**: Always keep `v_universal_commerce_master` and `UniversalCommerceService.getMasterDataProjection()` synchronized so flat queries and exports contain:
  - `entity`, `sub_entity`, `domain`, `category`, `flag_1`, `flag_2`, `item_name`, `permission_timeslot_start`, `permission_timeslot_end`, `status`, `stock_available`, `price_minor`.

---

## 3. Orthogonal Lifecycle State Machines
Never overload a single status column across catalogue definitions and per-customer purchases:
1. **`catalogue_items.status`**: `draft` | `dormant` | `active` (`available`) | `unavailable` | `ready_to_upgrade` | `archived`
2. **Derived Stock Status**: `in_stock` | `low_stock` | `sold_out` (`sold`)
3. **`orders.status`**: `draft` | `awaiting_payment` | `confirmed` | `partially_fulfilled` | `fulfilled` | `cancelled` | `refunded`
4. **`fulfilments.status`**: `pending` | `packed` | `ready_for_pickup` | `out_for_delivery` | `in_transit` | `delivered` | `picked_up` | `failed_delivery` | `returned`
5. **`entitlements.status`**: `pending` | `active` | `ready_to_upgrade` | `upgraded` | `exhausted` | `expired` | `suspended` | `revoked`
6. **`customer_subscriptions.status`**: `trialing` | `active` | `past_due` | `cancel_at_period_end` | `cancelled` | `expired` | `paused`

---

## 4. Mandatory Concurrency & Integrity Rules
1. **Atomic Mixed-Cart Reservation**: When an order contains multiple lines (e.g., Laptop + Python Course + Turf Slot), all line holds/reservations must succeed together. If any line fails (e.g., Turf Slot is taken or Laptop stock is 0), rollback all reservations acquired earlier in the request.
2. **Real-Time Entitlement Expiry**: `verifyEntitlementAccess` must always evaluate `now >= validFrom && (!validUntil || now < validUntil)`. If `validUntil` has elapsed, immediately transition `status` to `'expired'` and deny access.
3. **Subscription Paid-Through Guarantee**: Cancelling a recurring subscription sets `cancel_at_period_end = true` (`status = 'cancel_at_period_end'`). The customer retains active entitlement access until `current_period_end`.
