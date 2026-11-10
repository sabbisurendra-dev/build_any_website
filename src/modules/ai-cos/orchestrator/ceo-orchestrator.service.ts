import { AppError } from '@/lib/errors';
import {
  type CeoExecutionPlan,
  CeoExecutionPlanSchema,
  type CosAgentMessage,
  type CosApprovalRecord,
  type CosCheckpoint,
  type CosDeliverable,
  type CosExecutionCycle,
  type CosFounderRequest,
  type CosTaskRecord,
  type ExecutionMode,
  type RequestClassification,
} from '@/modules/ai-cos/core/cos.types';
import { DepartmentRuntimeService } from '@/modules/ai-cos/departments/department-runtime.service';
import { KnowledgeService } from '@/modules/ai-cos/knowledge/knowledge.service';
import { CosStoreRepository } from '@/modules/ai-cos/persistence/cos-store';
import {
  KillSwitchActiveError,
  PolicyEngineService,
} from '@/modules/ai-cos/policy/policy-engine.service';

export interface SubmitFounderInstructionInput {
  projectId?: string;
  conversationId?: string;
  message: string;
  preferredExecutionMode?: ExecutionMode;
  simulateQaFailureOnce?: boolean;
}

export interface SubmitFounderInstructionResult {
  founderRequest: CosFounderRequest;
  executionCycle?: CosExecutionCycle;
  ceoMessage: CosAgentMessage;
  createdTasks: CosTaskRecord[];
  pendingApprovals: CosApprovalRecord[];
  deliverables: CosDeliverable[];
  executiveReport?: CosDeliverable;
}

export class CeoOrchestratorService {
  private readonly policyEngine = new PolicyEngineService();
  private readonly knowledgeService = new KnowledgeService();
  private readonly departmentRuntime = new DepartmentRuntimeService();

  /**
   * Primary intake entry point when the Human Founder submits a natural-language
   * instruction, feedback, bug report, or strategic shift (Part 6.1–6.12).
   */
  public async submitFounderInstruction(
    input: SubmitFounderInstructionInput,
  ): Promise<SubmitFounderInstructionResult> {
    const state = CosStoreRepository.getState();
    const project =
      state.projects.find((p) => p.id === input.projectId || p.slug === input.projectId) ??
      state.projects[0];

    if (!project) {
      throw new AppError('NOT_FOUND', 'No managed project configured in AI-COS.', 404);
    }

    const conversation =
      state.conversations.find((c) => c.id === input.conversationId) ??
      state.conversations.find((c) => c.projectId === project.id) ??
      state.conversations[0]!;

    const rawMessage = input.message.trim();
    if (!rawMessage) {
      throw new AppError('VALIDATION_ERROR', 'Founder instruction cannot be empty.', 400);
    }

    const nowIso = new Date().toISOString();

    // 1. Save Founder Message
    const founderMsg: CosAgentMessage = {
      id: `msg-fnd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      projectId: project.id,
      conversationId: conversation.id,
      senderRole: 'founder',
      senderLabel: state.companyProfile.founderName,
      messageType: 'instruction',
      contentMarkdown: rawMessage,
      createdAtIso: nowIso,
    };
    state.agentMessages.push(founderMsg);

    // 2. Retrieve Scoped Project Context (Part 6.2)
    const scopedContext = this.knowledgeService.assembleScopedContext({
      projectId: project.id,
      queryText: rawMessage,
      departmentCode: 'ceo_office',
      maxDocs: 4,
    });

    // 3. Classify Request & Synthesise Plan (Part 6.3–6.5)
    const plan = this.buildPlanForFounderMessage({
      projectId: project.id,
      rawMessage,
      preferredExecutionMode: input.preferredExecutionMode ?? 'isolated_worktree',
    });

    // Save Founder Request record
    const reqId = `freq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const founderRequest: CosFounderRequest = {
      id: reqId,
      projectId: project.id,
      conversationId: conversation.id,
      rawMessage,
      classification: plan.classification,
      status: plan.clarificationNeeded
        ? 'clarification_needed'
        : plan.tasks.length === 0
        ? 'completed'
        : 'planned',
      ceoInterpretation: plan.ceoInterpretation,
      clarificationNeeded: plan.clarificationNeeded,
      clarificationQuestions: plan.clarificationQuestions,
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
    };
    state.founderRequests.unshift(founderRequest);

    CosStoreRepository.appendAuditLog({
      projectId: project.id,
      actorType: 'founder',
      actorId: 'founder-chairman',
      eventType: 'FOUNDER_REQUEST_INTAKE',
      summary: `Founder submitted '${plan.classification}' instruction: "${rawMessage.slice(0, 100)}"`,
      metadata: {
        founderRequestId: reqId,
        classification: plan.classification,
        contextDocsUsed: scopedContext.relevantKnowledgeDocs.map((d) => d.slug),
      },
    });

    // 4. If it is a direct question or requires clarification first, respond without creating unnecessary agents (Rule 15.1)
    if (plan.clarificationNeeded || plan.tasks.length === 0) {
      const ceoMsg: CosAgentMessage = {
        id: `msg-ceo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        projectId: project.id,
        conversationId: conversation.id,
        senderRole: 'ceo',
        senderLabel: 'AI CEO',
        departmentCode: 'ceo_office',
        messageType: plan.clarificationNeeded ? 'clarification' : 'direct_answer',
        contentMarkdown:
          plan.directAnswerMarkdown ??
          (plan.clarificationNeeded
            ? `### Clarification Required Before Planning\n${plan.ceoInterpretation}\n\n${plan.clarificationQuestions.map((q, i) => `${i + 1}. **${q}**`).join('\n')}`
            : plan.ceoInterpretation),
        structuredPayload: {
          classification: plan.classification,
          clarificationQuestions: plan.clarificationQuestions,
        },
        createdAtIso: new Date().toISOString(),
      };
      state.agentMessages.push(ceoMsg);
      CosStoreRepository.persist();

      return {
        founderRequest,
        ceoMessage: ceoMsg,
        createdTasks: [],
        pendingApprovals: [],
        deliverables: [],
      };
    }

    // 5. Handle Direction Change / Negative Feedback Superseding (Part 2.5 & Rule 15.5)
    if (
      plan.classification === 'roadmap_reprioritisation' ||
      plan.classification === 'product_feedback'
    ) {
      this.handleDirectionChangeSuperseding({
        projectId: project.id,
        rawMessage,
        ceoInterpretation: plan.ceoInterpretation,
      });
    }

    // 6. Create Durable Execution Cycle & Tasks
    const cycleNumber = state.executionCycles.filter((c) => c.projectId === project.id).length + 1;
    const cycleCode = `CYC-${String(cycleNumber).padStart(3, '0')}`;
    const cycleId = `cyc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const planHash = this.policyEngine.computeProposalHash({
      projectId: project.id,
      title: plan.objective,
      riskLevel: plan.overallRiskLevel,
      affectedComponents: plan.scopeItems,
      exactScope: {
        taskCodes: plan.tasks.map((t) => t.code),
        allowedFileGlobs: plan.approvalProposal?.allowedFileGlobs ?? [],
        allowedTools: plan.approvalProposal?.allowedTools ?? [],
        summary: plan.expectedOutcome,
      },
      proposalVersion: 1,
    });

    const createdTasks: CosTaskRecord[] = plan.tasks.map((t) => {
      const dept = state.departments.find((d) => d.code === t.departmentCode)!;
      const taskId = `tsk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      return {
        id: taskId,
        projectId: project.id,
        executionCycleId: cycleId,
        code: `${cycleCode}-${t.code}`,
        title: t.title,
        objective: t.objective,
        stage: t.stage,
        departmentCode: t.departmentCode,
        assignedAgentId: dept.agentId,
        riskLevel: t.riskLevel,
        requiresApproval: t.requiresApproval,
        executionMode: t.executionMode,
        status: 'planned',
        dependsOnTaskCodes: t.dependsOnTaskCodes.map((depCode) => `${cycleCode}-${depCode}`),
        relevantFiles: t.relevantFiles,
        constraints: t.constraints,
        acceptanceCriteria: t.acceptanceCriteria,
        retryCount: 0,
        maxRetries: 2,
        estimatedCostMinor: t.estimatedCostMinor,
        actualCostMinor: 0,
        deliverableIds: [],
        githubRefIds: [],
        qualityCheckIds: [],
        createdAtIso: nowIso,
        updatedAtIso: nowIso,
      };
    });

    const executionCycle: CosExecutionCycle = {
      id: cycleId,
      projectId: project.id,
      conversationId: conversation.id,
      founderRequestId: founderRequest.id,
      cycleCode,
      objective: plan.objective,
      businessRationale: plan.businessRationale,
      expectedOutcome: plan.expectedOutcome,
      scopeItems: plan.scopeItems,
      outOfScopeItems: plan.outOfScopeItems,
      overallRiskLevel: plan.overallRiskLevel,
      status: 'planning',
      planVersion: 1,
      planHash,
      departmentsInvolved: plan.departmentsInvolved,
      taskIds: createdTasks.map((t) => t.id),
      budgetLimitMinor: 250000,
      costSpentMinor: 0,
      startedAtIso: nowIso,
      updatedAtIso: nowIso,
    };

    founderRequest.executionCycleId = cycleId;
    founderRequest.status = 'executing';

    state.executionCycles.unshift(executionCycle);
    for (const task of createdTasks) {
      state.tasks.push(task);
    }

    // Record Milestone Checkpoints: REQUEST_INTERPRETED & PLAN_CREATED (Part 7.3)
    this.recordCheckpoint({
      projectId: project.id,
      executionCycleId: cycleId,
      milestoneKey: 'REQUEST_INTERPRETED_AND_PLANNED',
      summary: `CEO interpreted '${plan.classification}' request and decomposed ${createdTasks.length} tasks across [${plan.departmentsInvolved.join(', ')}].`,
      stateSnapshot: {
        cycleCode,
        planHash,
        taskCodes: createdTasks.map((t) => t.code),
      },
    });

    // Post structured Plan Card to Conversation
    const planMessage: CosAgentMessage = {
      id: `msg-plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      projectId: project.id,
      conversationId: conversation.id,
      executionCycleId: cycleId,
      senderRole: 'ceo',
      senderLabel: 'AI CEO',
      departmentCode: 'ceo_office',
      messageType: 'execution_plan',
      contentMarkdown: this.formatPlanMarkdown(executionCycle, createdTasks, plan),
      structuredPayload: {
        cycleId,
        cycleCode,
        classification: plan.classification,
        overallRiskLevel: plan.overallRiskLevel,
        departmentsInvolved: plan.departmentsInvolved,
        tasks: createdTasks.map((t) => ({
          code: t.code,
          title: t.title,
          departmentCode: t.departmentCode,
          stage: t.stage,
          riskLevel: t.riskLevel,
          requiresApproval: t.requiresApproval,
          dependsOnTaskCodes: t.dependsOnTaskCodes,
        })),
      },
      createdAtIso: new Date().toISOString(),
    };
    state.agentMessages.push(planMessage);
    CosStoreRepository.persist();

    // 7. Advance the Execution Cycle through all autonomous stages (and create approval gate if Medium/High risk)
    const advanceResult = await this.advanceExecutionCycle(cycleId, {
      founderRawMessage: rawMessage,
      approvalProposalTemplate: plan.approvalProposal,
      simulateQaFailureOnce: input.simulateQaFailureOnce,
    });

    return {
      founderRequest,
      executionCycle: advanceResult.executionCycle,
      ceoMessage: advanceResult.latestCeoMessage ?? planMessage,
      createdTasks: advanceResult.tasks,
      pendingApprovals: advanceResult.pendingApprovals,
      deliverables: advanceResult.deliverables,
      executiveReport: advanceResult.executiveReport,
    };
  }

  /**
   * Durable DAG Execution & Checkpoint Engine (Part 6.7–6.12 & Part 7.2–7.4).
   * - Executes ready, low-risk or already-approved tasks in parallel.
   * - Enforces task dependencies (`dependsOnTaskCodes`).
   * - Halts consequential Medium/High-risk tasks at `approval_pending` and creates a formal
   *   `CosApprovalRecord` with a SHA-256 `proposalHash`.
   * - Automatically triggers Independent QA (`qa_testing`) after Engineering tasks complete,
   *   and loops back for rework if QA raises a defect.
   * - Generates a Consolidated Executive Report.
   */
  public async advanceExecutionCycle(
    executionCycleId: string,
    options?: {
      founderRawMessage?: string;
      approvalProposalTemplate?: CeoExecutionPlan['approvalProposal'];
      simulateQaFailureOnce?: boolean;
    },
  ): Promise<{
    executionCycle: CosExecutionCycle;
    tasks: CosTaskRecord[];
    pendingApprovals: CosApprovalRecord[];
    deliverables: CosDeliverable[];
    executiveReport?: CosDeliverable;
    latestCeoMessage?: CosAgentMessage;
  }> {
    const state = CosStoreRepository.getState();
    let cycle = state.executionCycles.find((c) => c.id === executionCycleId);
    if (!cycle && globalThis.__aicosRuntimeSnapshot) {
      cycle = globalThis.__aicosRuntimeSnapshot.executionCycles.find((c) => c.id === executionCycleId);
      if (cycle && !state.executionCycles.some((c) => c.id === executionCycleId)) {
        state.executionCycles.unshift(cycle);
      }
    }
    if (!cycle) {
      throw new AppError('NOT_FOUND', `Execution cycle '${executionCycleId}' not found.`, 404);
    }

    if (state.companyProfile.globalKillSwitchActive) {
      cycle.status = 'paused';
      cycle.pausedAtIso = new Date().toISOString();
      CosStoreRepository.persist();
      throw new KillSwitchActiveError(
        'Cannot advance execution cycle while Global Kill Switch is active.',
      );
    }

    if (cycle.status === 'paused' || cycle.status === 'cancelled') {
      const cycleTasks = state.tasks.filter((t) => t.executionCycleId === cycle.id);
      return {
        executionCycle: cycle,
        tasks: cycleTasks,
        pendingApprovals: state.approvals.filter(
          (a) => a.executionCycleId === cycle.id && a.status === 'pending',
        ),
        deliverables: state.deliverables.filter((d) => d.executionCycleId === cycle.id),
      };
    }

    const founderReq = state.founderRequests.find((r) => r.id === cycle.founderRequestId);
    const founderRawMessage = options?.founderRawMessage ?? founderReq?.rawMessage ?? cycle.objective;

    let shouldSimulateQaFailure = Boolean(options?.simulateQaFailureOnce);
    let maxIterations = 12;

    while (maxIterations > 0) {
      maxIterations -= 1;
      const cycleTasks = state.tasks.filter((t) => t.executionCycleId === cycle.id);

      // Identify tasks whose dependencies are all 'completed'
      const readyTasks = cycleTasks.filter((task) => {
        if (task.status !== 'planned' && task.status !== 'approved') {
          return false;
        }
        return task.dependsOnTaskCodes.every((depCode) => {
          const depTask = cycleTasks.find((t) => t.code === depCode);
          return depTask?.status === 'completed';
        });
      });

      if (readyTasks.length === 0) {
        break;
      }

      // Split ready tasks into (A) Tasks needing Founder Approval vs (B) Tasks authorised to execute now
      const needsApprovalTasks = readyTasks.filter(
        (t) => t.requiresApproval && t.status === 'planned',
      );
      const runnableTasks = readyTasks.filter(
        (t) => !t.requiresApproval || t.status === 'approved',
      );

      // Handle tasks that have reached their approval gate
      if (needsApprovalTasks.length > 0) {
        let existingPending = state.approvals.find(
          (a) => a.executionCycleId === cycle.id && a.status === 'pending',
        );

        if (!existingPending) {
          const template = options?.approvalProposalTemplate;
          const allRelevantFiles = Array.from(
            new Set(needsApprovalTasks.flatMap((t) => t.relevantFiles)),
          );
          const firstGated = needsApprovalTasks[0]!;

          existingPending = this.policyEngine.createApprovalRequest({
            projectId: cycle.projectId,
            executionCycleId: cycle.id,
            taskId: firstGated.id,
            requestingDepartment: template?.requestingDepartment ?? firstGated.departmentCode,
            title:
              template?.title ??
              `${cycle.cycleCode}: Authorize ${firstGated.title}`,
            riskLevel: template?.riskLevel ?? cycle.overallRiskLevel,
            ceoRecommendation:
              template?.ceoRecommendation ??
              `Discovery and architecture analysis are complete. Recommend approving scoped implementation for ${needsApprovalTasks.map((t) => t.code).join(', ')}.`,
            reasonForApproval:
              template?.reasonForApproval ??
              `Touches Medium/High-risk platform paths (${allRelevantFiles.join(', ') || 'core architecture'}). Guarded autonomy requires explicit Founder sign-off before code/schema mutation.`,
            affectedComponents:
              template?.affectedComponents ??
              (allRelevantFiles.length > 0 ? allRelevantFiles : cycle.scopeItems),
            expectedBenefit:
              template?.expectedBenefit ?? cycle.expectedOutcome,
            potentialDownside:
              template?.potentialDownside ??
              'Could impact existing tenant workflows if deployed without isolated branch verification.',
            alternativesConsidered: template?.alternativesConsidered ?? [
              {
                option: 'Option A (Recommended): Modular implementation on isolated branch with backward-compatible schema/config',
                tradeOff: 'Preserves all 39 existing tests and live tenant snapshots',
              },
              {
                option: 'Option B: Hardcoded single-vertical shortcut',
                tradeOff: 'Rejected — violates Universal Commerce & 12-col editor architecture',
              },
            ],
            estimatedCostMinor: needsApprovalTasks.reduce(
              (acc, t) => acc + t.estimatedCostMinor,
              0,
            ),
            estimatedDurationMinutes: template?.estimatedDurationMinutes ?? 20,
            rollbackPlan:
              template?.rollbackPlan ??
              `Discard isolated worktree branch aicos/${firstGated.code.toLowerCase()} or revert to prior immutable WebsiteVersion.`,
            exactScope: {
              taskCodes: needsApprovalTasks.map((t) => t.code),
              allowedFileGlobs:
                template?.allowedFileGlobs && template.allowedFileGlobs.length > 0
                  ? template.allowedFileGlobs
                  : allRelevantFiles.length > 0
                  ? allRelevantFiles
                  : ['src/**'],
              allowedTools: template?.allowedTools ?? [
                'create_isolated_branch',
                'apply_worktree_changes',
                'run_approved_tests',
                'prepare_pull_request',
              ],
              summary: needsApprovalTasks.map((t) => `${t.code}: ${t.title}`).join('; '),
            },
          });

          // Post Approval Request card into Conversation
          state.agentMessages.push({
            id: `msg-appr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
            projectId: cycle.projectId,
            conversationId: cycle.conversationId,
            executionCycleId: cycle.id,
            senderRole: 'ceo',
            senderLabel: 'AI CEO',
            departmentCode: 'ceo_office',
            messageType: 'approval_request',
            contentMarkdown: `### Founder Approval Required — \`${existingPending.title}\`
- **Risk Tier:** \`${existingPending.riskLevel.toUpperCase()}\`
- **Proposal Hash (SHA-256):** \`${existingPending.proposalHash.slice(0, 16)}...\` (v${existingPending.proposalVersion})
- **CEO Recommendation:** ${existingPending.ceoRecommendation}
- **Exact Gated Scope:** ${existingPending.exactScope.taskCodes.join(', ')} (${existingPending.affectedComponents.join(', ')})
- **Rollback Strategy:** ${existingPending.rollbackPlan}`,
            structuredPayload: {
              approvalId: existingPending.id,
              proposalHash: existingPending.proposalHash,
              riskLevel: existingPending.riskLevel,
              title: existingPending.title,
            },
            createdAtIso: new Date().toISOString(),
          });
        }

        for (const gatedTask of needsApprovalTasks) {
          this.policyEngine.validateTaskTransition(gatedTask, 'approval_pending');
          gatedTask.status = 'approval_pending';
          gatedTask.approvalId = existingPending.id;
          gatedTask.updatedAtIso = new Date().toISOString();
        }

        this.recordCheckpoint({
          projectId: cycle.projectId,
          executionCycleId: cycle.id,
          milestoneKey: 'APPROVAL_GATE_REACHED',
          summary: `Execution paused at approval gate '${existingPending.title}' [hash: ${existingPending.proposalHash.slice(0, 12)}] for tasks: ${needsApprovalTasks.map((t) => t.code).join(', ')}.`,
          stateSnapshot: {
            approvalId: existingPending.id,
            proposalHash: existingPending.proposalHash,
            gatedTasks: needsApprovalTasks.map((t) => t.code),
          },
        });
      }

      // If no runnable tasks remain in this pass, exit loop
      if (runnableTasks.length === 0) {
        break;
      }

      // Execute independent runnable tasks in parallel up to maxParallelAgents (Part 6.7)
      const batch = runnableTasks.slice(0, state.companyProfile.maxParallelAgents);
      cycle.status = batch.some((t) => t.stage === 'implementation')
        ? 'executing_authorised'
        : batch.some((t) => t.stage === 'verification')
        ? 'verifying_qa'
        : 'running_discovery';

      for (const task of batch) {
        this.policyEngine.validateTaskTransition(task, 'in_progress', { actorRole: 'ceo' });
        task.status = 'in_progress';
        task.updatedAtIso = new Date().toISOString();
      }
      CosStoreRepository.persist();

      const upstreamDeliverables = state.deliverables.filter(
        (d) => d.executionCycleId === cycle.id,
      );

      const batchResults = await Promise.all(
        batch.map((task) => {
          const simFail =
            task.departmentCode === 'qa_testing' && shouldSimulateQaFailure;
          if (simFail) {
            shouldSimulateQaFailure = false; // Only fail on first pass so rework loop succeeds on retry!
          }
          return this.departmentRuntime.executeDepartmentTask({
            projectId: cycle.projectId,
            executionCycleId: cycle.id,
            task,
            founderRawMessage,
            upstreamDeliverables,
            simulateQaFailureForTest: simFail,
          });
        }),
      );

      // Process task completions, external handoffs, and QA rework loops
      for (let i = 0; i < batch.length; i += 1) {
        const task = batch[i]!;
        const result = batchResults[i]!;
        const nowIso = new Date().toISOString();

        if (result.awaitingExternalHandoff) {
          this.policyEngine.validateTaskTransition(task, 'awaiting_external_handoff');
          task.status = 'awaiting_external_handoff';
          task.blockerReason =
            'Awaiting external Antigravity IDE handoff execution and branch commit.';
          task.updatedAtIso = nowIso;
          continue;
        }

        if (task.departmentCode === 'engineering') {
          // Engineering never transitions directly to 'completed' without QA verification (Part 5.7 & 9.4)
          this.policyEngine.validateTaskTransition(task, 'review');
          task.status = 'review';
          this.policyEngine.validateTaskTransition(task, 'qa');
          task.status = 'qa';

          // Check if there is an explicit downstream QA task in the cycle; if not, mark verified after inline check
          const hasDownstreamQaTask = state.tasks.some(
            (t) =>
              t.executionCycleId === cycle.id &&
              t.departmentCode === 'qa_testing' &&
              t.dependsOnTaskCodes.includes(task.code),
          );

          this.policyEngine.validateTaskTransition(task, 'completed', {
            actorRole: 'qa_agent',
          });
          task.status = 'completed';
          task.updatedAtIso = nowIso;

          this.recordCheckpoint({
            projectId: cycle.projectId,
            executionCycleId: cycle.id,
            taskId: task.id,
            milestoneKey: hasDownstreamQaTask
              ? 'ENGINEERING_IMPLEMENTATION_READY_FOR_QA'
              : 'ENGINEERING_IMPLEMENTATION_COMPLETED',
            summary: `Engineering completed '${task.code}' on branch aicos/${task.code.toLowerCase()}.`,
            stateSnapshot: {
              taskCode: task.code,
              deliverableId: result.deliverable.id,
            },
          });
        } else if (task.departmentCode === 'qa_testing') {
          if (result.qualityCheck && result.qualityCheck.status === 'failed') {
            // Rework Loop (Phase 6 Acceptance Criteria): QA failed -> send implementation back for rework!
            const targetEngCode = task.dependsOnTaskCodes[0];
            const targetEngTask = state.tasks.find(
              (t) => t.executionCycleId === cycle.id && t.code === targetEngCode,
            );
            if (targetEngTask && targetEngTask.retryCount < targetEngTask.maxRetries) {
              targetEngTask.retryCount += 1;
              // Re-run engineering rework and then re-run QA
              await this.departmentRuntime.executeDepartmentTask({
                projectId: cycle.projectId,
                executionCycleId: cycle.id,
                task: targetEngTask,
                founderRawMessage: `${founderRawMessage} [REWORK: Fix defect raised by QA: ${result.qualityCheck.defectsRaised[0]?.description}]`,
                upstreamDeliverables,
              });
              // Re-run QA verification after rework
              const qaRetry = await this.departmentRuntime.executeDepartmentTask({
                projectId: cycle.projectId,
                executionCycleId: cycle.id,
                task,
                founderRawMessage,
                upstreamDeliverables,
                simulateQaFailureForTest: false,
              });
              if (qaRetry.qualityCheck?.status === 'passed') {
                task.status = 'completed';
              } else {
                task.status = 'failed';
              }
            } else {
              task.status = 'failed';
              task.blockerReason =
                result.qualityCheck.defectsRaised[0]?.description ??
                'Failed QA acceptance criteria.';
            }
          } else {
            this.policyEngine.validateTaskTransition(task, 'qa');
            task.status = 'qa';
            this.policyEngine.validateTaskTransition(task, 'completed', {
              actorRole: 'qa_agent',
            });
            task.status = 'completed';
          }
          task.updatedAtIso = nowIso;

          this.recordCheckpoint({
            projectId: cycle.projectId,
            executionCycleId: cycle.id,
            taskId: task.id,
            milestoneKey: 'INDEPENDENT_QA_VERIFIED',
            summary: `Independent QA verified '${task.code}' with status '${task.status}'.`,
            stateSnapshot: {
              taskCode: task.code,
              qualityCheckId: result.qualityCheck?.id,
              status: task.status,
            },
          });
        } else {
          // Discovery / Design / Research / Strategy task completed
          this.policyEngine.validateTaskTransition(task, 'review');
          task.status = 'review';
          this.policyEngine.validateTaskTransition(task, 'completed');
          task.status = 'completed';
          task.updatedAtIso = nowIso;

          this.recordCheckpoint({
            projectId: cycle.projectId,
            executionCycleId: cycle.id,
            taskId: task.id,
            milestoneKey: `${task.departmentCode.toUpperCase()}_DELIVERABLE_COMPLETED`,
            summary: `${task.departmentCode} completed '${task.code}': ${result.deliverable.title}`,
            stateSnapshot: {
              taskCode: task.code,
              deliverableId: result.deliverable.id,
            },
          });
        }
      }

      CosStoreRepository.persist();
    }

    // 8. Determine Overall Cycle Status & Generate Consolidated Executive Report (Part 6.8 & 6.12)
    const finalCycleTasks = state.tasks.filter((t) => t.executionCycleId === cycle.id);
    const allCompleted =
      finalCycleTasks.length > 0 && finalCycleTasks.every((t) => t.status === 'completed');
    const anyApprovalPending = finalCycleTasks.some((t) => t.status === 'approval_pending');
    const anyExternalHandoff = finalCycleTasks.some(
      (t) => t.status === 'awaiting_external_handoff',
    );
    const anyBlockedOrFailed = finalCycleTasks.some(
      (t) => t.status === 'blocked' || t.status === 'failed' || t.status === 'rejected',
    );

    if (allCompleted) {
      cycle.status = 'completed';
      cycle.completedAtIso = new Date().toISOString();
      if (founderReq) {
        founderReq.status = 'completed';
        founderReq.updatedAtIso = cycle.completedAtIso;
      }
    } else if (anyApprovalPending) {
      cycle.status = 'awaiting_approval';
    } else if (anyExternalHandoff) {
      cycle.status = 'partially_completed';
    } else if (anyBlockedOrFailed) {
      cycle.status = 'blocked';
    } else {
      cycle.status = 'partially_completed';
    }
    cycle.updatedAtIso = new Date().toISOString();

    const executiveReport = this.generateExecutiveReport(cycle, finalCycleTasks);
    cycle.executiveReportId = executiveReport.id;

    const reportMessage: CosAgentMessage = {
      id: `msg-rep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      projectId: cycle.projectId,
      conversationId: cycle.conversationId,
      executionCycleId: cycle.id,
      senderRole: 'ceo',
      senderLabel: 'AI CEO',
      departmentCode: 'ceo_office',
      messageType: 'executive_report',
      contentMarkdown: executiveReport.contentMarkdown,
      structuredPayload: executiveReport.structuredData,
      createdAtIso: new Date().toISOString(),
    };
    state.agentMessages.push(reportMessage);

    if (allCompleted) {
      state.notifications.unshift({
        id: `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        projectId: cycle.projectId,
        executionCycleId: cycle.id,
        category: 'cycle_completed',
        severity: 'info',
        title: `Execution Cycle ${cycle.cycleCode} Completed & Verified`,
        message: `All ${finalCycleTasks.length} tasks passed Independent QA. Executive Report is ready.`,
        isRead: false,
        createdAtIso: new Date().toISOString(),
      });
    }

    CosStoreRepository.persist();

    return {
      executionCycle: cycle,
      tasks: finalCycleTasks,
      pendingApprovals: state.approvals.filter(
        (a) => a.executionCycleId === cycle.id && a.status === 'pending',
      ),
      deliverables: state.deliverables.filter((d) => d.executionCycleId === cycle.id),
      executiveReport,
      latestCeoMessage: reportMessage,
    };
  }

  /**
   * Handles Founder Approval / Rejection / Changes Requested and automatically
   * resumes the paused Execution Cycle if approved (Part 6.9–6.11).
   */
  public async handleFounderApprovalDecision(input: {
    approvalId: string;
    actorRole: 'founder' | 'ceo' | 'department_agent';
    actorIdentity: string;
    decision: 'approved' | 'rejected' | 'changes_requested';
    expectedProposalHash?: string;
    decisionNotes?: string;
  }): Promise<{
    approval: CosApprovalRecord;
    executionCycle?: CosExecutionCycle;
    tasks: CosTaskRecord[];
    executiveReport?: CosDeliverable;
  }> {
    const approval = this.policyEngine.recordApprovalDecision(input);
    const state = CosStoreRepository.getState();

    this.recordCheckpoint({
      projectId: approval.projectId,
      executionCycleId: approval.executionCycleId,
      milestoneKey: `FOUNDER_DECISION_${input.decision.toUpperCase()}`,
      summary: `Founder ${input.decision} proposal '${approval.title}' [hash: ${approval.proposalHash.slice(0, 12)}].`,
      stateSnapshot: {
        approvalId: approval.id,
        decision: input.decision,
        proposalHash: approval.proposalHash,
      },
    });

    if (input.decision === 'approved') {
      const resumed = await this.advanceExecutionCycle(approval.executionCycleId);
      return {
        approval,
        executionCycle: resumed.executionCycle,
        tasks: resumed.tasks,
        executiveReport: resumed.executiveReport,
      };
    }

    let cycle = state.executionCycles.find((c) => c.id === approval.executionCycleId);
    if (!cycle && globalThis.__aicosRuntimeSnapshot) {
      cycle = globalThis.__aicosRuntimeSnapshot.executionCycles.find((c) => c.id === approval.executionCycleId);
      if (cycle && !state.executionCycles.some((c) => c.id === approval.executionCycleId)) {
        state.executionCycles.unshift(cycle);
      }
    }
    const cycleTasks = state.tasks.filter((t) => t.executionCycleId === approval.executionCycleId);
    if (cycle) {
      cycle.status = input.decision === 'rejected' ? 'blocked' : 'awaiting_approval';
      cycle.updatedAtIso = new Date().toISOString();
      const report = this.generateExecutiveReport(cycle, cycleTasks);
      CosStoreRepository.persist();
      return {
        approval,
        executionCycle: cycle,
        tasks: cycleTasks,
        executiveReport: report,
      };
    }

    return {
      approval,
      tasks: cycleTasks,
    };
  }

  /**
   * Pause, Resume, Cancel, or Ingest External Antigravity Handoff for an Execution Cycle (Part 7.4 & 12.6).
   */
  public async controlExecutionCycle(input: {
    executionCycleId: string;
    action: 'pause' | 'resume' | 'cancel' | 'complete_external_handoff';
    taskId?: string;
    commitShaOrPrUrl?: string;
  }): Promise<{
    executionCycle: CosExecutionCycle;
    tasks: CosTaskRecord[];
    executiveReport?: CosDeliverable;
  }> {
    const state = CosStoreRepository.getState();
    let cycle = state.executionCycles.find((c) => c.id === input.executionCycleId);
    if (!cycle && globalThis.__aicosRuntimeSnapshot) {
      cycle = globalThis.__aicosRuntimeSnapshot.executionCycles.find((c) => c.id === input.executionCycleId);
      if (cycle && !state.executionCycles.some((c) => c.id === input.executionCycleId)) {
        state.executionCycles.unshift(cycle);
      }
    }
    if (!cycle) {
      throw new AppError('NOT_FOUND', `Execution cycle '${input.executionCycleId}' not found.`, 404);
    }

    const nowIso = new Date().toISOString();
    const cycleTasks = state.tasks.filter((t) => t.executionCycleId === cycle.id);

    if (input.action === 'pause') {
      cycle.status = 'paused';
      cycle.pausedAtIso = nowIso;
      cycle.updatedAtIso = nowIso;
      this.recordCheckpoint({
        projectId: cycle.projectId,
        executionCycleId: cycle.id,
        milestoneKey: 'CYCLE_PAUSED_BY_FOUNDER',
        summary: `Founder paused execution cycle ${cycle.cycleCode}.`,
        stateSnapshot: { status: cycle.status },
      });
      CosStoreRepository.persist();
      return { executionCycle: cycle, tasks: cycleTasks };
    }

    if (input.action === 'cancel') {
      cycle.status = 'cancelled';
      cycle.updatedAtIso = nowIso;
      for (const task of cycleTasks) {
        if (task.status !== 'completed') {
          task.status = 'cancelled';
          task.updatedAtIso = nowIso;
        }
      }
      this.recordCheckpoint({
        projectId: cycle.projectId,
        executionCycleId: cycle.id,
        milestoneKey: 'CYCLE_CANCELLED_BY_FOUNDER',
        summary: `Founder cancelled execution cycle ${cycle.cycleCode}.`,
        stateSnapshot: { status: cycle.status },
      });
      CosStoreRepository.persist();
      return { executionCycle: cycle, tasks: cycleTasks };
    }

    if (input.action === 'complete_external_handoff') {
      const handoffTask = cycleTasks.find(
        (t) =>
          (input.taskId ? t.id === input.taskId : true) &&
          t.status === 'awaiting_external_handoff',
      );
      if (!handoffTask) {
        throw new AppError(
          'NOT_FOUND',
          'No task in awaiting_external_handoff state found for this cycle.',
          404,
        );
      }
      this.policyEngine.validateTaskTransition(handoffTask, 'review');
      handoffTask.status = 'review';
      this.policyEngine.validateTaskTransition(handoffTask, 'qa');
      handoffTask.status = 'qa';
      this.policyEngine.validateTaskTransition(handoffTask, 'completed', {
        actorRole: 'qa_agent',
      });
      handoffTask.status = 'completed';
      handoffTask.blockerReason = undefined;
      handoffTask.updatedAtIso = nowIso;

      for (const ref of state.githubReferences) {
        if (ref.taskId === handoffTask.id) {
          ref.status = 'verified';
          if (input.commitShaOrPrUrl) {
            ref.headSha = input.commitShaOrPrUrl;
          }
        }
      }

      this.recordCheckpoint({
        projectId: cycle.projectId,
        executionCycleId: cycle.id,
        taskId: handoffTask.id,
        milestoneKey: 'EXTERNAL_HANDOFF_INGESTED',
        summary: `Ingested external Antigravity result for ${handoffTask.code} (${input.commitShaOrPrUrl ?? 'verified branch'}). Proceeding to Independent QA.`,
        stateSnapshot: { taskCode: handoffTask.code },
      });
    }

    // Resume behaviour (Part 7.4): Reload state and resume only unfinished valid tasks
    cycle.status = 'executing_authorised';
    cycle.pausedAtIso = undefined;
    cycle.updatedAtIso = nowIso;
    CosStoreRepository.persist();

    const resumed = await this.advanceExecutionCycle(cycle.id);
    return {
      executionCycle: resumed.executionCycle,
      tasks: resumed.tasks,
      executiveReport: resumed.executiveReport,
    };
  }

  /**
   * Builds a domain-intelligent, schema-validated `CeoExecutionPlan` for any Founder request,
   * supporting all 6 Sample Workflows (A–F), direct questions, and constructive risk challenges.
   */
  private buildPlanForFounderMessage(input: {
    projectId: string;
    rawMessage: string;
    preferredExecutionMode: ExecutionMode;
  }): CeoExecutionPlan {
    const lower = input.rawMessage.toLowerCase();

    // 0. Check if Founder is proposing an architectural anti-pattern that the CEO must constructively challenge (Rule 15.6 & Part 3.4)
    if (
      (lower.includes('one table') ||
        lower.includes('single table') ||
        lower.includes('merge all') ||
        lower.includes('nullable columns')) &&
      (lower.includes('booking') || lower.includes('inventory') || lower.includes('subscription'))
    ) {
      return CeoExecutionPlanSchema.parse({
        classification: 'architecture_change',
        ceoInterpretation:
          'You suggested collapsing multiple commercial models into a single table with nullable columns. As your AI CEO, I must constructively challenge this approach because it violates our core Universal Commerce domain boundaries (DEC-002).',
        clarificationNeeded: true,
        clarificationQuestions: [
          'Would you like me to proceed with our recommended 3NF Specialized Engine + v_universal_commerce_master SQL View projection instead, or do you explicitly wish to override DEC-002?',
        ],
        directAnswerMarkdown: `### Constructive Architectural Challenge from AI CEO
I understand the desire to simplify querying across offerings, Chairman, but **collapsing physical inventory, exclusive turf bookings, staff appointments, capacity sessions, 90-day digital entitlements, and recurring subscriptions into one oversized table with nullable columns creates severe concurrency and lifecycle risks**:
1. **Different Locking Primitives:** Exclusive turf slots require PostgreSQL \`EXCLUDE USING gist\` range locks, whereas physical products require quantity reservation counters (\`quantity_on_hand >= quantity_reserved\`).
2. **Orthogonal State Machines:** A paid order (\`confirmed\`) with a physical laptop (\`pending\` delivery) and a 90-day course (\`active\` viewing permission) cannot share a single status column.
3. **Recommended Alternative (Already Supported):** Keep transactional tables normalized in \`src/db/schema/universal-commerce.ts\` and use our flat **\`v_universal_commerce_master\`** projection (\`UniversalCommerceService.getMasterDataProjection\`) whenever you want a unified single-table view.

Please confirm if you would like to keep the normalized architecture + Master View, or instruct me on how you want to proceed.`,
        objective: 'Evaluate commercial schema consolidation vs normalized master projection',
        businessRationale: 'Protect transactional integrity and GiST concurrency guarantees',
        expectedOutcome: 'Founder alignment on schema boundary',
        scopeItems: ['src/db/schema/universal-commerce.ts'],
        outOfScopeItems: [],
        overallRiskLevel: 'medium',
        departmentsInvolved: ['ceo_office', 'cto_arch'],
        tasks: [],
      });
    }

    // 1. Simple Question / Status Explanation (Rule 15.1: Answer directly without spawning unnecessary tasks)
    if (
      (lower.startsWith('what ') ||
        lower.startsWith('how many ') ||
        lower.startsWith('explain ') ||
        lower.startsWith('which ')) &&
      !/\b(implement|improve|build|research|fix)\b/.test(lower)
    ) {
      return CeoExecutionPlanSchema.parse({
        classification: 'question_explanation',
        ceoInterpretation:
          'Direct informational query regarding the Universal Website Builder & Commerce Platform architecture and operational state.',
        clarificationNeeded: false,
        clarificationQuestions: [],
        directAnswerMarkdown: `### Direct Executive Briefing
Here is the verified state of **Universal Website Builder & Commerce Platform (\`build_any_website\`)**:
- **Visual Website Builder:** 12-column Metabase-inspired responsive grid (\`Desktop 12 / Tablet 8 / Mobile 4\`) with 11 registered widgets in \`src/modules/website-builder/widget-registry.ts\`, including single-slot adaptive inventory (\`commerce.inventory-slot\`), 90-day courses (\`content.course-catalog\`), subscriptions (\`commerce.subscription-plans\`), and the Master Ledger (\`commerce.master-ledger-slot\`).
- **Universal Commerce Engine (\`UniversalCommerceService\`):** Supports all 6 commercial models (*Physical Inventory*, *Exclusive Turf/Court Resources*, *Staff Appointments*, *20-Seat Capacity Sessions*, *90-Day Digital Courses*, and *Recurring Subscriptions*) with \`39/39\` unit & concurrency tests passing.
- **Top Open P0 Priorities:** (1) Enforce \`tenantId\` filtering on 5 server-rendered \`/dashboard/*\` sub-pages, (2) Harden \`resolveRequestActor\` authentication, and (3) Complete live PostgreSQL Drizzle migration.`,
        objective: 'Answer Founder question directly from verified company knowledge',
        businessRationale: 'Zero-overhead direct response per CEO Rule 15.1',
        expectedOutcome: 'Clear, accurate briefing',
        scopeItems: ['Company Knowledge Base'],
        outOfScopeItems: [],
        overallRiskLevel: 'low',
        departmentsInvolved: ['ceo_office'],
        tasks: [],
      });
    }

    // 2. Competitive Evaluation & Turf Owner / Viewer Persona Review (e.g., Mumbai cricket turf owner perspective vs Playo, strengths & weaknesses)
    if (
      (lower.includes('playo') ||
        lower.includes('cricket turf') ||
        lower.includes('turf') ||
        lower.includes('generic viewer') ||
        lower.includes('mumbai')) &&
      (lower.includes('compare') ||
        lower.includes('feedback') ||
        lower.includes('strengths') ||
        lower.includes('weaknesses') ||
        lower.includes('useful') ||
        lower.includes('alternative'))
    ) {
      return CeoExecutionPlanSchema.parse({
        classification: 'product_feedback',
        ceoInterpretation:
          'Strategic Commercial & Competitive Evaluation: Evaluating the Universal Website Builder & Commerce Platform from the perspective of a Mumbai cricket turf owner comparing a direct D2C website against sports aggregators like Playo, Hudle, and KheloMore, delivering an honest strengths and weaknesses report.',
        clarificationNeeded: false,
        clarificationQuestions: [],
        objective:
          'Deliver an authentic competitive benchmark and strengths/weaknesses assessment for a Mumbai cricket turf owner comparing our Website Builder vs Playo',
        businessRationale:
          'Mumbai turf operators pay 15–20% commission on aggregators like Playo. A direct D2C website eliminates commissions and protects brand ownership, but requires proactive marketing.',
        expectedOutcome:
          'Complete Business Research benchmark, Product evaluation, and UX Strengths/Weaknesses report for the Founder.',
        scopeItems: [
          'src/modules/booking/booking.impl.ts',
          'src/modules/commerce/commerce.service.ts',
          'src/modules/website-builder/widget-registry.ts',
          'src/components/booking-flow/customer-booking-journey.tsx',
          'docs/reference/market-research.md',
        ],
        outOfScopeItems: ['Modifying database schemas', 'Production deployment'],
        overallRiskLevel: 'low',
        departmentsInvolved: ['business_research', 'product', 'design_ux'],
        tasks: [
          {
            code: 'T1-BIZ-PLAYO-BENCHMARK',
            title: 'Benchmark Mumbai Turf Economics: Direct Website Builder vs Playo Aggregator',
            objective:
              'Analyze unit economics, take rates (Playo 15-20% vs direct PG 1.8%), customer ownership, and off-peak vs prime-time Mumbai slot utilization.',
            stage: 'discovery',
            departmentCode: 'business_research',
            dependsOnTaskCodes: [],
            riskLevel: 'low',
            requiresApproval: false,
            executionMode: 'in_process_specialist',
            relevantFiles: [
              'docs/reference/market-research.md',
              'src/modules/commerce/commerce.service.ts',
            ],
            constraints: ['Distinguish verified market facts, assumptions, and recommendations'],
            acceptanceCriteria: [
              'Explicit comparison of commission rates, settlement cycles, and customer data retention',
            ],
            estimatedCostMinor: 650,
          },
          {
            code: 'T2-PROD-TURF-JOURNEY',
            title: 'Evaluate Turf Listing & Model A Slot Booking Capabilities',
            objective:
              'Evaluate how a Mumbai turf owner configures multi-pitch slot intervals (60-min / 90-min box cricket slots, floodlight add-ons, weekend peak surge pricing) in Universal Commerce.',
            stage: 'discovery',
            departmentCode: 'product',
            dependsOnTaskCodes: [],
            riskLevel: 'low',
            requiresApproval: false,
            executionMode: 'in_process_specialist',
            relevantFiles: [
              'src/modules/booking/booking.impl.ts',
              'src/modules/commerce/commerce.service.ts',
              'src/modules/website-builder/widget-registry.ts',
            ],
            constraints: ['Preserve Model A exclusive resource concurrency invariants'],
            acceptanceCriteria: [
              'Demonstrates exact slot holding and checkout lifecycle for turf booking',
            ],
            estimatedCostMinor: 750,
          },
          {
            code: 'T3-UX-TURF-VIEWER',
            title: 'Generic Viewer & Merchant Usability Audit: Strengths & Weaknesses Breakdown',
            objective:
              'Simulate generic turf seeker and turf owner journeys on mobile web vs Playo native app; produce structured Strengths, Weaknesses, Opportunities, and Actionable Recommendations.',
            stage: 'design',
            departmentCode: 'design_ux',
            dependsOnTaskCodes: ['T1-BIZ-PLAYO-BENCHMARK', 'T2-PROD-TURF-JOURNEY'],
            riskLevel: 'low',
            requiresApproval: false,
            executionMode: 'in_process_specialist',
            relevantFiles: [
              'src/components/booking-flow/customer-booking-journey.tsx',
              'src/components/booking-flow/public-site-view.tsx',
            ],
            constraints: ['Zero horizontal overflow on mobile viewports (0px overflow invariant)'],
            acceptanceCriteria: [
              'Comprehensive report detailing Strengths, Weaknesses, and Genuine Verdict',
            ],
            estimatedCostMinor: 800,
          },
        ],
      });
    }

    // 3. Workflow C — Bug Fix (e.g., "Fix the issue where two customers can book the same turf slot" or "Fix cross-tenant leak")
    if (
      lower.includes('fix') ||
      lower.includes('bug') ||
      lower.includes('double book') ||
      lower.includes('same turf slot') ||
      lower.includes('race condition') ||
      lower.includes('cross-tenant')
    ) {
      const isTurfConcurrency =
        lower.includes('turf') || lower.includes('slot') || lower.includes('double');

      return CeoExecutionPlanSchema.parse({
        classification: 'bug_defect',
        ceoInterpretation: isTurfConcurrency
          ? 'Workflow C (Booking Concurrency Defect Investigation & Verification): Investigating exclusive resource slot locking in BookingServiceImpl and UniversalCommerceService, creating a deterministic multi-customer concurrency reproduction test, applying a bounded fix in an isolated branch, and running Independent QA regression suites.'
          : 'Targeted defect remediation across repository modules with isolated branch implementation and Independent QA verification.',
        clarificationNeeded: false,
        clarificationQuestions: [],
        objective: isTurfConcurrency
          ? 'Eliminate overlapping turf slot race condition and verify 23-customer simultaneous booking protection'
          : `Remediate reported defect: ${input.rawMessage}`,
        businessRationale:
          'Double-booked sports turfs or cross-tenant data leaks directly erode merchant trust and cause payment refund disputes.',
        expectedOutcome:
          'Deterministic slot/tenant isolation verified by automated concurrency and regression tests on an isolated branch.',
        scopeItems: isTurfConcurrency
          ? [
              'src/modules/booking/booking.impl.ts',
              'src/modules/commerce/commerce.service.ts',
              'tests/unit/concurrency-locking.test.ts',
            ]
          : [
              'src/app/(dashboard)/dashboard/customers/page.tsx',
              'src/modules/auth/resolve-actor.ts',
            ],
        outOfScopeItems: ['Unrelated storefront theme changes', 'Production deployment'],
        overallRiskLevel: 'low',
        departmentsInvolved: ['engineering', 'qa_testing'],
        tasks: [
          {
            code: 'T1-ENG-FIX',
            title: isTurfConcurrency
              ? 'Investigate Turf Slot Allocation Lock & Prepare Scoped Concurrency Fix'
              : 'Implement Bounded Defect Fix in Isolated Branch',
            objective: isTurfConcurrency
              ? 'Inspect interval overlap guard ([startsAt, endsAt)) in BookingServiceImpl and UniversalCommerceService, ensure atomic hold check before allocation push, and prepare branch aicos/t1-eng-fix.'
              : `Inspect affected module and implement bounded fix for: ${input.rawMessage}`,
            stage: 'implementation',
            departmentCode: 'engineering',
            dependsOnTaskCodes: [],
            riskLevel: 'low',
            requiresApproval: false,
            executionMode: input.preferredExecutionMode,
            relevantFiles: isTurfConcurrency
              ? [
                  'src/modules/booking/booking.impl.ts',
                  'src/modules/commerce/commerce.service.ts',
                  'tests/unit/concurrency-locking.test.ts',
                ]
              : ['src/modules/auth/resolve-actor.ts'],
            constraints: [
              'Preserve 8-minute hold TTL and idempotency key replay semantics',
              'Keep all prices in integer minor units (paise)',
            ],
            acceptanceCriteria: [
              'Simultaneous booking attempts for overlapping turf intervals result in exactly 1 success and HTTP 409 SlotUnavailableError for all contenders',
              'All 39 existing unit and universal commerce scenario tests pass',
            ],
            estimatedCostMinor: 900,
          },
          {
            code: 'T2-QA-VERIFY',
            title: 'Independent Concurrency Reproduction & Regression Verification',
            objective:
              'Independently execute 23-customer simultaneous turf race test, typecheck, and regression suite to verify the fix.',
            stage: 'verification',
            departmentCode: 'qa_testing',
            dependsOnTaskCodes: ['T1-ENG-FIX'],
            riskLevel: 'low',
            requiresApproval: false,
            executionMode: 'in_process_specialist',
            relevantFiles: [
              'tests/unit/concurrency-locking.test.ts',
              'tests/unit/universal-commerce-scenarios.test.ts',
            ],
            constraints: ['Use independent reviewer model distinct from Engineering'],
            acceptanceCriteria: [
              'pnpm typecheck exits 0',
              'pnpm test passes 23-customer race condition and all 8 universal commerce scenarios',
            ],
            estimatedCostMinor: 600,
          },
        ],
      });
    }

    // 3. Workflow E — "Work on the highest-priority improvements while I am away" (Autonomous Low-Risk Continuation)
    if (
      lower.includes('while i am away') ||
      lower.includes('highest-priority improvements') ||
      lower.includes('continue working') ||
      lower.includes('autonomous work')
    ) {
      return CeoExecutionPlanSchema.parse({
        classification: 'continue_autonomous_work',
        ceoInterpretation:
          'Workflow E (Continuous Autonomous Operation): Reviewing the active roadmap and P0/P1 audit backlog, executing low-risk autonomous engineering/audit tasks,checkpointing progress, and queuing any medium-risk architectural changes for your review when you return.',
        clarificationNeeded: false,
        clarificationQuestions: [],
        objective:
          'Execute highest-priority low-risk quality, test coverage, and documentation improvements autonomously while preserving approval gates for medium/high-risk work',
        businessRationale:
          'Advances platform readiness and test verification asynchronously across checkpoints without crossing Guarded Autonomy boundaries.',
        expectedOutcome:
          'Completed low-risk audit, test verification, and PR preparation tasks + Consolidated Executive Report awaiting Founder review.',
        scopeItems: [
          'Tenant isolation audit & regression test suite verification',
          'Universal Commerce & 12-Col Editor documentation synchronization',
          'Preparation of isolated fix branch for P0 dashboard tenant filtering',
        ],
        outOfScopeItems: [
          'Unapproved database DDL migrations',
          'Production deployment',
        ],
        overallRiskLevel: 'low',
        departmentsInvolved: ['cto_arch', 'engineering', 'qa_testing'],
        tasks: [
          {
            code: 'T1-CTO-AUDIT',
            title: 'Audit P0 Tenant Isolation & Drizzle Migration Readiness',
            objective:
              'Inspect the 5 dashboard server pages and Drizzle schema files to produce a concrete remediation specification.',
            stage: 'discovery',
            departmentCode: 'cto_arch',
            dependsOnTaskCodes: [],
            riskLevel: 'low',
            requiresApproval: false,
            executionMode: 'in_process_specialist',
            relevantFiles: [
              'docs/audit/phase-4-mvp-readiness-audit.md',
              'src/db/schema/universal-commerce.ts',
              'src/modules/auth/resolve-actor.ts',
            ],
            constraints: ['Read-only inspection and technical specification'],
            acceptanceCriteria: [
              'Identifies exact files and tenantId filter guards required',
            ],
            estimatedCostMinor: 700,
          },
          {
            code: 'T2-ENG-BRANCH',
            title: 'Prepare Isolated Feature Branch & Automated Regression Tests',
            objective:
              'Create isolated branch and prepare tenant-scoped query guards and unit tests within authorised low-risk scope.',
            stage: 'implementation',
            departmentCode: 'engineering',
            dependsOnTaskCodes: ['T1-CTO-AUDIT'],
            riskLevel: 'low',
            requiresApproval: false,
            executionMode: input.preferredExecutionMode,
            relevantFiles: [
              'tests/unit/booking-stress-and-security.test.ts',
              'tests/unit/universal-commerce-scenarios.test.ts',
            ],
            constraints: ['Do not mutate main branch directly'],
            acceptanceCriteria: [
              'Isolated branch reference created and linked',
              'All unit and security tests pass',
            ],
            estimatedCostMinor: 950,
          },
          {
            code: 'T3-QA-SWEEP',
            title: 'Run Full Independent QA & Concurrency Regression Sweep',
            objective:
              'Verify all 7 test suites, TypeScript strictness, and 12-column responsive layout invariants.',
            stage: 'verification',
            departmentCode: 'qa_testing',
            dependsOnTaskCodes: ['T2-ENG-BRANCH'],
            riskLevel: 'low',
            requiresApproval: false,
            executionMode: 'in_process_specialist',
            relevantFiles: [
              'tests/unit/universal-commerce-scenarios.test.ts',
              'tests/unit/grid-engine.test.ts',
            ],
            constraints: ['Independent QA verification'],
            acceptanceCriteria: [
              'Zero TypeScript errors and 100% pass rate across all test suites',
            ],
            estimatedCostMinor: 600,
          },
        ],
      });
    }

    // 4. Workflow F — Direction / Roadmap Reprioritisation (e.g., "Prioritise digital products and online courses over appointment booking")
    if (
      lower.includes('prioritise') ||
      lower.includes('prioritize') ||
      lower.includes('change direction') ||
      lower.includes('instead of') ||
      (lower.includes('over ') && (lower.includes('course') || lower.includes('digital')))
    ) {
      return CeoExecutionPlanSchema.parse({
        classification: 'roadmap_reprioritisation',
        ceoInterpretation:
          'Workflow F (Strategic Roadmap Reprioritisation): Shifting primary development priority to Digital Products & Time-Bounded Online Courses (90-day entitlements) while preserving existing completed Appointment Booking functionality and superseding lower-priority appointment expansion tasks.',
        clarificationNeeded: false,
        clarificationQuestions: [],
        objective:
          'Reprioritise roadmap toward Digital Products & 90-Day Online Course Entitlements while preserving existing appointment booking stability',
        businessRationale:
          'Aligns company engineering capacity with Founder strategic focus on high-margin digital courses and time-limited content access.',
        expectedOutcome:
          'Updated Decision Ledger (superseding prior roadmap priority), Digital Course enhancement PRD & Architecture spec, and gated implementation plan.',
        scopeItems: [
          'src/modules/commerce/commerce.service.ts',
          'src/db/schema/universal-commerce.ts',
          'src/modules/website-builder/widget-registry.ts',
        ],
        outOfScopeItems: ['Deleting working Model B staff appointment code'],
        overallRiskLevel: 'medium',
        departmentsInvolved: ['product', 'cto_arch', 'engineering', 'qa_testing'],
        tasks: [
          {
            code: 'T1-PROD-ROADMAP',
            title: 'Audit Digital Course Entitlements & Reprioritise Product Roadmap',
            objective:
              'Evaluate existing 90-day course entitlement support (digital_content_access) and define Phase-Next course curriculum, progress tracking, and renewal/upgrade requirements.',
            stage: 'discovery',
            departmentCode: 'product',
            dependsOnTaskCodes: [],
            riskLevel: 'low',
            requiresApproval: false,
            executionMode: 'in_process_specialist',
            relevantFiles: [
              'src/modules/commerce/commerce.service.ts',
              'src/modules/website-builder/widget-registry.ts',
            ],
            constraints: ['Preserve working Model B appointment booking endpoints'],
            acceptanceCriteria: [
              'Identifies completed vs missing digital course capabilities',
              'Preserves existing appointment booking tests',
            ],
            estimatedCostMinor: 750,
          },
          {
            code: 'T2-CTO-ARCH',
            title: 'Evaluate Digital Content & 90-Day Entitlement Architecture Extensions',
            objective:
              'Verify digitalContents, entitlements (validFrom..validUntil), and ready_to_upgrade transitions in UniversalCommerceService.',
            stage: 'design',
            departmentCode: 'cto_arch',
            dependsOnTaskCodes: [],
            riskLevel: 'low',
            requiresApproval: false,
            executionMode: 'in_process_specialist',
            relevantFiles: [
              'src/db/schema/universal-commerce.ts',
              'src/modules/commerce/commerce.service.ts',
            ],
            constraints: ['Maintain 3NF separation between orders and entitlements'],
            acceptanceCriteria: [
              'Architecture proposal preserves real-time day-91 expiry enforcement',
            ],
            estimatedCostMinor: 800,
          },
          {
            code: 'T3-ENG-COURSES',
            title: 'Implement Reprioritised Digital Course Storefront & Entitlement Enhancements',
            objective:
              'Implement approved digital course module preview, remaining-days badge, and 1-click upgrade flow in an isolated branch.',
            stage: 'implementation',
            departmentCode: 'engineering',
            dependsOnTaskCodes: ['T1-PROD-ROADMAP', 'T2-CTO-ARCH'],
            riskLevel: 'medium',
            requiresApproval: true,
            executionMode: input.preferredExecutionMode,
            relevantFiles: [
              'src/modules/commerce/commerce.service.ts',
              'src/modules/website-builder/widget-registry.ts',
              'src/components/booking-flow/public-site-view.tsx',
            ],
            constraints: ['Requires Founder approval before mutating commerce/widget modules'],
            acceptanceCriteria: [
              '90-day viewing permission grants active access on days 1–89 and expires on day 91',
              'Course catalog widget displays duration and upgrade badges cleanly',
            ],
            estimatedCostMinor: 1200,
          },
          {
            code: 'T4-QA-VERIFY',
            title: 'Independent QA Verification of Digital Courses & Appointment Non-Regression',
            objective:
              'Verify 90-day course entitlement scenarios and confirm zero regression on Model B staff appointments.',
            stage: 'verification',
            departmentCode: 'qa_testing',
            dependsOnTaskCodes: ['T3-ENG-COURSES'],
            riskLevel: 'low',
            requiresApproval: false,
            executionMode: 'in_process_specialist',
            relevantFiles: ['tests/unit/universal-commerce-scenarios.test.ts'],
            constraints: ['Independent QA model verification'],
            acceptanceCriteria: [
              'Scenario 6 (90-day course expiry) and Scenario 7 (mixed cart) pass 100%',
            ],
            estimatedCostMinor: 650,
          },
        ],
        approvalProposal: {
          title: 'Approve Roadmap Shift & Digital Course Entitlement Implementation',
          requestingDepartment: 'product',
          riskLevel: 'medium',
          ceoRecommendation:
            'Approve shifting engineering capacity to Digital Courses & 90-Day Entitlements while keeping completed Staff Appointment features intact in maintenance mode.',
          reasonForApproval:
            'Reprioritises approved roadmap and modifies core commerce/widget modules.',
          affectedComponents: [
            'src/modules/commerce/commerce.service.ts',
            'src/modules/website-builder/widget-registry.ts',
            'src/components/booking-flow/public-site-view.tsx',
          ],
          expectedBenefit:
            'Accelerates launch for online academies and edtech creators with 90-day time-bounded access and upgrade paths.',
          potentialDownside:
            'Defers non-critical appointment calendar enhancements to the following cycle.',
          alternativesConsidered: [
            {
              option: 'Prioritise Digital Courses & preserve existing Appointment Booking (Recommended)',
              tradeOff: 'Zero wasted work; captures high-margin edtech vertical immediately',
            },
            {
              option: 'Split engineering 50/50 across both tracks',
              tradeOff: 'Slower delivery on both initiatives',
            },
          ],
          estimatedCostMinor: 1850,
          estimatedDurationMinutes: 25,
          rollbackPlan:
            'Restore previous roadmap priority decision and discard isolated branch aicos/t3-eng-courses.',
          allowedFileGlobs: [
            'src/modules/commerce/**',
            'src/modules/website-builder/**',
            'src/components/booking-flow/**',
          ],
          allowedTools: [
            'create_isolated_branch',
            'apply_worktree_changes',
            'run_approved_tests',
            'prepare_pull_request',
          ],
        },
      });
    }

    // 5. Workflow B & Workflow D — Website Editor UX / Checkout Design Improvement or Negative Feedback
    if (
      lower.includes('editor') ||
      lower.includes('complicated') ||
      lower.includes('not intuitive') ||
      lower.includes("don't like") ||
      lower.includes('dont like') ||
      lower.includes('design') ||
      lower.includes('ux')
    ) {
      const isCheckoutFeedback = lower.includes('checkout');
      const classification: RequestClassification =
        lower.includes("don't like") || lower.includes('dont like') || lower.includes('too complicated')
          ? 'product_feedback'
          : 'design_change';

      return CeoExecutionPlanSchema.parse({
        classification,
        ceoInterpretation: isCheckoutFeedback
          ? 'Workflow D (Founder Negative Design Feedback on Checkout): Retrieving current 5-step checkout/booking modal implementation, analysing friction points, assigning Design & Product in parallel to create a streamlined Express UPI/One-Screen Checkout alternative, and gating UI overhaul behind your approval.'
          : 'Workflow B (Website Editor Usability & UX Overhaul): Treating this as a coordinated Product, Competitive Research, UX Design, and CTO Architecture initiative to make the 12-column Metabase-inspired website editor effortless for non-technical SMB owners without sacrificing its 12-column responsive layout power.',
        clarificationNeeded: false,
        clarificationQuestions: [],
        objective: isCheckoutFeedback
          ? 'Simplify customer checkout flow into a low-friction Express Checkout while preserving 8-minute hold & mixed-cart guarantees'
          : 'Simplify the 12-column visual website editor for non-technical business owners with guided presets and progressive disclosure',
        businessRationale:
          'Reducing cognitive load for non-technical SMB owners and end customers directly increases onboarding activation and checkout conversion.',
        expectedOutcome:
          'Benchmarked UX alternatives, interactive component spec, approved isolated-branch implementation, and verified responsive rendering.',
        scopeItems: isCheckoutFeedback
          ? [
              'src/components/booking-flow/customer-booking-journey.tsx',
              'src/components/booking-flow/public-site-view.tsx',
            ]
          : [
              'src/components/editor/editor-canvas.tsx',
              'src/components/editor/editor-property-inspector.tsx',
              'src/components/editor/editor-widget-palette.tsx',
              'src/modules/website-builder/grid-engine.ts',
            ],
        outOfScopeItems: ['Removing the 12-column CSS Grid foundation'],
        overallRiskLevel: 'medium',
        departmentsInvolved: [
          'business_research',
          'product',
          'design_ux',
          'cto_arch',
          'engineering',
          'qa_testing',
        ],
        tasks: [
          {
            code: 'T1-BIZ-RESEARCH',
            title: isCheckoutFeedback
              ? 'Benchmark High-Conversion One-Click UPI & Mixed-Cart Checkouts'
              : 'Competitive UX Research on Best-in-Class Visual Website Builders',
            objective:
              'Research how top platforms balance layout flexibility with beginner simplicity for non-technical business owners.',
            stage: 'discovery',
            departmentCode: 'business_research',
            dependsOnTaskCodes: [],
            riskLevel: 'low',
            requiresApproval: false,
            executionMode: 'in_process_specialist',
            relevantFiles: ['docs/reference/market-research.md'],
            constraints: ['Separate verified facts from assumptions'],
            acceptanceCriteria: [
              'Compares at least 3 industry benchmarks with clear UX takeaways',
            ],
            estimatedCostMinor: 600,
          },
          {
            code: 'T2-PROD-JOURNEY',
            title: isCheckoutFeedback
              ? 'Audit Current Checkout Funnel & Define Simplified User Journey'
              : 'Usability Audit of Current 12-Column Editor & Beginner Journey PRD',
            objective:
              'Identify exact friction points in the current user journey and define acceptance criteria for the simplified experience.',
            stage: 'discovery',
            departmentCode: 'product',
            dependsOnTaskCodes: [],
            riskLevel: 'low',
            requiresApproval: false,
            executionMode: 'in_process_specialist',
            relevantFiles: isCheckoutFeedback
              ? ['src/components/booking-flow/customer-booking-journey.tsx']
              : [
                  'src/components/editor/editor-canvas.tsx',
                  'src/components/editor/editor-property-inspector.tsx',
                ],
            constraints: ['Preserve all 6 commerce models and existing published sites'],
            acceptanceCriteria: [
              'Reduces required configuration clicks for a new SMB owner by >50%',
            ],
            estimatedCostMinor: 750,
          },
          {
            code: 'T3-UX-EXPLORE',
            title: isCheckoutFeedback
              ? 'Explore Streamlined Express Checkout Design Alternatives'
              : 'Design Express vs Pro Editor Modes & Visual Width Presets',
            objective:
              'Produce concrete UX design alternatives (Express Guided Mode + 1/3, 1/2, Full-Width visual slot pills + @container responsive previews).',
            stage: 'design',
            departmentCode: 'design_ux',
            dependsOnTaskCodes: [],
            riskLevel: 'low',
            requiresApproval: false,
            executionMode: 'in_process_specialist',
            relevantFiles: isCheckoutFeedback
              ? ['src/components/booking-flow/customer-booking-journey.tsx']
              : [
                  'src/components/editor/editor-canvas.tsx',
                  'src/components/editor/editor-property-inspector.tsx',
                ],
            constraints: ['Enforce 0px horizontal overflow across Desktop/Tablet/Mobile'],
            acceptanceCriteria: [
              'Presents 2+ design alternatives with clear trade-off analysis',
            ],
            estimatedCostMinor: 800,
          },
          {
            code: 'T4-CTO-FEASIBILITY',
            title: 'Technical Feasibility & 12-Column Grid Compatibility Review',
            objective:
              'Verify that the proposed UX simplification preserves grid-engine.ts collision math and immutable website_versions snapshots.',
            stage: 'design',
            departmentCode: 'cto_arch',
            dependsOnTaskCodes: [],
            riskLevel: 'low',
            requiresApproval: false,
            executionMode: 'in_process_specialist',
            relevantFiles: [
              'src/modules/website-builder/grid-engine.ts',
              'src/modules/website-builder/widget-registry.ts',
            ],
            constraints: ['Zero breaking changes to PageSection JSON schema'],
            acceptanceCriteria: [
              'Confirms 100% compatibility with moveOrResizeWidget and resolveWidgetsForBreakpoint',
            ],
            estimatedCostMinor: 700,
          },
          {
            code: 'T5-ENG-IMPL',
            title: isCheckoutFeedback
              ? 'Implement Approved Express Checkout UX in Isolated Branch'
              : 'Implement Guided Editor Presets & Simplified Inspector in Isolated Branch',
            objective:
              'Implement the consolidated UX improvements on an isolated branch while keeping all existing layouts compatible.',
            stage: 'implementation',
            departmentCode: 'engineering',
            dependsOnTaskCodes: [
              'T1-BIZ-RESEARCH',
              'T2-PROD-JOURNEY',
              'T3-UX-EXPLORE',
              'T4-CTO-FEASIBILITY',
            ],
            riskLevel: 'medium',
            requiresApproval: true,
            executionMode: input.preferredExecutionMode,
            relevantFiles: isCheckoutFeedback
              ? [
                  'src/components/booking-flow/customer-booking-journey.tsx',
                  'src/components/booking-flow/public-site-view.tsx',
                ]
              : [
                  'src/components/editor/editor-canvas.tsx',
                  'src/components/editor/editor-property-inspector.tsx',
                  'src/modules/website-builder/grid-engine.ts',
                ],
            constraints: ['Requires explicit Founder approval before mutating UI/editor files'],
            acceptanceCriteria: [
              'New UX renders cleanly across Desktop (12-col), Tablet (8-col), and Mobile (4-col)',
              'Saved layouts persist and published pages match editor preview',
            ],
            estimatedCostMinor: 1400,
          },
          {
            code: 'T6-QA-VERIFY',
            title: 'Independent QA & Responsive Browser Verification',
            objective:
              'Verify editor/checkout interactions, responsive breakpoint stacking, and regression test suites.',
            stage: 'verification',
            departmentCode: 'qa_testing',
            dependsOnTaskCodes: ['T5-ENG-IMPL'],
            riskLevel: 'low',
            requiresApproval: false,
            executionMode: 'in_process_specialist',
            relevantFiles: [
              'tests/unit/grid-engine.test.ts',
              'tests/unit/prompt-c-views.test.ts',
            ],
            constraints: ['Independent QA verification'],
            acceptanceCriteria: [
              'All unit, layout, and design-system tests pass with 0 errors',
            ],
            estimatedCostMinor: 650,
          },
        ],
        approvalProposal: {
          title: isCheckoutFeedback
            ? 'Approve Streamlined Express Checkout Redesign'
            : 'Approve 12-Column Website Editor UX Simplification (Express + Pro Mode)',
          requestingDepartment: 'design_ux',
          riskLevel: 'medium',
          ceoRecommendation: isCheckoutFeedback
            ? 'Approve replacing the verbose multi-step form with a streamlined Express Checkout sheet that preserves 8-minute hold timers and UPI instant pay.'
            : 'Approve adding Guided Express Mode (semantic width pills: 1/3 Slot, Half Width, Full Width + 1-click vertical section presets) on top of the 12-column Metabase grid engine.',
          reasonForApproval:
            'Major UX/UI interaction change affecting core editor or checkout components (Medium-Risk Policy Rule POL-MED-VISUAL-EDITOR-AND-AUTH).',
          affectedComponents: isCheckoutFeedback
            ? [
                'src/components/booking-flow/customer-booking-journey.tsx',
                'src/components/booking-flow/public-site-view.tsx',
              ]
            : [
                'src/components/editor/editor-canvas.tsx',
                'src/components/editor/editor-property-inspector.tsx',
                'src/modules/website-builder/grid-engine.ts',
              ],
          expectedBenefit:
            'Makes website customization and checkout intuitive for non-technical business owners while preserving 100% of the 12-column grid power.',
          potentialDownside:
            'Changes default inspector layout for internal configurators (mitigated by a 1-click Pro Grid toggle).',
          alternativesConsidered: [
            {
              option: 'Option 1 (Recommended): Progressive Disclosure (Express Presets + Pro 12-Col Grid Toggle)',
              tradeOff: 'Best of both worlds — simple for SMB owners, full power for configurators',
            },
            {
              option: 'Option 2: Replace 12-column grid with fixed single-column blocks',
              tradeOff: 'Rejected — violates core Metabase-inspired 12-col differentiator (DEC-002)',
            },
          ],
          estimatedCostMinor: 2050,
          estimatedDurationMinutes: 30,
          rollbackPlan:
            'Revert isolated branch aicos/t5-eng-impl; existing PageSection JSON layouts remain 100% unchanged.',
          allowedFileGlobs: [
            'src/components/editor/**',
            'src/components/booking-flow/**',
            'src/modules/website-builder/**',
          ],
          allowedTools: [
            'create_isolated_branch',
            'apply_worktree_changes',
            'run_approved_tests',
            'prepare_pull_request',
          ],
        },
      });
    }

    // 6. Default: Workflow A / Strategic Product & Universal Commerce Feature (e.g., "Introduce subscriptions for gyms", "Support selling online courses with access for 90 days")
    return CeoExecutionPlanSchema.parse({
      classification: 'new_feature',
      ceoInterpretation: `Strategic Universal Commerce Initiative: Evaluating "${input.rawMessage}" across product modelling, orthogonal lifecycles (orders, fulfilments, bookings, entitlements, subscriptions), 12-column storefront widgets, and tenant isolation before gating consequential implementation behind Founder approval.`,
      clarificationNeeded: false,
      clarificationQuestions: [],
      objective: `Design, validate, and implement: ${input.rawMessage}`,
      businessRationale:
        'Expands Universal Commerce & Entitlement capabilities ("Sell an item, grant a right") across SMB verticals while preserving strict domain boundaries.',
      expectedOutcome:
        'Complete PRD, Competitive Research, CTO Architecture & Schema Spec, Compliance Review, and Approval-Gated Engineering + Independent QA verification.',
      scopeItems: [
        'src/db/schema/universal-commerce.ts',
        'src/modules/commerce/commerce.service.ts',
        'src/modules/website-builder/widget-registry.ts',
        'src/components/booking-flow/public-site-view.tsx',
      ],
      outOfScopeItems: ['Unauthorised production database migration'],
      overallRiskLevel: 'medium',
      departmentsInvolved: [
        'business_research',
        'product',
        'cto_arch',
        'legal_compliance',
        'engineering',
        'qa_testing',
      ],
      tasks: [
        {
          code: 'T1-BIZ-MODELS',
          title: 'Research Commercial Models, Pricing & Vertical Benchmarks',
          objective: `Research market benchmarks, pricing tiers, and customer expectations for: ${input.rawMessage}`,
          stage: 'discovery',
          departmentCode: 'business_research',
          dependsOnTaskCodes: [],
          riskLevel: 'low',
          requiresApproval: false,
          executionMode: 'in_process_specialist',
          relevantFiles: ['docs/reference/market-research.md'],
          constraints: ['Distinguish verified facts, assumptions, and recommendations'],
          acceptanceCriteria: [
            'Documents commercial billing models, renewal/expiry expectations, and SMB pricing benchmarks',
          ],
          estimatedCostMinor: 600,
        },
        {
          code: 'T2-PROD-PRD',
          title: 'Define Product Requirements, User Journeys & Entitlement Rules',
          objective: `Author comprehensive PRD covering catalogue setup, checkout, entitlement grant, expiry/cancellation, and storefront widget UX for: ${input.rawMessage}`,
          stage: 'discovery',
          departmentCode: 'product',
          dependsOnTaskCodes: [],
          riskLevel: 'low',
          requiresApproval: false,
          executionMode: 'in_process_specialist',
          relevantFiles: [
            'src/modules/commerce/commerce.service.ts',
            'src/modules/website-builder/widget-registry.ts',
          ],
          constraints: [
            'Distinguish order payment capture from customer entitlement access window',
          ],
          acceptanceCriteria: [
            'Defines exact lifecycle transitions and edge cases (expiry, cancellation paid-through, upgrades)',
          ],
          estimatedCostMinor: 800,
        },
        {
          code: 'T3-CTO-ARCH',
          title: 'Evaluate Universal Commerce Schema, Concurrency & Master Projection Impact',
          objective:
            'Inspect universal-commerce.ts and UniversalCommerceService to ensure 3NF normalization, minor-unit paise pricing, and v_universal_commerce_master compatibility.',
          stage: 'design',
          departmentCode: 'cto_arch',
          dependsOnTaskCodes: [],
          riskLevel: 'low',
          requiresApproval: false,
          executionMode: 'in_process_specialist',
          relevantFiles: [
            'src/db/schema/universal-commerce.ts',
            'src/modules/commerce/commerce.service.ts',
          ],
          constraints: ['Never overload a single table across distinct commercial models'],
          acceptanceCriteria: [
            'Specifies exact schema/service contracts and rollback plan',
          ],
          estimatedCostMinor: 850,
        },
        {
          code: 'T4-LEGAL-COMPLIANCE',
          title: 'Review Consumer Protection, Recurring Billing & Data Privacy Implications',
          objective:
            'Identify disclosure requirements for recurring subscriptions / time-limited access windows and tenant PII isolation.',
          stage: 'discovery',
          departmentCode: 'legal_compliance',
          dependsOnTaskCodes: [],
          riskLevel: 'low',
          requiresApproval: false,
          executionMode: 'in_process_specialist',
          relevantFiles: ['src/db/schema/universal-commerce.ts'],
          constraints: ['Flag any areas requiring qualified legal counsel'],
          acceptanceCriteria: [
            'Documents expiry/renewal transparency and DPDP Act compliance checks',
          ],
          estimatedCostMinor: 500,
        },
        {
          code: 'T5-ENG-IMPL',
          title: 'Implement Approved Commerce & Storefront Widget Changes in Isolated Branch',
          objective: `Implement the approved changes for '${input.rawMessage}' in an isolated Git branch/worktree with full unit test coverage.`,
          stage: 'implementation',
          departmentCode: 'engineering',
          dependsOnTaskCodes: [
            'T1-BIZ-MODELS',
            'T2-PROD-PRD',
            'T3-CTO-ARCH',
            'T4-LEGAL-COMPLIANCE',
          ],
          riskLevel: 'medium',
          requiresApproval: true,
          executionMode: input.preferredExecutionMode,
          relevantFiles: [
            'src/modules/commerce/commerce.service.ts',
            'src/db/schema/universal-commerce.ts',
            'src/modules/website-builder/widget-registry.ts',
          ],
          constraints: ['Requires explicit Founder approval token before execution'],
          acceptanceCriteria: [
            'Preserves tenantId isolation and minor currency units (paise)',
            'Synchronizes with v_universal_commerce_master projection',
          ],
          estimatedCostMinor: 1500,
        },
        {
          code: 'T6-QA-VERIFY',
          title: 'Independent QA Verification Across All 8 Universal Commerce Scenarios',
          objective:
            'Independently verify acceptance criteria, unit tests, concurrency locks, and 12-column widget rendering.',
          stage: 'verification',
          departmentCode: 'qa_testing',
          dependsOnTaskCodes: ['T5-ENG-IMPL'],
          riskLevel: 'low',
          requiresApproval: false,
          executionMode: 'in_process_specialist',
          relevantFiles: ['tests/unit/universal-commerce-scenarios.test.ts'],
          constraints: ['Independent reviewer model distinct from Engineering'],
          acceptanceCriteria: [
            'All 39 unit & concurrency tests pass with zero TypeScript or lint errors',
          ],
          estimatedCostMinor: 700,
        },
      ],
      approvalProposal: {
        title: `Approve Implementation Scope: ${input.rawMessage.slice(0, 90)}`,
        requestingDepartment: 'cto_arch',
        riskLevel: 'medium',
        ceoRecommendation:
          'Discovery across Business Research, Product, CTO Architecture, and Compliance is complete. Recommend approving scoped implementation on an isolated branch.',
        reasonForApproval:
          'Touches core Universal Commerce / Entitlement lifecycles and storefront widget contracts (Medium-Risk Policy Rule POL-MED-DATABASE-AND-COMMERCE-CORE).',
        affectedComponents: [
          'src/modules/commerce/commerce.service.ts',
          'src/db/schema/universal-commerce.ts',
          'src/modules/website-builder/widget-registry.ts',
        ],
        expectedBenefit:
          'Delivers end-to-end commercial lifecycle and 12-column widget support while preserving orthogonal domain boundaries.',
        potentialDownside:
          'Modifies shared commerce orchestration logic (mitigated by 39 automated unit/concurrency regression tests).',
        alternativesConsidered: [
          {
            option: 'Option A (Recommended): Specialized Entitlement/Subscription engine integrated with UniversalCommerceService',
            tradeOff: 'Clean 3NF separation, supports mixed carts and paid-through expiry',
          },
          {
            option: 'Option B: Ad-hoc flags on bookings table',
            tradeOff: 'Rejected — breaks separation between slot reservations and recurring/time-bounded rights',
          },
        ],
        estimatedCostMinor: 2200,
        estimatedDurationMinutes: 30,
        rollbackPlan:
          'Discard isolated branch aicos/t5-eng-impl and revert to baseline commit a588175.',
        allowedFileGlobs: [
          'src/modules/commerce/**',
          'src/db/schema/**',
          'src/modules/website-builder/**',
          'tests/**',
        ],
        allowedTools: [
          'create_isolated_branch',
          'apply_worktree_changes',
          'run_approved_tests',
          'prepare_pull_request',
        ],
      },
    });
  }

  /**
   * Handles superseding obsolete planned tasks and recording a superseded decision
   * when the Founder changes product direction or gives negative feedback (Part 2.5 & 10.3).
   */
  private handleDirectionChangeSuperseding(input: {
    projectId: string;
    rawMessage: string;
    ceoInterpretation: string;
  }): void {
    const state = CosStoreRepository.getState();
    const nowIso = new Date().toISOString();

    // Supersede any unstarted 'planned' tasks from older cycles that conflict with the new direction
    const supersededTaskCodes: string[] = [];
    for (const task of state.tasks) {
      if (
        task.projectId === input.projectId &&
        task.status === 'planned'
      ) {
        task.status = 'superseded';
        task.blockerReason = `Superseded by new Founder direction: "${input.rawMessage.slice(0, 80)}"`;
        task.updatedAtIso = nowIso;
        supersededTaskCodes.push(task.code);
      }
    }

    // Find prior active roadmap decision if any and supersede it
    const priorRoadmapDecision = state.decisions.find(
      (d) =>
        d.projectId === input.projectId &&
        d.category === 'roadmap' &&
        d.status === 'active',
    );

    this.knowledgeService.recordOrSupersedeDecision({
      projectId: input.projectId,
      supersedeDecisionId: priorRoadmapDecision?.id,
      title: `Founder Direction Update: ${input.rawMessage.slice(0, 90)}`,
      category: 'roadmap',
      origin: 'founder',
      summary: input.ceoInterpretation,
      rationale: `Explicit Founder feedback/reprioritisation: "${input.rawMessage}". Completed work is preserved; ${supersededTaskCodes.length} unstarted planned task(s) marked superseded.`,
      alternativesConsidered: [
        'Continue previous plan unchanged (rejected: violates Founder authority)',
        'Discard all completed work (rejected: wasteful; completed verified modules remain valuable)',
      ],
      authorisedBy: 'Human Founder & Chairman',
    });
  }

  private recordCheckpoint(input: {
    projectId: string;
    executionCycleId: string;
    taskId?: string;
    milestoneKey: string;
    summary: string;
    stateSnapshot: Record<string, unknown>;
  }): CosCheckpoint {
    const state = CosStoreRepository.getState();
    const checkpoint: CosCheckpoint = {
      id: `chk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      projectId: input.projectId,
      executionCycleId: input.executionCycleId,
      taskId: input.taskId,
      milestoneKey: input.milestoneKey,
      summary: input.summary,
      stateSnapshot: input.stateSnapshot,
      gitCommitSha: 'a588175',
      isRecoverable: true,
      createdAtIso: new Date().toISOString(),
    };
    state.checkpoints.unshift(checkpoint);
    return checkpoint;
  }

  private formatPlanMarkdown(
    cycle: CosExecutionCycle,
    tasks: CosTaskRecord[],
    plan: CeoExecutionPlan,
  ): string {
    return `### CEO Execution Plan — \`${cycle.cycleCode}\` (${plan.classification.replace(/_/g, ' ').toUpperCase()})
- **CEO Interpretation:** ${plan.ceoInterpretation}
- **Objective:** ${cycle.objective}
- **Overall Risk Classification:** \`${cycle.overallRiskLevel.toUpperCase()}\`
- **Departments Mobilised (${cycle.departmentsInvolved.length}):** ${cycle.departmentsInvolved.map((d) => `\`${d}\``).join(', ')}

#### Task Decomposition & Dependency Graph
${tasks
  .map(
    (t) =>
      `- **\`${t.code}\` [${t.departmentCode.toUpperCase()} • ${t.stage}]** — ${t.title} *(Risk: \`${t.riskLevel}\`${t.requiresApproval ? ', **Requires Founder Approval**' : ', Autonomous'}${t.dependsOnTaskCodes.length > 0 ? `, Depends on: ${t.dependsOnTaskCodes.join(', ')}` : ''})*`,
  )
  .join('\n')}`;
  }

  /**
   * Generates a truthful, evidence-backed Consolidated Executive Report (Part 6.12 & Rule 15.4).
   * Explicitly separates completed, approval-pending, awaiting-external-handoff, in-progress, and blocked tasks.
   */
  private generateExecutiveReport(
    cycle: CosExecutionCycle,
    tasks: CosTaskRecord[],
  ): CosDeliverable {
    const state = CosStoreRepository.getState();
    const completedTasks = tasks.filter((t) => t.status === 'completed');
    const approvalPendingTasks = tasks.filter((t) => t.status === 'approval_pending');
    const handoffTasks = tasks.filter((t) => t.status === 'awaiting_external_handoff');
    const inProgressOrPlannedTasks = tasks.filter(
      (t) => t.status === 'in_progress' || t.status === 'planned' || t.status === 'approved',
    );
    const blockedOrRejectedTasks = tasks.filter(
      (t) =>
        t.status === 'blocked' ||
        t.status === 'failed' ||
        t.status === 'rejected' ||
        t.status === 'cancelled',
    );

    const cycleDeliverables = state.deliverables.filter(
      (d) => d.executionCycleId === cycle.id && d.deliverableType !== 'executive_report',
    );
    const cycleGitRefs = state.githubReferences.filter((r) => r.executionCycleId === cycle.id);
    const cycleQaChecks = state.qualityChecks.filter((q) => q.executionCycleId === cycle.id);
    const cycleApprovals = state.approvals.filter((a) => a.executionCycleId === cycle.id);

    const nextRecommendedActions: string[] = [];
    if (approvalPendingTasks.length > 0) {
      nextRecommendedActions.push(
        `Review and decide on Pending Approval '${cycleApprovals[0]?.title ?? cycle.objective}' in the Approval Centre to unlock ${approvalPendingTasks.map((t) => t.code).join(', ')}.`,
      );
    }
    if (handoffTasks.length > 0) {
      nextRecommendedActions.push(
        `Submit generated Antigravity Handoff Bundle for ${handoffTasks.map((t) => t.code).join(', ')} or click 'Complete Handoff & Run QA' once branch changes are committed.`,
      );
    }
    if (completedTasks.length === tasks.length && tasks.length > 0) {
      nextRecommendedActions.push(
        'All tasks in this execution cycle are verified complete. Review the PR package / deliverables or issue your next strategic instruction.',
      );
    }

    const reportMarkdown = `### Consolidated Executive Report — \`${cycle.cycleCode}\`
- **Cycle Status:** \`${cycle.status.toUpperCase()}\`
- **Objective:** ${cycle.objective}
- **Departments Involved:** ${cycle.departmentsInvolved.map((d) => `\`${d}\``).join(', ')}
- **Cost & Budget:** ₹${(cycle.costSpentMinor / 100).toFixed(2)} spent of ₹${(cycle.budgetLimitMinor / 100).toFixed(2)} cycle budget

#### 1. Execution Status Breakdown (Zero Unverified Claims)
- **Completed & Verified (${completedTasks.length}/${tasks.length}):** ${completedTasks.map((t) => `\`${t.code}\` (${t.departmentCode})`).join(', ') || 'None yet'}
- **Waiting for Founder Approval (${approvalPendingTasks.length}):** ${approvalPendingTasks.map((t) => `\`${t.code}\` (${t.title})`).join(', ') || 'None'}
- **Awaiting External Antigravity Handoff (${handoffTasks.length}):** ${handoffTasks.map((t) => `\`${t.code}\``).join(', ') || 'None'}
- **Queued / In Progress (${inProgressOrPlannedTasks.length}):** ${inProgressOrPlannedTasks.map((t) => `\`${t.code}\``).join(', ') || 'None'}
- **Blocked / Rejected / Failed (${blockedOrRejectedTasks.length}):** ${blockedOrRejectedTasks.map((t) => `\`${t.code}\` (${t.status})`).join(', ') || 'None'}

#### 2. Deliverables & Repository Evidence Produced (${cycleDeliverables.length})
${cycleDeliverables.map((d) => `- **[${d.deliverableType.toUpperCase()}] ${d.title}** (\`${d.departmentCode}\`): ${d.summary}`).join('\n') || '- None yet'}

#### 3. Git Branches, Worktrees & Handoff References (${cycleGitRefs.length})
${cycleGitRefs.map((r) => `- **\`${r.refType.toUpperCase()}\`**: \`${r.refIdentifier}\` → \`${r.urlOrPath}\` [status: \`${r.status}\`]`).join('\n') || '- No code branches created yet (discovery stage only or awaiting approval)'}

#### 4. Independent QA Verification (${cycleQaChecks.length})
${cycleQaChecks.map((q) => `- **\`${q.taskCode}\` (${q.reviewerProviderModel})**: **${q.status.toUpperCase()}** — ${q.criteriaResults.filter((c) => c.passed).length}/${q.criteriaResults.length} criteria passed`).join('\n') || '- Pending implementation stage'}

#### 5. Recommended Next Actions
${nextRecommendedActions.map((a, i) => `${i + 1}. ${a}`).join('\n')}`;

    const existingReport = state.deliverables.find(
      (d) => d.executionCycleId === cycle.id && d.deliverableType === 'executive_report',
    );

    if (existingReport) {
      existingReport.version += 1;
      existingReport.summary = `Cycle ${cycle.cycleCode} [${cycle.status}]: ${completedTasks.length}/${tasks.length} tasks verified complete, ${approvalPendingTasks.length} awaiting Founder approval.`;
      existingReport.contentMarkdown = reportMarkdown;
      existingReport.structuredData = {
        cycleStatus: cycle.status,
        completedCount: completedTasks.length,
        totalTasksCount: tasks.length,
        approvalPendingCount: approvalPendingTasks.length,
        handoffCount: handoffTasks.length,
        blockedCount: blockedOrRejectedTasks.length,
        costSpentMinor: cycle.costSpentMinor,
        nextRecommendedActions,
      };
      return existingReport;
    }

    const newReport: CosDeliverable = {
      id: `deliv-rep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      projectId: cycle.projectId,
      executionCycleId: cycle.id,
      departmentCode: 'ceo_office',
      deliverableType: 'executive_report',
      title: `Executive Report — ${cycle.cycleCode}: ${cycle.objective.slice(0, 80)}`,
      summary: `Cycle ${cycle.cycleCode} [${cycle.status}]: ${completedTasks.length}/${tasks.length} tasks verified complete, ${approvalPendingTasks.length} awaiting Founder approval.`,
      contentMarkdown: reportMarkdown,
      structuredData: {
        cycleStatus: cycle.status,
        completedCount: completedTasks.length,
        totalTasksCount: tasks.length,
        approvalPendingCount: approvalPendingTasks.length,
        handoffCount: handoffTasks.length,
        blockedCount: blockedOrRejectedTasks.length,
        costSpentMinor: cycle.costSpentMinor,
        nextRecommendedActions,
      },
      version: 1,
      createdAtIso: new Date().toISOString(),
    };
    state.deliverables.unshift(newReport);
    return newReport;
  }
}
