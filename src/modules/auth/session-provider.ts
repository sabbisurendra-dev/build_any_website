import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { ROLE_PERMISSION_MATRIX } from './rbac';
import type { AuthenticatedActor, PermissionKey } from './session.types';
import type { SystemRoleKey, UUID } from '@/types/domain';

/**
 * Port: SessionProvider defines how authenticated sessions are retrieved
 * and converted into canonical AuthenticatedActor instances.
 */
export interface SessionProvider {
  resolveActor(request: NextRequest): Promise<AuthenticatedActor | null> | AuthenticatedActor | null;
}

/**
 * Adapter: SupabaseSessionProvider resolves sessions from verified Supabase
 * cookies or Authorization Bearer JWTs using @supabase/ssr.
 */
export class SupabaseSessionProvider implements SessionProvider {
  async resolveActor(request: NextRequest): Promise<AuthenticatedActor | null> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return null;
    }

    try {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // Read-only session inspection
          },
        },
      });

      const authHeader = request.headers.get('authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

      const {
        data: { user },
        error,
      } = token
        ? await supabase.auth.getUser(token)
        : await supabase.auth.getUser();

      if (error || !user) {
        return null;
      }

      const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
      const platformRole =
        (appMeta.platform_role as 'platform_super_admin' | 'internal_configurator') ?? null;
      const rawMemberships = (appMeta.tenant_memberships ?? []) as Array<{
        tenantId: UUID;
        roleKey: SystemRoleKey;
      }>;

      const tenantMemberships = rawMemberships.map((m) => ({
        tenantId: m.tenantId,
        roleKey: m.roleKey,
        permissions: new Set<PermissionKey>(ROLE_PERMISSION_MATRIX[m.roleKey] ?? []),
      }));

      return {
        userId: user.id,
        email: user.email,
        phone: user.phone,
        platformRole,
        tenantMemberships,
      };
    } catch {
      return null;
    }
  }
}

/**
 * Adapter: TestSessionProvider allows explicit actor injection for automated test harnesses.
 */
export class TestSessionProvider implements SessionProvider {
  private static currentActor: AuthenticatedActor | null = null;

  static setCurrentActor(actor: AuthenticatedActor | null): void {
    TestSessionProvider.currentActor = actor;
  }

  static reset(): void {
    TestSessionProvider.currentActor = null;
  }

  resolveActor(_request: NextRequest): AuthenticatedActor | null {
    return TestSessionProvider.currentActor;
  }
}

let activeProvider: SessionProvider = new SupabaseSessionProvider();

export function getSessionProvider(): SessionProvider {
  return activeProvider;
}

export function setSessionProvider(provider: SessionProvider): void {
  activeProvider = provider;
}
