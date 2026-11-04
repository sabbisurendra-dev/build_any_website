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
  isSaving?: boolean;
  onSaveDraft: () => Promise<{ ok: boolean; draftRevision?: number; error?: string }>;
  onPublish: () => Promise<{ ok: boolean; versionNumber?: number; error?: string }>;
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
  isSaving = false,
  onSaveDraft,
  onPublish,
}: EditorTopbarProps) {
  const { toast } = useToast();

  const handleSave = async () => {
    const res = await onSaveDraft();
    if (res.ok) {
      toast({
        title: 'Draft Saved',
        description: `Draft revision r${res.draftRevision ?? draftRevision + 1} persisted on server.`,
        variant: 'default',
      });
    } else {
      toast({
        title: 'Failed to Save Draft',
        description: res.error ?? 'Unable to save draft.',
        variant: 'destructive',
      });
    }
  };

  const handlePublish = async () => {
    const res = await onPublish();
    if (res.ok) {
      toast({
        title: 'Website Published to Production',
        description: `Release v${res.versionNumber ?? publishedVersion + 1} is now live at /s/${tenantSlug}.`,
        variant: 'success',
      });
    } else {
      toast({
        title: 'Publish Failed',
        description: res.error ?? 'Unable to publish website.',
        variant: 'destructive',
      });
    }
  };

  return (
    <header className="sticky top-0 z-30 flex flex-wrap min-h-14 w-full items-center justify-between gap-2 border-b border-border bg-card/95 px-3 sm:px-4 py-2 backdrop-blur-md">
      {/* Left: Back & Context */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0 text-muted-foreground">
          <Link href="/platform/tenants" aria-label="Back to tenant directory">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              data-testid="editor-tenant-name"
              className="font-bold text-sm tracking-tight text-foreground truncate max-w-[140px] sm:max-w-[240px]"
            >
              {tenantName}
            </span>
            <Badge
              data-testid="editor-live-version-badge"
              variant="outline"
              className="text-[10px] font-mono py-0"
            >
              v{publishedVersion} LIVE
            </Badge>
            <Badge
              data-testid="editor-draft-revision-badge"
              variant={isDirty ? 'warning' : 'secondary'}
              className="text-[10px] py-0 font-medium"
            >
              {isDirty ? `Unsaved (r${draftRevision})` : `Saved r${draftRevision}`}
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono truncate">
            /s/{tenantSlug}
          </span>
        </div>
      </div>

      {/* Center: Device Breakpoint Controls */}
      <div className="hidden md:flex items-center rounded-lg border border-border bg-muted/40 p-1 gap-1">
        <Button
          variant={breakpoint === 'desktop' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onBreakpointChange('desktop')}
          data-testid="bp-desktop"
          className="h-7 px-2.5 text-xs gap-1.5 font-medium"
        >
          <Monitor className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Desktop (12 col)</span>
        </Button>
        <Button
          variant={breakpoint === 'tablet' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onBreakpointChange('tablet')}
          data-testid="bp-tablet"
          className="h-7 px-2.5 text-xs gap-1.5 font-medium"
        >
          <Tablet className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Tablet (8 col)</span>
        </Button>
        <Button
          variant={breakpoint === 'mobile' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onBreakpointChange('mobile')}
          data-testid="bp-mobile"
          className="h-7 px-2.5 text-xs gap-1.5 font-medium"
        >
          <Smartphone className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Mobile (4 col)</span>
        </Button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
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

        <Button
          variant={isPreview ? 'default' : 'outline'}
          size="sm"
          onClick={onTogglePreview}
          data-testid="editor-preview-btn"
          className="h-8 px-2.5 text-xs gap-1.5 font-medium"
        >
          {isPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{isPreview ? 'Edit Canvas' : 'Preview'}</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          data-testid="editor-save-draft-btn"
          className="h-8 px-2.5 text-xs gap-1.5 font-medium border-border"
        >
          <Save className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Save Draft</span>
        </Button>

        <Button
          size="sm"
          onClick={handlePublish}
          disabled={isSaving}
          data-testid="editor-publish-btn"
          className="h-8 px-3 text-xs gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Publish v{publishedVersion + 1}</span>
        </Button>

        <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-muted-foreground">
          <Link
            href={`/s/${tenantSlug}`}
            target="_blank"
            data-testid="editor-live-site-link"
            aria-label="Open live customer website"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
