'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Calendar,
  Layers,
  Landmark,
  Users,
  Contact2,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building,
  ExternalLink,
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
import type { SystemRoleKey } from '@/types/domain';

export interface DashboardNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles?: readonly SystemRoleKey[];
  badge?: string;
}

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  {
    title: 'Overview',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: 'Calendar & Bookings',
    href: '/dashboard/bookings',
    icon: Calendar,
    badge: 'Live',
  },
  {
    title: 'Services & Menu',
    href: '/dashboard/services',
    icon: Layers,
  },
  {
    title: 'Resources & Courts',
    href: '/dashboard/resources',
    icon: Landmark,
    allowedRoles: ['platform_super_admin', 'internal_configurator', 'business_owner'],
  },
  {
    title: 'Staff & Providers',
    href: '/dashboard/staff',
    icon: Users,
  },
  {
    title: 'Customers',
    href: '/dashboard/customers',
    icon: Contact2,
  },
  {
    title: 'Reports & Revenue',
    href: '/dashboard/reports',
    icon: TrendingUp,
    allowedRoles: ['platform_super_admin', 'internal_configurator', 'business_owner'],
  },
  {
    title: 'Business Settings',
    href: '/dashboard/settings',
    icon: Settings,
    allowedRoles: ['platform_super_admin', 'internal_configurator', 'business_owner'],
  },
];

interface DashboardSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
  onNavigateMobile?: () => void;
  userRole?: SystemRoleKey;
}

export function DashboardSidebar({
  collapsed = false,
  onToggleCollapse,
  className,
  onNavigateMobile,
  userRole = 'business_owner',
}: DashboardSidebarProps) {
  const pathname = usePathname();

  // Filter navigation items by role
  const visibleNavItems = DASHBOARD_NAV_ITEMS.filter((item) => {
    if (!item.allowedRoles) return true;
    return item.allowedRoles.includes(userRole);
  });

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        className={cn(
          'flex h-full flex-col border-r border-border bg-card text-card-foreground transition-all duration-300 ease-in-out',
          collapsed ? 'w-16' : 'w-64',
          className,
        )}
      >
        {/* Business Context Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 overflow-hidden font-bold tracking-tight text-foreground"
            onClick={onNavigateMobile}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <Building className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden leading-tight">
                <span className="truncate text-sm font-semibold">Kickoff Turf</span>
                <span className="text-[10px] font-medium tracking-wide uppercase text-emerald-600 dark:text-emerald-400">
                  Business Portal
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
          {visibleNavItems.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
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
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
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

        {/* Bottom User / Business Actions */}
        <div className="border-t border-border p-3 space-y-2">
          {!collapsed && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="w-full justify-start text-xs gap-2 h-8 text-muted-foreground hover:text-foreground"
            >
              <Link href="/s/kickoff-turf" target="_blank">
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="truncate">View Public Website</span>
              </Link>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors',
                  collapsed && 'justify-center p-1',
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 font-semibold text-xs border border-emerald-300 dark:border-emerald-700">
                  BO
                </div>
                {!collapsed && (
                  <div className="flex flex-1 flex-col overflow-hidden leading-snug">
                    <span className="truncate text-xs font-semibold text-foreground">Rahul Sharma</span>
                    <span className="truncate text-[10px] text-muted-foreground capitalize">
                      {userRole.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56 mb-2">
              <DropdownMenuLabel className="flex flex-col space-y-0.5">
                <p className="text-xs font-semibold">Rahul Sharma</p>
                <p className="text-[10px] text-muted-foreground">rahul@kickoffturf.in</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>Business Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/" className="flex items-center gap-2 text-destructive cursor-pointer">
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
}
