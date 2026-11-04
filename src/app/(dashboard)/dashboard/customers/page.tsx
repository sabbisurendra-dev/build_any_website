import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

interface CustomerSummary {
  key: string;
  name: string;
  phone: string;
  email?: string;
  bookingCount: number;
  totalSpentMinor: number;
  lastDateLocal: string;
}

export default function DashboardCustomersPage() {
  const state = RuntimeStateRepository.getState();

  const customerMap = new Map<string, CustomerSummary>();
  for (const booking of state.bookings) {
    const key = booking.customerPhone || booking.customerName;
    const existing = customerMap.get(key);
    const isPaidOrConfirmed = booking.status === 'confirmed' || booking.status === 'completed';
    const spend = isPaidOrConfirmed ? booking.totalMinor : 0;

    if (!existing) {
      customerMap.set(key, {
        key,
        name: booking.customerName,
        phone: booking.customerPhone,
        email: booking.customerEmail,
        bookingCount: 1,
        totalSpentMinor: spend,
        lastDateLocal: booking.dateLocal,
      });
    } else {
      existing.bookingCount += 1;
      existing.totalSpentMinor += spend;
      if (booking.dateLocal > existing.lastDateLocal) {
        existing.lastDateLocal = booking.dateLocal;
      }
    }
  }

  const customers = Array.from(customerMap.values()).sort(
    (a, b) => b.totalSpentMinor - a.totalSpentMinor,
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Customer Directory</h2>
        <p className="text-sm text-muted-foreground mt-1">
          End-customer profiles, verified contact details, booking frequency, and lifetime value across slots.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((customer) => (
          <Card key={customer.key}>
            <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{customer.name}</CardTitle>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">{customer.phone}</p>
              </div>
              <Badge variant="outline" className="text-xs">
                {customer.bookingCount} {customer.bookingCount === 1 ? 'booking' : 'bookings'}
              </Badge>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <div>
                Lifetime Spend:{' '}
                <span className="font-mono font-semibold text-foreground">
                  ₹{(customer.totalSpentMinor / 100).toLocaleString('en-IN')}
                </span>
              </div>
              <div>Last Slot Date: {customer.lastDateLocal}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
