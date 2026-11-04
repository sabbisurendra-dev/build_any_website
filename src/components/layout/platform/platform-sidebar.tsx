'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  PanelsTopLeft,
  LayoutTemplate,
  BarChart3,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  User,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface PlatformNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const PLATFORM_NAV_ITEMS: PlatformNavItem[] = [
  {
    title: 'Overview',
    href: '/platform',
    icon: LayoutDashboard,
  },
  {
    title: 'Businesses & Tenants',
    href: '/platform/tenants',
    icon: Building2,
  },
  {
    title: 'Website Builder',
    href: '/platform/builder',
    icon: PanelsTopLeft,
    badge: 'Core',
  },
  {
    title: 'Industry Templates',
    href: '/platform/templates',
    icon: LayoutTemplate,
  },
  {
    title: 'Platform Analytics',
    href: '/platform/analytics',
    icon: BarChart3,
  },
  {
    title: 'Global Settings',
    href: '/platform/settings',
    icon: Sliders,
  },
];

interface PlatformSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
  onNavigateMobile?: () => void;
}

export function PlatformSidebar({
  collapsed = false,
  onToggleCollapse,
  className,
  onNavigateMobile,
}: PlatformSidebarProps) {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        className={cn(
          'flex h-full flex-col border-r border-border bg-card text-card-foreground transition-all duration-300 ease-in-out',
          collapsed ? 'w-16' : 'w-64',
          className,
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link
            href="/platform"
            className="flex items-center gap-2.5 overflow-hidden font-bold tracking-tight text-foreground"
            onClick={onNavigateMobile}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden leading-tight">
                <span className="truncate text-sm font-semibold">Antigravity</span>
                <span className="text-[10px] font-medium tracking-wide uppercase text-muted-foreground">
                  Platform Console
                </span>
              </div>
            )}
          </Link>

          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden h-7 w-7 md:flex text-muted-foreground hover:text-foreground"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
          {PLATFORM_NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/platform'
                ? pathname === '/platform'
                : pathname.startsWith(item.href);

            const Icon = item.icon;

            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigateMobile}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  collapsed && 'justify-center px-2',
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-primary-foreground' : 'text-muted-foreground')} />
                {!collapsed && (
                  <span className="flex-1 truncate">{item.title}</span>
                )}
                {!collapsed && item.badge && (
                  <span
                    className={cn(
                      'ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                      isActive
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-primary/10 text-primary',
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>

        {/* User Account / Context Menu */}
        <div className="border-t border-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors',
                  collapsed && 'justify-center p-1',
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs border border-primary/20">
                  SA
                </div>
                {!collapsed && (
                  <div className="flex flex-1 flex-col overflow-hidden leading-snug">
                    <span className="truncate text-xs font-semibold text-foreground">Super Admin</span>
                    <span className="truncate text-[10px] text-muted-foreground">Internal Team</span>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56 mb-2">
              <DropdownMenuLabel className="flex items-center gap-2 font-normal">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <div className="flex flex-col space-y-0.5">
                  <p className="text-xs font-semibold">platform_super_admin</p>
                  <p className="text-[10px] text-muted-foreground">Full Platform Authority</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/platform/settings" className="flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Profile & Security</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/" className="flex items-center gap-2 text-destructive cursor-pointer">
                  <LogOut className="h-4 w-4" />
                  <span>Exit to Public Portal</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
}
