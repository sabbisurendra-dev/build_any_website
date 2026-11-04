'use client';

import * as React from 'react';
import { DashboardSidebar } from './dashboard-sidebar';
import { DashboardHeader } from './dashboard-header';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { SystemRoleKey } from '@/types/domain';

interface DashboardLayoutShellProps {
  children: React.ReactNode;
  userRole?: SystemRoleKey;
}

export function DashboardLayoutShell({
  children,
  userRole = 'business_owner',
}: DashboardLayoutShellProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <DashboardSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        userRole={userRole}
        className="hidden md:flex"
      />

      {/* Mobile Drawer */}
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="p-0 max-w-[280px] h-full sm:rounded-none rounded-none border-r border-border left-0 translate-x-0 top-0 translate-y-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left">
          <DialogTitle className="sr-only">Dashboard Navigation Menu</DialogTitle>
          <DashboardSidebar
            collapsed={false}
            onNavigateMobile={() => setMobileOpen(false)}
            userRole={userRole}
            className="w-full border-none h-full"
          />
        </DialogContent>
      </Dialog>

      {/* Main Content Viewport */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
