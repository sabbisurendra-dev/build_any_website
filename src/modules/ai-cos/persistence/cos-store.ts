import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  CosAgentMessage,
  CosAgentRun,
  CosApprovalEvent,
  CosApprovalRecord,
  CosAuditLog,
  CosCheckpoint,
  CosCompanyProfile,
  CosConversation,
  CosDecisionRecord,
  CosDeliverable,
  CosDepartment,
  CosExecutionCycle,
  CosFounderRequest,
  CosGithubReference,
  CosKnowledgeDocument,
  CosKnowledgeVersion,
  CosNotification,
  CosPolicyRule,
  CosProject,
  CosQualityCheck,
  CosTaskRecord,
} from '@/modules/ai-cos/core/cos.types';

export interface CosRuntimeSnapshot {
  companyProfile: CosCompanyProfile;
  projects: CosProject[];
  departments: CosDepartment[];
  policyRules: CosPolicyRule[];
  conversations: CosConversation[];
  founderRequests: CosFounderRequest[];
  executionCycles: CosExecutionCycle[];
  tasks: CosTaskRecord[];
  checkpoints: CosCheckpoint[];
  agentRuns: CosAgentRun[];
  agentMessages: CosAgentMessage[];
  approvals: CosApprovalRecord[];
  approvalEvents: CosApprovalEvent[];
  rejectedProposalHashes: string[];
  deliverables: CosDeliverable[];
  githubReferences: CosGithubReference[];
  qualityChecks: CosQualityCheck[];
  decisions: CosDecisionRecord[];
  knowledgeDocuments: CosKnowledgeDocument[];
  knowledgeVersions: CosKnowledgeVersion[];
  notifications: CosNotification[];
  auditLogs: CosAuditLog[];
}

function getCosStateFilePath(): string {
  // In serverless environments (Vercel / AWS Lambda), the root filesystem is read-only except /tmp
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return '/tmp/.aicos-runtime-state.json';
  }
  return resolve(process.cwd(), '.aicos-runtime-state.json');
}

declare global {
  var __aicosRuntimeSnapshot: CosRuntimeSnapshot | undefined;
  var __aicosRuntimeMtimeMs: number | undefined;
  var __aicosInMemoryTestMode: boolean | undefined;
}

function buildSeededCosSnapshot(): CosRuntimeSnapshot {
  const nowIso = '2026-11-10T07:00:00.000Z';
  const companyProfileId = 'comp-aicos-01';
  const defaultProjectId = 'proj-uwb-01';

  const companyProfile: CosCompanyProfile = {
    id: companyProfileId,
    name: 'Antigravity AI Product Company (AI-COS)',
    founderName: 'Human Founder & Chairman',
    autonomyMode: 'guarded',
    globalKillSwitchActive: false,
    maxDelegationDepth: 2,
    maxParallelAgents: 4,
    operatingPrinciples: [
      'Human Founder remains the ultimate authority; AI CEO cannot overrule explicit founder decisions.',
      'Guarded Autonomy: Low-risk discovery, tests, and scoped branch work run autonomously; Medium/High-risk changes require explicit Founder approval tied to a SHA-256 proposal hash.',
      'Preserve Universal Commerce boundaries ("Sell an item, grant a right"): never collapse physical inventory, exclusive turf slots, staff appointments, capacity sessions, 90-day digital courses, and subscriptions into one nullable table.',
      'Preserve the 12-column Metabase-inspired visual website editor and integer minor currency units (paise).',
      'Independent Verification: A developer agent claim of completion is never accepted without independent QA verification.',
    ],
    updatedAtIso: nowIso,
  };

  const projects: CosProject[] = [
    {
      id: defaultProjectId,
      companyProfileId,
      slug: 'universal-website-builder',
      name: 'Universal Website Builder & Commerce Platform',
      description:
        'Multi-tenant SaaS enabling businesses to build 12-column visual websites and sell physical goods (milk, laptops), exclusive resource slots (turfs, courts), staff appointments (clinics, salons), capacity sessions (yoga classes), 90-day digital courses, and recurring subscriptions.',
      repositoryUrl: 'https://github.com/sabbisurendra-dev/build_any_website.git',
      defaultBranch: 'main',
      workspacePath: process.cwd(),
      autonomyMode: 'guarded',
      monthlyBudgetMinor: 5000000, // ₹50,000.00 in paise
      spentBudgetMinor: 4200,
      currency: 'INR',
      status: 'active',
      healthScore: 86,
      knownGapsCount: 5,
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
    },
  ];

  const departments: CosDepartment[] = [
    {
      id: 'dept-ceo-01',
      code: 'ceo_office',
      name: 'CEO / Executive Office',
      shortLabel: 'AI CEO',
      mandate:
        'Primary operating partner to the Founder. Interprets natural-language goals, retrieves project context, classifies intent, selects the minimal effective departments, resolves cross-department conflicts, enforces approval gates, and delivers verified executive reports.',
      responsibilities: [
        'Founder intent interpretation & context retrieval',
        'Minimal-effective department selection & task DAG planning',
        'Cross-department synthesis & conflict resolution',
        'Risk classification & Founder approval escalation',
        'Roadmap stewardship & verified executive reporting',
      ],
      permissionBoundaries: [
        'Cannot bypass PolicyEngineService or self-approve Medium/High-risk proposals',
        'Cannot directly mutate main branch code or production infrastructure',
        'Must never report unverified or planned work as completed',
      ],
      isEnabled: true,
      agentId: 'agt-ceo-01',
      agentDisplayName: 'Executive CEO Orchestrator',
      systemInstructions:
        'You are the AI CEO managing the Universal Website Builder & Commerce Platform under the Human Founder. Think like a seasoned product-company leader before delegating.',
      modelConfig: {
        workType: 'ceo_strategic_planning',
        reasoningTier: 'strong_reasoning',
        primaryProvider: 'google_gemini',
        primaryModel: 'gemini-3.8-pro',
        fallbackProvider: 'anthropic',
        fallbackModel: 'claude-sonnet-4-20250514',
        maxTokensBudget: 48000,
      },
      toolPermissions: [
        { toolName: 'read_knowledge', permissionMode: 'allow' },
        { toolName: 'inspect_repository', permissionMode: 'allow' },
        { toolName: 'create_execution_plan', permissionMode: 'allow' },
        { toolName: 'delegate_department_task', permissionMode: 'allow' },
        { toolName: 'request_founder_approval', permissionMode: 'allow' },
        { toolName: 'publish_executive_report', permissionMode: 'allow' },
      ],
    },
    {
      id: 'dept-product-02',
      code: 'product',
      name: 'Product Management Department',
      shortLabel: 'Product',
      mandate:
        'Owns product vision, PRDs, user journeys, acceptance criteria, and cross-vertical compatibility across the 12-column website builder and all 6 commercial models.',
      responsibilities: [
        'Authoring PRDs, user stories, and measurable acceptance criteria',
        'Evaluating impact across physical inventory, turf slots, appointments, sessions, 90-day courses, and subscriptions',
        'Ensuring backward compatibility for existing SMB tenants',
      ],
      permissionBoundaries: [
        'Read-only codebase & documentation inspection',
        'Cannot modify source code or database schemas',
      ],
      isEnabled: true,
      agentId: 'agt-product-02',
      agentDisplayName: 'VP of Product Agent',
      systemInstructions:
        'You are the Product Management Lead for the Universal Website Builder & Commerce Platform. Define crisp user journeys, edge cases, and testable acceptance criteria.',
      modelConfig: {
        workType: 'complex_product_analysis',
        reasoningTier: 'strong_reasoning',
        primaryProvider: 'google_gemini',
        primaryModel: 'gemini-3.8-pro',
        fallbackProvider: 'openai',
        fallbackModel: 'gpt-4.1',
        maxTokensBudget: 32000,
      },
      toolPermissions: [
        { toolName: 'read_knowledge', permissionMode: 'allow' },
        { toolName: 'inspect_repository', permissionMode: 'allow' },
        { toolName: 'write_deliverable', permissionMode: 'allow' },
      ],
    },
    {
      id: 'dept-cto-03',
      code: 'cto_arch',
      name: 'CTO / Architecture Department',
      shortLabel: 'CTO / Arch',
      mandate:
        'Safeguards technical architecture, Drizzle PostgreSQL schemas, GiST concurrency locks, tenant isolation, API contracts, and migration safety.',
      responsibilities: [
        'System design, database ERD review, and API contract specification',
        'Enforcing orthogonal domain boundaries (orders vs fulfilments vs bookings vs entitlements vs subscriptions)',
        'Reviewing tenant isolation (withTenantTransaction) and concurrency safety',
      ],
      permissionBoundaries: [
        'Can author Architecture Proposals and ADRs autonomously',
        'Any consequential schema or architectural implementation requires Founder approval',
      ],
      isEnabled: true,
      agentId: 'agt-cto-03',
      agentDisplayName: 'Chief Architect Agent',
      systemInstructions:
        'You are the CTO & Principal Architect. Preserve modular monolith boundaries, PostgreSQL GiST exclusion invariants, minor currency units, and strict tenant isolation.',
      modelConfig: {
        workType: 'architecture_review',
        reasoningTier: 'strong_reasoning',
        primaryProvider: 'anthropic',
        primaryModel: 'claude-sonnet-4-20250514',
        fallbackProvider: 'google_gemini',
        fallbackModel: 'gemini-3.8-pro',
        maxTokensBudget: 40000,
      },
      toolPermissions: [
        { toolName: 'read_knowledge', permissionMode: 'allow' },
        { toolName: 'inspect_repository', permissionMode: 'allow' },
        { toolName: 'write_deliverable', permissionMode: 'allow' },
      ],
    },
    {
      id: 'dept-eng-04',
      code: 'engineering',
      name: 'Engineering Department',
      shortLabel: 'Engineering',
      mandate:
        'Implements approved frontend, backend, database, and widget changes in isolated Git branches/worktrees, writes automated Vitest tests, and prepares Pull Requests.',
      responsibilities: [
        'TypeScript, Next.js 15, Tailwind v4, and Drizzle ORM implementation',
        'Working strictly in isolated branches/worktrees (aicos/task-*)',
        'Writing unit & concurrency tests and preparing PR packages',
      ],
      permissionBoundaries: [
        'Never pushes directly to main branch',
        'Cannot execute Medium/High-risk mutations without a valid Policy Engine capabilityToken',
        'Cannot mark its own work as final COMPLETED without Independent QA verification',
      ],
      isEnabled: true,
      agentId: 'agt-eng-04',
      agentDisplayName: 'Staff Software Engineer Agent',
      systemInstructions:
        'You are the Lead Engineering Agent. Follow strict TypeScript (noUncheckedIndexedAccess), preserve existing tests, and operate inside isolated branches.',
      modelConfig: {
        workType: 'coding_complex',
        reasoningTier: 'strong_coding',
        primaryProvider: 'anthropic',
        primaryModel: 'claude-sonnet-4-20250514',
        fallbackProvider: 'google_gemini',
        fallbackModel: 'gemini-3.8-flash',
        maxTokensBudget: 48000,
      },
      toolPermissions: [
        { toolName: 'inspect_repository', permissionMode: 'allow' },
        {
          toolName: 'create_isolated_branch',
          permissionMode: 'allow',
          scopeConstraint: 'aicos/*',
        },
        {
          toolName: 'apply_worktree_changes',
          permissionMode: 'require_approval',
          scopeConstraint: 'Approved task file globs only',
        },
        { toolName: 'run_approved_tests', permissionMode: 'allow' },
        { toolName: 'prepare_pull_request', permissionMode: 'allow' },
        { toolName: 'write_deliverable', permissionMode: 'allow' },
      ],
    },
    {
      id: 'dept-design-05',
      code: 'design_ux',
      name: 'Design / UX Department',
      shortLabel: 'Design / UX',
      mandate:
        'Designs intuitive user journeys, 12-column visual website builder interactions, @container adaptive commerce widgets, and industry-specific storefront themes.',
      responsibilities: [
        'Website editor UX simplification for non-technical business owners',
        'Responsive Desktop (12-col), Tablet (8-col), and Mobile (4-col) widget ergonomics',
        'Accessibility (WCAG AA) and design system consistency',
      ],
      permissionBoundaries: [
        'Can explore design variations and component specs autonomously',
        'Cannot replace approved design systems without Founder approval',
      ],
      isEnabled: true,
      agentId: 'agt-design-05',
      agentDisplayName: 'Principal Product Designer Agent',
      systemInstructions:
        'You are the Principal Design & UX Agent. Make the 12-column Metabase-inspired website editor and multi-vertical storefronts effortless for non-technical SMB owners.',
      modelConfig: {
        workType: 'ux_design_exploration',
        reasoningTier: 'strong_reasoning',
        primaryProvider: 'google_gemini',
        primaryModel: 'gemini-3.8-pro',
        fallbackProvider: 'anthropic',
        fallbackModel: 'claude-sonnet-4-20250514',
        maxTokensBudget: 32000,
      },
      toolPermissions: [
        { toolName: 'read_knowledge', permissionMode: 'allow' },
        { toolName: 'inspect_repository', permissionMode: 'allow' },
        { toolName: 'write_deliverable', permissionMode: 'allow' },
      ],
    },
    {
      id: 'dept-qa-06',
      code: 'qa_testing',
      name: 'QA / Testing Department',
      shortLabel: 'Independent QA',
      mandate:
        'Independently verifies Engineering and Design outputs against acceptance criteria, executes unit/concurrency/typecheck suites, and raises blocking defects when criteria fail.',
      responsibilities: [
        'Independent verification using a distinct reviewer perspective/model',
        'Running Vitest suites (including 23-customer turf concurrency race & 8 universal commerce scenarios)',
        'Checking responsive layouts, tenant isolation, and raising actionable defects',
      ],
      permissionBoundaries: [
        'Strictly independent from Engineering implementation agent',
        'Read-only access to code; can execute approved test suites and create defect records',
      ],
      isEnabled: true,
      agentId: 'agt-qa-06',
      agentDisplayName: 'Independent QA & Security Verifier',
      systemInstructions:
        'You are the Independent QA Lead. Never trust developer claims without test and acceptance criteria evidence.',
      modelConfig: {
        workType: 'independent_code_review',
        reasoningTier: 'independent_reviewer',
        primaryProvider: 'openai',
        primaryModel: 'gpt-4.1',
        fallbackProvider: 'google_gemini',
        fallbackModel: 'gemini-3.8-pro',
        maxTokensBudget: 32000,
      },
      toolPermissions: [
        { toolName: 'inspect_repository', permissionMode: 'allow' },
        { toolName: 'run_approved_tests', permissionMode: 'allow' },
        { toolName: 'verify_acceptance_criteria', permissionMode: 'allow' },
        { toolName: 'write_deliverable', permissionMode: 'allow' },
      ],
    },
    {
      id: 'dept-biz-07',
      code: 'business_research',
      name: 'Business / Strategy / Research Department',
      shortLabel: 'Business & Research',
      mandate:
        'Conducts competitor analysis, commercial model benchmarking, pricing research, and vertical opportunity sizing while strictly separating facts, assumptions, and recommendations.',
      responsibilities: [
        'Benchmarking website builders (Shopify, Wix, Framer, Squarespace, Metabase, Calendly, Mindbody)',
        'Evaluating unit economics, SMB pricing tiers, and vertical expansion',
        'Explicitly distinguishing verified facts from assumptions and estimates',
      ],
      permissionBoundaries: ['Read-only research and strategic recommendation authoring'],
      isEnabled: true,
      agentId: 'agt-biz-07',
      agentDisplayName: 'Strategy & Market Research Lead',
      systemInstructions:
        'You are the Business & Competitive Research Lead. Always separate verified facts, assumptions, estimates, and actionable recommendations.',
      modelConfig: {
        workType: 'market_research',
        reasoningTier: 'strong_reasoning',
        primaryProvider: 'google_gemini',
        primaryModel: 'gemini-3.8-flash',
        fallbackProvider: 'openai',
        fallbackModel: 'gpt-4.1-mini',
        maxTokensBudget: 24000,
      },
      toolPermissions: [
        { toolName: 'read_knowledge', permissionMode: 'allow' },
        { toolName: 'search_approved_sources', permissionMode: 'allow' },
        { toolName: 'write_deliverable', permissionMode: 'allow' },
      ],
    },
    {
      id: 'dept-growth-08',
      code: 'marketing_growth',
      name: 'Marketing / Growth Department',
      shortLabel: 'Marketing & Growth',
      mandate:
        'Plans go-to-market positioning, storefront conversion optimisation, local SMB SEO, WhatsApp/referral loops, and activation experiments.',
      responsibilities: [
        'Storefront checkout conversion & SEO metadata strategy',
        'SMB onboarding activation & retention playbooks',
      ],
      permissionBoundaries: ['Advisory strategy & deliverable generation only by default'],
      isEnabled: true,
      agentId: 'agt-growth-08',
      agentDisplayName: 'Growth & Conversion Strategist',
      systemInstructions:
        'You are the Growth & SEO Lead. Focus on high-conversion SMB storefronts, local SEO, and frictionless booking/checkout funnels.',
      modelConfig: {
        workType: 'summarisation',
        reasoningTier: 'efficient_coding',
        primaryProvider: 'google_gemini',
        primaryModel: 'gemini-3.8-flash',
        fallbackProvider: 'openai',
        fallbackModel: 'gpt-4.1-mini',
        maxTokensBudget: 20000,
      },
      toolPermissions: [
        { toolName: 'read_knowledge', permissionMode: 'allow' },
        { toolName: 'write_deliverable', permissionMode: 'allow' },
      ],
    },
    {
      id: 'dept-data-09',
      code: 'data_analytics',
      name: 'Data / Analytics Department',
      shortLabel: 'Data & Analytics',
      mandate:
        'Defines product metrics, conversion funnels, cohort retention, revenue/occupancy KPIs, and master ledger projections (v_universal_commerce_master).',
      responsibilities: [
        'Instrumentation specs and measurable outcome KPIs for every product initiative',
        'Master Data Projection (v_universal_commerce_master) integrity and BI readiness',
      ],
      permissionBoundaries: ['Read-only analytics inspection and instrumentation specification'],
      isEnabled: true,
      agentId: 'agt-data-09',
      agentDisplayName: 'Principal Data & Metrics Analyst',
      systemInstructions:
        'You are the Data & Analytics Lead. Define concrete, measurable success metrics and instrumentation for every product change.',
      modelConfig: {
        workType: 'data_analysis',
        reasoningTier: 'efficient_coding',
        primaryProvider: 'google_gemini',
        primaryModel: 'gemini-3.8-flash',
        fallbackProvider: 'anthropic',
        fallbackModel: 'claude-sonnet-4-20250514',
        maxTokensBudget: 24000,
      },
      toolPermissions: [
        { toolName: 'read_knowledge', permissionMode: 'allow' },
        { toolName: 'inspect_repository', permissionMode: 'allow' },
        { toolName: 'write_deliverable', permissionMode: 'allow' },
      ],
    },
    {
      id: 'dept-legal-10',
      code: 'legal_compliance',
      name: 'Legal / Regulatory / Compliance Department',
      shortLabel: 'Legal & Compliance',
      mandate:
        'Identifies privacy (India DPDP Act / GDPR), payment compliance (PCI-DSS SAQ-A / RBI UPI), refund/cancellation consumer protection rules, and flags matters requiring qualified legal counsel.',
      responsibilities: [
        'Privacy, data retention, and cross-tenant PII protection review',
        'Payment compliance, recurring subscription mandate disclosures, and refund policy review',
      ],
      permissionBoundaries: [
        'Distinguishes regulatory research from formal legal advice',
        'Cannot enter binding commitments or send external legal communications',
      ],
      isEnabled: true,
      agentId: 'agt-legal-10',
      agentDisplayName: 'Compliance & Regulatory Research Analyst',
      systemInstructions:
        'You are the Legal & Compliance Research Specialist. Flag privacy, payment, and consumer-protection risks clearly and note when qualified human legal review is required.',
      modelConfig: {
        workType: 'security_review',
        reasoningTier: 'strong_reasoning',
        primaryProvider: 'anthropic',
        primaryModel: 'claude-sonnet-4-20250514',
        fallbackProvider: 'google_gemini',
        fallbackModel: 'gemini-3.8-pro',
        maxTokensBudget: 24000,
      },
      toolPermissions: [
        { toolName: 'read_knowledge', permissionMode: 'allow' },
        { toolName: 'write_deliverable', permissionMode: 'allow' },
      ],
    },
  ];

  const policyRules: CosPolicyRule[] = [
    {
      id: 'pol-low-01',
      projectId: defaultProjectId,
      ruleCode: 'POL-LOW-RESEARCH-AND-DOCS',
      name: 'Autonomous Research, PRD, ADR & UX Exploration',
      description:
        'Market research, codebase inspection, PRD/ADR drafting, UX wireframing, and internal task planning proceed autonomously within budget.',
      actionCategory: 'discovery_and_planning',
      pathPatterns: ['docs/**', '.aicos/**'],
      riskLevel: 'low',
      requiresFounderApproval: false,
      isHardProhibited: false,
      isActive: true,
    },
    {
      id: 'pol-low-02',
      projectId: defaultProjectId,
      ruleCode: 'POL-LOW-ISOLATED-TESTS-AND-BRANCHES',
      name: 'Autonomous Local Tests, Typechecks & Feature Branch Preparation',
      description:
        'Running Vitest, tsc, ESLint, creating isolated aicos/* branches, and routine bug fixes within an already-authorised scope proceed autonomously.',
      actionCategory: 'routine_engineering_and_qa',
      pathPatterns: ['tests/**', 'src/components/**'],
      riskLevel: 'low',
      requiresFounderApproval: false,
      isHardProhibited: false,
      isActive: true,
    },
    {
      id: 'pol-med-01',
      projectId: defaultProjectId,
      ruleCode: 'POL-MED-DATABASE-AND-COMMERCE-CORE',
      name: 'Database Schema, Universal Commerce & Concurrency Engine Changes',
      description:
        'Any modification to Drizzle schemas, SQL migrations, UniversalCommerceService, BookingServiceImpl, or GiST concurrency locking requires explicit Founder approval before implementation.',
      actionCategory: 'schema_and_commerce_lifecycle',
      pathPatterns: [
        'src/db/schema/**',
        'src/db/migrations/**',
        'src/modules/commerce/**',
        'src/modules/booking/**',
      ],
      riskLevel: 'medium',
      requiresFounderApproval: true,
      isHardProhibited: false,
      isActive: true,
    },
    {
      id: 'pol-med-02',
      projectId: defaultProjectId,
      ruleCode: 'POL-MED-VISUAL-EDITOR-AND-AUTH',
      name: '12-Column Visual Website Editor, Auth/RBAC & Payment Flows',
      description:
        'Major changes to the 12-column Metabase grid engine, widget registry architecture, authentication/tenant isolation, or payment gateway adapters require Founder approval before implementation.',
      actionCategory: 'editor_auth_and_payments',
      pathPatterns: [
        'src/modules/website-builder/grid-engine.ts',
        'src/modules/auth/**',
        'src/modules/payments/**',
        'package.json',
      ],
      riskLevel: 'medium',
      requiresFounderApproval: true,
      isHardProhibited: false,
      isActive: true,
    },
    {
      id: 'pol-high-01',
      projectId: defaultProjectId,
      ruleCode: 'POL-HIGH-PROD-DEPLOY-AND-DESTRUCTIVE-DDL',
      name: 'Production Deployment, Destructive Migrations & Secret Changes',
      description:
        'Deploying to production, running destructive database DDL (DROP/TRUNCATE), or modifying production credentials requires explicit High-Risk Founder authorisation.',
      actionCategory: 'production_and_credentials',
      pathPatterns: ['.env*', 'vercel.json'],
      riskLevel: 'high',
      requiresFounderApproval: true,
      isHardProhibited: false,
      isActive: true,
    },
    {
      id: 'pol-prohibited-01',
      projectId: defaultProjectId,
      ruleCode: 'POL-PROHIBITED-FINANCIAL-AND-LEGAL',
      name: 'Prohibited Financial Transactions & Legal Commitments',
      description:
        'AI agents are strictly prohibited from spending external funds, changing live bank payout routes, or sending legally binding commitments.',
      actionCategory: 'financial_and_legal_execution',
      pathPatterns: [],
      riskLevel: 'prohibited',
      requiresFounderApproval: true,
      isHardProhibited: true,
      isActive: true,
    },
  ];

  const knowledgeDocuments: CosKnowledgeDocument[] = [
    {
      id: 'kdoc-prod-01',
      projectId: defaultProjectId,
      slug: 'universal-commerce-product-vision',
      title: 'Universal Website Builder & 6-Model Commerce Vision ("Sell an Item, Grant a Right")',
      category: 'product',
      tags: ['vision', 'website-builder', 'editor', 'commerce', 'courses', 'subscriptions', 'turf', 'milk', 'laptop'],
      currentVersion: 2,
      contentMarkdown: `### Core Product Identity
The platform combines a **12-Column Metabase-Inspired Visual Website Builder** with a **Universal Commerce & Entitlement Engine** (*"Sell an item, grant a right"*).

### Six Supported Commercial Models
1. **Physical Inventory & Ordinary Commerce (\`physical_product\`)**: Milk, groceries, laptops, electronics. Uses 8-min \`inventory_reservations\`, \`inventory_movements\` stock ledger, and \`fulfilments\` (\`local_delivery\` / \`store_pickup\`).
2. **Exclusive Resource Bookings (\`bookable_resource\`)**: Football turfs, badminton courts, rooms. Protected by PostgreSQL \`EXCLUDE USING gist\` overlap prevention + 23-racer concurrency lock + \`time_slot_access\` entitlement.
3. **Staff & Service Appointments (\`service_appointment\`)**: Doctors, clinics, salons, consultants. Enforces turnaround buffers, break hours, and holiday exceptions.
4. **Capacity-Based Sessions (\`capacity_session\`)**: 20-seat Yoga batches, gym classes, workshops. Enforces \`bookedCount + heldCount <= maxCapacity\` + \`session_attendance\` entitlement.
5. **Digital Products & Time-Limited Entitlements (\`digital_content\`)**: 90-day online courses and video libraries. Grants \`digital_content_access\` with \`permission_timeslot_start..end\` (\`validFrom..validUntil\`) and real-time expiry on day 91.
6. **Customer Subscriptions (\`subscription_plan\`)**: Monthly/annual recurring memberships with renewal window extension and \`cancel_at_period_end\` paid-through access guarantee.`,
      sourceFiles: [
        'AGENTS.md',
        'src/modules/commerce/commerce.service.ts',
        'src/modules/website-builder/widget-registry.ts',
      ],
      updatedBy: 'AI CEO (Phase 0 Seed)',
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
    },
    {
      id: 'kdoc-tech-02',
      projectId: defaultProjectId,
      slug: 'saas-technical-architecture-and-grid-engine',
      title: 'Technical Architecture: 12-Col Grid Engine, Drizzle Schema & v_universal_commerce_master',
      category: 'technical',
      tags: ['architecture', 'grid-engine', 'editor', 'drizzle', 'postgres', 'master-projection', 'widgets'],
      currentVersion: 1,
      contentMarkdown: `### 1. Metabase-Inspired 12-Column Visual Editor
- Implemented in \`src/modules/website-builder/grid-engine.ts\` and \`src/components/editor/*\`.
- Desktop = 12 columns, Tablet = 8 columns, Mobile = 4 columns.
- Deterministic push-down vertical collision resolution (\`moveOrResizeWidget\`, \`compactVertically\`).
- Single-slot adaptive widgets (\`commerce.inventory-slot\`, \`content.course-catalog\`, \`commerce.subscription-plans\`, \`commerce.master-ledger-slot\`) use CSS \`@container\` inline-size queries.

### 2. Orthogonal State Machines & Master Projection
- 49 Drizzle PostgreSQL tables across \`src/db/schema/*\`.
- \`v_universal_commerce_master\` projects: \`entity\`, \`sub_entity\`, \`domain\`, \`category\`, \`flag_1\`, \`flag_2\`, \`item_name\`, \`permission_timeslot_start\`, \`permission_timeslot_end\`, \`status\`, \`stock_available\`, \`price_minor\`.
- All monetary values are stored in integer minor units (\`paise\` for \`INR\`).`,
      sourceFiles: [
        'src/modules/website-builder/grid-engine.ts',
        'src/db/schema/universal-commerce.ts',
        'docs/architecture/05-universal-commerce-and-entitlements.md',
      ],
      updatedBy: 'CTO / Architecture Department',
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
    },
    {
      id: 'kdoc-exec-03',
      projectId: defaultProjectId,
      slug: 'phase-4-production-readiness-audit-backlog',
      title: 'Known SaaS Production Gaps & P0 Remediation Backlog',
      category: 'execution',
      tags: ['audit', 'security', 'tenant-isolation', 'postgres', 'auth', 'crud', 'technical-debt', 'improvements'],
      currentVersion: 1,
      contentMarkdown: `### Verified Working Baseline
- \`pnpm test\`: 39/39 unit & concurrency tests passing across 7 suites (including 23-customer simultaneous turf booking race and all 8 universal commerce scenarios).

### P0 Production Gaps Identified in Repository Audit
1. **Cross-Tenant Data Leak in 5 Dashboard Pages (\`P0 Security\`)**: \`/dashboard/customers\`, \`/dashboard/reports\`, \`/dashboard/resources\`, \`/dashboard/services\`, and \`/dashboard/staff\` read \`RuntimeStateRepository.getState()\` without filtering by \`tenantId\`.
2. **Header Spoofing & Unauthenticated Cancel (\`P0 Security\`)**: \`resolveRequestActor\` trusts \`x-actor-role\` in all environments, and \`POST /api/public/v1/bookings/[bookingId]/cancel\` does not verify caller ownership.
3. **Persistence Migration (\`P0 Infrastructure\`)**: Runtime services currently persist to \`.runtime-state.json\` via \`RuntimeStateRepository\`; migrating services to Drizzle \`withTenantTransaction\` and generating initial \`CREATE TABLE\` migrations is required for multi-instance deployment.
4. **Website Editor UX & CRUD Enhancements (\`P1 Product\`)**: Non-technical SMB owners need guided onboarding/section presets, pointer drag-resize handles in \`editor-canvas.tsx\`, and self-service CRUD modals for catalog items, staff schedules, and course modules.`,
      sourceFiles: [
        'docs/audit/phase-4-mvp-readiness-audit.md',
        'src/modules/auth/resolve-actor.ts',
        'src/modules/persistence/runtime-store.ts',
      ],
      updatedBy: 'QA & CTO Audit',
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
    },
    {
      id: 'kdoc-dept-04',
      projectId: defaultProjectId,
      slug: 'department-operating-standards',
      title: 'AI-COS Department Operating Standards & Verification Protocol',
      category: 'department',
      tags: ['standards', 'qa', 'engineering', 'approval', 'antigravity'],
      currentVersion: 1,
      contentMarkdown: `### Operating Rules
1. **Think Before Delegating**: Simple questions are answered directly; bug fixes involve only Engineering + Independent QA; strategic product/UX changes involve Business Research, Product, CTO, and Design.
2. **Structured Outputs**: Every department task produces a validated deliverable linked to its task and execution cycle.
3. **Independent QA**: Engineering never marks its own task \`completed\`. QA must verify acceptance criteria and test outputs independently.`,
      sourceFiles: ['AGENTS.md'],
      updatedBy: 'AI CEO Office',
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
    },
  ];

  const knowledgeVersions: CosKnowledgeVersion[] = knowledgeDocuments.map((doc) => ({
    id: `kver-${doc.id}-v1`,
    projectId: defaultProjectId,
    documentId: doc.id,
    versionNumber: doc.currentVersion,
    changeSummary: 'Initial verified baseline from Phase 0 repository inspection.',
    contentMarkdown: doc.contentMarkdown,
    authorisedBy: 'Human Founder & Chairman',
    createdAtIso: nowIso,
  }));

  const decisions: CosDecisionRecord[] = [
    {
      id: 'dec-001',
      projectId: defaultProjectId,
      code: 'DEC-001',
      title: 'Guarded Autonomy Enforced by Server-Side Policy Engine',
      category: 'autonomy',
      origin: 'founder',
      summary:
        'Low-risk research, documentation, test execution, and isolated branch preparation are autonomous. Medium-risk architecture, schema, commerce lifecycle, and editor changes require explicit Founder approval bound to a SHA-256 proposal hash.',
      rationale:
        'Prevents approval fatigue on routine discovery work while guaranteeing the Human Founder retains absolute control over consequential product, schema, security, and financial decisions.',
      alternativesConsidered: [
        'Manual approval for every step (rejected: causes severe bottleneck)',
        'Unrestricted autonomous agent execution (rejected: unsafe for production multi-tenant commerce)',
      ],
      status: 'active',
      authorisedBy: 'Human Founder & Chairman',
      decidedAtIso: nowIso,
    },
    {
      id: 'dec-002',
      projectId: defaultProjectId,
      code: 'DEC-002',
      title: 'Preserve 12-Column Metabase Visual Editor & Orthogonal Commerce Models',
      category: 'architecture',
      origin: 'founder',
      summary:
        'The 12-column responsive CSS Grid visual editor and the separation between physical inventory, exclusive resource bookings, staff appointments, capacity sessions, 90-day digital entitlements, and recurring subscriptions are core platform invariants.',
      rationale:
        'Ensures the platform can power diverse SMB verticals without collapsing distinct commercial lifecycles into a brittle single table.',
      alternativesConsidered: [
        'Single universal booking/inventory table with nullable columns (rejected: violates 3NF and lifecycle orthodoxy)',
      ],
      status: 'active',
      authorisedBy: 'Human Founder & Chairman',
      decidedAtIso: nowIso,
    },
    {
      id: 'dec-003',
      projectId: defaultProjectId,
      code: 'DEC-003',
      title: 'Modular Monolith AI-COS Co-Located with Managed SaaS + Multi-Project Schema',
      category: 'architecture',
      origin: 'ceo_proposal',
      summary:
        'Deploy AI-COS at /cos and src/modules/ai-cos/* with project_id foreign keys across all 25 tables, Isolated Git Worktree / Antigravity Handoff adapters, and multi-provider LLM routing.',
      rationale:
        'Approved by Founder at end of Phase 0. Maximises development velocity and direct codebase verification while keeping multi-project extensibility intact.',
      alternativesConsidered: [
        'Ten separate department microservices (rejected: premature operational complexity)',
      ],
      status: 'active',
      authorisedBy: 'Human Founder & Chairman',
      decidedAtIso: nowIso,
    },
  ];

  const defaultConversationId = 'conv-founder-ceo-01';
  const conversations: CosConversation[] = [
    {
      id: defaultConversationId,
      projectId: defaultProjectId,
      title: 'Founder ↔ AI CEO Executive Channel (Universal Website Builder)',
      status: 'active',
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
    },
  ];

  const agentMessages: CosAgentMessage[] = [
    {
      id: 'msg-welcome-01',
      projectId: defaultProjectId,
      conversationId: defaultConversationId,
      senderRole: 'ceo',
      senderLabel: 'AI CEO',
      departmentCode: 'ceo_office',
      messageType: 'direct_answer',
      contentMarkdown: `Welcome, Chairman. **AI-COS (AI Company Operating System)** is online and connected to **Universal Website Builder & Commerce Platform (\`build_any_website\`)**.

I have loaded our verified repository state (\`39/39\` unit & concurrency tests passing across all 6 commercial models and the 12-column visual editor) along with our **P0/P1 Production Readiness Backlog** and **Guarded Autonomy Policy Engine**.

You can give me any natural-language goal, product idea, UX critique, bug report, or roadmap shift — or launch one of our **6 Executive Workflows (A–F)** directly below.`,
      createdAtIso: nowIso,
    },
  ];

  const notifications: CosNotification[] = [
    {
      id: 'notif-init-01',
      projectId: defaultProjectId,
      category: 'report_ready',
      severity: 'info',
      title: 'Phase 0 Architecture Approved & AI Company Initialised',
      message:
        'All 9 specialist departments, the Guarded Autonomy Policy Engine, and the Universal Website Builder knowledge base are active.',
      isRead: false,
      createdAtIso: nowIso,
    },
  ];

  const auditLogs: CosAuditLog[] = [
    {
      id: 'aud-init-01',
      projectId: defaultProjectId,
      actorType: 'founder',
      actorId: 'founder-chairman',
      eventType: 'PHASE_0_ARCHITECTURE_APPROVED',
      summary:
        'Founder approved Phase 0 AI-COS Master Architecture Blueprint (DEC-001, DEC-002, DEC-003).',
      metadata: {
        projectId: defaultProjectId,
        autonomyMode: 'guarded',
      },
      createdAtIso: nowIso,
    },
  ];

  return {
    companyProfile,
    projects,
    departments,
    policyRules,
    conversations,
    founderRequests: [],
    executionCycles: [],
    tasks: [],
    checkpoints: [],
    agentRuns: [],
    agentMessages,
    approvals: [],
    approvalEvents: [],
    rejectedProposalHashes: [],
    deliverables: [],
    githubReferences: [],
    qualityChecks: [],
    decisions,
    knowledgeDocuments,
    knowledgeVersions,
    notifications,
    auditLogs,
  };
}

export class CosStoreRepository {
  public static getState(): CosRuntimeSnapshot {
    if (globalThis.__aicosInMemoryTestMode && globalThis.__aicosRuntimeSnapshot) {
      return globalThis.__aicosRuntimeSnapshot;
    }

    const primaryPath = getCosStateFilePath();
    const candidatePaths = [
      primaryPath,
      resolve(process.cwd(), '.aicos-runtime-state.json'),
      '/tmp/.aicos-runtime-state.json',
    ];

    for (const filePath of candidatePaths) {
      if (existsSync(filePath)) {
        try {
          const stat = statSync(filePath);
          if (
            !globalThis.__aicosRuntimeSnapshot ||
            globalThis.__aicosRuntimeMtimeMs !== stat.mtimeMs
          ) {
            const raw = readFileSync(filePath, 'utf-8');
            const parsed = JSON.parse(raw) as CosRuntimeSnapshot;
            // Guard: If in-memory already has execution cycles or tasks, do not overwrite with an older snapshot
            if (
              globalThis.__aicosRuntimeSnapshot &&
              globalThis.__aicosRuntimeSnapshot.executionCycles.length > parsed.executionCycles.length
            ) {
              return globalThis.__aicosRuntimeSnapshot;
            }
            globalThis.__aicosRuntimeSnapshot = parsed;
            globalThis.__aicosRuntimeMtimeMs = stat.mtimeMs;
          }
          return globalThis.__aicosRuntimeSnapshot;
        } catch {
          // Fall through to next candidate or in-memory
        }
      }
    }

    // Critical: If an in-memory snapshot already exists, DO NOT discard it!
    if (globalThis.__aicosRuntimeSnapshot) {
      return globalThis.__aicosRuntimeSnapshot;
    }

    const seeded = buildSeededCosSnapshot();
    globalThis.__aicosRuntimeSnapshot = seeded;
    this.persist();
    return seeded;
  }

  public static persist(): void {
    const state = globalThis.__aicosRuntimeSnapshot;
    if (!state) return;
    if (globalThis.__aicosInMemoryTestMode) {
      return;
    }

    const payload = JSON.stringify(state, null, 2);
    const primaryPath = getCosStateFilePath();

    try {
      writeFileSync(primaryPath, payload, 'utf-8');
      const stat = statSync(primaryPath);
      globalThis.__aicosRuntimeMtimeMs = stat.mtimeMs;
      return;
    } catch {
      // If primary path failed (e.g. read-only filesystem in Vercel), fallback to /tmp
      if (primaryPath !== '/tmp/.aicos-runtime-state.json') {
        try {
          writeFileSync('/tmp/.aicos-runtime-state.json', payload, 'utf-8');
          const stat = statSync('/tmp/.aicos-runtime-state.json');
          globalThis.__aicosRuntimeMtimeMs = stat.mtimeMs;
        } catch {
          // Silently preserve in-memory
        }
      }
    }
  }

  public static resetForTests(inMemoryOnly = true): CosRuntimeSnapshot {
    globalThis.__aicosInMemoryTestMode = inMemoryOnly;
    const fresh = buildSeededCosSnapshot();
    globalThis.__aicosRuntimeSnapshot = fresh;
    if (!inMemoryOnly) {
      this.persist();
    }
    return fresh;
  }

  public static appendAuditLog(input: {
    projectId: string;
    executionCycleId?: string;
    taskId?: string;
    actorType: CosAuditLog['actorType'];
    actorId: string;
    eventType: string;
    summary: string;
    metadata?: Record<string, unknown>;
  }): CosAuditLog {
    const state = this.getState();
    const nowIso = new Date().toISOString();
    const entry: CosAuditLog = {
      id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      projectId: input.projectId,
      executionCycleId: input.executionCycleId,
      taskId: input.taskId,
      actorType: input.actorType,
      actorId: input.actorId,
      eventType: input.eventType,
      summary: input.summary,
      metadata: input.metadata ?? {},
      createdAtIso: nowIso,
    };
    state.auditLogs.unshift(entry);
    this.persist();
    return entry;
  }
}
