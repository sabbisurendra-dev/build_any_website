import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { badgeVariants } from '@/components/ui/badge';

describe('Design System Primitives and Utilities', () => {
  it('correctly merges and deduplicates Tailwind classes using cn()', () => {
    const result = cn('px-4 py-2 bg-primary', 'bg-destructive', { 'opacity-50': true, 'hidden': false });
    expect(result).toContain('px-4');
    expect(result).toContain('py-2');
    expect(result).toContain('bg-destructive');
    expect(result).not.toContain('bg-primary');
    expect(result).toContain('opacity-50');
  });

  it('generates expected button classes for variants and sizes', () => {
    const defaultBtn = buttonVariants({ variant: 'default', size: 'default' });
    expect(defaultBtn).toContain('bg-primary');
    expect(defaultBtn).toContain('h-9');

    const brandBtn = buttonVariants({ variant: 'brand', size: 'lg' });
    expect(brandBtn).toContain('bg-brand-primary');
    expect(brandBtn).toContain('h-10');
  });

  it('generates expected badge classes for status indicators', () => {
    const successBadge = badgeVariants({ variant: 'success' });
    expect(successBadge).toContain('bg-emerald-100');

    const warningBadge = badgeVariants({ variant: 'warning' });
    expect(warningBadge).toContain('bg-amber-100');
  });
});
