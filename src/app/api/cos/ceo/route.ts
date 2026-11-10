import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors';
import { requireFounder } from '@/modules/auth/resolve-actor';
import {
  ceoOrchestrator,
  getCosDashboardSnapshot,
  type ExecutionMode,
} from '@/modules/ai-cos';

export async function POST(request: Request) {
  try {
    await requireFounder(request);

    const body = (await request.json()) as {
      projectId?: string;
      conversationId?: string;
      promptText: string;
      preferredExecutionMode?: ExecutionMode;
      simulateQaFailureOnce?: boolean;
    };

    if (!body.promptText || body.promptText.trim().length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'EMPTY_PROMPT',
            message: 'Founder instruction cannot be empty.',
          },
        },
        { status: 400 },
      );
    }

    const result = await ceoOrchestrator.submitFounderInstruction({
      projectId: body.projectId,
      conversationId: body.conversationId,
      message: body.promptText.trim(),
      preferredExecutionMode: body.preferredExecutionMode,
      simulateQaFailureOnce: body.simulateQaFailureOnce,
    });

    return NextResponse.json({
      ok: true,
      data: {
        orchestration: result,
        snapshot: getCosDashboardSnapshot(body.projectId),
      },
    });
  } catch (error) {
    const status = error instanceof AppError ? error.httpStatus : 500;
    const code = error instanceof AppError ? error.code : 'CEO_ORCHESTRATION_FAILED';
    return NextResponse.json(
      {
        ok: false,
        error: {
          code,
          message: error instanceof Error ? error.message : 'CEO orchestration failed.',
        },
      },
      { status },
    );
  }
}
