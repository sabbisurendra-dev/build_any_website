import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PlatformTemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Industry Starter Templates</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Pre-configured vertical blueprints for Football Turfs, Racquet Venues, Doctors Clinics, and Salons.
        </p>
      </div>

      <Card className="border-dashed bg-muted/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Route Verified</Badge>
            <CardTitle className="text-base">Template Catalog</CardTitle>
          </div>
          <CardDescription>
            Template preview and cloning actions will be mounted here in Prompt C.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
