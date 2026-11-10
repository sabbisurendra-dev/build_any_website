import {
  boolean,
  char,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * ============================================================================
 * AI COMPANY OPERATING SYSTEM (AI-COS) — DRIZZLE POSTGRESQL SCHEMA
 * ============================================================================
 * Every project-scoped entity carries `project_id` referencing `aicos_projects(id)`.
 * Separate orthogonal state machines are enforced for Founder Requests,
 * Execution Cycles, Tasks, Agent Runs, Approvals, Deliverables, and QA Checks.
 */

export const aicosAutonomyModeEnum = pgEnum('aicos_autonomy_mode', [
  'manual_only',
  'guarded',
  'high_autonomy',
]);

export const aicosRiskLevelEnum = pgEnum('aicos_risk_level', [
  'low',
  'medium',
  'high',
  'prohibited',
]);

export const aicosDepartmentCodeEnum = pgEnum('aicos_department_code', [
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
]);

export const aicosRequestClassificationEnum = pgEnum('aicos_request_classification', [
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
]);

export const aicosFounderRequestStatusEnum = pgEnum('aicos_founder_request_status', [
  'received',
  'clarification_needed',
  'planned',
  'executing',
  'completed',
  'superseded',
  'cancelled',
]);

export const aicosExecutionCycleStatusEnum = pgEnum('aicos_execution_cycle_status', [
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
]);

export const aicosTaskStatusEnum = pgEnum('aicos_task_status', [
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
]);

export const aicosExecutionModeEnum = pgEnum('aicos_execution_mode', [
  'in_process_specialist',
  'isolated_worktree',
  'antigravity_sdk',
  'external_handoff',
]);

export const aicosAgentRunStatusEnum = pgEnum('aicos_agent_run_status', [
  'queued',
  'running',
  'succeeded',
  'failed',
  'aborted',
]);

export const aicosApprovalStatusEnum = pgEnum('aicos_approval_status', [
  'pending',
  'approved',
  'rejected',
  'changes_requested',
  'invalidated',
  'expired',
]);

export const aicosDeliverableTypeEnum = pgEnum('aicos_deliverable_type', [
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
]);

export const aicosKnowledgeCategoryEnum = pgEnum('aicos_knowledge_category', [
  'product',
  'technical',
  'decision',
  'execution',
  'department',
]);

export const aicosDecisionStatusEnum = pgEnum('aicos_decision_status', [
  'active',
  'superseded',
  'revoked',
]);

export const aicosQualityCheckStatusEnum = pgEnum('aicos_quality_check_status', [
  'pending',
  'passed',
  'failed',
  'blocked',
]);

/**
 * 1. COMPANY PROFILES (`aicos_company_profiles`)
 */
export const aicosCompanyProfiles = pgTable('aicos_company_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 180 }).notNull(),
  founderName: varchar('founder_name', { length: 140 }).notNull().default('Human Founder & Chairman'),
  autonomyMode: aicosAutonomyModeEnum('autonomy_mode').notNull().default('guarded'),
  globalKillSwitchActive: boolean('global_kill_switch_active').notNull().default(false),
  maxDelegationDepth: integer('max_delegation_depth').notNull().default(2),
  maxParallelAgents: integer('max_parallel_agents').notNull().default(4),
  operatingPrinciples: jsonb('operating_principles').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * 2. MANAGED PROJECTS (`aicos_projects`)
 */
export const aicosProjects = pgTable(
  'aicos_projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyProfileId: uuid('company_profile_id')
      .notNull()
      .references(() => aicosCompanyProfiles.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 120 }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description').notNull(),
    repositoryUrl: varchar('repository_url', { length: 500 }).notNull(),
    defaultBranch: varchar('default_branch', { length: 80 }).notNull().default('main'),
    workspacePath: varchar('workspace_path', { length: 500 }).notNull(),
    autonomyMode: aicosAutonomyModeEnum('autonomy_mode').notNull().default('guarded'),
    monthlyBudgetMinor: integer('monthly_budget_minor').notNull().default(5000000), // ₹50,000 in paise
    spentBudgetMinor: integer('spent_budget_minor').notNull().default(0),
    currency: char('currency', { length: 3 }).notNull().default('INR'),
    status: varchar('status', { length: 40 }).notNull().default('active'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('uq_aicos_projects_slug').on(t.slug)],
);

/**
 * 3. SPECIALIST DEPARTMENTS (`aicos_departments`)
 */
export const aicosDepartments = pgTable(
  'aicos_departments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyProfileId: uuid('company_profile_id')
      .notNull()
      .references(() => aicosCompanyProfiles.id, { onDelete: 'cascade' }),
    code: aicosDepartmentCodeEnum('code').notNull(),
    name: varchar('name', { length: 140 }).notNull(),
    mandate: text('mandate').notNull(),
    responsibilities: jsonb('responsibilities').$type<string[]>().notNull().default([]),
    permissionBoundaries: jsonb('permission_boundaries').$type<string[]>().notNull().default([]),
    isEnabled: boolean('is_enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('uq_aicos_departments_code').on(t.companyProfileId, t.code)],
);

/**
 * 4. AGENTS (`aicos_agents`)
 */
export const aicosAgents = pgTable(
  'aicos_agents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    departmentId: uuid('department_id')
      .notNull()
      .references(() => aicosDepartments.id, { onDelete: 'cascade' }),
    roleKey: varchar('role_key', { length: 100 }).notNull(),
    displayName: varchar('display_name', { length: 140 }).notNull(),
    systemInstructions: text('system_instructions').notNull(),
    maxSubagentDepth: integer('max_subagent_depth').notNull().default(1),
    maxRetries: integer('max_retries').notNull().default(2),
    isEnabled: boolean('is_enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('uq_aicos_agents_role_key').on(t.roleKey)],
);

/**
 * 5. AGENT MODEL CONFIGURATIONS (`aicos_agent_model_configs`)
 */
export const aicosAgentModelConfigs = pgTable(
  'aicos_agent_model_configs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => aicosAgents.id, { onDelete: 'cascade' }),
    workType: varchar('work_type', { length: 100 }).notNull(),
    reasoningTier: varchar('reasoning_tier', { length: 64 }).notNull(),
    primaryProvider: varchar('primary_provider', { length: 64 }).notNull(),
    primaryModel: varchar('primary_model', { length: 120 }).notNull(),
    fallbackProvider: varchar('fallback_provider', { length: 64 }).notNull(),
    fallbackModel: varchar('fallback_model', { length: 120 }).notNull(),
    maxTokensBudget: integer('max_tokens_budget').notNull().default(32000),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_aicos_model_configs_agent').on(t.agentId)],
);

/**
 * 6. AGENT TOOL PERMISSIONS (`aicos_agent_tool_permissions`)
 */
export const aicosAgentToolPermissions = pgTable(
  'aicos_agent_tool_permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => aicosAgents.id, { onDelete: 'cascade' }),
    toolName: varchar('tool_name', { length: 120 }).notNull(),
    permissionMode: varchar('permission_mode', { length: 32 }).notNull().default('allow'), // allow | require_approval | deny
    scopeConstraint: varchar('scope_constraint', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('uq_aicos_agent_tool').on(t.agentId, t.toolName)],
);

/**
 * 7. CONVERSATIONS (`aicos_conversations`)
 */
export const aicosConversations = pgTable(
  'aicos_conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => aicosProjects.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 240 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_aicos_conversations_project').on(t.projectId)],
);

/**
 * 8. FOUNDER REQUESTS (`aicos_founder_requests`)
 */
export const aicosFounderRequests = pgTable(
  'aicos_founder_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => aicosProjects.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => aicosConversations.id, { onDelete: 'cascade' }),
    rawMessage: text('raw_message').notNull(),
    classification: aicosRequestClassificationEnum('classification').notNull(),
    status: aicosFounderRequestStatusEnum('status').notNull().default('received'),
    ceoInterpretation: text('ceo_interpretation').notNull(),
    clarificationNeeded: boolean('clarification_needed').notNull().default(false),
    clarificationQuestions: jsonb('clarification_questions').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_aicos_founder_requests_project').on(t.projectId, t.status)],
);

/**
 * 9. EXECUTION CYCLES (`aicos_execution_cycles`)
 */
export const aicosExecutionCycles = pgTable(
  'aicos_execution_cycles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => aicosProjects.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => aicosConversations.id, { onDelete: 'cascade' }),
    founderRequestId: uuid('founder_request_id')
      .notNull()
      .references(() => aicosFounderRequests.id, { onDelete: 'cascade' }),
    cycleCode: varchar('cycle_code', { length: 40 }).notNull(),
    objective: text('objective').notNull(),
    businessRationale: text('business_rationale').notNull(),
    expectedOutcome: text('expected_outcome').notNull(),
    scopeItems: jsonb('scope_items').$type<string[]>().notNull().default([]),
    outOfScopeItems: jsonb('out_of_scope_items').$type<string[]>().notNull().default([]),
    overallRiskLevel: aicosRiskLevelEnum('overall_risk_level').notNull().default('low'),
    status: aicosExecutionCycleStatusEnum('status').notNull().default('initializing'),
    planVersion: integer('plan_version').notNull().default(1),
    planHash: varchar('plan_hash', { length: 128 }).notNull(),
    departmentsInvolved: jsonb('departments_involved').$type<string[]>().notNull().default([]),
    budgetLimitMinor: integer('budget_limit_minor').notNull().default(250000),
    costSpentMinor: integer('cost_spent_minor').notNull().default(0),
    executiveReportId: uuid('executive_report_id'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    pausedAt: timestamp('paused_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_aicos_cycles_project_code').on(t.projectId, t.cycleCode),
    index('idx_aicos_cycles_project_status').on(t.projectId, t.status),
  ],
);

/**
 * 10. TASKS (`aicos_tasks`)
 */
export const aicosTasks = pgTable(
  'aicos_tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => aicosProjects.id, { onDelete: 'cascade' }),
    executionCycleId: uuid('execution_cycle_id')
      .notNull()
      .references(() => aicosExecutionCycles.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 40 }).notNull(),
    title: varchar('title', { length: 240 }).notNull(),
    objective: text('objective').notNull(),
    stage: varchar('stage', { length: 40 }).notNull().default('discovery'), // discovery | design | implementation | verification
    departmentCode: aicosDepartmentCodeEnum('department_code').notNull(),
    assignedAgentId: uuid('assigned_agent_id').references(() => aicosAgents.id, {
      onDelete: 'set null',
    }),
    riskLevel: aicosRiskLevelEnum('risk_level').notNull().default('low'),
    requiresApproval: boolean('requires_approval').notNull().default(false),
    approvalId: uuid('approval_id'),
    executionMode: aicosExecutionModeEnum('execution_mode')
      .notNull()
      .default('in_process_specialist'),
    status: aicosTaskStatusEnum('status').notNull().default('new'),
    relevantFiles: jsonb('relevant_files').$type<string[]>().notNull().default([]),
    constraints: jsonb('constraints').$type<string[]>().notNull().default([]),
    acceptanceCriteria: jsonb('acceptance_criteria').$type<string[]>().notNull().default([]),
    blockerReason: text('blocker_reason'),
    retryCount: integer('retry_count').notNull().default(0),
    maxRetries: integer('max_retries').notNull().default(2),
    estimatedCostMinor: integer('estimated_cost_minor').notNull().default(500),
    actualCostMinor: integer('actual_cost_minor').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_aicos_tasks_cycle_code').on(t.executionCycleId, t.code),
    index('idx_aicos_tasks_project_status').on(t.projectId, t.status),
  ],
);

/**
 * 11. TASK DEPENDENCIES (`aicos_task_dependencies`)
 */
export const aicosTaskDependencies = pgTable(
  'aicos_task_dependencies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => aicosProjects.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id')
      .notNull()
      .references(() => aicosTasks.id, { onDelete: 'cascade' }),
    dependsOnTaskId: uuid('depends_on_task_id')
      .notNull()
      .references(() => aicosTasks.id, { onDelete: 'cascade' }),
    dependencyType: varchar('dependency_type', { length: 40 }).notNull().default('blocking'),
  },
  (t) => [index('idx_aicos_task_deps_task').on(t.taskId)],
);

/**
 * 12. DURABLE CHECKPOINTS (`aicos_checkpoints`)
 */
export const aicosCheckpoints = pgTable(
  'aicos_checkpoints',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => aicosProjects.id, { onDelete: 'cascade' }),
    executionCycleId: uuid('execution_cycle_id')
      .notNull()
      .references(() => aicosExecutionCycles.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id').references(() => aicosTasks.id, { onDelete: 'set null' }),
    milestoneKey: varchar('milestone_key', { length: 100 }).notNull(),
    summary: text('summary').notNull(),
    stateSnapshot: jsonb('state_snapshot').$type<Record<string, unknown>>().notNull().default({}),
    gitCommitSha: varchar('git_commit_sha', { length: 64 }),
    isRecoverable: boolean('is_recoverable').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_aicos_checkpoints_cycle').on(t.executionCycleId, t.createdAt)],
);

/**
 * 13. AGENT RUNS (`aicos_agent_runs`)
 */
export const aicosAgentRuns = pgTable(
  'aicos_agent_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => aicosProjects.id, { onDelete: 'cascade' }),
    executionCycleId: uuid('execution_cycle_id')
      .notNull()
      .references(() => aicosExecutionCycles.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id')
      .notNull()
      .references(() => aicosTasks.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => aicosAgents.id, { onDelete: 'cascade' }),
    departmentCode: aicosDepartmentCodeEnum('department_code').notNull(),
    provider: varchar('provider', { length: 64 }).notNull(),
    model: varchar('model', { length: 120 }).notNull(),
    status: aicosAgentRunStatusEnum('status').notNull().default('queued'),
    contextSummary: text('context_summary').notNull(),
    toolCallsExecuted: jsonb('tool_calls_executed')
      .$type<Array<{ toolName: string; argsSummary: string; status: string; timestampIso: string }>>()
      .notNull()
      .default([]),
    structuredOutput: jsonb('structured_output')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    errorCategory: varchar('error_category', { length: 64 }),
    errorDetail: text('error_detail'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (t) => [index('idx_aicos_agent_runs_task').on(t.taskId)],
);

/**
 * 14. AGENT & CONVERSATION MESSAGES (`aicos_agent_messages`)
 */
export const aicosAgentMessages = pgTable(
  'aicos_agent_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => aicosProjects.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => aicosConversations.id, { onDelete: 'cascade' }),
    executionCycleId: uuid('execution_cycle_id').references(() => aicosExecutionCycles.id, {
      onDelete: 'set null',
    }),
    senderRole: varchar('sender_role', { length: 40 }).notNull(), // founder | ceo | department | system
    senderLabel: varchar('sender_label', { length: 120 }).notNull(),
    messageType: varchar('message_type', { length: 48 }).notNull(), // instruction | clarification | plan | approval_card | executive_report | feedback_response
    contentMarkdown: text('content_markdown').notNull(),
    structuredPayload: jsonb('structured_payload').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_aicos_messages_conv').on(t.conversationId, t.createdAt)],
);

/**
 * 15. APPROVALS (`aicos_approvals`)
 */
export const aicosApprovals = pgTable(
  'aicos_approvals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => aicosProjects.id, { onDelete: 'cascade' }),
    executionCycleId: uuid('execution_cycle_id')
      .notNull()
      .references(() => aicosExecutionCycles.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id').references(() => aicosTasks.id, { onDelete: 'set null' }),
    requestingDepartment: aicosDepartmentCodeEnum('requesting_department').notNull(),
    title: varchar('title', { length: 240 }).notNull(),
    proposalVersion: integer('proposal_version').notNull().default(1),
    proposalHash: varchar('proposal_hash', { length: 128 }).notNull(),
    riskLevel: aicosRiskLevelEnum('risk_level').notNull(),
    ceoRecommendation: text('ceo_recommendation').notNull(),
    reasonForApproval: text('reason_for_approval').notNull(),
    affectedComponents: jsonb('affected_components').$type<string[]>().notNull().default([]),
    expectedBenefit: text('expected_benefit').notNull(),
    potentialDownside: text('potential_downside').notNull(),
    alternativesConsidered: jsonb('alternatives_considered')
      .$type<Array<{ option: string; tradeOff: string }>>()
      .notNull()
      .default([]),
    estimatedCostMinor: integer('estimated_cost_minor').notNull().default(0),
    estimatedDurationMinutes: integer('estimated_duration_minutes').notNull().default(15),
    rollbackPlan: text('rollback_plan').notNull(),
    exactScope: jsonb('exact_scope').$type<Record<string, unknown>>().notNull().default({}),
    status: aicosApprovalStatusEnum('status').notNull().default('pending'),
    capabilityToken: varchar('capability_token', { length: 255 }),
    decidedBy: varchar('decided_by', { length: 120 }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decisionNotes: text('decision_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_aicos_approvals_project_status').on(t.projectId, t.status),
    index('idx_aicos_approvals_hash').on(t.proposalHash),
  ],
);

/**
 * 16. APPROVAL EVENTS (`aicos_approval_events` — Immutable Audit Trail)
 */
export const aicosApprovalEvents = pgTable(
  'aicos_approval_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => aicosProjects.id, { onDelete: 'cascade' }),
    approvalId: uuid('approval_id')
      .notNull()
      .references(() => aicosApprovals.id, { onDelete: 'cascade' }),
    actorRole: varchar('actor_role', { length: 48 }).notNull(),
    actorIdentity: varchar('actor_identity', { length: 140 }).notNull(),
    eventType: varchar('event_type', { length: 48 }).notNull(), // created | approved | rejected | changes_requested | question_asked | invalidated
    proposalVersion: integer('proposal_version').notNull(),
    proposalHash: varchar('proposal_hash', { length: 128 }).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_aicos_approval_events_approval').on(t.approvalId)],
);

/**
 * 17. POLICY RULES (`aicos_policy_rules`)
 */
export const aicosPolicyRules = pgTable(
  'aicos_policy_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => aicosProjects.id, { onDelete: 'cascade' }),
    ruleCode: varchar('rule_code', { length: 80 }).notNull(),
    name: varchar('name', { length: 180 }).notNull(),
    description: text('description').notNull(),
    actionCategory: varchar('action_category', { length: 80 }).notNull(),
    pathPatterns: jsonb('path_patterns').$type<string[]>().notNull().default([]),
    riskLevel: aicosRiskLevelEnum('risk_level').notNull(),
    requiresFounderApproval: boolean('requires_founder_approval').notNull().default(false),
    isHardProhibited: boolean('is_hard_prohibited').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('uq_aicos_policy_rules_code').on(t.projectId, t.ruleCode)],
);

/**
 * 18. DELIVERABLES (`aicos_deliverables`)
 */
export const aicosDeliverables = pgTable(
  'aicos_deliverables',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => aicosProjects.id, { onDelete: 'cascade' }),
    executionCycleId: uuid('execution_cycle_id')
      .notNull()
      .references(() => aicosExecutionCycles.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id').references(() => aicosTasks.id, { onDelete: 'set null' }),
    departmentCode: aicosDepartmentCodeEnum('department_code').notNull(),
    deliverableType: aicosDeliverableTypeEnum('deliverable_type').notNull(),
    title: varchar('title', { length: 240 }).notNull(),
    summary: text('summary').notNull(),
    contentMarkdown: text('content_markdown').notNull(),
    structuredData: jsonb('structured_data').$type<Record<string, unknown>>().notNull().default({}),
    artifactPath: varchar('artifact_path', { length: 500 }),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_aicos_deliverables_project_cycle').on(t.projectId, t.executionCycleId)],
);

/**
 * 19. GITHUB & WORKSPACE REFERENCES (`aicos_github_references`)
 */
export const aicosGithubReferences = pgTable(
  'aicos_github_references',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => aicosProjects.id, { onDelete: 'cascade' }),
    executionCycleId: uuid('execution_cycle_id')
      .notNull()
      .references(() => aicosExecutionCycles.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id')
      .notNull()
      .references(() => aicosTasks.id, { onDelete: 'cascade' }),
    refType: varchar('ref_type', { length: 40 }).notNull(), // branch | worktree | commit | pull_request | issue | handoff_bundle
    refIdentifier: varchar('ref_identifier', { length: 255 }).notNull(),
    urlOrPath: varchar('url_or_path', { length: 500 }).notNull(),
    baseBranch: varchar('base_branch', { length: 80 }).notNull().default('main'),
    baseSha: varchar('base_sha', { length: 64 }),
    headSha: varchar('head_sha', { length: 64 }),
    status: varchar('status', { length: 48 }).notNull().default('created'),
    filesChanged: jsonb('files_changed').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_aicos_github_refs_task').on(t.taskId)],
);

/**
 * 20. INDEPENDENT QUALITY CHECKS (`aicos_quality_checks`)
 */
export const aicosQualityChecks = pgTable(
  'aicos_quality_checks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => aicosProjects.id, { onDelete: 'cascade' }),
    executionCycleId: uuid('execution_cycle_id')
      .notNull()
      .references(() => aicosExecutionCycles.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id')
      .notNull()
      .references(() => aicosTasks.id, { onDelete: 'cascade' }),
    reviewerAgentId: uuid('reviewer_agent_id').references(() => aicosAgents.id, {
      onDelete: 'set null',
    }),
    reviewerProviderModel: varchar('reviewer_provider_model', { length: 140 }).notNull(),
    checkType: varchar('check_type', { length: 64 }).notNull(), // unit_tests | concurrency_tests | typecheck_lint | acceptance_criteria | security_review | browser_journey
    status: aicosQualityCheckStatusEnum('status').notNull().default('pending'),
    commandsExecuted: jsonb('commands_executed')
      .$type<Array<{ command: string; exitCode: number; summary: string }>>()
      .notNull()
      .default([]),
    criteriaResults: jsonb('criteria_results')
      .$type<Array<{ criterion: string; passed: boolean; evidence: string }>>()
      .notNull()
      .default([]),
    defectsRaised: jsonb('defects_raised')
      .$type<Array<{ severity: string; description: string; file?: string }>>()
      .notNull()
      .default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_aicos_quality_checks_task').on(t.taskId)],
);

/**
 * 21. DECISIONS LEDGER (`aicos_decisions`)
 */
export const aicosDecisions = pgTable(
  'aicos_decisions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => aicosProjects.id, { onDelete: 'cascade' }),
    executionCycleId: uuid('execution_cycle_id').references(() => aicosExecutionCycles.id, {
      onDelete: 'set null',
    }),
    approvalId: uuid('approval_id').references(() => aicosApprovals.id, {
      onDelete: 'set null',
    }),
    code: varchar('code', { length: 48 }).notNull(),
    title: varchar('title', { length: 240 }).notNull(),
    category: varchar('category', { length: 64 }).notNull(), // architecture | product | security | autonomy | roadmap
    origin: varchar('origin', { length: 80 }).notNull(), // founder | ceo_proposal | cto_adr
    summary: text('summary').notNull(),
    rationale: text('rationale').notNull(),
    alternativesConsidered: jsonb('alternatives_considered').$type<string[]>().notNull().default([]),
    status: aicosDecisionStatusEnum('status').notNull().default('active'),
    supersededByDecisionId: uuid('superseded_by_decision_id'),
    authorisedBy: varchar('authorised_by', { length: 140 }).notNull(),
    decidedAt: timestamp('decided_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_aicos_decisions_project_status').on(t.projectId, t.status)],
);

/**
 * 22. KNOWLEDGE DOCUMENTS (`aicos_knowledge_documents`) & 23. VERSIONS (`aicos_knowledge_versions`)
 */
export const aicosKnowledgeDocuments = pgTable(
  'aicos_knowledge_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => aicosProjects.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 140 }).notNull(),
    title: varchar('title', { length: 240 }).notNull(),
    category: aicosKnowledgeCategoryEnum('category').notNull(),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    currentVersion: integer('current_version').notNull().default(1),
    contentMarkdown: text('content_markdown').notNull(),
    sourceFiles: jsonb('source_files').$type<string[]>().notNull().default([]),
    updatedBy: varchar('updated_by', { length: 120 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('uq_aicos_knowledge_project_slug').on(t.projectId, t.slug)],
);

export const aicosKnowledgeVersions = pgTable(
  'aicos_knowledge_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => aicosProjects.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => aicosKnowledgeDocuments.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    changeSummary: text('change_summary').notNull(),
    contentMarkdown: text('content_markdown').notNull(),
    authorisedBy: varchar('authorised_by', { length: 120 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_aicos_knowledge_versions_doc').on(t.documentId, t.versionNumber)],
);

/**
 * 24. FOUNDER NOTIFICATIONS (`aicos_notifications`)
 */
export const aicosNotifications = pgTable(
  'aicos_notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => aicosProjects.id, { onDelete: 'cascade' }),
    executionCycleId: uuid('execution_cycle_id').references(() => aicosExecutionCycles.id, {
      onDelete: 'set null',
    }),
    category: varchar('category', { length: 64 }).notNull(), // approval_required | cycle_completed | critical_issue | security_alert | report_ready
    severity: varchar('severity', { length: 32 }).notNull().default('info'), // info | warning | critical
    title: varchar('title', { length: 240 }).notNull(),
    message: text('message').notNull(),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_aicos_notifications_project_read').on(t.projectId, t.isRead)],
);

/**
 * 25. MODEL USAGE (`aicos_model_usage`) & AUDIT LOGS (`aicos_audit_logs`)
 */
export const aicosModelUsage = pgTable(
  'aicos_model_usage',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => aicosProjects.id, { onDelete: 'cascade' }),
    executionCycleId: uuid('execution_cycle_id').references(() => aicosExecutionCycles.id, {
      onDelete: 'set null',
    }),
    agentRunId: uuid('agent_run_id').references(() => aicosAgentRuns.id, {
      onDelete: 'set null',
    }),
    provider: varchar('provider', { length: 64 }).notNull(),
    model: varchar('model', { length: 120 }).notNull(),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    estimatedCostMinor: integer('estimated_cost_minor').notNull().default(0),
    currency: char('currency', { length: 3 }).notNull().default('INR'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_aicos_model_usage_project').on(t.projectId, t.createdAt)],
);

export const aicosAuditLogs = pgTable(
  'aicos_audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => aicosProjects.id, { onDelete: 'cascade' }),
    executionCycleId: uuid('execution_cycle_id'),
    taskId: uuid('task_id'),
    actorType: varchar('actor_type', { length: 48 }).notNull(), // founder | ceo | department_agent | policy_engine | workflow_engine
    actorId: varchar('actor_id', { length: 120 }).notNull(),
    eventType: varchar('event_type', { length: 80 }).notNull(),
    summary: text('summary').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_aicos_audit_logs_project_time').on(t.projectId, t.createdAt)],
);
