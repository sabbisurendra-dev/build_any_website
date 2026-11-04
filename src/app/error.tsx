'use client';

import * as React from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('Unhandled Root Error:', error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
        <AlertOctagon className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        An unexpected error occurred. Please try reloading or contact platform support if the problem persists.
      </p>
      {error.digest && (
        <p className="mt-1 font-mono text-xs text-muted-foreground/80">
          Error Digest: {error.digest}
        </p>
      )}
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all"
        >
          <RotateCcw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    </main>
  );
}
