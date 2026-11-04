import Link from 'next/link';
import { Compass, MoveLeft } from 'lucide-react';

export default function RootNotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
        <Compass className="h-7 w-7" />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        404 — Page Not Found
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The page you are looking for does not exist or has been moved. Check the URL or return home.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all"
        >
          <MoveLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    </main>
  );
}
