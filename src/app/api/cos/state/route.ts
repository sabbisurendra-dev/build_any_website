import { NextResponse } from 'next/server';
import {
  CosStoreRepository,
  getCosDashboardSnapshot,
  knowledgeService,
  type KnowledgeCategory,
} from '@/modules/ai-cos';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId') ?? undefined;
  const snapshot = getCosDashboardSnapshot(projectId);
  return NextResponse.json({
    ok: true,
    data: snapshot,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action: 'create_project' | 'upsert_knowledge' | 'reset_demo_state';
      project?: {
        slug: string;
        name: string;
        repoUrl: string;
        localWorkspacePath: string;
        defaultBranch?: string;
        description: string;
      };
      knowledge?: {
        projectId: string;
        category: KnowledgeCategory;
        slug: string;
        title: string;
        markdownContent: string;
        changeReason: string;
      };
    };

    if (body.action === 'create_project' && body.project) {
      const state = CosStoreRepository.getState();
      const now = new Date().toISOString();
      const newProject = {
        id: `proj-${Date.now().toString(36)}`,
        companyProfileId: state.companyProfile.id,
        slug: body.project.slug,
        name: body.project.name,
        description: body.project.description,
        repositoryUrl: body.project.repoUrl,
        defaultBranch: body.project.defaultBranch ?? 'main',
        workspacePath: body.project.localWorkspacePath,
        autonomyMode: 'guarded' as const,
        monthlyBudgetMinor: 1000000,
        spentBudgetMinor: 0,
        currency: 'INR' as const,
        status: 'active' as const,
        healthScore: 95,
        knownGapsCount: 0,
        createdAtIso: now,
        updatedAtIso: now,
      };
      state.projects.push(newProject);
      CosStoreRepository.persist();
      return NextResponse.json({
        ok: true,
        data: getCosDashboardSnapshot(newProject.id),
      });
    }

    if (body.action === 'upsert_knowledge' && body.knowledge) {
      knowledgeService.upsertVersionedKnowledge({
        projectId: body.knowledge.projectId,
        category: body.knowledge.category,
        slug: body.knowledge.slug,
        title: body.knowledge.title,
        tags: [body.knowledge.category, body.knowledge.slug],
        contentMarkdown: body.knowledge.markdownContent,
        changeSummary: body.knowledge.changeReason,
        authorisedBy: 'Human Founder & Chairman',
      });
      return NextResponse.json({
        ok: true,
        data: getCosDashboardSnapshot(body.knowledge.projectId),
      });
    }

    if (body.action === 'reset_demo_state') {
      CosStoreRepository.resetForTests(false);
      return NextResponse.json({
        ok: true,
        data: getCosDashboardSnapshot(),
      });
    }

    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_ACTION', message: 'Unsupported state action.' } },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'COS_STATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to mutate AI-COS state.',
        },
      },
      { status: 500 },
    );
  }
}
