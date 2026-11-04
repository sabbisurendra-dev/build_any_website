import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default function DashboardServicesPage() {
  const state = RuntimeStateRepository.getState();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Services, Treatments & Group Batches
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configured clinical/salon services (Model B) and capacity-based class sessions (Model C).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {state.services.map((srv) => (
          <Card key={srv.id}>
            <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{srv.name}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{srv.description}</p>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                ₹{(srv.priceMinor / 100).toLocaleString('en-IN')}
              </Badge>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Duration: {srv.durationMinutes}m • Post-appointment buffer: {srv.bufferAfterMinutes}m
            </CardContent>
          </Card>
        ))}

        {state.sessions.map((sess) => (
          <Card key={sess.id}>
            <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{sess.name}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Instructor: {sess.instructorName} ({sess.startTime} – {sess.endTime})
                </p>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">
                {Math.max(0, sess.maxCapacity - sess.bookedCount - sess.heldCount)}/{sess.maxCapacity} left
              </Badge>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Fee: ₹{(sess.priceMinor / 100).toLocaleString('en-IN')} per participant seat
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
