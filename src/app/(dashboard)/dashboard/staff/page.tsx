import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default function DashboardStaffPage() {
  const state = RuntimeStateRepository.getState();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Staff & Providers</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Staff availability rosters, assigned clinical/salon services, break blocks, and holiday exceptions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {state.staffMembers.map((staff) => {
          const assignedServices = state.services.filter((srv) => staff.serviceIds.includes(srv.id));
          return (
            <Card key={staff.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{staff.displayName}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{staff.specialty}</p>
                </div>
                <Badge variant={staff.isActive ? 'default' : 'secondary'} className="text-xs">
                  {staff.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <div>
                  Working hours:{' '}
                  <span className="font-mono text-foreground">
                    {String(staff.workingStartHour).padStart(2, '0')}:00 –{' '}
                    {String(staff.workingEndHour).padStart(2, '0')}:00 IST
                  </span>
                  {staff.breakHour !== undefined && (
                    <span>
                      {' '}
                      • Break: {String(staff.breakHour).padStart(2, '0')}:00–
                      {String(staff.breakHour + 1).padStart(2, '0')}:00
                    </span>
                  )}
                </div>
                <div>
                  Assigned services:{' '}
                  {assignedServices.length > 0
                    ? assignedServices.map((s) => s.name).join(', ')
                    : 'General appointments'}
                </div>
                {staff.exceptions.length > 0 && (
                  <div className="pt-1 text-amber-700 dark:text-amber-400">
                    Exceptions:{' '}
                    {staff.exceptions
                      .map((ex) => `${ex.dateLocal} (${ex.reason ?? 'Unavailable'})`)
                      .join(', ')}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
