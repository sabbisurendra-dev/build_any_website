import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PlatformBuilderPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Metabase-Inspired Visual Editor</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          12-column drag-and-drop website configurator with real-time responsive preview and atomic publishing.
        </p>
      </div>

      <Card className="border-dashed bg-muted/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Route Verified</Badge>
            <CardTitle className="text-base">Website Builder Canvas</CardTitle>
          </div>
          <CardDescription>
            The interactive grid canvas, widget library palette, and schema-driven property inspector will be mounted here in Prompt C.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
