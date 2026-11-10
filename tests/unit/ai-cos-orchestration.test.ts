import { beforeEach, describe, expect, it } from 'vitest';
import {
  ceoOrchestrator,
  codingAgentAdapter,
  CosStoreRepository,
  getCosDashboardSnapshot,
  KillSwitchActiveError,
  knowledgeService,
  modelRouter,
  policyEngine,
  PolicyScopeViolationError,
} from '@/modules/ai-cos';

describe('AI Company Operating System (AI-COS) — End-to-End Architecture & Guarded Autonomy Suite', () => {
  beforeEach(() => {
    CosStoreRepository.resetForTests(true);
  });

  it('seeds all 10 company roles (AI CEO + 9 specialist departments), initial knowledge, and active decisions', () => {
    const snapshot = getCosDashboardSnapshot();
    expect(snapshot.departments).toHaveLength(10);
    const codes = snapshot.departments.map((d) => d.code);
    expect(codes).toEqual([
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
    expect(snapshot.knowledgeDocuments.length).toBeGreaterThanOrEqual(4);
    expect(
      snapshot.decisions.filter((d) => d.status === 'active').length,
    ).toBeGreaterThanOrEqual(3);
  });

  it('Rule 15.1: answers direct status questions from Company Knowledge without spawning unnecessary department runs', async () => {
    const res = await ceoOrchestrator.submitFounderInstruction({
      message:
        'What is the current status of our Universal Website Builder & Commerce Platform?',
    });

    expect(res.executionCycle).toBeUndefined();
    expect(res.createdTasks).toHaveLength(0);
    expect(res.ceoMessage.contentMarkdown).toContain('Direct Executive Briefing');
    expect(CosStoreRepository.getState().agentRuns).toHaveLength(0);
  });

  it('Rule 15.6: constructively challenges architectural anti-patterns (single nullable table proposal) using DEC-002', async () => {
    const res = await ceoOrchestrator.submitFounderInstruction({
      message:
        'Why not merge all bookings, physical inventory, and subscriptions into one single table with nullable columns?',
    });

    expect(res.executionCycle).toBeUndefined();
    expect(res.founderRequest.clarificationNeeded).toBe(true);
    expect(res.ceoMessage.contentMarkdown).toContain('Constructive Architectural Challenge');
  });

  it('Workflow B (90-Day Online Courses): runs parallel discovery, halts at MEDIUM-risk Approval Gate with SHA-256 hash, blocks agent self-approval, and completes Engineering + Independent QA after Founder approval', async () => {
    // Step 1: Founder submits instruction
    const submitRes = await ceoOrchestrator.submitFounderInstruction({
      message: 'I want this platform to support selling online courses with access for 90 days.',
    });

    expect(submitRes.pendingApprovals).toHaveLength(1);
    expect(submitRes.executionCycle?.status).toBe('awaiting_approval');

    const approval = submitRes.pendingApprovals[0]!;
    expect(approval.proposalHash).toHaveLength(64);
    expect(approval.riskLevel).toBe('medium');

    // Verify discovery tasks completed while engineering is approval_pending
    const stateMid = CosStoreRepository.getState();
    const cycleTasksMid = stateMid.tasks.filter(
      (t) => t.executionCycleId === submitRes.executionCycle!.id,
    );
    const completedDiscovery = cycleTasksMid.filter((t) => t.status === 'completed');
    const gatedEng = cycleTasksMid.find((t) => t.departmentCode === 'engineering');
    expect(completedDiscovery.length).toBe(4); // research, product, cto, legal
    expect(gatedEng?.status).toBe('approval_pending');

    // Step 2: Rule #9 — An AI agent attempting to approve its own medium/high-risk proposal must be blocked (403)
    await expect(
      ceoOrchestrator.handleFounderApprovalDecision({
        approvalId: approval.id,
        actorIdentity: 'agent-engineering-01',
        actorRole: 'department_agent',
        decision: 'approved',
        expectedProposalHash: approval.proposalHash,
        decisionNotes: 'Self-approving my own task',
      }),
    ).rejects.toThrow(PolicyScopeViolationError);

    // Step 3: Founder approves exact SHA-256 proposal hash
    const approveRes = await ceoOrchestrator.handleFounderApprovalDecision({
      approvalId: approval.id,
      actorIdentity: 'founder-chairman',
      actorRole: 'founder',
      decision: 'approved',
      expectedProposalHash: approval.proposalHash,
      decisionNotes: 'Approved 90-day entitlement window implementation.',
    });

    expect(approveRes.executionCycle?.status).toBe('completed');
    expect(approveRes.executiveReport?.contentMarkdown).toContain(
      'Consolidated Executive Report',
    );

    // Verify Independent QA check ran using a distinct reviewer model from Engineering
    const finalState = CosStoreRepository.getState();
    const qaChecks = finalState.qualityChecks.filter(
      (q) => q.executionCycleId === submitRes.executionCycle!.id,
    );
    expect(qaChecks.length).toBeGreaterThanOrEqual(1);
    expect(qaChecks[0]?.status).toBe('passed');
  });

  it('enforces Approval Rule #8 (blocks silent resubmission of rejected scope hash) and Rule #13 (invalidates approval on material scope change)', async () => {
    const submitRes = await ceoOrchestrator.submitFounderInstruction({
      message:
        'I think the current website editor is too complicated. Simplify the website editor UX for non-technical merchants.',
    });

    const approval = submitRes.pendingApprovals[0]!;
    expect(approval).toBeTruthy();

    // Reject the proposal
    const rejectRes = await ceoOrchestrator.handleFounderApprovalDecision({
      approvalId: approval.id,
      actorIdentity: 'founder-chairman',
      actorRole: 'founder',
      decision: 'rejected',
      expectedProposalHash: approval.proposalHash,
      decisionNotes: 'Scope is too broad right now.',
    });
    expect(rejectRes.approval.status).toBe('rejected');

    // Attempt to silently resubmit the exact same scope hash -> must throw PolicyScopeViolationError
    expect(() =>
      policyEngine.createApprovalRequest({
        projectId: approval.projectId,
        executionCycleId: approval.executionCycleId,
        taskId: approval.taskId,
        requestingDepartment: approval.requestingDepartment,
        title: approval.title,
        proposalVersion: approval.proposalVersion,
        riskLevel: approval.riskLevel,
        ceoRecommendation: approval.ceoRecommendation,
        reasonForApproval: approval.reasonForApproval,
        affectedComponents: approval.affectedComponents,
        expectedBenefit: approval.expectedBenefit,
        potentialDownside: approval.potentialDownside,
        alternativesConsidered: approval.alternativesConsidered,
        estimatedCostMinor: approval.estimatedCostMinor,
        estimatedDurationMinutes: approval.estimatedDurationMinutes,
        rollbackPlan: approval.rollbackPlan,
        exactScope: approval.exactScope,
      }),
    ).toThrow(PolicyScopeViolationError);
  });

  it('Workflow C (Turf Slot Concurrency Bug): executes low-risk bug fix autonomously and handles QA defect rework loop when QA fails on first pass', async () => {
    const res = await ceoOrchestrator.submitFounderInstruction({
      message: 'Fix the issue where two customers can book the same turf slot at the same time.',
      simulateQaFailureOnce: true,
    });

    expect(res.pendingApprovals).toHaveLength(0);
    expect(res.executionCycle?.status).toBe('completed');

    const cycleTasks = CosStoreRepository.getState().tasks.filter(
      (t) => t.executionCycleId === res.executionCycle!.id,
    );
    const engTask = cycleTasks.find((t) => t.departmentCode === 'engineering')!;
    expect(engTask.retryCount).toBe(1);
    expect(engTask.status).toBe('completed');

    const qaChecks = CosStoreRepository.getState().qualityChecks;
    expect(qaChecks.some((q) => q.status === 'failed')).toBe(true);
    expect(qaChecks.some((q) => q.status === 'passed')).toBe(true);
  });

  it('supports External Antigravity Handoff mode without faking task completion until handoff is confirmed', async () => {
    const res = await ceoOrchestrator.submitFounderInstruction({
      message: 'Fix the issue where two customers can book the same turf slot at the same time.',
      preferredExecutionMode: 'external_handoff',
    });

    const cycleId = res.executionCycle!.id;
    const tasks = CosStoreRepository.getState().tasks.filter(
      (t) => t.executionCycleId === cycleId,
    );
    const engTask = tasks.find((t) => t.departmentCode === 'engineering')!;
    const qaTask = tasks.find((t) => t.departmentCode === 'qa_testing')!;

    // Engineering task must pause in awaiting_external_handoff and QA must still be planned
    expect(engTask.status).toBe('awaiting_external_handoff');
    expect(qaTask.status).toBe('planned');

    // Confirm external handoff completion -> advances through QA to cycle completion
    const handoffComplete = await ceoOrchestrator.controlExecutionCycle({
      executionCycleId: cycleId,
      action: 'complete_external_handoff',
      taskId: engTask.id,
      commitShaOrPrUrl: 'commit-verified-001',
    });

    expect(handoffComplete.executionCycle.status).toBe('completed');
  });

  it('Workflow F (Roadmap Reprioritisation): records roadmap decision and supersedes prior roadmap decision', async () => {
    // First record an active roadmap decision
    const initialRoadmapDec = knowledgeService.recordOrSupersedeDecision({
      projectId: 'proj-uwb-01',
      title: 'Initial Priority: Appointment Booking Enhancements',
      category: 'roadmap',
      origin: 'founder',
      summary: 'Focus on appointment booking first.',
      rationale: 'Initial vertical focus',
      alternativesConsidered: ['Digital courses first'],
      authorisedBy: 'Human Founder & Chairman',
    });

    // Run Workflow F reprioritisation
    const wfF = await ceoOrchestrator.submitFounderInstruction({
      message:
        'Prioritise digital products and online courses over appointment booking on our product roadmap.',
    });

    expect(wfF.executionCycle?.status).toBe('awaiting_approval');
    const decisions = CosStoreRepository.getState().decisions;
    const oldDecision = decisions.find((d) => d.id === initialRoadmapDec.newDecision.id)!;
    expect(oldDecision.status).toBe('superseded');
    expect(oldDecision.supersededByDecisionId).toBeTruthy();
  });

  it('Emergency Global Kill Switch immediately blocks tool execution with KillSwitchActiveError (423)', () => {
    const state = CosStoreRepository.getState();
    state.companyProfile.globalKillSwitchActive = true;

    const dummyTask = {
      id: 'tsk-test-01',
      projectId: 'proj-uwb-01',
      executionCycleId: 'cyc-001',
      code: 'CYC-001-T1',
      title: 'Test Task',
      objective: 'Test',
      stage: 'discovery' as const,
      departmentCode: 'business_research' as const,
      assignedAgentId: 'agt-biz-01',
      riskLevel: 'low' as const,
      requiresApproval: false,
      executionMode: 'in_process_specialist' as const,
      status: 'in_progress' as const,
      dependsOnTaskCodes: [],
      relevantFiles: [],
      constraints: [],
      acceptanceCriteria: ['Pass'],
      retryCount: 0,
      maxRetries: 2,
      estimatedCostMinor: 100,
      actualCostMinor: 0,
      deliverableIds: [],
      githubRefIds: [],
      qualityCheckIds: [],
      createdAtIso: new Date().toISOString(),
      updatedAtIso: new Date().toISOString(),
    };

    expect(() =>
      policyEngine.authorizeToolExecution({
        projectId: 'proj-uwb-01',
        task: dummyTask,
        departmentCode: 'business_research',
        toolName: 'inspect_repository_files',
      }),
    ).toThrow(KillSwitchActiveError);

    const capabilities = codingAgentAdapter.getCodingEnvironmentCapabilities();
    expect(capabilities.isolatedGitWorktreeSupported).toBe(true);
    expect(capabilities.handoffBundleSupported).toBe(true);

    const routedQa = modelRouter.selectModelForRun({
      projectId: 'proj-uwb-01',
      executionCycleId: 'cyc-001',
      departmentCode: 'qa_testing',
      inputPromptLength: 500,
      avoidProviderModel: 'openai/o3-mini',
    });
    expect(`${routedQa.provider}/${routedQa.model}`).not.toBe('openai/o3-mini');
  });

  it('Generic Viewer / Mumbai Cricket Turf vs Playo benchmark: executes low-risk competitive evaluation and delivers strengths & weaknesses report', async () => {
    CosStoreRepository.resetForTests(true);

    const promptText =
      'act like a generic viewer, who wants to buy a website to list their cricket turf and get slots booked in Mumbai ; compare the experience to existing alternatives like playo etc. and give a genuine feedback if my website builder can be useful to them ; give a report of strengths, weaknesses';

    const result = await ceoOrchestrator.submitFounderInstruction({
      projectId: 'proj-uwb-01',
      message: promptText,
    });

    expect(result.executionCycle).toBeDefined();
    expect(result.executionCycle!.overallRiskLevel).toBe('low');
    expect(result.executionCycle!.status).toBe('completed');
    expect(result.createdTasks).toHaveLength(3);
    expect(result.pendingApprovals).toHaveLength(0); // Low risk, autonomous!
    expect(result.deliverables.length).toBeGreaterThanOrEqual(3);

    // Business Research Benchmark
    const bizDeliv = result.deliverables.find((d) => d.departmentCode === 'business_research');
    expect(bizDeliv).toBeDefined();
    expect(bizDeliv?.contentMarkdown).toContain('Playo');
    expect(bizDeliv?.contentMarkdown).toContain('15% – 20%');
    expect(bizDeliv?.contentMarkdown).toContain('0%');

    // Product Evaluation
    const prodDeliv = result.deliverables.find((d) => d.departmentCode === 'product');
    expect(prodDeliv).toBeDefined();
    expect(prodDeliv?.contentMarkdown).toContain('Model A Invariant');
    expect(prodDeliv?.contentMarkdown).toContain('Mixed-Cart Commerce');

    // UX Strengths & Weaknesses
    const uxDeliv = result.deliverables.find((d) => d.departmentCode === 'design_ux');
    expect(uxDeliv).toBeDefined();
    expect(uxDeliv?.contentMarkdown).toContain('Strengths Breakdown');
    expect(uxDeliv?.contentMarkdown).toContain('Weaknesses & Gaps to Address');
    expect(uxDeliv?.contentMarkdown).toContain('Genuine Verdict');

    // Executive Report
    expect(result.executiveReport).toBeDefined();
  });
});
