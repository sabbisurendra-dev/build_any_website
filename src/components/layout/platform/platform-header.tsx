'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Sun, Moon, Bell, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/providers/theme-provider';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface PlatformHeaderProps {
  onOpenMobileMenu?: () => void;
}

export function PlatformHeader({ onOpenMobileMenu }: PlatformHeaderProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  // Generate readable title from pathname
  const getPageTitle = () => {
    if (pathname === '/platform') return 'Platform Overview';
    if (pathname.startsWith('/platform/tenants')) return 'Business & Tenant Directory';
    if (pathname.startsWith('/platform/builder')) return 'Metabase Visual Website Editor';
    if (pathname.startsWith('/platform/templates')) return 'Starter Industry Blueprints';
    if (pathname.startsWith('/platform/analytics')) return 'SaaS Platform Analytics & SLA';
    if (pathname.startsWith('/platform/settings')) return 'Global Configuration';
    return 'Console';
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-4 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenMobileMenu}
            aria-label="Open mobile navigation menu"
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-2.5">
          <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
            {getPageTitle()}
          </h1>
          <Badge variant="outline" className="hidden sm:inline-flex text-[10px] font-mono uppercase tracking-wider py-0">
            INTERNAL
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="hidden sm:inline-flex text-xs gap-1.5 h-8 font-medium"
        >
          <Link href="/s/kickoff-turf" target="_blank">
            <span>Demo Customer Site</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </Link>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle color theme"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>
    </header>
  );
}
