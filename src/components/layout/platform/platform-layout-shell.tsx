'use client';

import * as React from 'react';
import { PlatformSidebar } from './platform-sidebar';
import { PlatformHeader } from './platform-header';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

export function PlatformLayoutShell({ children }: { readonly children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <PlatformSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        className="hidden md:flex"
      />

      {/* Mobile Drawer */}
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="p-0 max-w-[280px] h-full sm:rounded-none rounded-none border-r border-border left-0 translate-x-0 top-0 translate-y-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left">
          <DialogTitle className="sr-only">Platform Navigation Menu</DialogTitle>
          <PlatformSidebar
            collapsed={false}
            onNavigateMobile={() => setMobileOpen(false)}
            className="w-full border-none h-full"
          />
        </DialogContent>
      </Dialog>

      {/* Main Content Viewport */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <PlatformHeader onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
