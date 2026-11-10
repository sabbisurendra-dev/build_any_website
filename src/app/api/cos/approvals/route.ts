import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors';
import { requireFounder } from '@/modules/auth/resolve-actor';
import { ceoOrchestrator, getCosDashboardSnapshot } from '@/modules/ai-cos';

export async function POST(request: Request) {
  try {
    const founder = await requireFounder(request);

    const body = (await request.json()) as {
      approvalId: string;
      decision: 'approved' | 'rejected' | 'changes_requested';
      expectedProposalHash?: string;
      founderComment?: string;
      projectId?: string;
    };

    if (!body.approvalId || !body.decision) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'INVALID_APPROVAL_PAYLOAD',
            message: 'approvalId and decision are required.',
          },
        },
        { status: 400 },
      );
    }

    const result = await ceoOrchestrator.handleFounderApprovalDecision({
      approvalId: body.approvalId,
      actorIdentity: founder.userId,
      actorRole: 'founder',
      decision: body.decision,
      expectedProposalHash: body.expectedProposalHash,
      decisionNotes: body.founderComment,
    });

    return NextResponse.json({
      ok: true,
      data: {
        approvalResult: result,
        snapshot: getCosDashboardSnapshot(body.projectId),
      },
    });
  } catch (error) {
    const status = error instanceof AppError ? error.httpStatus : 500;
    const code = error instanceof AppError ? error.code : 'APPROVAL_HANDLER_ERROR';
    return NextResponse.json(
      {
        ok: false,
        error: {
          code,
          message: error instanceof Error ? error.message : 'Approval processing failed.',
        },
      },
      { status },
    );
  }
}
