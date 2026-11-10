import { describe, it, expect, beforeEach } from 'vitest';
import { UniversalCommerceService } from '@/modules/commerce/commerce.service';
import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';
import {
  InsufficientStockError,
  SlotUnavailableError,
  SessionCapacityExceededError,
  EntitlementExpiredError,
} from '@/lib/errors';
import { CORE_WIDGET_REGISTRY } from '@/modules/website-builder/widget-registry';
import {
  gridBoxesOverlap,
  moveOrResizeWidget,
  resolveWidgetsForBreakpoint,
} from '@/modules/website-builder/grid-engine';
import type { PlacedWidgetInstance } from '@/modules/website-builder/layout.types';

describe('Universal Commerce & Entitlement Platform — All 8 Required Scenarios + Master Data & Editor', () => {
  let commerce: UniversalCommerceService;
  const tenantId = 't-uni-06'; // OmniMarket Universal Store, Turf & Academy

  beforeEach(() => {
    UniversalCommerceService.resetStateForTests();
    commerce = new UniversalCommerceService();
  });

  it('Scenario 1: Selling 2L of Milk (stock reservation, deduction, movement ledger, and local_delivery fulfilment)', async () => {
    // Initial stock of Farm-Fresh A2 Milk (1 Litre) is 50
    const beforeItem = commerce
      .listCatalogue(tenantId)
      .find((i) => i.id === 'ci-milk-1l-tuni06');
    expect(beforeItem?.stockOnHand).toBe(50);
    expect(beforeItem?.stockAvailable).toBe(50);

    // Purchase 2 x 1L pouches (= 2L of Milk)
    const result = await commerce.createOrderAndHold({
      tenantId,
      idempotencyKey: 'idem-scenario-1-milk-2l',
      customer: {
        fullName: 'Ananya Verma',
        phone: '+91 98450 11101',
        email: 'ananya.milk@example.com',
        shippingAddress: 'Flat 402, Indiranagar, Bengaluru',
      },
      fulfilmentPreference: 'local_delivery',
      paymentMethod: 'upi',
      autoConfirmPayment: true,
      lines: [
        {
          catalogueItemId: 'ci-milk-1l-tuni06',
          quantity: 2,
        },
      ],
    });

    expect(result.order.status).toBe('confirmed');
    expect(result.order.paymentStatus).toBe('captured');
    expect(result.order.totalMinor).toBe(2 * 7500); // ₹150.00
    expect(result.fulfilments).toHaveLength(1);
    expect(result.fulfilments[0]?.method).toBe('local_delivery');
    expect(result.fulfilments[0]?.status).toBe('pending');
    expect(result.fulfilments[0]?.recipientAddress).toContain('Indiranagar');

    // Verify stock deducted from 50 -> 48 and movement logged
    const afterItem = commerce
      .listCatalogue(tenantId)
      .find((i) => i.id === 'ci-milk-1l-tuni06');
    expect(afterItem?.stockOnHand).toBe(48);
    expect(afterItem?.stockAvailable).toBe(48);

    const state = RuntimeStateRepository.getState();
    const saleMovement = state.inventoryMovements.find(
      (m) => m.catalogueItemId === 'ci-milk-1l-tuni06' && m.movementType === 'sale_commit',
    );
    expect(saleMovement?.deltaQuantity).toBe(-2);

    // Complete delivery and verify order transitions to fulfilled
    const delivered = commerce.updateFulfilmentStatus({
      tenantId,
      fulfilmentId: result.fulfilments[0]!.id,
      status: 'delivered',
    });
    expect(delivered.fulfilment.status).toBe('delivered');
    expect(delivered.order?.status).toBe('fulfilled');
  });

  it('Scenario 2: Selling a Laptop (checkout stock reservation prevents oversell while held, and completes pickup/delivery)', async () => {
    // ProBook Ultra 15 Laptop has 5 units in stock.
    // Buyer A places a temporary checkout reservation for all 5 units (autoConfirmPayment: false).
    const holdResult = await commerce.createOrderAndHold({
      tenantId,
      idempotencyKey: 'idem-scenario-2-laptop-hold',
      autoConfirmPayment: false,
      customer: {
        fullName: 'Corporate Buyer A',
        phone: '+91 98450 22201',
        email: 'buyer.a@example.com',
      },
      paymentMethod: 'card',
      lines: [
        {
          catalogueItemId: 'ci-laptop-pro15-tuni06',
          quantity: 5,
        },
      ],
    });

    expect(holdResult.order.status).toBe('awaiting_payment');
    const stockDuringHold = commerce
      .listCatalogue(tenantId)
      .find((i) => i.id === 'ci-laptop-pro15-tuni06');
    expect(stockDuringHold?.stockOnHand).toBe(5);
    expect(stockDuringHold?.stockReserved).toBe(5);
    expect(stockDuringHold?.stockAvailable).toBe(0);
    expect(stockDuringHold?.derivedStatus).toBe('sold');

    // Concurrent Buyer B attempts to buy 1 Laptop while Buyer A's checkout hold is active -> must fail with InsufficientStockError
    await expect(
      commerce.createOrderAndHold({
        tenantId,
        idempotencyKey: 'idem-scenario-2-laptop-oversell',
        autoConfirmPayment: true,
        customer: {
          fullName: 'Buyer B',
          phone: '+91 98450 22202',
        },
        paymentMethod: 'upi',
        lines: [
          {
            catalogueItemId: 'ci-laptop-pro15-tuni06',
            quantity: 1,
          },
        ],
      }),
    ).rejects.toThrow(InsufficientStockError);

    // Confirm Buyer A's payment and verify pickup/delivery completion
    const confirmed = await commerce.confirmOrderPayment({
      tenantId,
      orderId: holdResult.order.id,
      paymentMethod: 'card',
    });
    expect(confirmed.order.paymentStatus).toBe('captured');
    expect(confirmed.fulfilments).toHaveLength(1);
  });

  it('Scenario 3: Booking Cricket Turf 1 from 7:00 PM to 8:00 PM (grants time-slot entitlement & blocks overlapping slot)', async () => {
    const startsAt = '2026-11-15T19:00:00+05:30';
    const endsAt = '2026-11-15T20:00:00+05:30';

    const result = await commerce.createOrderAndHold({
      tenantId,
      idempotencyKey: 'idem-scenario-3-turf-7pm',
      autoConfirmPayment: true,
      customer: {
        fullName: 'Virat Captain',
        phone: '+91 98450 33301',
        email: 'virat@example.com',
      },
      paymentMethod: 'upi',
      lines: [
        {
          catalogueItemId: 'ci-turf-slot-tuni06',
          quantity: 1,
          slotSelection: {
            resourceId: 'res-omni-turf-01',
            startsAt,
            endsAt,
          },
        },
      ],
    });

    expect(result.order.status).toBe('fulfilled');
    expect(result.entitlements).toHaveLength(1);
    const turfRight = result.entitlements[0]!;
    expect(turfRight.entitlementType).toBe('time_slot_access');
    expect(new Date(turfRight.permissionTimeslotStartIso).getTime()).toBe(
      new Date(startsAt).getTime(),
    );
    expect(new Date(turfRight.permissionTimeslotEndIso!).getTime()).toBe(
      new Date(endsAt).getTime(),
    );

    // Attempting an overlapping booking (7:30 PM to 8:30 PM) on the same turf must fail with SlotUnavailableError
    await expect(
      commerce.createOrderAndHold({
        tenantId,
        idempotencyKey: 'idem-scenario-3-turf-overlap',
        autoConfirmPayment: true,
        customer: {
          fullName: 'Overlap Team',
          phone: '+91 98450 33302',
        },
        paymentMethod: 'upi',
        lines: [
          {
            catalogueItemId: 'ci-turf-slot-tuni06',
            quantity: 1,
            slotSelection: {
              resourceId: 'res-omni-turf-01',
              startsAt: '2026-11-15T19:30:00+05:30',
              endsAt: '2026-11-15T20:30:00+05:30',
            },
          },
        ],
      }),
    ).rejects.toThrow(SlotUnavailableError);
  });

  it('Scenario 4: 23 simultaneous customers attempting to book the final turf slot (exactly 1 succeeds, 22 get 409 SLOT_UNAVAILABLE)', async () => {
    const startsAt = '2026-11-18T19:00:00+05:30';
    const endsAt = '2026-11-18T20:00:00+05:30';

    const attempts = Array.from({ length: 23 }, (_, idx) =>
      commerce.createOrderAndHold({
        tenantId,
        idempotencyKey: `idem-scenario-4-racer-${idx + 1}`,
        autoConfirmPayment: true,
        customer: {
          fullName: `Turf Contender ${idx + 1}`,
          phone: `+91 98450 444${(idx + 1).toString().padStart(2, '0')}`,
          email: `contender${idx + 1}@example.com`,
        },
        paymentMethod: 'upi',
        lines: [
          {
            catalogueItemId: 'ci-turf-slot-tuni06',
            quantity: 1,
            slotSelection: {
              resourceId: 'res-omni-turf-01',
              startsAt,
              endsAt,
            },
          },
        ],
      }),
    );

    const results = await Promise.allSettled(attempts);
    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(succeeded).toHaveLength(1);
    expect(rejected).toHaveLength(22);
    for (const r of rejected) {
      if (r.status === 'rejected') {
        expect(r.reason).toBeInstanceOf(SlotUnavailableError);
      }
    }
  });

  it('Scenario 5: Selling a seat in a 20-person Yoga class (enforces 20-seat capacity ceiling)', async () => {
    // Seeded session sess-omni-yoga-20 starts with maxCapacity: 20, bookedCount: 18 (2 seats remaining).
    // Let's book 2 seats -> reaches 20/20 capacity.
    const twoSeatOrder = await commerce.createOrderAndHold({
      tenantId,
      idempotencyKey: 'idem-scenario-5-yoga-2-seats',
      autoConfirmPayment: true,
      customer: {
        fullName: 'Corporate Wellness Group',
        phone: '+91 98450 55501',
        email: 'wellness@example.com',
      },
      paymentMethod: 'upi',
      lines: [
        {
          catalogueItemId: 'ci-yoga-class-tuni06',
          quantity: 2,
          slotSelection: {
            sessionId: 'sess-omni-yoga-20',
            startsAt: '2026-11-16T07:00:00+05:30',
            endsAt: '2026-11-16T08:00:00+05:30',
          },
        },
      ],
    });

    expect(twoSeatOrder.order.status).toBe('fulfilled');
    expect(twoSeatOrder.entitlements[0]?.entitlementType).toBe('session_attendance');
    expect(twoSeatOrder.entitlements[0]?.maxUsageCount).toBe(2);

    // 21st seat attempt must fail with SessionCapacityExceededError
    await expect(
      commerce.createOrderAndHold({
        tenantId,
        idempotencyKey: 'idem-scenario-5-yoga-21st-seat',
        autoConfirmPayment: true,
        customer: {
          fullName: 'Late Attendee',
          phone: '+91 98450 55502',
        },
        paymentMethod: 'upi',
        lines: [
          {
            catalogueItemId: 'ci-yoga-class-tuni06',
            quantity: 1,
            slotSelection: {
              sessionId: 'sess-omni-yoga-20',
              startsAt: '2026-11-16T07:00:00+05:30',
              endsAt: '2026-11-16T08:00:00+05:30',
            },
          },
        ],
      }),
    ).rejects.toThrow(SessionCapacityExceededError);
  });

  it('Scenario 6: Selling a course with 90-day viewing permission (active during days 1-89, expires automatically after 90 days)', async () => {
    const result = await commerce.createOrderAndHold({
      tenantId,
      idempotencyKey: 'idem-scenario-6-course-90d',
      autoConfirmPayment: true,
      customer: {
        fullName: 'Siddharth Rao',
        phone: '+91 98450 66601',
        email: 'siddharth.course@example.com',
      },
      paymentMethod: 'card',
      lines: [
        {
          catalogueItemId: 'ci-course-python90-tuni06',
          quantity: 1,
        },
      ],
    });

    expect(result.order.status).toBe('fulfilled');
    expect(result.entitlements).toHaveLength(1);

    const courseEntitlement = result.entitlements[0]!;
    expect(courseEntitlement.entitlementType).toBe('digital_content_access');
    expect(courseEntitlement.status).toBe('active');

    const startMs = new Date(courseEntitlement.permissionTimeslotStartIso).getTime();
    const endMs = new Date(courseEntitlement.permissionTimeslotEndIso!).getTime();
    const diffDays = Math.round((endMs - startMs) / (24 * 60 * 60 * 1000));
    expect(diffDays).toBe(90);

    // Day 45: Student accesses module -> succeeds and increments consumedUsageCount
    const day45Ms = startMs + 45 * 24 * 60 * 60 * 1000;
    const verifiedAtDay45 = commerce.verifyEntitlementAccess({
      tenantId,
      entitlementId: courseEntitlement.id,
      atTimeMs: day45Ms,
      consumeUnit: true,
    });
    expect(verifiedAtDay45.allowed).toBe(true);
    expect(verifiedAtDay45.entitlement.status).toBe('active');
    expect(verifiedAtDay45.entitlement.consumedUsageCount).toBe(1);
    expect(verifiedAtDay45.remainingDays).toBe(45);

    // Day 91: Student attempts to access course after 90-day permission window -> automatically expires & throws EntitlementExpiredError
    const day91Ms = startMs + 91 * 24 * 60 * 60 * 1000;
    expect(() =>
      commerce.verifyEntitlementAccess({
        tenantId,
        entitlementId: courseEntitlement.id,
        atTimeMs: day91Ms,
        consumeUnit: true,
      }),
    ).toThrow(EntitlementExpiredError);
  });

  it('Scenario 7: Mixed cart containing a physical Laptop + 90-day Digital Course in one order (partially_fulfilled -> fulfilled)', async () => {
    const mixedResult = await commerce.createOrderAndHold({
      tenantId,
      idempotencyKey: 'idem-scenario-7-mixed-cart',
      autoConfirmPayment: true,
      customer: {
        fullName: 'Meera Krishnan',
        phone: '+91 98450 77701',
        email: 'meera.mixed@example.com',
        shippingAddress: 'HSR Layout Sector 2, Bengaluru',
      },
      paymentMethod: 'card',
      lines: [
        {
          catalogueItemId: 'ci-laptop-pro15-tuni06',
          quantity: 1,
        },
        {
          catalogueItemId: 'ci-course-python90-tuni06',
          quantity: 1,
        },
      ],
    });

    // Digital course unlocks immediately, while Laptop is pending delivery -> order is partially_fulfilled
    expect(mixedResult.order.lines).toHaveLength(2);
    expect(mixedResult.entitlements).toHaveLength(1);
    expect(mixedResult.entitlements[0]?.entitlementType).toBe('digital_content_access');
    expect(mixedResult.entitlements[0]?.status).toBe('active');
    expect(mixedResult.fulfilments).toHaveLength(1);
    expect(mixedResult.fulfilments[0]?.status).toBe('pending');
    expect(mixedResult.order.status).toBe('partially_fulfilled');

    // Once Laptop is delivered, composite order transitions to fulfilled
    const completed = commerce.updateFulfilmentStatus({
      tenantId,
      fulfilmentId: mixedResult.fulfilments[0]!.id,
      status: 'delivered',
    });

    expect(completed.order?.status).toBe('fulfilled');
  });

  it('Scenario 8: Recurring subscription (extends entitlement window on renewal, honours paid-through date on cancellation, then expires)', async () => {
    const subOrder = await commerce.createOrderAndHold({
      tenantId,
      idempotencyKey: 'idem-scenario-8-subscription',
      autoConfirmPayment: true,
      customer: {
        fullName: 'Rohan Kulkarni',
        phone: '+91 98450 88801',
        email: 'rohan.sub@example.com',
      },
      paymentMethod: 'card',
      lines: [
        {
          catalogueItemId: 'ci-sub-pro-monthly-tuni06',
          quantity: 1,
        },
      ],
    });

    expect(subOrder.subscriptions).toHaveLength(1);
    const sub = subOrder.subscriptions[0]!;
    expect(sub.status).toBe('active');
    const initialEndMs = new Date(sub.currentPeriodEndIso).getTime();

    // Renew subscription for another 30 days
    const renewed = commerce.renewSubscription({
      tenantId,
      subscriptionId: sub.id,
      renewedAtMs: initialEndMs - 24 * 60 * 60 * 1000,
    });
    const renewedEndMs = new Date(renewed.subscription.currentPeriodEndIso).getTime();
    expect(Math.round((renewedEndMs - initialEndMs) / (24 * 60 * 60 * 1000))).toBe(30);

    // Cancel subscription at period end (not immediately)
    const cancelledAtEnd = commerce.cancelSubscriptionAtPeriodEnd({
      tenantId,
      subscriptionId: sub.id,
    });
    expect(cancelledAtEnd.subscription.status).toBe('cancel_at_period_end');
    expect(cancelledAtEnd.subscription.cancelAtPeriodEnd).toBe(true);

    // Verify customer entitlement is STILL active before renewedEndMs
    const beforePeriodEndMs = renewedEndMs - 2 * 24 * 60 * 60 * 1000;
    const stillActiveCheck = commerce.verifyEntitlementAccess({
      tenantId,
      entitlementId: sub.linkedEntitlementId,
      atTimeMs: beforePeriodEndMs,
      consumeUnit: true,
    });
    expect(stillActiveCheck.allowed).toBe(true);
    expect(stillActiveCheck.entitlement.status).toBe('active');

    // Verify entitlement expires automatically after renewedEndMs
    const afterPeriodEndMs = renewedEndMs + 24 * 60 * 60 * 1000;
    expect(() =>
      commerce.verifyEntitlementAccess({
        tenantId,
        entitlementId: sub.linkedEntitlementId,
        atTimeMs: afterPeriodEndMs,
        consumeUnit: true,
      }),
    ).toThrow(EntitlementExpiredError);
  });

  it('Master Data Projection (v_universal_commerce_master) & Single-Slot Drag-and-Drop Website Editor Validation', () => {
    const masterRows = commerce.getMasterDataProjection(tenantId);
    expect(masterRows.length).toBeGreaterThanOrEqual(8);

    // Check required columns on master projection
    const milkRow = masterRows.find((r) => r.catalogueItemId === 'ci-milk-1l-tuni06');
    expect(milkRow).toBeDefined();
    expect(milkRow?.entity).toContain('OmniMarket');
    expect(milkRow?.sub_entity).toBe('Fresh Dairy Division');
    expect(milkRow?.domain).toBe('omnimarket.in');
    expect(milkRow?.category).toBe('Dairy & Daily Essentials');
    expect(milkRow?.flag_1).toBe('perishable_daily');
    expect(milkRow?.flag_2).toBe('cold_chain_delivery');
    expect(milkRow?.status).toBe('available');

    // Check dormant & ready_to_upgrade statuses in master projection
    const dormantRow = masterRows.find((r) => r.catalogueItemId === 'ci-dormant-drone-tuni06');
    expect(dormantRow?.status).toBe('dormant');

    const upgradeRow = masterRows.find((r) => r.status === 'ready_to_upgrade');
    expect(upgradeRow).toBeDefined();

    // Verify Single-Slot Inventory Widget is registered and works alongside legacy booking widgets in the 12-col grid
    expect(CORE_WIDGET_REGISTRY.get('commerce.inventory-slot')).toBeDefined();
    expect(CORE_WIDGET_REGISTRY.get('content.course-catalog')).toBeDefined();
    expect(CORE_WIDGET_REGISTRY.get('commerce.subscription-plans')).toBeDefined();
    expect(CORE_WIDGET_REGISTRY.get('commerce.master-ledger-slot')).toBeDefined();

    const widgets: PlacedWidgetInstance[] = [
      {
        id: 'w-single-slot-inv',
        widgetType: 'commerce.inventory-slot',
        widgetVersion: 1,
        placement: { desktop: { colStart: 1, colSpan: 6, rowStart: 1, rowSpan: 6 } },
        config: {
          title: 'Live Inventory & Permissions Slot',
          filterItemType: 'all',
          displayStyle: 'compact-cards',
        },
      },
      {
        id: 'w-slot-picker',
        widgetType: 'booking.slot-picker',
        widgetVersion: 1,
        placement: { desktop: { colStart: 7, colSpan: 6, rowStart: 1, rowSpan: 6 } },
        config: {
          title: 'Book Turf Time Slot',
        },
      },
    ];

    const resized = moveOrResizeWidget(
      widgets,
      'w-single-slot-inv',
      { colStart: 1, colSpan: 12, rowStart: 1, rowSpan: 6 },
      'vertical',
    );
    const invSlot = resized.find((w) => w.id === 'w-single-slot-inv')!;
    const slotPicker = resized.find((w) => w.id === 'w-slot-picker')!;
    expect(gridBoxesOverlap(invSlot.placement.desktop, slotPicker.placement.desktop)).toBe(false);

    const mobileStacked = resolveWidgetsForBreakpoint(resized, 'mobile');
    expect(mobileStacked).toHaveLength(2);
    expect(mobileStacked[0]?.box.colSpan).toBe(4);
  });
});
