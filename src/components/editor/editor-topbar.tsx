'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Monitor,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  Eye,
  EyeOff,
  Save,
  Send,
  ExternalLink,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ViewportBreakpoint } from '@/modules/website-builder/layout.types';
import { useToast } from '@/components/ui/toast';

interface EditorTopbarProps {
  tenantName: string;
  tenantSlug: string;
  breakpoint: ViewportBreakpoint;
  onBreakpointChange: (bp: ViewportBreakpoint) => void;
  isPreview: boolean;
  onTogglePreview: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  draftRevision: number;
  publishedVersion: number;
  isDirty: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
}

export function EditorTopbar({
  tenantName,
  tenantSlug,
  breakpoint,
  onBreakpointChange,
  isPreview,
  onTogglePreview,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  draftRevision,
  publishedVersion,
  isDirty,
  onSaveDraft,
  onPublish,
}: EditorTopbarProps) {
  const { toast } = useToast();

  const handleSave = () => {
    onSaveDraft();
    toast({
      title: 'Draft Saved',
      description: `Draft revision #${draftRevision + 1} persisted with optimistic locking.`,
      variant: 'default',
    });
  };

  const handlePublish = () => {
    onPublish();
    toast({
      title: 'Website Published to Production',
      description: `Immutable release version v${publishedVersion + 1} is now live with tag revalidation.`,
      variant: 'success',
    });
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-md">
      {/* Left: Back & Context */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-muted-foreground">
          <Link href="/platform/tenants" aria-label="Back to tenant directory">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-foreground truncate max-w-[180px] sm:max-w-[260px]">
              {tenantName}
            </span>
            <Badge variant="outline" className="text-[10px] font-mono py-0">
              v{publishedVersion} LIVE
            </Badge>
            {isDirty && (
              <Badge variant="warning" className="text-[10px] py-0 font-medium">
                Unsaved Draft (r{draftRevision})
              </Badge>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            {tenantSlug}.localhost:3000
          </span>
        </div>
      </div>

      {/* Center: Device Breakpoint Controls */}
      <div className="hidden sm:flex items-center rounded-lg border border-border bg-muted/40 p-1 gap-1">
        <Button
          variant={breakpoint === 'desktop' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onBreakpointChange('desktop')}
          className="h-7 px-2.5 text-xs gap-1.5 font-medium"
        >
          <Monitor className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Desktop (12 col)</span>
        </Button>
        <Button
          variant={breakpoint === 'tablet' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onBreakpointChange('tablet')}
          className="h-7 px-2.5 text-xs gap-1.5 font-medium"
        >
          <Tablet className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Tablet (8 col)</span>
        </Button>
        <Button
          variant={breakpoint === 'mobile' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onBreakpointChange('mobile')}
          className="h-7 px-2.5 text-xs gap-1.5 font-medium"
        >
          <Smartphone className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Mobile (4 col)</span>
        </Button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="hidden lg:flex items-center gap-1 border-r border-border pr-2 mr-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo last layout change"
            className="h-8 w-8 text-muted-foreground disabled:opacity-30"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Redo layout change"
            className="h-8 w-8 text-muted-foreground disabled:opacity-30"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Preview Toggle */}
        <Button
          variant={isPreview ? 'default' : 'outline'}
          size="sm"
          onClick={onTogglePreview}
          className="h-8 px-2.5 text-xs gap-1.5 font-medium"
        >
          {isPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{isPreview ? 'Edit Canvas' : 'Preview'}</span>
        </Button>

        {/* Save Draft */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={!isDirty}
          className="h-8 px-2.5 text-xs gap-1.5 font-medium border-border"
        >
          <Save className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Save Draft</span>
        </Button>

        {/* Publish Button */}
        <Button
          size="sm"
          onClick={handlePublish}
          className="h-8 px-3 text-xs gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Publish v{publishedVersion + 1}</span>
        </Button>

        {/* Live Site Link */}
        <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-muted-foreground">
          <Link href={`/s/${tenantSlug}`} target="_blank" aria-label="Open live customer website">
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
