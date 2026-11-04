import { Loader2 } from 'lucide-react';

export default function RootLoading() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 p-6"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary opacity-80" />
      <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading content...</p>
    </div>
  );
}
