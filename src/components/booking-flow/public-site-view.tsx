'use client';

import * as React from 'react';
import {
  Calendar,
  MapPin,
  Trophy,
  Scissors,
  Users,
  ChevronRight,
  HelpCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  Package,
  GraduationCap,
  Repeat,
  TableProperties,
  ShoppingCart,
  ShieldCheck,
  Truck,
  Plus,
  Minus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import type {
  PageSection,
  PlacedWidgetInstance,
  ViewportBreakpoint,
  WebsiteThemeConfig,
} from '@/modules/website-builder/layout.types';
import { resolveWidgetsForBreakpoint } from '@/modules/website-builder/grid-engine';
import type { BookingModel, BusinessVertical } from '@/types/domain';
import dynamic from 'next/dynamic';
import type {
  RuntimeEntitlementRecord,
  RuntimeFulfilmentRecord,
  RuntimeOrderRecord,
} from '@/modules/commerce/commerce.types';
import type { PublicCatalogPayload } from './customer-booking-journey';

const CustomerBookingJourney = dynamic(
  () => import('./customer-booking-journey').then((mod) => mod.CustomerBookingJourney),
  { ssr: false },
);

interface PublicSiteViewProps {
  tenantId: string;
  siteKey: string;
  businessName: string;
  vertical: BusinessVertical;
  tagline: string;
  locationLabel: string;
  publishedVersion: number;
  sections: PageSection[];
  theme: WebsiteThemeConfig;
  initialCatalog: PublicCatalogPayload;
}

interface CartLineItem {
  catalogueItemId: string;
  name: string;
  itemType: string;
  fulfilmentType: string;
  unitLabel: string;
  priceMinor: number;
  quantity: number;
}

export function PublicSiteView({
  tenantId,
  siteKey,
  businessName,
  vertical,
  locationLabel,
  publishedVersion,
  sections,
  theme,
  initialCatalog,
}: PublicSiteViewProps) {
  const { toast } = useToast();
  const [bookingModalOpen, setBookingModalOpen] = React.useState(false);
  const [cartModalOpen, setCartModalOpen] = React.useState(false);
  const [catalog, setCatalog] = React.useState<PublicCatalogPayload>(initialCatalog);
  const [preselectedId, setPreselectedId] = React.useState<string | undefined>(undefined);
  const [viewportBp, setViewportBp] = React.useState<ViewportBreakpoint>('desktop');

  // Mixed Cart State (Supports Physical Milk/Laptop + 90-Day Course + Turf Slot + Subscription)
  const [cart, setCart] = React.useState<CartLineItem[]>([]);
  const [customerName, setCustomerName] = React.useState('Aarav Sharma');
  const [customerPhone, setCustomerPhone] = React.useState('+91 98450 11223');
  const [shippingAddress, setShippingAddress] = React.useState(
    'Flat 402, 12th Main, Indiranagar, Bengaluru',
  );
  const [fulfilmentPref] = React.useState<
    'local_delivery' | 'courier_shipment' | 'store_pickup'
  >('local_delivery');
  const [isCheckingOut, setIsCheckingOut] = React.useState(false);
  const [lastOrderResult, setLastOrderResult] = React.useState<{
    order: RuntimeOrderRecord;
    fulfilments: RuntimeFulfilmentRecord[];
    entitlements: RuntimeEntitlementRecord[];
  } | null>(null);

  // Detect live viewport breakpoint so 12-col / 8-col / 4-col grid adapts cleanly
  React.useEffect(() => {
    const syncBp = () => {
      const w = window.innerWidth;
      if (w < 640) setViewportBp('mobile');
      else if (w < 1024) setViewportBp('tablet');
      else setViewportBp('desktop');
    };
    syncBp();
    window.addEventListener('resize', syncBp);
    return () => window.removeEventListener('resize', syncBp);
  }, []);

  const refreshCatalog = React.useCallback(async () => {
    try {
      const res = await fetch(
        `/api/public/v1/catalog?tenantId=${encodeURIComponent(tenantId)}`,
        { cache: 'no-store' },
      );
      if (res.ok) {
        const data = await res.json();
        setCatalog({
          resources: data.resources ?? [],
          services: data.services ?? [],
          staffMembers: data.staffMembers ?? [],
          sessions: data.sessions ?? [],
          catalogueItems: data.catalogueItems ?? [],
          masterProjection: data.masterProjection ?? [],
        });
      }
    } catch {
      // Keep current catalog snapshot on transient error
    }
  }, [tenantId]);

  const inferredBookingModel: BookingModel =
    vertical === 'clinic_healthcare' || vertical === 'salon_beauty'
      ? 'staff_appointment'
      : vertical === 'fitness_yoga'
      ? 'capacity_session'
      : 'exclusive_resource';

  const openBookingFor = (itemId?: string) => {
    setPreselectedId(itemId);
    setBookingModalOpen(true);
  };

  const addToCart = React.useCallback(
    (item: {
      id: string;
      name: string;
      itemType: string;
      fulfilmentType: string;
      unitLabel: string;
      priceMinor: number;
      qty?: number;
    }) => {
      const addQty = item.qty ?? 1;
      setCart((prev) => {
        const existing = prev.find((c) => c.catalogueItemId === item.id);
        if (existing) {
          return prev.map((c) =>
            c.catalogueItemId === item.id ? { ...c, quantity: c.quantity + addQty } : c,
          );
        }
        return [
          ...prev,
          {
            catalogueItemId: item.id,
            name: item.name,
            itemType: item.itemType,
            fulfilmentType: item.fulfilmentType,
            unitLabel: item.unitLabel,
            priceMinor: item.priceMinor,
            quantity: addQty,
          },
        ];
      });
      toast({
        title: `Added to Universal Cart`,
        description: `${addQty}x ${item.name} added. You can mix products, courses, slots & subscriptions in one order!`,
        variant: 'default',
      });
    },
    [toast],
  );

  const handleUniversalCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    try {
      const res = await fetch('/api/public/v1/orders', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': `ui-ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        },
        body: JSON.stringify({
          tenantId,
          customer: {
            fullName: customerName,
            phone: customerPhone,
            shippingAddress,
          },
          fulfilmentPreference: fulfilmentPref,
          paymentMethod: 'upi',
          autoConfirmPayment: true,
          lines: cart.map((c) => ({
            catalogueItemId: c.catalogueItemId,
            quantity: c.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: 'Order Conflict / Stock Guard',
          description: data?.error?.message ?? 'Unable to complete order.',
          variant: 'destructive',
        });
        setIsCheckingOut(false);
        return;
      }

      setLastOrderResult({
        order: data.order,
        fulfilments: data.fulfilments ?? [],
        entitlements: data.entitlements ?? [],
      });
      setCart([]);
      await refreshCatalog();
      toast({
        title: `Order ${data.order.orderNumber} Confirmed!`,
        description: `Status: ${data.order.status} • ${
          (data.fulfilments?.length ?? 0)
        } Fulfilment(s) & ${(data.entitlements?.length ?? 0)} Entitlement Right(s) Granted.`,
        variant: 'success',
      });
    } catch {
      toast({
        title: 'Network Error',
        description: 'Could not reach the universal checkout endpoint.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const cartTotalMinor = cart.reduce((sum, l) => sum + l.priceMinor * l.quantity, 0);

  return (
    <div
      data-testid="public-site-root"
      data-published-version={publishedVersion}
      data-brand-accent={theme.brandAccentHex}
      style={
        {
          '--tenant-accent': theme.brandAccentHex,
          '--tenant-primary': theme.brandPrimaryHex,
        } as React.CSSProperties
      }
      className="flex flex-col items-center w-full overflow-x-clip"
    >
      {/* Floating Universal Cart & Entitlements Bar */}
      <div className="w-full bg-card/95 border-b border-border sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono text-[10px]">
              Universal Commerce Engine
            </Badge>
            <span className="text-muted-foreground hidden sm:inline">
              Sell physical items (Milk, Laptop), book time slots (Turf, Doctor, Yoga), & grant 90-day course rights in one cart.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              data-testid="open-universal-cart-btn"
              onClick={() => setCartModalOpen(true)}
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              <ShoppingCart className="h-3.5 w-3.5" style={{ color: theme.brandAccentHex }} />
              <span>
                Mixed Cart ({cart.reduce((acc, i) => acc + i.quantity, 0)}) • ₹
                {(cartTotalMinor / 100).toLocaleString('en-IN')}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Render Published 12-Column / 8-Column / 4-Column Grid Sections */}
      <div id="book" className="w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {sections.map((section) => {
          const resolved = resolveWidgetsForBreakpoint(section.widgets, viewportBp);
          const gridCols =
            viewportBp === 'desktop' ? 12 : viewportBp === 'tablet' ? 8 : 1;

          return (
            <section
              key={section.id}
              data-testid={`public-section-${section.id}`}
              className={`w-full rounded-2xl ${
                section.style.backgroundVariant === 'muted'
                  ? 'bg-muted/30 p-4 sm:p-6 border border-border/60'
                  : ''
              }`}
            >
              <div
                className="grid gap-5"
                style={
                  viewportBp === 'mobile'
                    ? { gridTemplateColumns: 'minmax(0, 1fr)' }
                    : {
                        gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                      }
                }
              >
                {resolved.map(({ widget, box }) => (
                  <div
                    key={widget.id}
                    data-testid={`public-widget-${widget.id}`}
                    data-widget-type={widget.widgetType}
                    style={
                      viewportBp === 'mobile'
                        ? { containerType: 'inline-size' }
                        : {
                            gridColumnStart: box.colStart,
                            gridColumnEnd: `span ${box.colSpan}`,
                            containerType: 'inline-size',
                          }
                    }
                    className="min-w-0"
                  >
                    <PublishedWidgetRenderer
                      widget={widget}
                      colSpan={box.colSpan}
                      theme={theme}
                      catalog={catalog}
                      bookingModel={inferredBookingModel}
                      locationLabel={locationLabel}
                      onOpenBooking={openBookingFor}
                      onAddToCart={addToCart}
                      onOpenCart={() => setCartModalOpen(true)}
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Interactive Real-API Multi-Model Booking Modal */}
      <CustomerBookingJourney
        isOpen={bookingModalOpen}
        onOpenChange={(open) => {
          setBookingModalOpen(open);
          if (!open) {
            void refreshCatalog();
          }
        }}
        tenantId={tenantId}
        siteKey={siteKey}
        businessName={businessName}
        bookingModel={inferredBookingModel}
        brandAccentHex={theme.brandAccentHex}
        catalog={catalog}
        preselectedItemId={preselectedId}
        onBookingCompleted={() => {
          void refreshCatalog();
        }}
      />

      {/* Unified Mixed-Cart & Granted Entitlements Modal */}
      <Dialog open={cartModalOpen} onOpenChange={setCartModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="flex items-center justify-between text-base font-bold">
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" style={{ color: theme.brandAccentHex }} />
              <span>Universal Mixed-Cart Checkout & Granted Rights</span>
            </span>
            <Badge variant="outline" className="text-[10px] font-mono">
              Atomic Multi-Line Order Engine
            </Badge>
          </DialogTitle>

          <div className="space-y-5 text-xs pt-2">
            {/* Cart Lines */}
            {cart.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
                Your universal cart is empty. Add physical items (2L Milk, Laptop), 90-day courses, turf slots, or subscriptions from any slot on the page!
              </div>
            ) : (
              <div className="space-y-2.5">
                {cart.map((item) => (
                  <div
                    key={item.catalogueItemId}
                    className="rounded-xl border border-border p-3 bg-muted/20 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-semibold text-foreground truncate">{item.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {item.itemType} • {item.fulfilmentType} • ₹
                        {(item.priceMinor / 100).toLocaleString('en-IN')} / {item.unitLabel}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6"
                        onClick={() =>
                          setCart((prev) =>
                            prev
                              .map((c) =>
                                c.catalogueItemId === item.catalogueItemId
                                  ? { ...c, quantity: c.quantity - 1 }
                                  : c,
                              )
                              .filter((c) => c.quantity > 0),
                          )
                        }
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-7 text-center font-mono font-bold">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6"
                        onClick={() =>
                          setCart((prev) =>
                            prev.map((c) =>
                              c.catalogueItemId === item.catalogueItemId
                                ? { ...c, quantity: c.quantity + 1 }
                                : c,
                            ),
                          )
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive"
                        onClick={() =>
                          setCart((prev) =>
                            prev.filter((c) => c.catalogueItemId !== item.catalogueItemId),
                          )
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Customer & Delivery Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Customer Full Name</Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Customer Phone (WhatsApp)</Label>
                    <Input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px]">
                      Delivery Address (Used for Physical Items like Milk & Laptops)
                    </Label>
                    <Input
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div>
                    <span className="text-muted-foreground block">Order Total</span>
                    <span className="text-lg font-black font-mono text-foreground">
                      ₹{(cartTotalMinor / 100).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <Button
                    size="lg"
                    disabled={isCheckingOut}
                    data-testid="confirm-universal-order-btn"
                    onClick={handleUniversalCheckout}
                    style={{ backgroundColor: theme.brandAccentHex, color: '#ffffff' }}
                    className="font-semibold gap-2"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>
                      {isCheckingOut
                        ? 'Reserving Stock & Granting Rights...'
                        : 'Pay via UPI & Grant Rights'}
                    </span>
                  </Button>
                </div>
              </div>
            )}

            {/* Latest Order Receipt, Fulfilments & Granted Entitlements */}
            {lastOrderResult && (
              <div
                data-testid="universal-order-receipt"
                className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/5 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Order {lastOrderResult.order.orderNumber} Confirmed</span>
                  </div>
                  <Badge variant="success" className="text-[10px] font-mono">
                    {lastOrderResult.order.status}
                  </Badge>
                </div>

                {lastOrderResult.fulfilments.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="font-semibold text-[11px] flex items-center gap-1 text-foreground">
                      <Truck className="h-3.5 w-3.5 text-primary" />
                      <span>Physical Fulfilment Pipeline ({lastOrderResult.fulfilments.length})</span>
                    </div>
                    {lastOrderResult.fulfilments.map((f) => (
                      <div
                        key={f.id}
                        className="rounded-lg border border-border bg-card p-2.5 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold">{f.quantity}x {f.itemName}</span>
                          <span className="block text-[10px] text-muted-foreground font-mono">
                            Tracking: {f.trackingNumber} • Method: {f.method}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {f.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {lastOrderResult.entitlements.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="font-semibold text-[11px] flex items-center gap-1 text-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span>
                        Granted Customer Rights / Entitlements ({lastOrderResult.entitlements.length})
                      </span>
                    </div>
                    {lastOrderResult.entitlements.map((e) => (
                      <div
                        key={e.id}
                        className="rounded-lg border border-border bg-card p-2.5 flex items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-semibold">{e.itemName}</span>
                          <span className="block text-[10px] text-muted-foreground font-mono">
                            permission_timeslot: {e.permissionTimeslotStartIso.slice(0, 10)} →{' '}
                            {e.permissionTimeslotEndIso
                              ? e.permissionTimeslotEndIso.slice(0, 10)
                              : 'Lifetime'}
                          </span>
                        </div>
                        <Badge variant="success" className="text-[10px] font-mono">
                          {e.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PublishedWidgetRenderer({
  widget,
  colSpan = 6,
  theme,
  catalog,
  bookingModel,
  locationLabel,
  onOpenBooking,
  onAddToCart,
  onOpenCart,
}: {
  widget: PlacedWidgetInstance;
  colSpan?: number;
  theme: WebsiteThemeConfig;
  catalog: PublicCatalogPayload;
  bookingModel: BookingModel;
  locationLabel: string;
  onOpenBooking: (itemId?: string) => void;
  onAddToCart: (item: {
    id: string;
    name: string;
    itemType: string;
    fulfilmentType: string;
    unitLabel: string;
    priceMinor: number;
    qty?: number;
  }) => void;
  onOpenCart: () => void;
}) {
  const cfg = widget.config as Record<string, unknown>;
  const str = (k: string, fb = '') => (typeof cfg[k] === 'string' ? (cfg[k] as string) : fb);
  const catalogueItems = catalog.catalogueItems ?? [];
  const masterRows = catalog.masterProjection ?? [];

  switch (widget.widgetType) {
    case 'commerce.inventory-slot': {
      const filterType = str('filterItemType', 'all');
      const displayStyle = str('displayStyle', 'cards_grid');
      const filtered = catalogueItems.filter(
        (it) =>
          (it.status === 'active' || it.status === 'ready_to_upgrade') &&
          (filterType === 'all' || it.itemType === filterType),
      );

      const gridColsClass =
        displayStyle === 'compact_list' || colSpan <= 4
          ? 'grid-cols-1'
          : colSpan >= 9
          ? 'grid-cols-1 md:grid-cols-3'
          : 'grid-cols-1 sm:grid-cols-2';

      return (
        <Card className="p-5 sm:p-6 space-y-4 h-full">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Package className="h-5 w-5" style={{ color: theme.brandAccentHex }} />
              <span>{str('heading', 'Available Inventory, Slots, Courses & Passes')}</span>
            </h2>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] font-mono">
                {filtered.length} Available Offerings
              </Badge>
              <Button size="sm" variant="outline" onClick={onOpenCart} className="h-7 text-xs gap-1">
                <ShoppingCart className="h-3 w-3" />
                <span>View Mixed Cart</span>
              </Button>
            </div>
          </div>

          <div className={`grid gap-3.5 ${gridColsClass}`}>
            {filtered.map((item) => {
              const isSoldOut = item.derivedStatus === 'sold';
              return (
                <div
                  key={item.id}
                  data-testid={`universal-item-card-${item.id}`}
                  className="rounded-xl border border-border p-4 bg-muted/15 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {item.categoryName}
                      </Badge>
                      <Badge
                        variant={
                          isSoldOut
                            ? 'destructive'
                            : item.derivedStatus === 'ready_to_upgrade'
                            ? 'warning'
                            : 'success'
                        }
                        className="text-[10px] font-mono"
                      >
                        {item.stockAvailable !== null
                          ? isSoldOut
                            ? 'SOLD OUT (0 left)'
                            : `${item.stockAvailable} ${item.unitLabel}(s) available`
                          : item.accessDurationDays
                          ? `${item.accessDurationDays}-Day Access Right`
                          : item.derivedStatus}
                      </Badge>
                    </div>
                    <h3 className="font-bold text-sm text-foreground">{item.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {item.shortDescription}
                    </p>
                    {(item.flag1 || item.flag2) && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {item.flag1 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            flag_1: {item.flag1}
                          </span>
                        )}
                        {item.flag2 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            flag_2: {item.flag2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                    <div>
                      <span className="font-mono font-bold text-sm text-foreground">
                        ₹{(item.priceMinor / 100).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-1">
                        / {item.unitLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {(item.itemType === 'bookable_resource' ||
                        item.itemType === 'service_appointment' ||
                        item.itemType === 'capacity_session') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            onOpenBooking(item.resourceId ?? item.serviceId ?? item.sessionId)
                          }
                          className="h-7 px-2.5 text-xs"
                        >
                          Pick Slot
                        </Button>
                      )}
                      <Button
                        size="sm"
                        disabled={isSoldOut}
                        data-testid={`add-to-cart-${item.id}`}
                        onClick={() =>
                          onAddToCart({
                            id: item.id,
                            name: item.name,
                            itemType: item.itemType,
                            fulfilmentType: item.fulfilmentType,
                            unitLabel: item.unitLabel,
                            priceMinor: item.priceMinor,
                            qty: item.sku.startsWith('MILK-') ? 2 : 1, // Quick 2L Milk or 1x item
                          })
                        }
                        style={
                          isSoldOut
                            ? undefined
                            : { backgroundColor: theme.brandAccentHex, color: '#ffffff' }
                        }
                        className="h-7 px-3 text-xs font-semibold gap-1"
                      >
                        <ShoppingCart className="h-3 w-3" />
                        <span>
                          {item.sku.startsWith('MILK-') ? 'Add 2L' : 'Add to Cart'}
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      );
    }

    case 'content.course-catalog': {
      const courses = catalogueItems.filter((it) => it.itemType === 'digital_content');
      return (
        <Card className="p-5 sm:p-6 space-y-4 h-full">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="h-5 w-5" style={{ color: theme.brandAccentHex }} />
              <span>{str('heading', 'Courses & Time-Limited Content (90-Day Access)')}</span>
            </h2>
            <Badge variant="outline" className="text-[10px] font-mono">
              Auto-Expiry Guard
            </Badge>
          </div>
          <div className="space-y-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="rounded-xl border border-border p-4 bg-muted/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{course.name}</span>
                    <Badge variant="success" className="text-[10px] font-mono">
                      {course.accessDurationDays ?? 90}-Day Viewing Right
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{course.description}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    onAddToCart({
                      id: course.id,
                      name: course.name,
                      itemType: course.itemType,
                      fulfilmentType: course.fulfilmentType,
                      unitLabel: course.unitLabel,
                      priceMinor: course.priceMinor,
                    })
                  }
                  style={{ backgroundColor: theme.brandAccentHex, color: '#ffffff' }}
                  className="shrink-0 text-xs font-semibold"
                >
                  Unlock 90-Day Access • ₹{(course.priceMinor / 100).toLocaleString('en-IN')}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      );
    }

    case 'commerce.subscription-plans': {
      const subs = catalogueItems.filter((it) => it.itemType === 'subscription_plan');
      return (
        <Card className="p-5 sm:p-6 space-y-4 h-full">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Repeat className="h-5 w-5" style={{ color: theme.brandAccentHex }} />
              <span>{str('heading', 'Recurring Memberships & Entitlement Plans')}</span>
            </h2>
            <Badge variant="warning" className="text-[10px] font-mono">
              Paid-Through Expiry
            </Badge>
          </div>
          <div className="space-y-3">
            {subs.map((sub) => (
              <div
                key={sub.id}
                className="rounded-xl border border-border p-4 bg-muted/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="font-bold text-sm text-foreground">{sub.name}</div>
                  <p className="text-xs text-muted-foreground">{sub.shortDescription}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    onAddToCart({
                      id: sub.id,
                      name: sub.name,
                      itemType: sub.itemType,
                      fulfilmentType: sub.fulfilmentType,
                      unitLabel: sub.unitLabel,
                      priceMinor: sub.priceMinor,
                    })
                  }
                  style={{ backgroundColor: theme.brandAccentHex, color: '#ffffff' }}
                  className="shrink-0 text-xs font-semibold"
                >
                  Subscribe • ₹{(sub.priceMinor / 100).toLocaleString('en-IN')}/{sub.unitLabel}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      );
    }

    case 'commerce.master-ledger-slot':
      return (
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <TableProperties className="h-5 w-5" style={{ color: theme.brandAccentHex }} />
                <span>{str('heading', 'Universal Master Inventory & Permission Timeslot Matrix')}</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Live projection of Entity, Sub-Entity, Domain, Category, Flag_1, Flag_2, Item Name, Permission Timeslot Start/End, and Lifecycle Status.
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              {masterRows.length} Master Rows
            </Badge>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border font-mono text-[11px]">
                <tr>
                  <th className="p-2.5">Entity / Sub_entity</th>
                  <th className="p-2.5">Domain</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Flag_1 / Flag_2</th>
                  <th className="p-2.5">Item_name</th>
                  <th className="p-2.5">Permission Timeslot (Start → End)</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {masterRows.map((r) => (
                  <tr key={r.rowId} className="hover:bg-muted/20">
                    <td className="p-2.5">
                      <div className="font-semibold text-foreground">{r.entity}</div>
                      <div className="text-[11px] text-muted-foreground">{r.sub_entity}</div>
                    </td>
                    <td className="p-2.5 font-mono text-[11px] text-muted-foreground">{r.domain}</td>
                    <td className="p-2.5">{r.category}</td>
                    <td className="p-2.5 font-mono text-[10px]">
                      <div>{r.flag_1 ?? '—'}</div>
                      <div className="text-muted-foreground">{r.flag_2 ?? ''}</div>
                    </td>
                    <td className="p-2.5 font-medium text-foreground">{r.item_name}</td>
                    <td className="p-2.5 font-mono text-[11px]">
                      {r.permission_timeslot_start
                        ? `${r.permission_timeslot_start.slice(0, 16)} → ${
                            r.permission_timeslot_end?.slice(0, 16) ?? '∞'
                          }`
                        : r.stock_available !== null
                        ? `Stock: ${r.stock_available} ${r.unit_label}(s)`
                        : 'Instant'}
                    </td>
                    <td className="p-2.5">
                      <Badge
                        variant={
                          r.status === 'available' || r.status === 'active'
                            ? 'success'
                            : r.status === 'ready_to_upgrade'
                            ? 'warning'
                            : r.status === 'sold' || r.status === 'expired'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-[10px] font-mono"
                      >
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      );

    case 'hero.banner':
      return (
        <div className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/30 p-6 sm:p-10 shadow-xs space-y-5">
          {str('eyebrow') && (
            <div
              style={{
                borderColor: `${theme.brandAccentHex}40`,
                color: theme.brandAccentHex,
                backgroundColor: `${theme.brandAccentHex}12`,
              }}
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold border"
            >
              <span
                style={{ backgroundColor: theme.brandAccentHex }}
                className="h-2 w-2 rounded-full"
              />
              <span>{str('eyebrow')}</span>
            </div>
          )}

          <h1
            data-testid="public-hero-headline"
            className="text-3xl sm:text-5xl font-black tracking-tight text-foreground leading-tight"
          >
            {str('headline', 'Book Your Slot Online')}
          </h1>

          {str('subheadline') && (
            <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
              {str('subheadline')}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              size="lg"
              data-testid="public-book-now-btn"
              onClick={() => onOpenBooking()}
              style={{ backgroundColor: theme.brandAccentHex, color: '#ffffff' }}
              className="gap-2 font-semibold shadow-sm"
            >
              <Calendar className="h-4 w-4" />
              <span>{str('primaryCtaLabel', 'Book Now')}</span>
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onOpenCart}
              className="gap-2 font-semibold"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Open Universal Cart</span>
            </Button>
          </div>
        </div>
      );

    case 'catalog.resource-grid':
      return (
        <Card className="p-5 sm:p-6 space-y-4 h-full flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Trophy className="h-5 w-5" style={{ color: theme.brandAccentHex }} />
                <span>{str('heading', 'Available Courts & Arenas')}</span>
              </h2>
              <Badge variant="outline" className="text-[10px] font-mono">
                {catalog.resources.length} Active
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {catalog.resources.map((court) => (
                <div
                  key={court.id}
                  data-testid={`public-resource-card-${court.id}`}
                  className="rounded-xl border border-border p-4 bg-muted/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-foreground">{court.name}</div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {court.description}
                    </p>
                    <div className="text-xs font-mono text-muted-foreground pt-0.5">
                      Day: ₹{(court.basePriceMinor / 100).toLocaleString('en-IN')}/hr • Peak: ₹
                      {(court.peakPriceMinor / 100).toLocaleString('en-IN')}/hr
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onOpenBooking(court.id)}
                    style={{ backgroundColor: theme.brandAccentHex, color: '#ffffff' }}
                    className="shrink-0 gap-1 text-xs font-semibold"
                  >
                    <span>Book</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      );

    case 'catalog.service-list':
      return (
        <Card className="p-5 sm:p-6 space-y-4 h-full">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Scissors className="h-5 w-5" style={{ color: theme.brandAccentHex }} />
              <span>{str('heading', 'Treatments & Services')}</span>
            </h2>
            <Badge variant="outline" className="text-[10px] font-mono">
              {catalog.services.length} Services
            </Badge>
          </div>

          <div className="space-y-3">
            {catalog.services.map((srv) => (
              <div
                key={srv.id}
                data-testid={`public-service-card-${srv.id}`}
                className="rounded-xl border border-border p-3.5 bg-muted/15 flex items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-sm text-foreground">{srv.name}</div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {srv.description}
                  </p>
                  <span className="inline-block text-[11px] font-mono text-muted-foreground">
                    {srv.durationMinutes} mins
                  </span>
                </div>
                <div className="text-right shrink-0 space-y-1.5">
                  <div className="font-mono font-bold text-sm text-foreground">
                    ₹{(srv.priceMinor / 100).toLocaleString('en-IN')}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onOpenBooking(srv.id)}
                    style={{ backgroundColor: theme.brandAccentHex, color: '#ffffff' }}
                    className="h-7 px-3 text-xs font-semibold"
                  >
                    Select
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      );

    case 'booking.slot-picker':
      return (
        <Card className="p-5 sm:p-6 space-y-4 h-full flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5" style={{ color: theme.brandAccentHex }} />
                <span>{str('heading', 'Instant Online Reservation')}</span>
              </h2>
              <Badge variant="outline" className="text-[10px] font-mono">
                8-Min Hold Lock
              </Badge>
            </div>

            {bookingModel === 'capacity_session' && catalog.sessions.length > 0 ? (
              <div className="space-y-2.5">
                {catalog.sessions.map((sess) => {
                  const isFull = sess.remainingCapacity <= 0;
                  return (
                    <div
                      key={sess.id}
                      data-testid={`public-session-card-${sess.id}`}
                      className="rounded-xl border border-border p-3.5 bg-muted/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">
                            {sess.name}
                          </span>
                          <Badge
                            data-testid={`session-capacity-badge-${sess.id}`}
                            variant={isFull ? 'destructive' : 'outline'}
                            className="text-[10px] font-mono"
                          >
                            {isFull
                              ? 'SOLD OUT (0 left)'
                              : `${sess.remainingCapacity} / ${sess.maxCapacity} seats left`}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {sess.startTime} – {sess.endTime} • Coach {sess.instructorName}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        disabled={isFull}
                        data-testid={`book-session-btn-${sess.id}`}
                        onClick={() => onOpenBooking(sess.id)}
                        style={
                          isFull
                            ? undefined
                            : { backgroundColor: theme.brandAccentHex, color: '#ffffff' }
                        }
                        className="shrink-0 text-xs font-semibold"
                      >
                        {isFull ? 'Class Full' : `Book ₹${(sess.priceMinor / 100).toLocaleString('en-IN')}`}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : bookingModel === 'staff_appointment' && catalog.staffMembers.length > 0 ? (
              <div className="space-y-2.5">
                <p className="text-xs text-muted-foreground">
                  Available Specialists & Practitioners:
                </p>
                {catalog.staffMembers.map((st) => (
                  <div
                    key={st.id}
                    className="rounded-xl border border-border p-3 bg-muted/15 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-foreground">{st.displayName}</div>
                      <div className="text-muted-foreground">{st.specialty}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {st.workingStartHour}:00–{st.workingEndHour}:00
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Live slot availability synced with venue calendar</span>
                </div>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <Users className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Protected against simultaneous double-booking</span>
                </div>
              </div>
            )}
          </div>

          <Button
            size="lg"
            data-testid="slot-picker-open-btn"
            onClick={() => onOpenBooking()}
            style={{ backgroundColor: theme.brandAccentHex, color: '#ffffff' }}
            className="w-full font-semibold gap-2 mt-4"
          >
            <Calendar className="h-4 w-4" />
            <span>Check Live Slots & Reserve</span>
          </Button>
        </Card>
      );

    case 'content.faq': {
      const items = Array.isArray(cfg.items)
        ? (cfg.items as Array<{ question?: string; answer?: string }>)
        : [];
      return (
        <Card className="p-5 sm:p-6 space-y-4 h-full">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <HelpCircle className="h-5 w-5" style={{ color: theme.brandAccentHex }} />
            <span>{str('heading', 'Frequently Asked Questions')}</span>
          </h2>
          <div className="space-y-3">
            {(items.length > 0
              ? items
              : [
                  {
                    question: 'How does online slot locking work?',
                    answer:
                      'Selecting a slot locks it exclusively for 8 minutes while you complete UPI or card payment.',
                  },
                ]
            ).map((it, idx) => (
              <div key={idx} className="rounded-xl border border-border p-3.5 bg-muted/15">
                <h3 className="text-sm font-semibold text-foreground">{it.question}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{it.answer}</p>
              </div>
            ))}
          </div>
        </Card>
      );
    }

    case 'location.map-hours':
      return (
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" style={{ color: theme.brandAccentHex }} />
              <span>{str('heading', locationLabel)}</span>
            </h3>
            <p className="text-xs text-muted-foreground">{locationLabel}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenBooking()}
            className="gap-1.5 text-xs shrink-0"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>View Today&apos;s Open Slots</span>
          </Button>
        </div>
      );

    default:
      return (
        <Card className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4" style={{ color: theme.brandAccentHex }} />
            <span>{str('heading') || widget.widgetType}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => onOpenBooking()}>
            Book Now
          </Button>
        </Card>
      );
  }
}
