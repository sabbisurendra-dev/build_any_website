import * as React from 'react';
import { PublicHeader, type PublicHeaderProps } from './public-header';
import { PublicFooter, type PublicFooterProps } from './public-footer';

export interface PublicSiteLayoutProps {
  children: React.ReactNode;
  headerProps: PublicHeaderProps;
  footerProps: PublicFooterProps;
}

/**
 * Reusable layout shell for all tenant customer-facing websites.
 * Wraps content with tenant-specific branding, header, and configurable footer.
 */
export function PublicSiteLayout({ children, headerProps, footerProps }: PublicSiteLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader {...headerProps} />
      <div className="flex-1">{children}</div>
      <PublicFooter {...footerProps} />
    </div>
  );
}
