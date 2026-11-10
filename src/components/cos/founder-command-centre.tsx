'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertOctagon,
  ArrowLeft,
  BookOpen,
  Bot,
  CheckCircle2,
  Cpu,
  FileText,
  FolderGit2,
  Layers,
  Lock,
  MessageSquare,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Scale,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type {
  ExecutionMode,
  KnowledgeCategory,
} from '@/modules/ai-cos/core/cos.types';
import type { getCosDashboardSnapshot } from '@/modules/ai-cos';

type DashboardSnapshot = ReturnType<typeof getCosDashboardSnapshot>;

type CosNavTab =
  | 'overview'
  | 'talk'
  | 'tasks'
  | 'approvals'
  | 'departments'
  | 'deliverables'
  | 'knowledge'
  | 'decisions'
  | 'reports'
  | 'projects'
  | 'settings';

interface SamplePreset {
  id: string;
  label: string;
  badge: string;
  prompt: string;
  description: string;
}

const SAMPLE_WORKFLOW_PRESETS: SamplePreset[] = [
  {
    id: 'wf-a',
    label: 'Workflow A: Simplify Website Editor UX',
    badge: 'MEDIUM RISK • APPROVAL GATE',
    prompt:
      'I think the current website editor is too complicated. I want the experience to be much easier for a business owner who is not technical. Research how the best website builders solve this, explore alternative designs and suggest improvements.',
    description:
      'Triggers parallel Research, Product, Design & CTO discovery, pauses at MEDIUM-risk Approval Gate, then delegates to Engineering & QA.',
  },
  {
    id: 'wf-b',
    label: 'Workflow B: 90-Day Online Course Access',
    badge: 'MEDIUM RISK • COMMERCE & ENTITLEMENT',
    prompt:
      'I want this platform to support selling online courses with access for 90 days.',
    description:
      'Engages Research, Product, CTO & Legal, halts for schema/entitlement approval with SHA-256 hash, then implements & verifies 90-day expiry.',
  },
  {
    id: 'wf-c',
    label: 'Workflow C: Turf Slot Double-Booking Fix',
    badge: 'LOW RISK • AUTONOMOUS + QA',
    prompt:
      'Fix the issue where two customers can book the same turf slot at the same time.',
    description:
      'Executes autonomously across Engineering and Independent QA within existing booking concurrency invariants.',
  },
  {
    id: 'wf-d',
    label: 'Workflow D: Negative Checkout UX Feedback',
    badge: 'MEDIUM RISK • DESIGN FEEDBACK',
    prompt:
      "I don't like the current checkout flow. It feels too complicated and has too many steps. Explore a simpler Express UPI Checkout design.",
    description:
      'Retrieves current checkout implementation, runs parallel Research/Product/Design/CTO analysis, and gates UI redesign behind approval.',
  },
  {
    id: 'wf-e',
    label: 'Workflow E: Autonomous Continuation & Checkpoints',
    badge: 'DURABLE CHECKPOINTS',
    prompt:
      'Work on the highest-priority improvements while I am away and report back when I return.',
    description:
      'Demonstrates durable step-level checkpoints that survive browser closure and resume deterministically.',
  },
  {
    id: 'wf-f',
    label: 'Workflow F: Roadmap Reprioritisation',
    badge: 'DECISION SUPERSEDING',
    prompt:
      'Prioritise digital products and online courses over appointment booking on our product roadmap.',
    description:
      'Supersedes lower-priority planned tasks, updates the Decision Ledger, and realigns departments.',
  },
  {
    id: 'challenge',
    label: 'CEO Challenge: Single Nullable Table Anti-Pattern',
    badge: 'CONSTRUCTIVE CHALLENGE (RULE 15.6)',
    prompt:
      'Why not merge all bookings, physical inventory, and subscriptions into one single table with nullable columns?',
    description:
      'Demonstrates the AI CEO respectfully challenging an architectural anti-pattern using DEC-002 and codebase facts.',
  },
  {
    id: 'direct-q',
    label: 'Direct Question: Current Platform Status',
    badge: 'ZERO UNNECESSARY DELEGATION (RULE 15.1)',
    prompt:
      'What is the current status of our Universal Website Builder & Commerce Platform?',
    description:
      'Answers directly from Company Knowledge without spawning unnecessary specialist department runs.',
  },
];

function formatMinorInr(minor: number): string {
  const rupees = minor / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(rupees);
}

function getRiskBadgeVariant(
  risk: string,
): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
  switch (risk) {
    case 'low':
      return 'success';
    case 'medium':
      return 'warning';
    case 'high':
    case 'prohibited':
      return 'destructive';
    default:
      return 'outline';
  }
}

function getStatusBadgeVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
  switch (status) {
    case 'completed':
    case 'approved':
    case 'passed':
    case 'active':
      return 'success';
    case 'approval_pending':
    case 'awaiting_approval':
    case 'awaiting_external_handoff':
    case 'pending':
    case 'planning':
    case 'running_discovery':
    case 'executing_authorised':
    case 'in_progress':
    case 'review':
    case 'qa':
    case 'verifying_qa':
      return 'warning';
    case 'blocked':
    case 'failed':
    case 'rejected':
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
}

export function FounderCommandCentre({ initialSnapshot }: { initialSnapshot: DashboardSnapshot }) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(initialSnapshot);
  const [activeTab, setActiveTab] = useState<CosNavTab>('overview');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialSnapshot.activeProject?.id ?? 'proj-uwb-01',
  );

  // Talk to CEO state
  const [promptInput, setPromptInput] = useState('');
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('isolated_worktree');
  const [simulateQaFailure, setSimulateQaFailure] = useState(false);
  const [isSubmittingPrompt, setIsSubmittingPrompt] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'info' | 'success' | 'error';
    text: string;
  } | null>(null);

  // Approval comment state
  const [approvalComments, setApprovalComments] = useState<Record<string, string>>({});

  // Deliverable viewer state
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<string | null>(
    initialSnapshot.deliverables[0]?.id ?? null,
  );
  const [deliverableDeptFilter, setDeliverableDeptFilter] = useState<string>('all');

  // Knowledge form state
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocSlug, setNewDocSlug] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<KnowledgeCategory>('product');
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocReason, setNewDocReason] = useState('');

  // Project registration form state
  const [newProjName, setNewProjName] = useState('');
  const [newProjSlug, setNewProjSlug] = useState('');
  const [newProjRepo, setNewProjRepo] = useState('');
  const [newProjPath, setNewProjPath] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');

  const refreshSnapshot = useCallback(
    async (projId?: string) => {
      const targetProj = projId ?? selectedProjectId;
      const res = await fetch(`/api/cos/state?projectId=${encodeURIComponent(targetProj)}`);
      const json = await res.json();
      if (json.ok && json.data) {
        setSnapshot(json.data);
      }
    },
    [selectedProjectId],
  );

  useEffect(() => {
    void refreshSnapshot(selectedProjectId);
  }, [selectedProjectId, refreshSnapshot]);

  const handleSendToCeo = async (preset?: SamplePreset) => {
    const text = preset ? preset.prompt : promptInput.trim();
    if (!text) return;

    setIsSubmittingPrompt(true);
    setStatusBanner({
      type: 'info',
      text: 'AI CEO is interpreting your directive, consulting Company Knowledge, and orchestrating specialist departments...',
    });

    try {
      const res = await fetch('/api/cos/ceo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          promptText: text,
          preferredExecutionMode: executionMode,
          simulateQaFailureOnce: simulateQaFailure,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setStatusBanner({
          type: 'error',
          text: json.error?.message ?? 'Failed to process instruction.',
        });
      } else {
        setSnapshot(json.data.snapshot);
        if (!preset) setPromptInput('');
        const orch = json.data.orchestration;
        if (orch.pendingApprovals && orch.pendingApprovals.length > 0) {
          setStatusBanner({
            type: 'info',
            text: `Cycle paused at Guarded Autonomy Approval Gate (${orch.pendingApprovals[0].title}). Review and approve in Talk to CEO or Approvals.`,
          });
        } else {
          setStatusBanner({
            type: 'success',
            text: 'AI CEO completed orchestration turn and updated Company Knowledge & Deliverables.',
          });
        }
      }
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Network error communicating with AI CEO.',
      });
    } finally {
      setIsSubmittingPrompt(false);
    }
  };

  const handleApprovalDecision = async (
    approvalId: string,
    expectedProposalHash: string,
    decision: 'approved' | 'rejected' | 'changes_requested',
    actorRole: 'founder' | 'department_agent' = 'founder',
  ) => {
    const comment =
      approvalComments[approvalId] ??
      (decision === 'approved'
        ? 'Approved exact proposal hash and scope.'
        : decision === 'rejected'
          ? 'Rejected proposal scope.'
          : 'Please revise the proposal and reduce scope risk.');

    try {
      const res = await fetch('/api/cos/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId,
          actorId: actorRole === 'founder' ? 'founder-chairman' : 'agent-engineering-01',
          actorRole,
          decision,
          expectedProposalHash,
          founderComment: comment,
          projectId: selectedProjectId,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setStatusBanner({
          type: 'error',
          text: `Policy Engine Blocked Action: ${json.error?.message}`,
        });
        await refreshSnapshot();
        return;
      }
      setSnapshot(json.data.snapshot);
      setStatusBanner({
        type: 'success',
        text:
          decision === 'approved'
            ? 'Founder approval verified (SHA-256 hash matched). Capability token minted and Engineering + Independent QA execution resumed!'
            : `Proposal marked as ${decision}. Dependent consequential tasks blocked per Guarded Autonomy Policy.`,
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to submit approval decision.',
      });
    }
  };

  const handleCycleControl = async (
    cycleId: string,
    action: 'pause' | 'resume' | 'cancel' | 'complete_external_handoff',
    taskId?: string,
  ) => {
    const res = await fetch('/api/cos/cycles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cycleId,
        action,
        taskId,
        projectId: selectedProjectId,
      }),
    });
    const json = await res.json();
    if (!json.ok) {
      setStatusBanner({
        type: 'error',
        text: json.error?.message ?? 'Cycle control action failed.',
      });
      return;
    }
    setSnapshot(json.data.snapshot);
    setStatusBanner({
      type: 'success',
      text: `Cycle control action '${action}' executed and logged.`,
    });
  };

  const handleToggleKillSwitch = async (enabled: boolean) => {
    const res = await fetch('/api/cos/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'toggle_kill_switch',
        enabled,
        projectId: selectedProjectId,
      }),
    });
    const json = await res.json();
    if (json.ok) {
      setSnapshot(json.data);
      setStatusBanner({
        type: enabled ? 'error' : 'success',
        text: enabled
          ? 'EMERGENCY GLOBAL KILL SWITCH ACTIVATED: All autonomous tool calls and active cycles are now paused.'
          : 'Global Kill Switch deactivated. Normal Guarded Autonomy operations resumed.',
      });
    }
  };

  const handleToggleDepartment = async (departmentCode: string, enabled: boolean) => {
    const res = await fetch('/api/cos/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'toggle_department',
        departmentCode,
        enabled,
        projectId: selectedProjectId,
      }),
    });
    const json = await res.json();
    if (json.ok) {
      setSnapshot(json.data);
    }
  };

  const handleResetDemoState = async () => {
    const res = await fetch('/api/cos/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_demo_state' }),
    });
    const json = await res.json();
    if (json.ok) {
      setSnapshot(json.data);
      setStatusBanner({
        type: 'info',
        text: 'AI-COS runtime state reset to clean initial baseline.',
      });
    }
  };

  const handleCreateKnowledgeDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !newDocContent.trim()) return;
    const slug =
      newDocSlug.trim() ||
      newDocTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const res = await fetch('/api/cos/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsert_knowledge',
        knowledge: {
          projectId: selectedProjectId,
          category: newDocCategory,
          slug,
          title: newDocTitle.trim(),
          markdownContent: newDocContent.trim(),
          changeReason: newDocReason.trim() || 'Founder manual knowledge update',
        },
      }),
    });
    const json = await res.json();
    if (json.ok) {
      setSnapshot(json.data);
      setNewDocTitle('');
      setNewDocSlug('');
      setNewDocContent('');
      setNewDocReason('');
      setStatusBanner({
        type: 'success',
        text: `Versioned knowledge document '${slug}' saved.`,
      });
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim() || !newProjSlug.trim()) return;
    const res = await fetch('/api/cos/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_project',
        project: {
          name: newProjName.trim(),
          slug: newProjSlug.trim(),
          repoUrl: newProjRepo.trim() || 'https://github.com/sabbisurendra-dev/new-project.git',
          localWorkspacePath:
            newProjPath.trim() || '/Users/sabbisurendra/Website Builder - Slot booking',
          description: newProjDesc.trim() || 'Managed software project under AI-COS.',
        },
      }),
    });
    const json = await res.json();
    if (json.ok) {
      setSnapshot(json.data);
      setSelectedProjectId(json.data.activeProject.id);
      setNewProjName('');
      setNewProjSlug('');
      setNewProjRepo('');
      setNewProjPath('');
      setNewProjDesc('');
      setStatusBanner({
        type: 'success',
        text: `Managed project '${json.data.activeProject.name}' registered.`,
      });
    }
  };

  const pendingApprovals = useMemo(
    () => snapshot.approvals.filter((a) => a.status === 'pending'),
    [snapshot.approvals],
  );

  const filteredDeliverables = useMemo(() => {
    if (deliverableDeptFilter === 'all') return snapshot.deliverables;
    return snapshot.deliverables.filter((d) => d.departmentCode === deliverableDeptFilter);
  }, [snapshot.deliverables, deliverableDeptFilter]);

  const activeDeliverable = useMemo(
    () =>
      filteredDeliverables.find((d) => d.id === selectedDeliverableId) ??
      filteredDeliverables[0] ??
      null,
    [filteredDeliverables, selectedDeliverableId],
  );

  const navItems: Array<{
    id: CosNavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeCount?: number;
  }> = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'talk', label: 'Talk to CEO', icon: MessageSquare },
    {
      id: 'approvals',
      label: 'Approvals',
      icon: ShieldAlert,
      badgeCount: pendingApprovals.length,
    },
    {
      id: 'tasks',
      label: 'Tasks & Execution',
      icon: Layers,
      badgeCount: snapshot.metrics.activeCyclesCount,
    },
    { id: 'departments', label: 'Departments (10)', icon: Users },
    {
      id: 'deliverables',
      label: 'Deliverables',
      icon: FileText,
      badgeCount: snapshot.deliverables.length,
    },
    {
      id: 'knowledge',
      label: 'Company Knowledge',
      icon: BookOpen,
      badgeCount: snapshot.knowledgeDocuments.length,
    },
    {
      id: 'decisions',
      label: 'Decisions Ledger',
      icon: Scale,
      badgeCount: snapshot.metrics.activeDecisionsCount,
    },
    { id: 'reports', label: 'Reports & Quality', icon: Sparkles },
    { id: 'projects', label: 'Managed Projects', icon: FolderGit2 },
    { id: 'settings', label: 'Settings & Audit', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Executive Command Bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight sm:text-lg">
                  AI-COS • Founder Command Centre
                </h1>
                <Badge variant="outline" className="font-mono text-[10px]">
                  GUARDED AUTONOMY
                </Badge>
                {snapshot.companyProfile.globalKillSwitchActive && (
                  <Badge variant="destructive" className="animate-pulse font-mono text-[10px]">
                    KILL SWITCH ACTIVE
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Managed Project:{' '}
                <span className="font-medium text-foreground">
                  {snapshot.activeProject?.name}
                </span>{' '}
                • Role: <span className="font-medium text-foreground">Founder / Chairman</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Select Managed Project"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground"
            >
              {snapshot.projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name} ({proj.slug})
                </option>
              ))}
            </select>

            <Button
              variant={snapshot.companyProfile.globalKillSwitchActive ? 'default' : 'destructive'}
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() =>
                void handleToggleKillSwitch(!snapshot.companyProfile.globalKillSwitchActive)
              }
            >
              <AlertOctagon className="h-3.5 w-3.5" />
              {snapshot.companyProfile.globalKillSwitchActive
                ? 'Resume AI Operations'
                : 'Emergency Kill Switch'}
            </Button>

            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
              <Link href="/platform">
                <ArrowLeft className="h-3.5 w-3.5" />
                Platform Console
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout: Sidebar + Container-Query Responsive Content Area */}
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col lg:flex-row">
        {/* Left Navigation Sidebar */}
        <aside className="w-full border-b border-border bg-card/40 p-3 lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
          <nav aria-label="AI-COS Navigation" className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] ${
                        isActive
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : item.id === 'approvals'
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {item.badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* CEO Status Widget in Sidebar */}
          <div className="mt-4 hidden rounded-xl border border-border bg-card p-3 lg:block space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                AI CEO Status
              </span>
              <Badge
                variant={
                  snapshot.companyProfile.globalKillSwitchActive
                    ? 'destructive'
                    : pendingApprovals.length > 0
                      ? 'warning'
                      : 'success'
                }
                className="text-[10px]"
              >
                {snapshot.companyProfile.globalKillSwitchActive
                  ? 'HALTED'
                  : pendingApprovals.length > 0
                    ? 'AWAITING FOUNDER'
                    : 'OPERATIONAL'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Orchestrating 9 specialist departments with SHA-256 approval binding and independent QA verification.
            </p>
            <div className="pt-1 border-t border-border flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Runtime Spend:</span>
              <span className="font-mono font-semibold text-foreground">
                {formatMinorInr(snapshot.metrics.totalCostMinor)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Monthly Budget:</span>
              <span className="font-mono text-muted-foreground">
                {formatMinorInr(snapshot.activeProject.monthlyBudgetMinor)}
              </span>
            </div>
          </div>
        </aside>

        {/* Main Content Workspace (Container Query Root) */}
        <main className="flex-1 p-4 sm:p-6 space-y-6" style={{ containerType: 'inline-size' }}>
          {statusBanner && (
            <div
              role="status"
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs ${
                statusBanner.type === 'error'
                  ? 'border-destructive/40 bg-destructive/10 text-destructive'
                  : statusBanner.type === 'success'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-primary/40 bg-primary/10 text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span className="font-medium">{statusBanner.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                className="text-[11px] underline opacity-80 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          )}

          {pendingApprovals.length > 0 && activeTab !== 'approvals' && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">
                    {pendingApprovals.length} Consequential Proposal(s) Awaiting Founder Approval
                  </p>
                  <p className="text-muted-foreground">
                    Guarded Autonomy Policy has paused medium/high-risk implementation tasks until you authorize the exact SHA-256 proposal scope.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="default"
                className="h-8 text-xs"
                onClick={() => setActiveTab('approvals')}
              >
                Review Pending Approvals ({pendingApprovals.length})
              </Button>
            </div>
          )}

          {/* =====================================================================
              VIEW 1: OVERVIEW
             ===================================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    Executive Company Overview
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Real-time operating state of your AI CEO, 9 specialist departments, guarded autonomy gates, and managed SaaS platform.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => setActiveTab('talk')}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Give Directive to AI CEO
                </Button>
              </div>

              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
                }}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">CEO & Autonomy Mode</CardDescription>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>Guarded Autonomy</span>
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    Low-risk research & tests run autonomously; Medium/High-risk changes require cryptographic Founder approval.
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">Pending Founder Approvals</CardDescription>
                    <CardTitle className="text-2xl font-mono flex items-center justify-between">
                      <span>{snapshot.metrics.pendingApprovalsCount}</span>
                      <ShieldAlert className="h-5 w-5 text-amber-500" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    {snapshot.metrics.awaitingApprovalTasksCount} downstream implementation task(s) gated on approval.
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">Task Completion & QA Pass</CardDescription>
                    <CardTitle className="text-2xl font-mono flex items-center justify-between">
                      <span>
                        {snapshot.metrics.completedTasksCount}/{snapshot.metrics.totalTasksCount}
                      </span>
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    First-pass QA rate: <strong>{snapshot.metrics.firstPassQaSuccessRatePercent}%</strong> • Rework loops: <strong>{snapshot.metrics.totalReworkLoopsCount}</strong>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">Model Spend & Efficiency</CardDescription>
                    <CardTitle className="text-2xl font-mono flex items-center justify-between">
                      <span>{formatMinorInr(snapshot.metrics.totalCostMinor)}</span>
                      <Cpu className="h-5 w-5 text-primary" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    Avg cost/completed task: <strong>{formatMinorInr(snapshot.metrics.costPerCompletedTaskMinor)}</strong>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Launch End-to-End Executive Workflows (Part 12 Scenarios)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Click any scenario below to watch the AI CEO interpret the goal, assemble Company Knowledge, delegate to specialist departments, enforce Guarded Autonomy approval gates, and synthesize an Executive Report.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className="grid gap-3"
                    style={{
                      gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
                    }}
                  >
                    {SAMPLE_WORKFLOW_PRESETS.slice(0, 6).map((preset) => (
                      <div
                        key={preset.id}
                        className="flex flex-col justify-between rounded-xl border border-border bg-card/60 p-3.5 hover:border-primary/50 transition-colors gap-3"
                      >
                        <div className="space-y-1.5">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {preset.badge}
                          </Badge>
                          <h3 className="text-xs font-semibold text-foreground">
                            {preset.label}
                          </h3>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {preset.description}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isSubmittingPrompt}
                          className="w-full h-8 text-xs gap-1.5"
                          onClick={() => {
                            setActiveTab('talk');
                            void handleSendToCeo(preset);
                          }}
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          Execute {preset.id.toUpperCase()}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      CEO Recommended Priorities (From Codebase Audit)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Proactive priorities surfaced by AI CEO from <code className="text-foreground">kdoc-exec-03</code> & Phase 4 Readiness Audit.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">
                          P0-1: Enforce Tenant Isolation on 5 Dashboard Pages
                        </span>
                        <Badge variant="warning" className="text-[10px]">
                          MEDIUM RISK
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        <code className="text-foreground">/dashboard/customers</code>, <code className="text-foreground">reports</code>, <code className="text-foreground">resources</code>, <code className="text-foreground">services</code>, and <code className="text-foreground">staff</code> currently query without <code className="text-foreground">WHERE tenant_id = ?</code>.
                      </p>
                    </div>

                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">
                          P0-2: Harden Actor Session Resolution
                        </span>
                        <Badge variant="warning" className="text-[10px]">
                          MEDIUM RISK
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        Replace raw <code className="text-foreground">x-actor-role</code> header trust in <code className="text-foreground">src/modules/auth/resolve-actor.ts</code> with signed session verification.
                      </p>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">
                          P1: Simplify 12-Column Visual Builder for Non-Technical Merchants
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          PRODUCT & UX
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        Introduce Quick-Edit Guided Mode while preserving advanced 12-column grid power for configurators.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Active Architectural & Product Decisions
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Immutable Decision Ledger governing all AI CEO and specialist department plans.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2.5 text-xs">
                    {snapshot.decisions.slice(0, 4).map((dec) => (
                      <div
                        key={dec.id}
                        className="rounded-lg border border-border p-3 flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground">
                            {dec.code}: {dec.title}
                          </span>
                          <Badge
                            variant={dec.status === 'active' ? 'success' : 'secondary'}
                            className="text-[10px] uppercase"
                          >
                            {dec.status}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground line-clamp-2">{dec.summary}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* =====================================================================
              VIEW 2: TALK TO CEO
             ===================================================================== */}
          {activeTab === 'talk' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-8 flex flex-col gap-4">
                <Card className="flex flex-col">
                  <CardHeader className="pb-3 border-b border-border">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Bot className="h-4 w-4 text-primary" />
                          Direct Executive Channel with AI CEO
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Communicate goals, dissatisfaction, product ideas, or priorities in natural language. The AI CEO handles department routing, DAG planning, QA verification, and reporting.
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span>Coding Mode:</span>
                          <select
                            value={executionMode}
                            onChange={(e) =>
                              setExecutionMode(e.target.value as ExecutionMode)
                            }
                            className="rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground"
                          >
                            <option value="isolated_worktree">
                              Isolated Git Branch + PR Package
                            </option>
                            <option value="external_handoff">
                              External Antigravity Handoff Bundle
                            </option>
                          </select>
                        </label>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="py-4 space-y-4 max-h-[540px] overflow-y-auto">
                    {snapshot.agentMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col gap-1.5 rounded-xl p-3.5 text-xs ${
                          msg.senderRole === 'founder'
                            ? 'ml-8 bg-primary text-primary-foreground'
                            : 'mr-4 border border-border bg-card text-foreground'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] opacity-80">
                          <span className="font-mono font-semibold uppercase">
                            {msg.senderLabel} ({msg.messageType})
                          </span>
                          <span>{new Date(msg.createdAtIso).toLocaleTimeString()}</span>
                        </div>
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {msg.contentMarkdown}
                        </div>
                      </div>
                    ))}
                  </CardContent>

                  <CardFooter className="border-t border-border pt-3 flex flex-col gap-3">
                    <div className="flex w-full flex-col sm:flex-row gap-2">
                      <textarea
                        rows={2}
                        value={promptInput}
                        onChange={(e) => setPromptInput(e.target.value)}
                        placeholder="Tell the AI CEO what you want to improve, research, fix, or build..."
                        className="flex-1 rounded-lg border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <Button
                        disabled={isSubmittingPrompt || !promptInput.trim()}
                        onClick={() => void handleSendToCeo()}
                        className="sm:h-auto gap-1.5 text-xs"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {isSubmittingPrompt ? 'Orchestrating...' : 'Send to CEO'}
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center justify-between w-full gap-2 text-[11px] text-muted-foreground">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={simulateQaFailure}
                          onChange={(e) => setSimulateQaFailure(e.target.checked)}
                          className="rounded border-border"
                        />
                        <span>
                          Simulate 1st-Pass QA Defect (demonstrates automatic Engineering rework loop before reporting to Founder)
                        </span>
                      </label>
                    </div>
                  </CardFooter>
                </Card>

                {pendingApprovals.map((app) => (
                  <Card key={app.id} className="border-amber-500/50 bg-amber-500/5">
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4 text-amber-600" />
                          <CardTitle className="text-sm">
                            Guarded Autonomy Approval Required: {app.title}
                          </CardTitle>
                        </div>
                        <Badge
                          variant={getRiskBadgeVariant(app.riskLevel)}
                          className="uppercase text-[10px]"
                        >
                          {app.riskLevel} risk • v{app.proposalVersion}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs font-mono">
                        SHA-256 Scope Hash: {app.proposalHash}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <p>
                        <strong>Why Approval Is Required:</strong> {app.reasonForApproval}
                      </p>
                      <p>
                        <strong>CEO Recommendation:</strong> {app.ceoRecommendation}
                      </p>
                      <p>
                        <strong>Rollback Strategy:</strong> {app.rollbackPlan}
                      </p>
                    </CardContent>
                    <CardFooter className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() =>
                          void handleApprovalDecision(app.id, app.proposalHash, 'approved')
                        }
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve Exact Scope & Resume Execution
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() =>
                          void handleApprovalDecision(
                            app.id,
                            app.proposalHash,
                            'changes_requested',
                          )
                        }
                      >
                        Request Changes
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 text-xs"
                        onClick={() =>
                          void handleApprovalDecision(app.id, app.proposalHash, 'rejected')
                        }
                      >
                        Reject Proposal
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>

              <div className="xl:col-span-4 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      1-Click Founder Directives & Demos
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Test all 6 Part 12 workflows plus CEO architectural challenge & direct Q&A.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {SAMPLE_WORKFLOW_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        disabled={isSubmittingPrompt}
                        onClick={() => void handleSendToCeo(preset)}
                        className="w-full rounded-lg border border-border bg-card p-2.5 text-left hover:border-primary/60 transition-colors space-y-1"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-foreground">
                            {preset.label}
                          </span>
                          <Badge variant="outline" className="text-[9px] font-mono">
                            Run
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          “{preset.prompt}”
                        </p>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* =====================================================================
              VIEW 3: APPROVALS (GUARDED AUTONOMY ENGINE)
             ===================================================================== */}
          {activeTab === 'approvals' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Guarded Autonomy Approval Queue & Policy Ledger
                </h2>
                <p className="text-xs text-muted-foreground">
                  Every medium/high-risk proposal is bound to a deterministic SHA-256 content hash. Approval mints a scoped HMAC capability token; timeout or silence never counts as approval.
                </p>
              </div>

              {snapshot.approvals.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-xs text-muted-foreground">
                    No approval requests generated yet. Run <strong>Workflow A (Editor UX)</strong> or <strong>Workflow B (90-Day Online Courses)</strong> in <em>Talk to CEO</em> to trigger a medium-risk approval gate.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {snapshot.approvals.map((app) => (
                    <Card
                      key={app.id}
                      className={
                        app.status === 'pending'
                          ? 'border-amber-500/60 shadow-sm'
                          : 'border-border'
                      }
                    >
                      <CardHeader className="pb-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">{app.title}</CardTitle>
                              <Badge
                                variant={getStatusBadgeVariant(app.status)}
                                className="uppercase text-[10px]"
                              >
                                {app.status}
                              </Badge>
                              <Badge
                                variant={getRiskBadgeVariant(app.riskLevel)}
                                className="uppercase text-[10px]"
                              >
                                {app.riskLevel} risk
                              </Badge>
                            </div>
                            <CardDescription className="text-xs font-mono">
                              Approval ID: {app.id} • Version: v{app.proposalVersion} • SHA-256:{' '}
                              <span className="text-foreground">{app.proposalHash}</span>
                            </CardDescription>
                          </div>
                          <div className="text-right text-xs font-mono">
                            <div>Est. Cost: {formatMinorInr(app.estimatedCostMinor)}</div>
                            <div className="text-muted-foreground">
                              Est. Duration: {app.estimatedDurationMinutes} mins
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                            <span className="font-semibold text-foreground">
                              Exact Scope & CEO Recommendation
                            </span>
                            <p className="text-muted-foreground">{app.ceoRecommendation}</p>
                          </div>
                          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                            <span className="font-semibold text-foreground">
                              Why Founder Approval Is Required
                            </span>
                            <p className="text-muted-foreground">{app.reasonForApproval}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="rounded-lg border border-border p-3 space-y-1">
                            <span className="font-semibold text-foreground">
                              Affected Repository Components
                            </span>
                            <ul className="list-disc pl-4 text-muted-foreground space-y-0.5 font-mono text-[11px]">
                              {app.affectedComponents.map((comp) => (
                                <li key={comp}>{comp}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="rounded-lg border border-border p-3 space-y-1">
                            <span className="font-semibold text-foreground">
                              Alternatives Considered
                            </span>
                            <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                              {app.alternativesConsidered.map((alt) => (
                                <li key={alt.option}>
                                  <strong>{alt.option}:</strong> {alt.tradeOff}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="rounded-lg border border-border p-3 space-y-1">
                            <span className="font-semibold text-foreground">
                              Rollback Strategy
                            </span>
                            <p className="text-muted-foreground">{app.rollbackPlan}</p>
                          </div>
                        </div>

                        {app.status === 'pending' && (
                          <div className="pt-2 space-y-2">
                            <input
                              type="text"
                              value={approvalComments[app.id] ?? ''}
                              onChange={(e) =>
                                setApprovalComments((prev) => ({
                                  ...prev,
                                  [app.id]: e.target.value,
                                }))
                              }
                              placeholder="Optional Founder conditions or audit note..."
                              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs"
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                size="sm"
                                className="h-8 text-xs gap-1.5"
                                onClick={() =>
                                  void handleApprovalDecision(
                                    app.id,
                                    app.proposalHash,
                                    'approved',
                                    'founder',
                                  )
                                }
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Approve Exact Proposal Scope
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={() =>
                                  void handleApprovalDecision(
                                    app.id,
                                    app.proposalHash,
                                    'changes_requested',
                                    'founder',
                                  )
                                }
                              >
                                Request Scope Revision
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 text-xs"
                                onClick={() =>
                                  void handleApprovalDecision(
                                    app.id,
                                    app.proposalHash,
                                    'rejected',
                                    'founder',
                                  )
                                }
                              >
                                Reject Proposal
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 text-xs ml-auto"
                                onClick={() =>
                                  void handleApprovalDecision(
                                    app.id,
                                    app.proposalHash,
                                    'approved',
                                    'department_agent',
                                  )
                                }
                              >
                                <Lock className="h-3.5 w-3.5 mr-1" />
                                Test Rule #9 (Simulate Agent Self-Approval → 403)
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              VIEW 4: TASKS & EXECUTION (DAG & CHECKPOINTS)
             ===================================================================== */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Multi-Department Execution Cycles, Task DAG & Durable Checkpoints
                </h2>
                <p className="text-xs text-muted-foreground">
                  Every cycle decomposes Founder intent into a dependency DAG with orthogonal state machines, step-level checkpoints, and independent QA verification.
                </p>
              </div>

              {snapshot.executionCycles.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-xs text-muted-foreground">
                    No execution cycles started yet. Launch a workflow in <em>Talk to CEO</em>.
                  </CardContent>
                </Card>
              ) : (
                snapshot.executionCycles.map((cycle) => {
                  const cycleTasks = snapshot.tasks.filter(
                    (t) => t.executionCycleId === cycle.id,
                  );
                  const cycleCheckpoints = snapshot.checkpoints.filter(
                    (cp) => cp.executionCycleId === cycle.id,
                  );
                  return (
                    <Card key={cycle.id}>
                      <CardHeader className="pb-3 border-b border-border">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">
                                {cycle.cycleCode}: {cycle.objective}
                              </CardTitle>
                              <Badge
                                variant={getStatusBadgeVariant(cycle.status)}
                                className="uppercase text-[10px]"
                              >
                                {cycle.status}
                              </Badge>
                              <Badge
                                variant={getRiskBadgeVariant(cycle.overallRiskLevel)}
                                className="uppercase text-[10px]"
                              >
                                {cycle.overallRiskLevel} risk
                              </Badge>
                            </div>
                            <CardDescription className="text-xs mt-1">
                              {cycle.businessRationale}
                            </CardDescription>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {cycle.status !== 'paused' &&
                              cycle.status !== 'completed' &&
                              cycle.status !== 'cancelled' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => void handleCycleControl(cycle.id, 'pause')}
                                >
                                  <PauseCircle className="h-3.5 w-3.5" />
                                  Pause
                                </Button>
                              )}
                            {cycle.status === 'paused' && (
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs gap-1"
                                onClick={() => void handleCycleControl(cycle.id, 'resume')}
                              >
                                <PlayCircle className="h-3.5 w-3.5" />
                                Resume
                              </Button>
                            )}
                            {cycle.status !== 'completed' && cycle.status !== 'cancelled' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs gap-1"
                                onClick={() => void handleCycleControl(cycle.id, 'cancel')}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Cancel Cycle
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-4 space-y-4">
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Specialist Department Task DAG ({cycleTasks.length} Tasks)
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {cycleTasks.map((task) => (
                              <div
                                key={task.id}
                                className="rounded-xl border border-border p-3 text-xs space-y-2 bg-card/50"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono font-bold text-primary">
                                    {task.code} • {task.departmentCode}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <Badge
                                      variant={getRiskBadgeVariant(task.riskLevel)}
                                      className="text-[9px] uppercase"
                                    >
                                      {task.riskLevel}
                                    </Badge>
                                    <Badge
                                      variant={getStatusBadgeVariant(task.status)}
                                      className="text-[9px] uppercase"
                                    >
                                      {task.status}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="font-semibold text-foreground">{task.title}</div>
                                <p className="text-muted-foreground text-[11px]">
                                  {task.objective}
                                </p>
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border text-[10px] font-mono text-muted-foreground">
                                  <span>Mode: {task.executionMode}</span>
                                  <span>
                                    Deps:{' '}
                                    {task.dependsOnTaskCodes.length > 0
                                      ? task.dependsOnTaskCodes.join(', ')
                                      : 'None (Root)'}
                                  </span>
                                  {task.retryCount > 0 && (
                                    <span className="text-amber-600 font-bold">
                                      QA Rework Loops: {task.retryCount}
                                    </span>
                                  )}
                                </div>

                                {task.status === 'awaiting_external_handoff' && (
                                  <div className="pt-2">
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="w-full h-7 text-[11px]"
                                      onClick={() =>
                                        void handleCycleControl(
                                          cycle.id,
                                          'complete_external_handoff',
                                          task.id,
                                        )
                                      }
                                    >
                                      Confirm External Antigravity Handoff Completed → Advance to QA
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {cycleCheckpoints.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-border">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Durable Step-Level Checkpoints ({cycleCheckpoints.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {cycleCheckpoints.map((cp) => (
                                <div
                                  key={cp.id}
                                  className="rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-[11px]"
                                >
                                  <span className="font-mono font-semibold text-foreground">
                                    {cp.milestoneKey}:
                                  </span>{' '}
                                  <span className="text-muted-foreground">{cp.summary}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* =====================================================================
              VIEW 5: DEPARTMENTS (ALL 10 ROLES)
             ===================================================================== */}
          {activeTab === 'departments' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  AI Company Organisational Structure (CEO + 9 Specialist Departments)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Each department operates with an explicit mandate, scoped context assembly, model provider assignment, tool allowlist, and prohibited action boundary.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {snapshot.departments.map((dept) => {
                  const deptTasks = snapshot.tasks.filter(
                    (t) => t.departmentCode === dept.code,
                  );
                  const completedCount = deptTasks.filter(
                    (t) => t.status === 'completed',
                  ).length;

                  return (
                    <Card key={dept.id} className={!dept.isEnabled ? 'opacity-60' : ''}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              <span>{dept.name}</span>
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {dept.code}
                              </Badge>
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                              {dept.mandate}
                            </CardDescription>
                          </div>
                          {dept.code !== 'ceo_office' && (
                            <Button
                              size="sm"
                              variant={dept.isEnabled ? 'outline' : 'default'}
                              className="h-7 text-[11px]"
                              onClick={() =>
                                void handleToggleDepartment(dept.code, !dept.isEnabled)
                              }
                            >
                              {dept.isEnabled ? 'Disable' : 'Enable'}
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2.5 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-1.5 font-mono text-[11px]">
                          <span>
                            Model: <strong>{dept.modelConfig.primaryProvider}</strong> /{' '}
                            <strong>{dept.modelConfig.primaryModel}</strong>
                          </span>
                          <span>
                            Tasks: <strong>{completedCount}/{deptTasks.length}</strong> completed
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">Allowed Tools: </span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {dept.toolPermissions
                              .filter((tp) => tp.permissionMode !== 'deny')
                              .map((t) => `${t.toolName} (${t.permissionMode})`)
                              .join(', ')}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-destructive">
                            Permission Boundaries:{' '}
                          </span>
                          <span className="text-muted-foreground">
                            {dept.permissionBoundaries.join(' • ')}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* =====================================================================
              VIEW 6: DELIVERABLES VAULT
             ===================================================================== */}
          {activeTab === 'deliverables' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    Structured Department Deliverables & Engineering PR / Handoff Packages
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Inspect PRDs, competitor research, architecture proposals, UX specs, isolated branch PR packages, Antigravity handoff bundles, QA reports, and Executive summaries.
                  </p>
                </div>
                <select
                  aria-label="Filter Deliverables by Department"
                  value={deliverableDeptFilter}
                  onChange={(e) => setDeliverableDeptFilter(e.target.value)}
                  className="h-8 rounded-md border border-border bg-background px-2.5 text-xs"
                >
                  <option value="all">All Departments ({snapshot.deliverables.length})</option>
                  {snapshot.departments.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {filteredDeliverables.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-xs text-muted-foreground">
                    No deliverables in this filter yet. Run a workflow in <em>Talk to CEO</em> to generate department artifacts.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-4 space-y-2 max-h-[600px] overflow-y-auto">
                    {filteredDeliverables.map((deliv) => (
                      <button
                        key={deliv.id}
                        type="button"
                        onClick={() => setSelectedDeliverableId(deliv.id)}
                        className={`w-full rounded-xl border p-3 text-left transition-colors space-y-1 ${
                          activeDeliverable?.id === deliv.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-card hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {deliv.departmentCode}
                          </Badge>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {deliv.deliverableType}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-foreground">
                          {deliv.title}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {deliv.summary}
                        </p>
                      </button>
                    ))}
                  </div>

                  <div className="lg:col-span-8">
                    {activeDeliverable && (
                      <Card>
                        <CardHeader className="border-b border-border pb-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <CardTitle className="text-base">
                              {activeDeliverable.title}
                            </CardTitle>
                            <Badge variant="secondary" className="font-mono text-[10px]">
                              {activeDeliverable.deliverableType}
                            </Badge>
                          </div>
                          <CardDescription className="text-xs">
                            {activeDeliverable.summary}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                          <pre className="whitespace-pre-wrap rounded-xl border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed overflow-x-auto">
                            {activeDeliverable.contentMarkdown}
                          </pre>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              VIEW 7: COMPANY KNOWLEDGE
             ===================================================================== */}
          {activeTab === 'knowledge' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Versioned Company Knowledge Repository (5 Categories)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Structured Product, Technical, Decision, Execution, and Department memory assembled into scoped context packets before every agent run.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-4">
                  {snapshot.knowledgeDocuments.map((doc) => (
                    <Card key={doc.id}>
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <CardTitle className="text-sm">{doc.title}</CardTitle>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="uppercase text-[10px] font-mono">
                              {doc.category}
                            </Badge>
                            <Badge variant="secondary" className="font-mono text-[10px]">
                              v{doc.currentVersion}
                            </Badge>
                          </div>
                        </div>
                        <CardDescription className="text-[11px] font-mono">
                          Slug: {doc.slug} • Updated by {doc.updatedBy}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <pre className="whitespace-pre-wrap rounded-lg bg-muted/30 p-3 font-mono text-xs leading-relaxed">
                          {doc.contentMarkdown}
                        </pre>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="lg:col-span-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">
                        Publish / Update Knowledge Document
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Creates a new immutable version in <code className="text-foreground">aicos_knowledge_versions</code>.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={(e) => void handleCreateKnowledgeDoc(e)} className="space-y-3 text-xs">
                        <div>
                          <label className="block font-medium mb-1">Category</label>
                          <select
                            value={newDocCategory}
                            onChange={(e) =>
                              setNewDocCategory(e.target.value as KnowledgeCategory)
                            }
                            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5"
                          >
                            <option value="product">Product Knowledge</option>
                            <option value="technical">Technical Knowledge</option>
                            <option value="decision">Decision Knowledge</option>
                            <option value="execution">Execution Knowledge</option>
                            <option value="department">Department Knowledge</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-medium mb-1">Document Title</label>
                          <input
                            type="text"
                            required
                            value={newDocTitle}
                            onChange={(e) => setNewDocTitle(e.target.value)}
                            placeholder="e.g., UPI Refund SLA Policy"
                            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5"
                          />
                        </div>
                        <div>
                          <label className="block font-medium mb-1">Slug (optional)</label>
                          <input
                            type="text"
                            value={newDocSlug}
                            onChange={(e) => setNewDocSlug(e.target.value)}
                            placeholder="upi-refund-sla-policy"
                            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-medium mb-1">Markdown Content</label>
                          <textarea
                            rows={4}
                            required
                            value={newDocContent}
                            onChange={(e) => setNewDocContent(e.target.value)}
                            placeholder="# Policy Details..."
                            className="w-full rounded-md border border-border bg-background p-2 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-medium mb-1">Change Reason</label>
                          <input
                            type="text"
                            value={newDocReason}
                            onChange={(e) => setNewDocReason(e.target.value)}
                            placeholder="Why is this knowledge being updated?"
                            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5"
                          />
                        </div>
                        <Button type="submit" size="sm" className="w-full text-xs">
                          Commit Versioned Knowledge
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              VIEW 8: DECISIONS LEDGER
             ===================================================================== */}
          {activeTab === 'decisions' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Immutable Company Decision Ledger
                </h2>
                <p className="text-xs text-muted-foreground">
                  Decisions are never silently overwritten. When strategy shifts (such as Workflow F), a new decision is created and linked via <code className="text-foreground">supersededByDecisionId</code>.
                </p>
              </div>

              <div className="space-y-3">
                {snapshot.decisions.map((dec) => (
                  <Card key={dec.id}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-base">
                          {dec.code}: {dec.title}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={dec.status === 'active' ? 'success' : 'secondary'}
                            className="uppercase text-[10px]"
                          >
                            {dec.status}
                          </Badge>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            ID: {dec.id}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <p className="text-foreground font-medium">{dec.summary}</p>
                      <p className="text-muted-foreground">
                        <strong>Rationale:</strong> {dec.rationale}
                      </p>
                      <p className="text-muted-foreground">
                        <strong>Alternatives Considered:</strong>{' '}
                        {dec.alternativesConsidered.join(' | ')}
                      </p>
                      {dec.supersededByDecisionId && (
                        <p className="font-mono text-amber-600">
                          Superseded By Decision ID: {dec.supersededByDecisionId}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* =====================================================================
              VIEW 9: REPORTS & QUALITY METRICS
             ===================================================================== */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Consolidated Executive Reports & Quality / Efficiency Telemetry
                </h2>
                <p className="text-xs text-muted-foreground">
                  Part 11 quality metrics tracking task completion, first-pass QA verification, rework loops, and token efficiency.
                </p>
              </div>

              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
                }}
              >
                <Card>
                  <CardHeader className="pb-1">
                    <CardDescription className="text-xs">Task Completion Rate</CardDescription>
                    <CardTitle className="text-2xl font-mono">
                      {snapshot.metrics.taskCompletionRatePercent}%
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    {snapshot.metrics.completedTasksCount} of {snapshot.metrics.totalTasksCount} tasks completed
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-1">
                    <CardDescription className="text-xs">First-Pass QA Pass Rate</CardDescription>
                    <CardTitle className="text-2xl font-mono">
                      {snapshot.metrics.firstPassQaSuccessRatePercent}%
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    {snapshot.metrics.totalQaChecksCount} independent QA check(s) run
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-1">
                    <CardDescription className="text-xs">Engineering Rework Loops</CardDescription>
                    <CardTitle className="text-2xl font-mono">
                      {snapshot.metrics.totalReworkLoopsCount}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    Caught by QA before reaching Founder
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-1">
                    <CardDescription className="text-xs">Cost per Completed Task</CardDescription>
                    <CardTitle className="text-2xl font-mono">
                      {formatMinorInr(snapshot.metrics.costPerCompletedTaskMinor)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    Total spend: {formatMinorInr(snapshot.metrics.totalCostMinor)}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                {snapshot.deliverables
                  .filter((d) => d.deliverableType === 'executive_report')
                  .map((report) => (
                    <Card key={report.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{report.title}</CardTitle>
                        <CardDescription className="text-xs font-mono">
                          Deliverable ID: {report.id} • v{report.version}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <pre className="whitespace-pre-wrap rounded-xl bg-muted/30 p-4 font-mono text-xs leading-relaxed">
                          {report.contentMarkdown}
                        </pre>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )}

          {/* =====================================================================
              VIEW 10: MANAGED PROJECTS
             ===================================================================== */}
          {activeTab === 'projects' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-4">
                <h2 className="text-xl font-bold tracking-tight">
                  Managed Software Projects (Multi-Project Support)
                </h2>
                {snapshot.projects.map((proj) => (
                  <Card
                    key={proj.id}
                    className={
                      proj.id === selectedProjectId ? 'border-primary' : 'border-border'
                    }
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{proj.name}</CardTitle>
                        <Badge variant="success" className="uppercase text-[10px]">
                          {proj.status}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs font-mono">
                        Slug: {proj.slug} • Branch: {proj.defaultBranch}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-xs space-y-1 text-muted-foreground">
                      <p>{proj.description}</p>
                      <p className="font-mono text-[11px]">Repo: {proj.repositoryUrl}</p>
                      <p className="font-mono text-[11px]">Workspace: {proj.workspacePath}</p>
                    </CardContent>
                    <CardFooter>
                      <Button
                        size="sm"
                        variant={proj.id === selectedProjectId ? 'secondary' : 'default'}
                        className="h-7 text-xs"
                        onClick={() => setSelectedProjectId(proj.id)}
                      >
                        {proj.id === selectedProjectId
                          ? 'Active Project'
                          : 'Switch to Project'}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>

              <div className="lg:col-span-5">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Register Additional Project</CardTitle>
                    <CardDescription className="text-xs">
                      AI-COS supports managing multiple repositories with isolated knowledge & backlog.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={(e) => void handleCreateProject(e)} className="space-y-3 text-xs">
                      <div>
                        <label className="block font-medium mb-1">Project Name</label>
                        <input
                          type="text"
                          required
                          value={newProjName}
                          onChange={(e) => setNewProjName(e.target.value)}
                          placeholder="e.g., Merchant Mobile Companion App"
                          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">Project Slug</label>
                        <input
                          type="text"
                          required
                          value={newProjSlug}
                          onChange={(e) => setNewProjSlug(e.target.value)}
                          placeholder="merchant-mobile-app"
                          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">GitHub Repository URL</label>
                        <input
                          type="text"
                          value={newProjRepo}
                          onChange={(e) => setNewProjRepo(e.target.value)}
                          placeholder="https://github.com/sabbisurendra-dev/..."
                          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">Description</label>
                        <textarea
                          rows={2}
                          value={newProjDesc}
                          onChange={(e) => setNewProjDesc(e.target.value)}
                          placeholder="Project scope and goals..."
                          className="w-full rounded-md border border-border bg-background p-2"
                        />
                      </div>
                      <Button type="submit" size="sm" className="w-full text-xs">
                        Register Managed Project
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* =====================================================================
              VIEW 11: SETTINGS, CODING CAPABILITIES & AUDIT LOG
             ===================================================================== */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    Guarded Autonomy Policy Rules, Coding Environment & Audit Ledger
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Inspect server-enforced policy rules, local Antigravity/Git capabilities, and the immutable audit trail.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => void handleResetDemoState()}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Demo State to Baseline
                </Button>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-primary" />
                    Coding-Agent & Google Antigravity Integration Capabilities
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Honest capability report from <code className="text-foreground">CodingAgentAdapterService.getCodingEnvironmentCapabilities()</code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="success">
                      Isolated Git Worktree: {snapshot.codingCapabilities.isolatedGitWorktreeSupported ? 'Active' : 'No'}
                    </Badge>
                    <Badge variant="success">
                      GitHub CLI (/opt/homebrew/bin/gh): {snapshot.codingCapabilities.githubCliInstalled ? 'Installed' : 'No'}
                    </Badge>
                    <Badge variant="success">
                      Antigravity Handoff Bundle: {snapshot.codingCapabilities.handoffBundleSupported ? 'Active' : 'No'}
                    </Badge>
                    <Badge variant="secondary">
                      Standalone agy CLI: {snapshot.codingCapabilities.antigravityCliInstalled ? 'Found' : 'Not on PATH (Uses Handoff Mode)'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Declarative Guarded Autonomy Policy Rules
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="py-2 pr-3">Rule Code</th>
                          <th className="py-2 px-3">Risk Level</th>
                          <th className="py-2 px-3">Requires Approval</th>
                          <th className="py-2 px-3">Prohibited for AI</th>
                          <th className="py-2 pl-3">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {snapshot.policyRules.map((rule) => (
                          <tr key={rule.id}>
                            <td className="py-2 pr-3 font-mono font-medium">
                              {rule.ruleCode}
                            </td>
                            <td className="py-2 px-3">
                              <Badge
                                variant={getRiskBadgeVariant(rule.riskLevel)}
                                className="uppercase text-[10px]"
                              >
                                {rule.riskLevel}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 font-mono">
                              {rule.requiresFounderApproval ? 'YES (SHA-256)' : 'NO (Autonomous)'}
                            </td>
                            <td className="py-2 px-3 font-mono">
                              {rule.isHardProhibited ? 'PROHIBITED' : 'Allowed in Scope'}
                            </td>
                            <td className="py-2 pl-3 text-muted-foreground">
                              {rule.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Immutable Security & Execution Audit Log ({snapshot.auditLogs.length} Recent Events)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="py-2 pr-3">Timestamp</th>
                          <th className="py-2 px-3">Actor</th>
                          <th className="py-2 px-3">Event Type</th>
                          <th className="py-2 pl-3">Summary</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border font-mono text-[11px]">
                        {snapshot.auditLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="py-1.5 pr-3 text-muted-foreground">
                              {new Date(log.createdAtIso).toLocaleTimeString()}
                            </td>
                            <td className="py-1.5 px-3">
                              {log.actorType}:{log.actorId}
                            </td>
                            <td className="py-1.5 px-3 font-semibold text-foreground">
                              {log.eventType}
                            </td>
                            <td className="py-1.5 pl-3 text-muted-foreground">
                              {log.summary}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
