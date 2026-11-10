import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors';
import { ceoOrchestrator, getCosDashboardSnapshot } from '@/modules/ai-cos';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      cycleId: string;
      action: 'pause' | 'resume' | 'cancel' | 'complete_external_handoff';
      taskId?: string;
      commitShaOrPrUrl?: string;
      projectId?: string;
    };

    if (!body.cycleId || !body.action) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'INVALID_CYCLE_CONTROL',
            message: 'cycleId and action are required.',
          },
        },
        { status: 400 },
      );
    }

    const result = await ceoOrchestrator.controlExecutionCycle({
      executionCycleId: body.cycleId,
      action: body.action,
      taskId: body.taskId,
      commitShaOrPrUrl: body.commitShaOrPrUrl,
    });

    return NextResponse.json({
      ok: true,
      data: {
        cycleResult: result,
        snapshot: getCosDashboardSnapshot(body.projectId),
      },
    });
  } catch (error) {
    const status = error instanceof AppError ? error.httpStatus : 500;
    const code = error instanceof AppError ? error.code : 'CYCLE_HANDLER_ERROR';
    return NextResponse.json(
      {
        ok: false,
        error: {
          code,
          message: error instanceof Error ? error.message : 'Cycle control failed.',
        },
      },
      { status },
    );
  }
}
