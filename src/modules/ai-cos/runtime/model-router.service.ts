import { AppError } from '@/lib/errors';
import type { DepartmentCode } from '@/modules/ai-cos/core/cos.types';
import { CosStoreRepository } from '@/modules/ai-cos/persistence/cos-store';

/**
 * ============================================================================
 * AI-COS MULTI-PROVIDER MODEL ROUTER & BUDGET GUARD (PART 8.3, 8.4, 8.5)
 * ============================================================================
 * - Routes tasks to optimal model capabilities based on work type and department.
 * - Ensures Independent QA / Code Review uses a distinct provider/model from Engineering.
 * - Tracks token usage and integer minor-unit costs (`paise`), enforcing cycle & project budgets.
 */

export interface RoutedModelSelection {
  provider: string;
  model: string;
  reasoningTier: string;
  liveApiKeyConfigured: boolean;
  executionBackend: 'live_provider_api' | 'codebase_verified_deterministic_engine';
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostMinor: number;
}

export class BudgetExceededError extends AppError {
  constructor(message: string) {
    super('BUDGET_EXCEEDED', message, 402);
  }
}

export class ModelRouterService {
  /**
   * Checks which provider API keys or OIDC tokens are present in the server environment
   * without ever exposing secret values.
   */
  public getProviderAvailabilityStatus(): Record<
    string,
    { configured: boolean; envVarName: string }
  > {
    return {
      google_gemini: {
        configured: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY),
        envVarName: 'GEMINI_API_KEY',
      },
      anthropic: {
        configured: Boolean(process.env.ANTHROPIC_API_KEY),
        envVarName: 'ANTHROPIC_API_KEY',
      },
      openai: {
        configured: Boolean(process.env.OPENAI_API_KEY),
        envVarName: 'OPENAI_API_KEY',
      },
      vercel_ai_gateway: {
        configured: Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN),
        envVarName: 'VERCEL_OIDC_TOKEN',
      },
    };
  }

  /**
   * Selects the provider & model for a given department and work type,
   * enforcing distinct reviewer model selection for `qa_testing` (Part 4.5, 8.4, 9.4).
   */
  public selectModelForRun(input: {
    projectId: string;
    executionCycleId: string;
    departmentCode: DepartmentCode;
    inputPromptLength: number;
    avoidProviderModel?: string;
  }): RoutedModelSelection {
    const state = CosStoreRepository.getState();
    const project = state.projects.find((p) => p.id === input.projectId);
    const cycle = state.executionCycles.find((c) => c.id === input.executionCycleId);
    const dept = state.departments.find((d) => d.code === input.departmentCode);

    if (!project || !dept) {
      throw new AppError('NOT_FOUND', 'Project or department configuration not found.', 404);
    }

    let provider: string = dept.modelConfig.primaryProvider;
    let model: string = dept.modelConfig.primaryModel;

    // Independent Review Rule: QA must not use the exact same provider/model as the implementing agent
    if (
      input.departmentCode === 'qa_testing' &&
      input.avoidProviderModel &&
      `${provider}/${model}` === input.avoidProviderModel
    ) {
      provider = dept.modelConfig.fallbackProvider;
      model = dept.modelConfig.fallbackModel;
    }

    const estimatedInputTokens = Math.max(450, Math.round(input.inputPromptLength / 3.5));
    const estimatedOutputTokens =
      dept.modelConfig.reasoningTier === 'strong_reasoning' ||
      dept.modelConfig.reasoningTier === 'strong_coding'
        ? 1450
        : 850;

    // Integer minor-unit cost calculation (paise)
    const ratePer1kTokensPaise =
      dept.modelConfig.reasoningTier === 'strong_reasoning' ||
      dept.modelConfig.reasoningTier === 'strong_coding' ||
      dept.modelConfig.reasoningTier === 'independent_reviewer'
        ? 250 // ₹2.50 per 1k blended tokens
        : 80; // ₹0.80 per 1k blended tokens

    const estimatedCostMinor = Math.max(
      100,
      Math.round(((estimatedInputTokens + estimatedOutputTokens) / 1000) * ratePer1kTokensPaise),
    );

    // Budget Guard Enforcement (Part 8.5)
    if (cycle && cycle.costSpentMinor + estimatedCostMinor > cycle.budgetLimitMinor) {
      throw new BudgetExceededError(
        `Execution cycle '${cycle.cycleCode}' would exceed its budget limit (${cycle.budgetLimitMinor} paise).`,
      );
    }

    if (project.spentBudgetMinor + estimatedCostMinor > project.monthlyBudgetMinor) {
      throw new BudgetExceededError(
        `Project '${project.name}' would exceed its monthly budget (${project.monthlyBudgetMinor} paise).`,
      );
    }

    const availability = this.getProviderAvailabilityStatus();
    const isPrimaryConfigured = availability[provider]?.configured ?? false;

    return {
      provider,
      model,
      reasoningTier: dept.modelConfig.reasoningTier,
      liveApiKeyConfigured: isPrimaryConfigured,
      executionBackend: isPrimaryConfigured
        ? 'live_provider_api'
        : 'codebase_verified_deterministic_engine',
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedCostMinor,
    };
  }

  /**
   * Commits token and minor-unit cost usage to the project and execution cycle ledger.
   */
  public recordUsage(input: {
    projectId: string;
    executionCycleId: string;
    taskId: string;
    costMinor: number;
  }): void {
    const state = CosStoreRepository.getState();
    const project = state.projects.find((p) => p.id === input.projectId);
    const cycle = state.executionCycles.find((c) => c.id === input.executionCycleId);
    const task = state.tasks.find((t) => t.id === input.taskId);

    if (project) {
      project.spentBudgetMinor += input.costMinor;
      project.updatedAtIso = new Date().toISOString();
    }
    if (cycle) {
      cycle.costSpentMinor += input.costMinor;
      cycle.updatedAtIso = new Date().toISOString();
    }
    if (task) {
      task.actualCostMinor += input.costMinor;
      task.updatedAtIso = new Date().toISOString();
    }
    CosStoreRepository.persist();
  }
}
