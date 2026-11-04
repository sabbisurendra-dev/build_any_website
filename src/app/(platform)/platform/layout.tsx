import type { ReactNode } from 'react';
import { PlatformLayoutShell } from '@/components/layout/platform/platform-layout-shell';

/**
 * Route Group Boundary: Internal SaaS Console (`platform.*`).
 * Restricted to `platform_super_admin` and `internal_configurator` roles.
 * Houses tenant provisioning, template management, and the Metabase-style visual editor.
 */
export default function PlatformConsoleLayout({ children }: { readonly children: ReactNode }) {
  return <PlatformLayoutShell>{children}</PlatformLayoutShell>;
}
