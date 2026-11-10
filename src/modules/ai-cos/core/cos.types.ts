import { z } from 'zod';

/**
 * ============================================================================
 * AI-COS CORE DOMAIN TYPES, STATE MACHINES & ZOD CONTRACTS
 * ============================================================================
 */

export const DEPARTMENT_CODES = [
  'ceo_office',
  'product',
  'cto_arch',
  'engineering',
  'design_ux',
  'qa_testing',
  'business_research',
  'marketing_growth',
  'data_analytics',
  'legal_compliance',
] as const;

export type DepartmentCode = (typeof DEPARTMENT_CODES)[number];

export const RISK_LEVELS = ['low', 'medium', 'high', 'prohibited'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const REQUEST_CLASSIFICATIONS = [
  'question_explanation',
  'research_request',
  'product_feedback',
  'new_feature',
  'feature_modification',
  'bug_defect',
  'design_change',
  'architecture_change',
  'technical_debt',
  'performance_issue',
  'security_issue',
  'business_strategy',
  'roadmap_reprioritisation',
  'emergency_incident',
  'approval_rejection',
  'continue_autonomous_work',
  'general_instruction',
] as const;
export type RequestClassification = (typeof REQUEST_CLASSIFICATIONS)[number];

export const FOUNDER_REQUEST_STATUSES = [
  'received',
  'clarification_needed',
  'planned',
  'executing',
  'completed',
  'superseded',
  'cancelled',
] as const;
export type FounderRequestStatus = (typeof FOUNDER_REQUEST_STATUSES)[number];

export const EXECUTION_CYCLE_STATUSES = [
  'initializing',
  'planning',
  'awaiting_clarification',
  'running_discovery',
  'awaiting_approval',
  'executing_authorised',
  'verifying_qa',
  'paused',
  'completed',
  'partially_completed',
  'blocked',
  'failed',
  'cancelled',
] as const;
export type ExecutionCycleStatus = (typeof EXECUTION_CYCLE_STATUSES)[number];

export const COS_TASK_STATUSES = [
  'new',
  'planned',
  'approval_pending',
  'approved',
  'in_progress',
  'awaiting_external_handoff',
  'review',
  'qa',
  'completed',
  'blocked',
  'rejected',
  'cancelled',
  'failed',
  'superseded',
] as const;
export type CosTaskStatus = (typeof COS_TASK_STATUSES)[number];

export const EXECUTION_MODES = [
  'in_process_specialist',
  'isolated_worktree',
  'antigravity_sdk',
  'external_handoff',
] as const;
export type ExecutionMode = (typeof EXECUTION_MODES)[number];

export const AGENT_RUN_STATUSES = ['queued', 'running', 'succeeded', 'failed', 'aborted'] as const;
export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number];

export const APPROVAL_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'changes_requested',
  'invalidated',
  'expired',
] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const DELIVERABLE_TYPES = [
  'prd',
  'research_report',
  'architecture_proposal',
  'ux_design_spec',
  'engineering_implementation',
  'antigravity_handoff_bundle',
  'pull_request_summary',
  'qa_verification_report',
  'legal_compliance_memo',
  'growth_analytics_plan',
  'executive_report',
] as const;
export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];

export const KNOWLEDGE_CATEGORIES = [
  'product',
  'technical',
  'decision',
  'execution',
  'department',
] as const;
export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number];

export const DECISION_STATUSES = ['active', 'superseded', 'revoked'] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export const QUALITY_CHECK_STATUSES = ['pending', 'passed', 'failed', 'blocked'] as const;
export type QualityCheckStatus = (typeof QUALITY_CHECK_STATUSES)[number];

/**
 * Valid Server-Side Task State Transitions (Part 8.7)
 */
export const ALLOWED_TASK_TRANSITIONS: Readonly<Record<CosTaskStatus, readonly CosTaskStatus[]>> = {
  new: ['planned', 'cancelled', 'superseded'],
  planned: ['approval_pending', 'approved', 'in_progress', 'blocked', 'cancelled', 'superseded'],
  approval_pending: ['approved', 'rejected', 'cancelled', 'superseded'],
  approved: ['in_progress', 'awaiting_external_handoff', 'blocked', 'cancelled', 'superseded'],
  in_progress: [
    'awaiting_external_handoff',
    'review',
    'qa',
    'blocked',
    'failed',
    'cancelled',
    'superseded',
  ],
  awaiting_external_handoff: ['in_progress', 'review', 'qa', 'blocked', 'cancelled', 'superseded'],
  review: ['qa', 'in_progress', 'completed', 'blocked', 'failed', 'cancelled'],
  qa: ['completed', 'in_progress', 'blocked', 'failed', 'cancelled'],
  completed: ['superseded'],
  blocked: ['planned', 'in_progress', 'approval_pending', 'cancelled', 'failed', 'superseded'],
  rejected: ['planned', 'cancelled', 'superseded'],
  cancelled: ['planned'],
  failed: ['planned', 'in_progress', 'cancelled'],
  superseded: [],
};

/**
 * ============================================================================
 * PERSISTED ENTITY INTERFACES
 * ============================================================================
 */

export interface CosCompanyProfile {
  id: string;
  name: string;
  founderName: string;
  autonomyMode: 'manual_only' | 'guarded' | 'high_autonomy';
  globalKillSwitchActive: boolean;
  maxDelegationDepth: number;
  maxParallelAgents: number;
  operatingPrinciples: string[];
  updatedAtIso: string;
}

export interface CosProject {
  id: string;
  companyProfileId: string;
  slug: string;
  name: string;
  description: string;
  repositoryUrl: string;
  defaultBranch: string;
  workspacePath: string;
  autonomyMode: 'manual_only' | 'guarded' | 'high_autonomy';
  monthlyBudgetMinor: number; // Integer minor units (paise)
  spentBudgetMinor: number;
  currency: 'INR';
  status: 'active' | 'paused' | 'archived';
  healthScore: number;
  knownGapsCount: number;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface CosToolPermission {
  toolName: string;
  permissionMode: 'allow' | 'require_approval' | 'deny';
  scopeConstraint?: string;
}

export interface CosModelRouteConfig {
  workType: string;
  reasoningTier: 'strong_reasoning' | 'strong_coding' | 'efficient_coding' | 'fast_classification' | 'independent_reviewer';
  primaryProvider: 'google_gemini' | 'anthropic' | 'openai' | 'vercel_ai_gateway';
  primaryModel: string;
  fallbackProvider: string;
  fallbackModel: string;
  maxTokensBudget: number;
}

export interface CosDepartment {
  id: string;
  code: DepartmentCode;
  name: string;
  shortLabel: string;
  mandate: string;
  responsibilities: string[];
  permissionBoundaries: string[];
  isEnabled: boolean;
  agentId: string;
  agentDisplayName: string;
  systemInstructions: string;
  modelConfig: CosModelRouteConfig;
  toolPermissions: CosToolPermission[];
}

export interface CosConversation {
  id: string;
  projectId: string;
  title: string;
  status: 'active' | 'archived';
  createdAtIso: string;
  updatedAtIso: string;
}

export interface CosFounderRequest {
  id: string;
  projectId: string;
  conversationId: string;
  rawMessage: string;
  classification: RequestClassification;
  status: FounderRequestStatus;
  ceoInterpretation: string;
  clarificationNeeded: boolean;
  clarificationQuestions: string[];
  executionCycleId?: string;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface CosTaskRecord {
  id: string;
  projectId: string;
  executionCycleId: string;
  code: string;
  title: string;
  objective: string;
  stage: 'discovery' | 'design' | 'implementation' | 'verification';
  departmentCode: DepartmentCode;
  assignedAgentId: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  approvalId?: string;
  executionMode: ExecutionMode;
  status: CosTaskStatus;
  dependsOnTaskCodes: string[];
  relevantFiles: string[];
  constraints: string[];
  acceptanceCriteria: string[];
  blockerReason?: string;
  retryCount: number;
  maxRetries: number;
  estimatedCostMinor: number;
  actualCostMinor: number;
  deliverableIds: string[];
  githubRefIds: string[];
  qualityCheckIds: string[];
  createdAtIso: string;
  updatedAtIso: string;
}

export interface CosExecutionCycle {
  id: string;
  projectId: string;
  conversationId: string;
  founderRequestId: string;
  cycleCode: string;
  objective: string;
  businessRationale: string;
  expectedOutcome: string;
  scopeItems: string[];
  outOfScopeItems: string[];
  overallRiskLevel: RiskLevel;
  status: ExecutionCycleStatus;
  planVersion: number;
  planHash: string;
  departmentsInvolved: DepartmentCode[];
  taskIds: string[];
  budgetLimitMinor: number;
  costSpentMinor: number;
  executiveReportId?: string;
  startedAtIso: string;
  pausedAtIso?: string;
  completedAtIso?: string;
  updatedAtIso: string;
}

export interface CosCheckpoint {
  id: string;
  projectId: string;
  executionCycleId: string;
  taskId?: string;
  milestoneKey: string;
  summary: string;
  stateSnapshot: Record<string, unknown>;
  gitCommitSha?: string;
  isRecoverable: boolean;
  createdAtIso: string;
}

export interface CosAgentRun {
  id: string;
  projectId: string;
  executionCycleId: string;
  taskId: string;
  agentId: string;
  departmentCode: DepartmentCode;
  provider: string;
  model: string;
  status: AgentRunStatus;
  contextSummary: string;
  toolCallsExecuted: Array<{
    toolName: string;
    argsSummary: string;
    status: 'allowed' | 'blocked_by_policy' | 'completed' | 'failed';
    timestampIso: string;
  }>;
  structuredOutput: Record<string, unknown>;
  inputTokens: number;
  outputTokens: number;
  costMinor: number;
  errorCategory?: string;
  errorDetail?: string;
  startedAtIso: string;
  endedAtIso?: string;
}

export interface CosAgentMessage {
  id: string;
  projectId: string;
  conversationId: string;
  executionCycleId?: string;
  senderRole: 'founder' | 'ceo' | 'department' | 'system';
  senderLabel: string;
  departmentCode?: DepartmentCode;
  messageType:
    | 'instruction'
    | 'direct_answer'
    | 'clarification'
    | 'execution_plan'
    | 'approval_request'
    | 'executive_report'
    | 'direction_update';
  contentMarkdown: string;
  structuredPayload?: Record<string, unknown>;
  createdAtIso: string;
}

export interface CosApprovalRecord {
  id: string;
  projectId: string;
  executionCycleId: string;
  taskId?: string;
  requestingDepartment: DepartmentCode;
  title: string;
  proposalVersion: number;
  proposalHash: string;
  riskLevel: RiskLevel;
  ceoRecommendation: string;
  reasonForApproval: string;
  affectedComponents: string[];
  expectedBenefit: string;
  potentialDownside: string;
  alternativesConsidered: Array<{ option: string; tradeOff: string }>;
  estimatedCostMinor: number;
  estimatedDurationMinutes: number;
  rollbackPlan: string;
  exactScope: {
    taskCodes: string[];
    allowedFileGlobs: string[];
    allowedTools: string[];
    summary: string;
  };
  status: ApprovalStatus;
  capabilityToken?: string;
  decidedBy?: string;
  decidedAtIso?: string;
  decisionNotes?: string;
  createdAtIso: string;
}

export interface CosApprovalEvent {
  id: string;
  projectId: string;
  approvalId: string;
  actorRole: 'founder' | 'ceo' | 'policy_engine';
  actorIdentity: string;
  eventType:
    | 'created'
    | 'approved'
    | 'rejected'
    | 'changes_requested'
    | 'question_asked'
    | 'invalidated';
  proposalVersion: number;
  proposalHash: string;
  notes?: string;
  createdAtIso: string;
}

export interface CosPolicyRule {
  id: string;
  projectId: string;
  ruleCode: string;
  name: string;
  description: string;
  actionCategory: string;
  pathPatterns: string[];
  riskLevel: RiskLevel;
  requiresFounderApproval: boolean;
  isHardProhibited: boolean;
  isActive: boolean;
}

export interface CosDeliverable {
  id: string;
  projectId: string;
  executionCycleId: string;
  taskId?: string;
  taskCode?: string;
  departmentCode: DepartmentCode;
  deliverableType: DeliverableType;
  title: string;
  summary: string;
  contentMarkdown: string;
  structuredData: Record<string, unknown>;
  artifactPath?: string;
  version: number;
  createdAtIso: string;
}

export interface CosGithubReference {
  id: string;
  projectId: string;
  executionCycleId: string;
  taskId: string;
  taskCode: string;
  refType: 'branch' | 'worktree' | 'commit' | 'pull_request' | 'issue' | 'handoff_bundle';
  refIdentifier: string;
  urlOrPath: string;
  baseBranch: string;
  baseSha?: string;
  headSha?: string;
  status: 'created' | 'ready_for_review' | 'awaiting_handoff' | 'verified' | 'merged';
  filesChanged: string[];
  createdAtIso: string;
}

export interface CosQualityCheck {
  id: string;
  projectId: string;
  executionCycleId: string;
  taskId: string;
  taskCode: string;
  reviewerAgentId: string;
  reviewerProviderModel: string;
  checkType:
    | 'unit_tests'
    | 'concurrency_tests'
    | 'typecheck_lint'
    | 'acceptance_criteria'
    | 'security_review'
    | 'browser_journey';
  status: QualityCheckStatus;
  commandsExecuted: Array<{ command: string; exitCode: number; summary: string }>;
  criteriaResults: Array<{ criterion: string; passed: boolean; evidence: string }>;
  defectsRaised: Array<{ severity: 'low' | 'medium' | 'high' | 'critical'; description: string; file?: string }>;
  createdAtIso: string;
}

export interface CosDecisionRecord {
  id: string;
  projectId: string;
  executionCycleId?: string;
  approvalId?: string;
  code: string;
  title: string;
  category: 'architecture' | 'product' | 'security' | 'autonomy' | 'roadmap';
  origin: 'founder' | 'ceo_proposal' | 'cto_adr';
  summary: string;
  rationale: string;
  alternativesConsidered: string[];
  status: DecisionStatus;
  supersededByDecisionId?: string;
  authorisedBy: string;
  decidedAtIso: string;
}

export interface CosKnowledgeDocument {
  id: string;
  projectId: string;
  slug: string;
  title: string;
  category: KnowledgeCategory;
  tags: string[];
  currentVersion: number;
  contentMarkdown: string;
  sourceFiles: string[];
  updatedBy: string;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface CosKnowledgeVersion {
  id: string;
  projectId: string;
  documentId: string;
  versionNumber: number;
  changeSummary: string;
  contentMarkdown: string;
  authorisedBy: string;
  createdAtIso: string;
}

export interface CosNotification {
  id: string;
  projectId: string;
  executionCycleId?: string;
  category:
    | 'approval_required'
    | 'cycle_completed'
    | 'critical_issue'
    | 'security_alert'
    | 'report_ready';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  isRead: boolean;
  createdAtIso: string;
}

export interface CosAuditLog {
  id: string;
  projectId: string;
  executionCycleId?: string;
  taskId?: string;
  actorType: 'founder' | 'ceo' | 'department_agent' | 'policy_engine' | 'workflow_engine';
  actorId: string;
  eventType: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAtIso: string;
}

/**
 * ============================================================================
 * ZOD VALIDATION CONTRACTS FOR STRUCTURED AGENT OUTPUTS
 * ============================================================================
 */

export const PlannedTaskInputSchema = z.object({
  code: z.string().min(2),
  title: z.string().min(3),
  objective: z.string().min(5),
  stage: z.enum(['discovery', 'design', 'implementation', 'verification']),
  departmentCode: z.enum(DEPARTMENT_CODES),
  dependsOnTaskCodes: z.array(z.string()).default([]),
  riskLevel: z.enum(RISK_LEVELS),
  requiresApproval: z.boolean(),
  executionMode: z.enum(EXECUTION_MODES).default('in_process_specialist'),
  relevantFiles: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  acceptanceCriteria: z.array(z.string()).min(1),
  estimatedCostMinor: z.number().int().nonnegative().default(500),
});

export const CeoExecutionPlanSchema = z.object({
  classification: z.enum(REQUEST_CLASSIFICATIONS),
  ceoInterpretation: z.string().min(5),
  clarificationNeeded: z.boolean().default(false),
  clarificationQuestions: z.array(z.string()).default([]),
  directAnswerMarkdown: z.string().optional(),
  objective: z.string().min(5),
  businessRationale: z.string().min(5),
  expectedOutcome: z.string().min(5),
  scopeItems: z.array(z.string()).min(1),
  outOfScopeItems: z.array(z.string()).default([]),
  overallRiskLevel: z.enum(RISK_LEVELS),
  departmentsInvolved: z.array(z.enum(DEPARTMENT_CODES)).min(1),
  tasks: z.array(PlannedTaskInputSchema),
  approvalProposal: z
    .object({
      title: z.string(),
      requestingDepartment: z.enum(DEPARTMENT_CODES),
      riskLevel: z.enum(RISK_LEVELS),
      ceoRecommendation: z.string(),
      reasonForApproval: z.string(),
      affectedComponents: z.array(z.string()),
      expectedBenefit: z.string(),
      potentialDownside: z.string(),
      alternativesConsidered: z.array(
        z.object({
          option: z.string(),
          tradeOff: z.string(),
        }),
      ),
      estimatedCostMinor: z.number().int().nonnegative(),
      estimatedDurationMinutes: z.number().int().positive(),
      rollbackPlan: z.string(),
      allowedFileGlobs: z.array(z.string()),
      allowedTools: z.array(z.string()),
    })
    .optional(),
});

export type CeoExecutionPlan = z.infer<typeof CeoExecutionPlanSchema>;

export const DepartmentStructuredOutputSchema = z.object({
  taskCode: z.string(),
  departmentCode: z.enum(DEPARTMENT_CODES),
  deliverableType: z.enum(DELIVERABLE_TYPES),
  title: z.string(),
  summary: z.string(),
  factsVerified: z.array(z.string()).default([]),
  assumptionsMade: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).min(1),
  affectedFiles: z.array(z.string()).default([]),
  risksIdentified: z.array(z.string()).default([]),
  contentMarkdown: z.string().min(10),
  structuredArtifact: z.record(z.unknown()).default({}),
});

export type DepartmentStructuredOutput = z.infer<typeof DepartmentStructuredOutputSchema>;

export const QaVerificationVerdictSchema = z.object({
  taskCode: z.string(),
  passed: z.boolean(),
  checkType: z.enum([
    'unit_tests',
    'concurrency_tests',
    'typecheck_lint',
    'acceptance_criteria',
    'security_review',
    'browser_journey',
  ]),
  commandsExecuted: z.array(
    z.object({
      command: z.string(),
      exitCode: z.number().int(),
      summary: z.string(),
    }),
  ),
  criteriaResults: z.array(
    z.object({
      criterion: z.string(),
      passed: z.boolean(),
      evidence: z.string(),
    }),
  ),
  defectsRaised: z
    .array(
      z.object({
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        description: z.string(),
        file: z.string().optional(),
      }),
    )
    .default([]),
});

export type QaVerificationVerdict = z.infer<typeof QaVerificationVerdictSchema>;
