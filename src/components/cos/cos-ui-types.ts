'use client';

import type { getCosDashboardSnapshot } from '@/modules/ai-cos';

export type DashboardSnapshot = ReturnType<typeof getCosDashboardSnapshot>;

export type CosNavTab =
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

export interface SamplePreset {
  id: string;
  label: string;
  badge: string;
  prompt: string;
  description: string;
}

export const SAMPLE_WORKFLOW_PRESETS: SamplePreset[] = [
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

export function formatMinorInr(minor: number): string {
  const rupees = minor / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function getRiskBadgeVariant(
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

export function getStatusBadgeVariant(
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
