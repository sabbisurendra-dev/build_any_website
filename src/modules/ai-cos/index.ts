import { CodingAgentAdapterService } from './adapters/coding-agent.adapter';
import { DepartmentRuntimeService } from './departments/department-runtime.service';
import { KnowledgeService } from './knowledge/knowledge.service';
import { CeoOrchestratorService } from './orchestrator/ceo-orchestrator.service';
import { CosStoreRepository, type CosRuntimeSnapshot } from './persistence/cos-store';
import {
  FounderApprovalRequiredError,
  KillSwitchActiveError,
  PolicyEngineService,
  PolicyScopeViolationError,
} from './policy/policy-engine.service';
import { BudgetExceededError, ModelRouterService } from './runtime/model-router.service';

export * from './core/cos.types';

export const codingAgentAdapter = new CodingAgentAdapterService();
export const departmentRuntime = new DepartmentRuntimeService();
export const knowledgeService = new KnowledgeService();
export const policyEngine = new PolicyEngineService();
export const modelRouter = new ModelRouterService();
export const ceoOrchestrator = new CeoOrchestratorService();

export * from './core/commerce-bridge';
export * from './departments/marketing-agent';
export * from './policy/approval-queue.service';

export {
  BudgetExceededError,
  CeoOrchestratorService,
  CodingAgentAdapterService,
  CosStoreRepository,
  type CosRuntimeSnapshot,
  DepartmentRuntimeService,
  FounderApprovalRequiredError,
  KillSwitchActiveError,
  KnowledgeService,
  ModelRouterService,
  PolicyEngineService,
  PolicyScopeViolationError,
};

export interface CosQualityAndEfficiencyMetrics {
  totalTasksCount: number;
  completedTasksCount: number;
  blockedTasksCount: number;
  failedTasksCount: number;
  awaitingApprovalTasksCount: number;
  awaitingExternalHandoffCount: number;
  taskCompletionRatePercent: number;
  totalQaChecksCount: number;
  firstPassQaSuccessRatePercent: number;
  totalReworkLoopsCount: number;
  totalCostMinor: number;
  costPerCompletedTaskMinor: number;
  pendingApprovalsCount: number;
  activeCyclesCount: number;
  completedCyclesCount: number;
  activeDecisionsCount: number;
  knowledgeDocumentsCount: number;
}

export function getCosDashboardSnapshot(projectId?: string) {
  const state = CosStoreRepository.getState();
  const activeProjectId = projectId ?? state.projects[0]?.id ?? 'proj-uwb-01';
  const project = state.projects.find((p) => p.id === activeProjectId) ?? state.projects[0]!;

  const tasks = state.tasks.filter(
    (t) => t.projectId === activeProjectId && t.status !== 'superseded',
  );
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const blockedTasks = tasks.filter((t) => t.status === 'blocked');
  const failedTasks = tasks.filter((t) => t.status === 'failed');
  const awaitingApprovalTasks = tasks.filter((t) => t.status === 'approval_pending');
  const awaitingExternalHandoffTasks = tasks.filter(
    (t) => t.status === 'awaiting_external_handoff',
  );

  const taskIds = new Set(tasks.map((t) => t.id));
  const qaChecks = state.qualityChecks.filter((q) => taskIds.has(q.taskId));
  const passedQaChecks = qaChecks.filter((q) => q.status === 'passed');
  const totalReworkLoopsCount = tasks.reduce((sum, t) => sum + t.retryCount, 0);

  const cycles = state.executionCycles.filter((c) => c.projectId === activeProjectId);
  const activeCycles = cycles.filter(
    (c) =>
      c.status === 'planning' ||
      c.status === 'running_discovery' ||
      c.status === 'executing_authorised' ||
      c.status === 'awaiting_approval' ||
      c.status === 'verifying_qa',
  );
  const completedCycles = cycles.filter((c) => c.status === 'completed');

  const approvals = state.approvals.filter((a) => a.projectId === activeProjectId);
  const pendingApprovals = approvals.filter((a) => a.status === 'pending');

  const totalCostMinor = cycles.reduce((sum, c) => sum + c.costSpentMinor, 0);
  const costPerCompletedTaskMinor =
    completedTasks.length > 0 ? Math.round(totalCostMinor / completedTasks.length) : 0;

  const metrics: CosQualityAndEfficiencyMetrics = {
    totalTasksCount: tasks.length,
    completedTasksCount: completedTasks.length,
    blockedTasksCount: blockedTasks.length,
    failedTasksCount: failedTasks.length,
    awaitingApprovalTasksCount: awaitingApprovalTasks.length,
    awaitingExternalHandoffCount: awaitingExternalHandoffTasks.length,
    taskCompletionRatePercent:
      tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 100,
    totalQaChecksCount: qaChecks.length,
    firstPassQaSuccessRatePercent:
      qaChecks.length > 0 ? Math.round((passedQaChecks.length / qaChecks.length) * 100) : 100,
    totalReworkLoopsCount,
    totalCostMinor,
    costPerCompletedTaskMinor,
    pendingApprovalsCount: pendingApprovals.length,
    activeCyclesCount: activeCycles.length,
    completedCyclesCount: completedCycles.length,
    activeDecisionsCount: state.decisions.filter(
      (d) => d.projectId === activeProjectId && d.status === 'active',
    ).length,
    knowledgeDocumentsCount: state.knowledgeDocuments.filter(
      (k) => k.projectId === activeProjectId,
    ).length,
  };

  return {
    companyProfile: state.companyProfile,
    activeProject: project,
    projects: state.projects,
    departments: state.departments,
    conversations: state.conversations.filter((c) => c.projectId === activeProjectId),
    founderRequests: state.founderRequests.filter((r) => r.projectId === activeProjectId),
    executionCycles: cycles,
    tasks: state.tasks.filter((t) => t.projectId === activeProjectId),
    checkpoints: state.checkpoints.filter((cp) => cp.projectId === activeProjectId),
    agentRuns: state.agentRuns.filter((r) => r.projectId === activeProjectId),
    agentMessages: state.agentMessages.filter((m) => m.projectId === activeProjectId),
    approvals,
    approvalEvents: state.approvalEvents.filter((e) => e.projectId === activeProjectId),
    policyRules: state.policyRules.filter((r) => r.projectId === activeProjectId),
    deliverables: state.deliverables.filter((d) => d.projectId === activeProjectId),
    githubReferences: state.githubReferences.filter((g) => g.projectId === activeProjectId),
    qualityChecks: qaChecks,
    decisions: state.decisions.filter((d) => d.projectId === activeProjectId),
    knowledgeDocuments: state.knowledgeDocuments.filter((k) => k.projectId === activeProjectId),
    knowledgeVersions: state.knowledgeVersions.filter((kv) => kv.projectId === activeProjectId),
    notifications: state.notifications.filter((n) => n.projectId === activeProjectId),
    auditLogs: state.auditLogs.filter((l) => l.projectId === activeProjectId).slice(0, 100),
    metrics,
    codingCapabilities: codingAgentAdapter.getCodingEnvironmentCapabilities(),
    providerAvailability: modelRouter.getProviderAvailabilityStatus(),
  };
}
