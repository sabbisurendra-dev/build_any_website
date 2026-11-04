'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Sun, Moon, Bell, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/providers/theme-provider';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardHeaderProps {
  onOpenMobileMenu?: () => void;
}

export function DashboardHeader({ onOpenMobileMenu }: DashboardHeaderProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [selectedLocation, setSelectedLocation] = React.useState('Main Turf Arena (Indiranagar)');

  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Business Overview';
    if (pathname.startsWith('/dashboard/bookings')) return 'Live Booking Calendar & Slots';
    if (pathname.startsWith('/dashboard/services')) return 'Service Catalog & Pricing';
    if (pathname.startsWith('/dashboard/resources')) return 'Facilities & Court Inventory';
    if (pathname.startsWith('/dashboard/staff')) return 'Staff & Schedules';
    if (pathname.startsWith('/dashboard/customers')) return 'Customer Directory';
    if (pathname.startsWith('/dashboard/reports')) return 'Revenue & Utilisation Reports';
    if (pathname.startsWith('/dashboard/settings')) return 'Venue Settings & Policies';
    return 'Dashboard';
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
          <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
            {getPageTitle()}
          </h1>

          <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Facility Live • Open 6:00 AM – 1:00 AM</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Location Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex text-xs gap-1.5 h-8 font-normal"
            >
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="max-w-[140px] truncate">{selectedLocation}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">Select Location</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSelectedLocation('Main Arena (Indiranagar)')}>
              Indiranagar Arena (Primary)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedLocation('Koramangala Box Cricket')}>
              Koramangala Box Cricket
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Badge variant="success" className="hidden sm:inline-flex text-[10px] uppercase font-mono py-0">
          OPERATIONAL
        </Badge>

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
