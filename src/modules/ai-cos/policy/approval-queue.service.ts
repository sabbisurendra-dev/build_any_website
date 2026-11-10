import { createHash } from 'node:crypto';
import type { UUID } from '@/types/domain';
import type { CosApprovalRecord, RiskLevel } from '@/modules/ai-cos/core/cos.types';
import { PolicyEngineService, PolicyScopeViolationError } from './policy-engine.service';
import { CosStoreRepository } from '../persistence/cos-store';
import { AppError } from '@/lib/errors';

export interface SubmitPendingActionInput {
  readonly tenantId: UUID;
  readonly executionCycleId?: string;
  readonly proposedByAgent: string;
  readonly actionType: string;
  readonly title: string;
  readonly payload: Record<string, unknown>;
  readonly riskLevel?: RiskLevel;
  readonly reason?: string;
}

export interface DecidePendingActionInput {
  readonly approvalId: string;
  readonly actorRole: 'founder' | 'owner' | 'department_agent' | 'admin' | string;
  readonly actorIdentity: string;
  readonly decision: 'approved' | 'rejected' | 'changes_requested';
  readonly expectedProposalHash?: string;
  readonly decisionNotes?: string;
}

export class ApprovalQueueService {
  private policyEngine = new PolicyEngineService();

  public computeActionPayloadHash(payload: Record<string, unknown>): string {
    const keys = Object.keys(payload).sort();
    const sortedObj: Record<string, unknown> = {};
    for (const key of keys) {
      sortedObj[key] = payload[key];
    }
    return createHash('sha256').update(JSON.stringify(sortedObj)).digest('hex');
  }

  public submitPendingAction(input: SubmitPendingActionInput): CosApprovalRecord {
    const riskLevel: RiskLevel = input.riskLevel ?? 'medium';
    const payloadHash = this.computeActionPayloadHash(input.payload);

    return this.policyEngine.createApprovalRequest({
      projectId: input.tenantId,
      executionCycleId: input.executionCycleId ?? `cyc-${Date.now().toString(36)}`,
      requestingDepartment: 'marketing_growth',
      createdByUserId: input.proposedByAgent,
      title: input.title,
      riskLevel,
      ceoRecommendation: `AI-COS agent '${input.proposedByAgent}' proposed action '${input.actionType}'. Founder review required before applying changes.`,
      reasonForApproval: input.reason ?? `Action alters merchant state (${input.actionType}).`,
      affectedComponents: ['website_builder', 'catalogue_content'],
      expectedBenefit: 'Updated copy and increased storefront conversion.',
      potentialDownside: 'Merchant brand messaging changes.',
      alternativesConsidered: [
        { option: 'Keep existing copy', tradeOff: 'No improvement in conversion' },
      ],
      estimatedCostMinor: 0,
      estimatedDurationMinutes: 5,
      rollbackPlan: 'Revert to previous snapshot via Website Builder version history.',
      exactScope: {
        taskCodes: [input.actionType],
        allowedFileGlobs: ['content/*'],
        allowedTools: ['apply_website_content'],
        summary: `Action '${input.actionType}' with payload hash ${payloadHash.slice(0, 12)}`,
      },
    });
  }

  public decidePendingAction(input: DecidePendingActionInput): CosApprovalRecord {
    // Only founder or owner can decide approvals; agents are strictly forbidden
    if (input.actorRole !== 'founder' && input.actorRole !== 'owner') {
      throw new PolicyScopeViolationError(
        `Actor '${input.actorIdentity}' (${input.actorRole}) is forbidden from deciding approvals. Only the Founder/Owner can approve proposals.`,
      );
    }

    return this.policyEngine.recordApprovalDecision({
      approvalId: input.approvalId,
      actorRole: 'founder', // normalized for policy engine
      actorIdentity: input.actorIdentity,
      decision: input.decision,
      expectedProposalHash: input.expectedProposalHash,
      decisionNotes: input.decisionNotes,
    });
  }

  public listPendingActions(projectId?: string): CosApprovalRecord[] {
    const state = CosStoreRepository.getState();
    return state.approvals.filter((a) => {
      if (a.status !== 'pending') return false;
      if (projectId && a.projectId !== projectId) return false;
      return true;
    });
  }

  public getPendingAction(approvalId: string): CosApprovalRecord {
    const state = CosStoreRepository.getState();
    const match = state.approvals.find((a) => a.id === approvalId);
    if (!match) {
      throw new AppError('NOT_FOUND', `Approval action '${approvalId}' not found.`, 404);
    }
    return match;
  }
}

export const approvalQueueService = new ApprovalQueueService();
