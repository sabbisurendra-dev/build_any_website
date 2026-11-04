import { NextResponse, type NextRequest } from 'next/server';

/**
 * Multi-Tenant Hostname Resolution Middleware.
 *
 * Routes incoming HTTP requests into three isolated application surfaces:
 * 1. `platform.{ROOT_DOMAIN}` -> Internal SaaS Admin & Metabase-style Website Configurator (`/platform/*`)
 * 2. `app.{ROOT_DOMAIN}`      -> SMB Business Owner & Staff Dashboard (`/dashboard/*`)
 * 3. `{tenant}.{ROOT_DOMAIN}` or verified custom SMB domain (e.g. `kickoffturf.in`)
 *                             -> Rewritten transparently to `/s/{siteKey}{pathname}`
 *
 * In local development (`localhost:3000`), direct path prefixes (`/platform`, `/dashboard`, `/s/...`)
 * also work out-of-the-box without requiring `/etc/hosts` edits.
 */
export function middleware(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  const rawHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
  const hostname = rawHost.toLowerCase().trim();

  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000').toLowerCase();
  const platformHost = (
    process.env.NEXT_PUBLIC_PLATFORM_HOST ?? `platform.${rootDomain}`
  ).toLowerCase();
  const dashboardHost = (
    process.env.NEXT_PUBLIC_DASHBOARD_HOST ?? `app.${rootDomain}`
  ).toLowerCase();

  // Bypass API routes and Next.js static internals
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Direct root-domain access in local development falls through to explicit route groups
  if (hostname === rootDomain) {
    return NextResponse.next();
  }

  // 1. Platform Super Admin & Internal Configurator surface
  if (hostname === platformHost) {
    if (!url.pathname.startsWith('/platform')) {
      url.pathname = `/platform${url.pathname === '/' ? '' : url.pathname}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // 2. SMB Business Owner & Staff operational dashboard
  if (hostname === dashboardHost) {
    if (!url.pathname.startsWith('/dashboard')) {
      url.pathname = `/dashboard${url.pathname === '/' ? '' : url.pathname}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // 3. Public Customer Website: extract subdomain if under rootDomain, else treat as custom domain
  const siteKey = hostname.endsWith(`.${rootDomain}`)
    ? hostname.slice(0, -(rootDomain.length + 1))
    : hostname.replace(/:\d+$/, '');

  url.pathname = `/s/${encodeURIComponent(siteKey)}${url.pathname === '/' ? '' : url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
