import { AppError } from '@/lib/errors';
import type {
  CosDecisionRecord,
  CosKnowledgeDocument,
  CosKnowledgeVersion,
  DepartmentCode,
  KnowledgeCategory,
} from '@/modules/ai-cos/core/cos.types';
import { CosStoreRepository } from '@/modules/ai-cos/persistence/cos-store';

/**
 * ============================================================================
 * AI-COS VERSIONED KNOWLEDGE, DECISION LEDGER & CONTEXT ASSEMBLER (PART 10)
 * ============================================================================
 * - Maintains separate Product, Technical, Decision, Execution, and Department knowledge.
 * - Preserves superseded decisions with full traceability (never overwrites silently).
 * - Assembles focused, relevance-ranked context packages per task rather than
 *   dumping the entire knowledge base into every agent prompt.
 */

export interface ScopedContextPackage {
  projectId: string;
  projectName: string;
  departmentCode: DepartmentCode;
  relevantKnowledgeDocs: Array<{
    id: string;
    slug: string;
    title: string;
    category: KnowledgeCategory;
    version: number;
    excerpt: string;
    sourceFiles: string[];
  }>;
  activeDecisions: Array<{
    code: string;
    title: string;
    summary: string;
  }>;
  contextSummaryText: string;
}

export class KnowledgeService {
  /**
   * Assembles a focused context package for the CEO or a Specialist Department
   * based on query keywords and department role (Part 6.2 & 10.4).
   */
  public assembleScopedContext(input: {
    projectId: string;
    queryText: string;
    departmentCode: DepartmentCode;
    maxDocs?: number;
  }): ScopedContextPackage {
    const state = CosStoreRepository.getState();
    const project = state.projects.find((p) => p.id === input.projectId);
    if (!project) {
      throw new AppError('NOT_FOUND', `Project '${input.projectId}' not found.`, 404);
    }

    const queryTokens = input.queryText
      .toLowerCase()
      .split(/[^a-z0-9_]+/)
      .filter((t) => t.length >= 3);

    const docsForProject = state.knowledgeDocuments.filter(
      (doc) => doc.projectId === input.projectId,
    );

    // Score each document by keyword overlap + department category affinity
    const scoredDocs = docsForProject
      .map((doc) => {
        let score = 1;
        const searchable = `${doc.title} ${doc.tags.join(' ')} ${doc.contentMarkdown}`.toLowerCase();
        for (const token of queryTokens) {
          if (searchable.includes(token)) {
            score += 3;
          }
        }
        if (input.departmentCode === 'product' && doc.category === 'product') score += 4;
        if (
          (input.departmentCode === 'cto_arch' || input.departmentCode === 'engineering') &&
          (doc.category === 'technical' || doc.category === 'execution')
        ) {
          score += 4;
        }
        if (input.departmentCode === 'qa_testing' && doc.category === 'execution') score += 4;
        return { doc, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, input.maxDocs ?? 3)
      .map((entry) => ({
        id: entry.doc.id,
        slug: entry.doc.slug,
        title: entry.doc.title,
        category: entry.doc.category,
        version: entry.doc.currentVersion,
        excerpt: entry.doc.contentMarkdown.slice(0, 650),
        sourceFiles: entry.doc.sourceFiles,
      }));

    const activeDecisions = state.decisions
      .filter((d) => d.projectId === input.projectId && d.status === 'active')
      .slice(0, 5)
      .map((d) => ({
        code: d.code,
        title: d.title,
        summary: d.summary,
      }));

    const contextSummaryText = [
      `Project: ${project.name} (${project.slug})`,
      `Scoped Knowledge (${scoredDocs.length} docs): ${scoredDocs.map((d) => `${d.title} [v${d.version}]`).join('; ')}`,
      `Active Decisions (${activeDecisions.length}): ${activeDecisions.map((d) => `${d.code}: ${d.title}`).join('; ')}`,
    ].join(' | ');

    return {
      projectId: project.id,
      projectName: project.name,
      departmentCode: input.departmentCode,
      relevantKnowledgeDocs: scoredDocs,
      activeDecisions,
      contextSummaryText,
    };
  }

  /**
   * Creates or versions a knowledge document without losing prior history (Part 10.3).
   */
  public upsertVersionedKnowledge(input: {
    projectId: string;
    slug: string;
    title: string;
    category: KnowledgeCategory;
    tags: string[];
    contentMarkdown: string;
    sourceFiles?: string[];
    changeSummary: string;
    authorisedBy: string;
  }): { document: CosKnowledgeDocument; versionRecord: CosKnowledgeVersion } {
    const state = CosStoreRepository.getState();
    const nowIso = new Date().toISOString();
    const existing = state.knowledgeDocuments.find(
      (d) => d.projectId === input.projectId && d.slug === input.slug,
    );

    if (existing) {
      existing.currentVersion += 1;
      existing.title = input.title;
      existing.category = input.category;
      existing.tags = input.tags;
      existing.contentMarkdown = input.contentMarkdown;
      if (input.sourceFiles) {
        existing.sourceFiles = input.sourceFiles;
      }
      existing.updatedBy = input.authorisedBy;
      existing.updatedAtIso = nowIso;

      const versionRecord: CosKnowledgeVersion = {
        id: `kver-${existing.id}-v${existing.currentVersion}`,
        projectId: input.projectId,
        documentId: existing.id,
        versionNumber: existing.currentVersion,
        changeSummary: input.changeSummary,
        contentMarkdown: input.contentMarkdown,
        authorisedBy: input.authorisedBy,
        createdAtIso: nowIso,
      };
      state.knowledgeVersions.unshift(versionRecord);
      CosStoreRepository.persist();
      return { document: existing, versionRecord };
    }

    const docId = `kdoc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const document: CosKnowledgeDocument = {
      id: docId,
      projectId: input.projectId,
      slug: input.slug,
      title: input.title,
      category: input.category,
      tags: input.tags,
      currentVersion: 1,
      contentMarkdown: input.contentMarkdown,
      sourceFiles: input.sourceFiles ?? [],
      updatedBy: input.authorisedBy,
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
    };

    const versionRecord: CosKnowledgeVersion = {
      id: `kver-${docId}-v1`,
      projectId: input.projectId,
      documentId: docId,
      versionNumber: 1,
      changeSummary: input.changeSummary,
      contentMarkdown: input.contentMarkdown,
      authorisedBy: input.authorisedBy,
      createdAtIso: nowIso,
    };

    state.knowledgeDocuments.unshift(document);
    state.knowledgeVersions.unshift(versionRecord);
    CosStoreRepository.persist();
    return { document, versionRecord };
  }

  /**
   * Supersedes a previous decision while preserving the old decision as 'superseded'
   * and linking `supersededByDecisionId` (Part 10.3).
   */
  public recordOrSupersedeDecision(input: {
    projectId: string;
    executionCycleId?: string;
    supersedeDecisionId?: string;
    title: string;
    category: CosDecisionRecord['category'];
    origin: CosDecisionRecord['origin'];
    summary: string;
    rationale: string;
    alternativesConsidered: string[];
    authorisedBy: string;
  }): { newDecision: CosDecisionRecord; supersededDecision?: CosDecisionRecord } {
    const state = CosStoreRepository.getState();
    const nowIso = new Date().toISOString();
    const newId = `dec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const code = `DEC-${String(state.decisions.length + 1).padStart(3, '0')}`;

    const newDecision: CosDecisionRecord = {
      id: newId,
      projectId: input.projectId,
      executionCycleId: input.executionCycleId,
      code,
      title: input.title,
      category: input.category,
      origin: input.origin,
      summary: input.summary,
      rationale: input.rationale,
      alternativesConsidered: input.alternativesConsidered,
      status: 'active',
      authorisedBy: input.authorisedBy,
      decidedAtIso: nowIso,
    };

    let supersededDecision: CosDecisionRecord | undefined;
    if (input.supersedeDecisionId) {
      supersededDecision = state.decisions.find(
        (d) => d.id === input.supersedeDecisionId && d.projectId === input.projectId,
      );
      if (supersededDecision) {
        supersededDecision.status = 'superseded';
        supersededDecision.supersededByDecisionId = newId;
      }
    }

    state.decisions.unshift(newDecision);

    CosStoreRepository.appendAuditLog({
      projectId: input.projectId,
      executionCycleId: input.executionCycleId,
      actorType: input.origin === 'founder' ? 'founder' : 'ceo',
      actorId: input.authorisedBy,
      eventType: supersededDecision ? 'DECISION_SUPERSEDED' : 'DECISION_RECORDED',
      summary: supersededDecision
        ? `Recorded ${code} ('${input.title}'), superseding ${supersededDecision.code}.`
        : `Recorded ${code} ('${input.title}').`,
      metadata: {
        newDecisionId: newId,
        supersededDecisionId: supersededDecision?.id,
      },
    });

    CosStoreRepository.persist();
    return { newDecision, supersededDecision };
  }
}
