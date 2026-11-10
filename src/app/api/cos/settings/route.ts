import { NextResponse } from 'next/server';
import {
  CosStoreRepository,
  getCosDashboardSnapshot,
  type DepartmentCode,
} from '@/modules/ai-cos';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action: 'toggle_kill_switch' | 'toggle_department' | 'update_budget';
      enabled?: boolean;
      departmentCode?: DepartmentCode;
      monthlyBudgetMinor?: number;
      actorId?: string;
      reason?: string;
      projectId?: string;
    };

    const state = CosStoreRepository.getState();
    const projectId = body.projectId ?? state.projects[0]?.id ?? 'proj-uwb-01';
    const actorId = body.actorId ?? 'founder-chairman';
    const nowIso = new Date().toISOString();

    if (body.action === 'toggle_kill_switch' && typeof body.enabled === 'boolean') {
      state.companyProfile.globalKillSwitchActive = body.enabled;
      state.companyProfile.updatedAtIso = nowIso;
      if (body.enabled) {
        for (const cycle of state.executionCycles) {
          if (
            cycle.status === 'planning' ||
            cycle.status === 'running_discovery' ||
            cycle.status === 'executing_authorised' ||
            cycle.status === 'verifying_qa'
          ) {
            cycle.status = 'paused';
            cycle.pausedAtIso = nowIso;
            cycle.updatedAtIso = nowIso;
          }
        }
      }
      CosStoreRepository.appendAuditLog({
        projectId,
        actorType: 'founder',
        actorId,
        eventType: body.enabled ? 'GLOBAL_KILL_SWITCH_ACTIVATED' : 'GLOBAL_KILL_SWITCH_DEACTIVATED',
        summary:
          body.reason ??
          (body.enabled
            ? 'Founder activated Emergency Global Kill Switch.'
            : 'Founder deactivated Emergency Global Kill Switch.'),
      });
      CosStoreRepository.persist();
      return NextResponse.json({
        ok: true,
        data: getCosDashboardSnapshot(projectId),
      });
    }

    if (
      body.action === 'toggle_department' &&
      body.departmentCode &&
      typeof body.enabled === 'boolean'
    ) {
      const dept = state.departments.find((d) => d.code === body.departmentCode);
      if (dept && dept.code !== 'ceo_office') {
        dept.isEnabled = body.enabled;
        CosStoreRepository.appendAuditLog({
          projectId,
          actorType: 'founder',
          actorId,
          eventType: body.enabled ? 'DEPARTMENT_ENABLED' : 'DEPARTMENT_DISABLED',
          summary: `Founder ${body.enabled ? 'enabled' : 'disabled'} department ${dept.name} (${dept.code}).`,
        });
        CosStoreRepository.persist();
      }
      return NextResponse.json({
        ok: true,
        data: getCosDashboardSnapshot(projectId),
      });
    }

    if (body.action === 'update_budget' && typeof body.monthlyBudgetMinor === 'number') {
      const proj = state.projects.find((p) => p.id === projectId);
      if (proj && body.monthlyBudgetMinor > 0) {
        proj.monthlyBudgetMinor = Math.round(body.monthlyBudgetMinor);
        proj.updatedAtIso = nowIso;
        CosStoreRepository.persist();
      }
      return NextResponse.json({
        ok: true,
        data: getCosDashboardSnapshot(projectId),
      });
    }

    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_SETTINGS_ACTION', message: 'Invalid settings action.' } },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'SETTINGS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update settings.',
        },
      },
      { status: 500 },
    );
  }
}
