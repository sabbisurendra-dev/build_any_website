import { createHash, createHmac } from 'node:crypto';
import { AppError } from '@/lib/errors';
import type {
  CosApprovalEvent,
  CosApprovalRecord,
  CosTaskRecord,
  CosTaskStatus,
  DepartmentCode,
  RiskLevel,
} from '@/modules/ai-cos/core/cos.types';
import { ALLOWED_TASK_TRANSITIONS } from '@/modules/ai-cos/core/cos.types';
import { CosStoreRepository } from '@/modules/ai-cos/persistence/cos-store';

/**
 * ============================================================================
 * AI-COS DETERMINISTIC POLICY & APPROVAL ENGINE (PART 2.1, 6.9, 8.1D, 12)
 * ============================================================================
 * Enforces Guarded Autonomy and all 14 Founder Approval Rules at the backend
 * and tool-execution boundary — completely independent of LLM reasoning.
 */

const CAPABILITY_SIGNING_SECRET =
  process.env.CRON_SECRET ?? 'aicos-internal-capability-hmac-secret-v1';

export class PolicyScopeViolationError extends AppError {
  constructor(message: string) {
    super('POLICY_SCOPE_VIOLATION', message, 403);
  }
}

export class FounderApprovalRequiredError extends AppError {
  constructor(message: string) {
    super('FOUNDER_APPROVAL_REQUIRED', message, 403);
  }
}

export class KillSwitchActiveError extends AppError {
  constructor(message: string) {
    super('KILL_SWITCH_ACTIVE', message, 423);
  }
}

export class PolicyEngineService {
  /**
   * Computes a deterministic SHA-256 content hash over a proposal's canonical payload
   * (Approval Rule 3 & Rule 13).
   */
  public computeProposalHash(payload: {
    projectId: string;
    title: string;
    riskLevel: RiskLevel;
    affectedComponents: string[];
    exactScope: {
      taskCodes: string[];
      allowedFileGlobs: string[];
      allowedTools: string[];
      summary: string;
    };
    proposalVersion: number;
  }): string {
    const canonical = JSON.stringify({
      projectId: payload.projectId,
      title: payload.title.trim(),
      riskLevel: payload.riskLevel,
      affectedComponents: [...payload.affectedComponents].sort(),
      exactScope: {
        taskCodes: [...payload.exactScope.taskCodes].sort(),
        allowedFileGlobs: [...payload.exactScope.allowedFileGlobs].sort(),
        allowedTools: [...payload.exactScope.allowedTools].sort(),
        summary: payload.exactScope.summary.trim(),
      },
      proposalVersion: payload.proposalVersion,
    });
    return createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Evaluates a file path or action against project policy rules to determine risk level.
   */
  public classifyActionRisk(input: {
    projectId: string;
    stage: 'discovery' | 'design' | 'implementation' | 'verification';
    departmentCode: DepartmentCode;
    relevantFiles: string[];
    actionDescription: string;
  }): {
    riskLevel: RiskLevel;
    requiresFounderApproval: boolean;
    matchedRuleCode: string;
  } {
    const state = CosStoreRepository.getState();
    const project = state.projects.find((p) => p.id === input.projectId);
    const lowerDesc = input.actionDescription.toLowerCase();

    // 1. Check hard-prohibited financial or binding legal actions
    if (
      lowerDesc.includes('spend money') ||
      lowerDesc.includes('wire transfer') ||
      lowerDesc.includes('sign contract') ||
      lowerDesc.includes('legally binding commitment')
    ) {
      return {
        riskLevel: 'prohibited',
        requiresFounderApproval: true,
        matchedRuleCode: 'POL-PROHIBITED-FINANCIAL-AND-LEGAL',
      };
    }

    // 2. Discovery, Research, PRD, ADR, UX Exploration, and QA Verification are Low-Risk Autonomous
    // (CEO may research, analyse, design, prepare proposals and create implementation plans autonomously)
    if (input.stage === 'discovery' || input.stage === 'verification') {
      return {
        riskLevel: 'low',
        requiresFounderApproval: false,
        matchedRuleCode: 'POL-LOW-RESEARCH-AND-DOCS',
      };
    }

    if (
      input.stage === 'design' &&
      (input.departmentCode === 'product' ||
        input.departmentCode === 'cto_arch' ||
        input.departmentCode === 'design_ux' ||
        input.departmentCode === 'business_research' ||
        input.departmentCode === 'legal_compliance' ||
        input.departmentCode === 'marketing_growth' ||
        input.departmentCode === 'data_analytics')
    ) {
      return {
        riskLevel: 'low',
        requiresFounderApproval: false,
        matchedRuleCode: 'POL-LOW-RESEARCH-AND-DOCS',
      };
    }

    // 3. High-risk production / destructive actions
    if (
      lowerDesc.includes('production deploy') ||
      lowerDesc.includes('drop table') ||
      lowerDesc.includes('truncate ') ||
      lowerDesc.includes('delete production') ||
      input.relevantFiles.some((f) => f.startsWith('.env') || f === 'vercel.json')
    ) {
      return {
        riskLevel: 'high',
        requiresFounderApproval: true,
        matchedRuleCode: 'POL-HIGH-PROD-DEPLOY-AND-DESTRUCTIVE-DDL',
      };
    }

    // 4. Medium-risk consequential implementation paths
    const mediumRiskPrefixes = [
      'src/db/schema/',
      'src/db/migrations/',
      'src/modules/commerce/',
      'src/modules/booking/',
      'src/modules/website-builder/grid-engine.ts',
      'src/modules/auth/',
      'src/modules/payments/',
      'package.json',
    ];

    const touchesMediumPath = input.relevantFiles.some((file) =>
      mediumRiskPrefixes.some((prefix) => file.startsWith(prefix) || file === prefix),
    );

    if (
      touchesMediumPath ||
      lowerDesc.includes('schema') ||
      lowerDesc.includes('migration') ||
      lowerDesc.includes('architecture') ||
      lowerDesc.includes('redesign') ||
      lowerDesc.includes('subscription') ||
      lowerDesc.includes('checkout') ||
      project?.autonomyMode === 'manual_only'
    ) {
      return {
        riskLevel: 'medium',
        requiresFounderApproval: true,
        matchedRuleCode: 'POL-MED-DATABASE-AND-COMMERCE-CORE',
      };
    }

    return {
      riskLevel: 'low',
      requiresFounderApproval: false,
      matchedRuleCode: 'POL-LOW-ISOLATED-TESTS-AND-BRANCHES',
    };
  }

  /**
   * Validates server-side task state transitions (Part 8.7).
   */
  public validateTaskTransition(
    task: CosTaskRecord,
    nextStatus: CosTaskStatus,
    options?: { actorRole?: 'founder' | 'ceo' | 'qa_agent' | 'system' },
  ): void {
    if (task.status === nextStatus) return;

    const allowed = ALLOWED_TASK_TRANSITIONS[task.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new AppError(
        'INVALID_STATE_TRANSITION',
        `Illegal task state transition for ${task.code}: '${task.status}' -> '${nextStatus}'.`,
        400,
      );
    }

    // Rule: An Engineering task cannot transition directly to 'completed' without QA verification
    if (
      nextStatus === 'completed' &&
      task.departmentCode === 'engineering' &&
      task.status !== 'qa'
    ) {
      throw new PolicyScopeViolationError(
        `Engineering task '${task.code}' cannot be marked 'completed' without passing Independent QA ('qa' stage).`,
      );
    }

    // Rule: Medium/High-risk task requiring approval cannot enter 'in_progress' unless approved
    if (
      (nextStatus === 'in_progress' || nextStatus === 'awaiting_external_handoff') &&
      task.requiresApproval
    ) {
      const state = CosStoreRepository.getState();
      const approval = state.approvals.find((a) => a.id === task.approvalId);
      if (!approval || approval.status !== 'approved' || !approval.capabilityToken) {
        throw new FounderApprovalRequiredError(
          `Task '${task.code}' (${task.riskLevel.toUpperCase()} risk) requires explicit Founder approval before execution can start.`,
        );
      }
      if (options?.actorRole === 'ceo') {
        // Verify capability token integrity
        const expectedToken = this.mintCapabilityToken(approval);
        if (approval.capabilityToken !== expectedToken) {
          throw new PolicyScopeViolationError(
            `Capability token for approval '${approval.id}' does not match current proposal hash '${approval.proposalHash}'.`,
          );
        }
      }
    }
  }

  /**
   * Creates a formal Approval Record bound to an exact proposal version & SHA-256 content hash.
   * Enforces Rule 8: Rejected proposals must not be silently resubmitted with the same scope.
   */
  public createApprovalRequest(input: {
    projectId: string;
    executionCycleId: string;
    taskId?: string;
    requestingDepartment: DepartmentCode;
    createdByUserId?: string;
    title: string;
    proposalVersion?: number;
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
  }): CosApprovalRecord {
    const state = CosStoreRepository.getState();
    const proposalVersion = input.proposalVersion ?? 1;
    const proposalHash = this.computeProposalHash({
      projectId: input.projectId,
      title: input.title,
      riskLevel: input.riskLevel,
      affectedComponents: input.affectedComponents,
      exactScope: input.exactScope,
      proposalVersion,
    });

    // Approval Rule 8: Rejected proposals must not be silently resubmitted with the same scope
    if (state.rejectedProposalHashes.includes(proposalHash)) {
      throw new PolicyScopeViolationError(
        `Proposal with identical scope hash '${proposalHash.slice(0, 12)}...' was previously rejected by the Founder and cannot be resubmitted without material scope modifications.`,
      );
    }

    const nowIso = new Date().toISOString();
    const approvalId = `appr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const record: CosApprovalRecord = {
      id: approvalId,
      projectId: input.projectId,
      executionCycleId: input.executionCycleId,
      taskId: input.taskId,
      requestingDepartment: input.requestingDepartment,
      createdByUserId: input.createdByUserId ?? input.requestingDepartment,
      title: input.title,
      proposalVersion,
      proposalHash,
      riskLevel: input.riskLevel,
      ceoRecommendation: input.ceoRecommendation,
      reasonForApproval: input.reasonForApproval,
      affectedComponents: input.affectedComponents,
      expectedBenefit: input.expectedBenefit,
      potentialDownside: input.potentialDownside,
      alternativesConsidered: input.alternativesConsidered,
      estimatedCostMinor: input.estimatedCostMinor,
      estimatedDurationMinutes: input.estimatedDurationMinutes,
      rollbackPlan: input.rollbackPlan,
      exactScope: input.exactScope,
      status: 'pending',
      createdAtIso: nowIso,
    };

    const event: CosApprovalEvent = {
      id: `aprev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      projectId: input.projectId,
      approvalId,
      actorRole: 'ceo',
      actorIdentity: 'agt-ceo-01',
      eventType: 'created',
      proposalVersion,
      proposalHash,
      notes: `Approval requested for ${input.riskLevel.toUpperCase()} risk proposal (${input.exactScope.taskCodes.join(', ')}).`,
      createdAtIso: nowIso,
    };

    state.approvals.unshift(record);
    state.approvalEvents.unshift(event);

    state.notifications.unshift({
      id: `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      projectId: input.projectId,
      executionCycleId: input.executionCycleId,
      category: 'approval_required',
      severity: input.riskLevel === 'high' ? 'critical' : 'warning',
      title: `Founder Approval Required: ${input.title}`,
      message: `${input.ceoRecommendation} (Scope hash: ${proposalHash.slice(0, 10)})`,
      isRead: false,
      createdAtIso: nowIso,
    });

    CosStoreRepository.appendAuditLog({
      projectId: input.projectId,
      executionCycleId: input.executionCycleId,
      taskId: input.taskId,
      actorType: 'policy_engine',
      actorId: 'policy-engine-v1',
      eventType: 'APPROVAL_GATE_CREATED',
      summary: `Created ${input.riskLevel.toUpperCase()} approval gate '${input.title}' [hash: ${proposalHash.slice(0, 12)}].`,
      metadata: {
        approvalId,
        proposalHash,
        proposalVersion,
        exactScope: input.exactScope,
      },
    });

    CosStoreRepository.persist();
    return record;
  }

  /**
   * Records a Founder decision on an Approval Record (Approve / Reject / Request Changes).
   * Enforces Rules 1, 3, 7, 8, 9, 10, 11, 12.
   */
  public recordApprovalDecision(input: {
    approvalId: string;
    actorRole: 'founder' | 'ceo' | 'department_agent';
    actorIdentity: string;
    decision: 'approved' | 'rejected' | 'changes_requested';
    expectedProposalHash?: string;
    decisionNotes?: string;
  }): CosApprovalRecord {
    // Rule 9 & 10: An agent or department cannot approve or override a proposal
    if (input.actorRole !== 'founder') {
      throw new PolicyScopeViolationError(
        `Actor '${input.actorIdentity}' (${input.actorRole}) is forbidden from deciding approvals. Only the Human Founder can authorise or reject proposals.`,
      );
    }

    const state = CosStoreRepository.getState();
    const approval = state.approvals.find((a) => a.id === input.approvalId);
    if (!approval) {
      throw new AppError('NOT_FOUND', `Approval '${input.approvalId}' not found.`, 404);
    }

    // Rule: Self-approval is strictly forbidden. Approver cannot be the creator/proposer
    const proposer = approval.createdByUserId ?? approval.requestingDepartment;
    if (
      proposer &&
      input.actorIdentity &&
      input.actorIdentity.trim().toLowerCase() === proposer.trim().toLowerCase()
    ) {
      throw new PolicyScopeViolationError(
        `Actor '${input.actorIdentity}' cannot approve proposal '${approval.id}' because they are the creator/proposer ('${proposer}'). Self-approval is strictly forbidden.`,
      );
    }

    if (approval.status !== 'pending' && approval.status !== 'changes_requested') {
      throw new AppError(
        'CONFLICT',
        `Approval '${approval.id}' is already in state '${approval.status}'.`,
        409,
      );
    }

    // Rule 1 & 3: Verify proposal hash matches what the Founder reviewed
    if (input.expectedProposalHash && input.expectedProposalHash !== approval.proposalHash) {
      throw new PolicyScopeViolationError(
        `Proposal hash mismatch: Founder signed '${input.expectedProposalHash}', but current proposal hash is '${approval.proposalHash}'. Obtain fresh approval.`,
      );
    }

    // Prohibited actions cannot be executed by AI even if approved
    if (approval.riskLevel === 'prohibited' && input.decision === 'approved') {
      throw new PolicyScopeViolationError(
        `Proposal '${approval.title}' is classified as PROHIBITED for AI execution (financial/legal commitment). The Founder must execute this externally.`,
      );
    }

    const nowIso = new Date().toISOString();
    approval.status = input.decision;
    approval.decidedBy = input.actorIdentity;
    approval.decidedAtIso = nowIso;
    approval.decisionNotes = input.decisionNotes;

    if (input.decision === 'approved') {
      approval.capabilityToken = this.mintCapabilityToken(approval);
      // Transition gated tasks from approval_pending -> approved
      for (const task of state.tasks) {
        if (
          task.executionCycleId === approval.executionCycleId &&
          (task.approvalId === approval.id || approval.exactScope.taskCodes.includes(task.code)) &&
          task.status === 'approval_pending'
        ) {
          task.status = 'approved';
          task.updatedAtIso = nowIso;
        }
      }
    } else if (input.decision === 'rejected') {
      approval.capabilityToken = undefined;
      if (!state.rejectedProposalHashes.includes(approval.proposalHash)) {
        state.rejectedProposalHashes.push(approval.proposalHash);
      }
      for (const task of state.tasks) {
        if (
          task.executionCycleId === approval.executionCycleId &&
          (task.approvalId === approval.id || approval.exactScope.taskCodes.includes(task.code)) &&
          task.status === 'approval_pending'
        ) {
          task.status = 'rejected';
          task.blockerReason = `Rejected by Founder: ${input.decisionNotes ?? 'Proposal rejected.'}`;
          task.updatedAtIso = nowIso;
        }
      }
    }

    const event: CosApprovalEvent = {
      id: `aprev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      projectId: approval.projectId,
      approvalId: approval.id,
      actorRole: 'founder',
      actorIdentity: input.actorIdentity,
      eventType: input.decision,
      proposalVersion: approval.proposalVersion,
      proposalHash: approval.proposalHash,
      notes: input.decisionNotes,
      createdAtIso: nowIso,
    };
    state.approvalEvents.unshift(event);

    // Record in Decision Ledger when approved or rejected
    state.decisions.unshift({
      id: `dec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      projectId: approval.projectId,
      executionCycleId: approval.executionCycleId,
      approvalId: approval.id,
      code: `DEC-${String(state.decisions.length + 1).padStart(3, '0')}`,
      title: `${input.decision === 'approved' ? 'Approved' : 'Rejected'}: ${approval.title}`,
      category: 'architecture',
      origin: 'founder',
      summary: `${approval.ceoRecommendation} — Founder decision: ${input.decision.toUpperCase()}.`,
      rationale: input.decisionNotes ?? approval.reasonForApproval,
      alternativesConsidered: approval.alternativesConsidered.map(
        (a) => `${a.option} (${a.tradeOff})`,
      ),
      status: 'active',
      authorisedBy: input.actorIdentity,
      decidedAtIso: nowIso,
    });

    CosStoreRepository.appendAuditLog({
      projectId: approval.projectId,
      executionCycleId: approval.executionCycleId,
      taskId: approval.taskId,
      actorType: 'founder',
      actorId: input.actorIdentity,
      eventType: `FOUNDER_APPROVAL_${input.decision.toUpperCase()}`,
      summary: `Founder ${input.decision} proposal '${approval.title}' (v${approval.proposalVersion}, hash ${approval.proposalHash.slice(0, 12)}).`,
      metadata: {
        approvalId: approval.id,
        proposalVersion: approval.proposalVersion,
        proposalHash: approval.proposalHash,
        decision: input.decision,
        exactScope: approval.exactScope,
      },
    });

    CosStoreRepository.persist();
    return approval;
  }

  /**
   * Rule 13: If a proposal changes materially after approval, invalidate the approval
   * and require fresh Founder approval.
   */
  public invalidateApprovalOnMaterialChange(
    approvalId: string,
    updatedExactScope: CosApprovalRecord['exactScope'],
  ): CosApprovalRecord {
    const state = CosStoreRepository.getState();
    const approval = state.approvals.find((a) => a.id === approvalId);
    if (!approval) {
      throw new AppError('NOT_FOUND', `Approval '${approvalId}' not found.`, 404);
    }

    const nextVersion = approval.proposalVersion + 1;
    const nextHash = this.computeProposalHash({
      projectId: approval.projectId,
      title: approval.title,
      riskLevel: approval.riskLevel,
      affectedComponents: approval.affectedComponents,
      exactScope: updatedExactScope,
      proposalVersion: nextVersion,
    });

    approval.proposalVersion = nextVersion;
    approval.proposalHash = nextHash;
    approval.exactScope = updatedExactScope;
    approval.status = 'pending';
    approval.capabilityToken = undefined;
    approval.decidedBy = undefined;
    approval.decidedAtIso = undefined;

    for (const task of state.tasks) {
      if (task.approvalId === approval.id && task.status === 'approved') {
        task.status = 'approval_pending';
      }
    }

    state.approvalEvents.unshift({
      id: `aprev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      projectId: approval.projectId,
      approvalId: approval.id,
      actorRole: 'policy_engine',
      actorIdentity: 'policy-engine-v1',
      eventType: 'invalidated',
      proposalVersion: nextVersion,
      proposalHash: nextHash,
      notes: 'Proposal scope changed materially after approval; prior capability token revoked.',
      createdAtIso: new Date().toISOString(),
    });

    CosStoreRepository.persist();
    return approval;
  }

  /**
   * Enforces tool-execution authorisation at the boundary (Part 2.1, 12.2).
   */
  public authorizeToolExecution(input: {
    projectId: string;
    task: CosTaskRecord;
    departmentCode: DepartmentCode;
    toolName: string;
    targetFiles?: string[];
  }): { allowed: true; mode: string } {
    const state = CosStoreRepository.getState();

    // 1. Check Global Kill Switch (Part 12.6)
    if (state.companyProfile.globalKillSwitchActive) {
      throw new KillSwitchActiveError(
        'Global Autonomous Execution Kill Switch is active. All agent tool calls are halted.',
      );
    }

    // 2. Check Department Enablement & Tool Allowlist
    const dept = state.departments.find((d) => d.code === input.departmentCode);
    if (!dept || !dept.isEnabled) {
      throw new PolicyScopeViolationError(
        `Department '${input.departmentCode}' is disabled and cannot execute tool '${input.toolName}'.`,
      );
    }

    const permission = dept.toolPermissions.find((tp) => tp.toolName === input.toolName);
    if (!permission || permission.permissionMode === 'deny') {
      CosStoreRepository.appendAuditLog({
        projectId: input.projectId,
        executionCycleId: input.task.executionCycleId,
        taskId: input.task.id,
        actorType: 'policy_engine',
        actorId: 'policy-engine-v1',
        eventType: 'TOOL_CALL_DENIED',
        summary: `Blocked unauthorized tool '${input.toolName}' for department '${input.departmentCode}'.`,
        metadata: { toolName: input.toolName, departmentCode: input.departmentCode },
      });
      throw new PolicyScopeViolationError(
        `Department '${input.departmentCode}' is not permitted to invoke tool '${input.toolName}'.`,
      );
    }

    // 3. If tool or task requires approval, verify valid capabilityToken and file scope (Rule 1 & 2)
    if (permission.permissionMode === 'require_approval' || input.task.requiresApproval) {
      const approval = state.approvals.find((a) => a.id === input.task.approvalId);
      if (!approval || approval.status !== 'approved' || !approval.capabilityToken) {
        throw new FounderApprovalRequiredError(
          `Tool '${input.toolName}' on task '${input.task.code}' requires an active Founder approval token.`,
        );
      }

      const expectedToken = this.mintCapabilityToken(approval);
      if (approval.capabilityToken !== expectedToken) {
        throw new PolicyScopeViolationError(
          `Capability token verification failed for approval '${approval.id}'.`,
        );
      }

      // Check file scope boundaries (Rule 2: Approval must not authorise changes outside exact scope)
      if (input.targetFiles && input.targetFiles.length > 0) {
        const allowedGlobs = approval.exactScope.allowedFileGlobs;
        if (allowedGlobs.length > 0) {
          for (const targetFile of input.targetFiles) {
            const matchesScope = allowedGlobs.some((glob) => {
              const cleanPrefix = glob.replace(/\/\*\*$/, '').replace(/\/\*$/, '');
              return targetFile === cleanPrefix || targetFile.startsWith(cleanPrefix);
            });
            if (!matchesScope) {
              throw new PolicyScopeViolationError(
                `Target file '${targetFile}' is outside the approved proposal scope (${allowedGlobs.join(', ')}).`,
              );
            }
          }
        }
      }
    }

    return { allowed: true, mode: permission.permissionMode };
  }

  private mintCapabilityToken(approval: CosApprovalRecord): string {
    return createHmac('sha256', CAPABILITY_SIGNING_SECRET)
      .update(`${approval.id}:${approval.proposalVersion}:${approval.proposalHash}`)
      .digest('hex');
  }
}
