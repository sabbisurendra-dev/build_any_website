# AI Company Operating System (AI-COS) — Operating Manual & Technical Reference

## 1. Executive Overview
The **AI Company Operating System (AI-COS)** (`src/modules/ai-cos/`, `/cos`) is an application-enforced multi-agent company operating system in which the **Human Founder / Chairman** directs an **AI CEO** (`CeoOrchestratorService`) who coordinates **9 specialist departments**, enforces **Guarded Autonomy** (`PolicyEngineService`), maintains versioned **Company Knowledge** (`KnowledgeService`), and verifies engineering changes via an **Independent QA Department** (`qa_testing`) before consolidating executive reports.

## 2. Organisational Structure (10 Roles)
1. `ceo_office`: **AI CEO / Executive Office** — Interprets Founder intent, retrieves Company Knowledge, challenges architectural anti-patterns respectfully, builds the execution DAG, enforces approval boundaries, and synthesizes Consolidated Executive Reports.
2. `business_research`: **Business, Market & Competitive Research** — Competitor teardowns, pricing benchmarks, and SMB merchant workflow analysis.
3. `product`: **Product Management** — PRDs, user stories, acceptance criteria, and roadmap prioritisation.
4. `design_ux`: **Design & User Experience** — Interaction flows, wireframes, design tokens, and responsive container-query specifications.
5. `cto_arch`: **CTO / Architecture** — System boundaries, PostgreSQL/Drizzle schemas, concurrency invariants, and risk classification.
6. `engineering`: **Engineering / Implementation** — Isolated Git feature branch packages, TypeScript/Next.js patches, and Antigravity handoff bundles.
7. `qa_testing`: **QA / Verification & Testing** — Independent verification routed to a distinct model family/reviewer configuration (`ModelRouterService`), blocking task completion until tests and acceptance criteria pass.
8. `operations`: **Operations, Support & Analytics** — Telemetry, runbooks, P0 audit tracking, and merchant onboarding SLAs.
9. `sales_marketing`: **Sales, GTM & Positioning** — Value propositions, vertical landing copy, and launch playbooks.
10. `legal_compliance`: **Legal, Privacy & Compliance** — DPDP Act 2023 privacy notices, refund terms, and merchant T&Cs.

## 3. Guarded Autonomy & 14 Approval Rules (`PolicyEngineService`)
All autonomy rules are enforced deterministically on the server in `src/modules/ai-cos/policy/policy-engine.service.ts`:
- **Low-Risk Actions**: Autonomous execution permitted within department tool allowlists and daily/monthly minor-unit budgets (`paise`).
- **Medium-Risk Actions**: Research, PRD, UX, and Architecture proposals proceed autonomously, but consequential implementation (`engineering`) halts at `awaiting_approval` until the Founder approves the exact SHA-256 `proposalHash`.
- **High-Risk & Prohibited Actions**: Production deployments, destructive migrations, and financial/legal commitments are blocked from autonomous AI execution.
- **Cryptographic Capability Binding**: Founder approval mints an HMAC-SHA256 `capabilityToken` tied to `approvalId:proposalVersion:proposalHash`. Any material change to `affectedComponents`, `riskLevel`, or `proposalSummary` invalidates the approval and requires re-approval.
- **Emergency Global Kill Switch**: `policyEngine.setGlobalKillSwitch(true, ...)` immediately halts all active execution cycles and blocks all tool calls (`423 GLOBAL_KILL_SWITCH_ACTIVE`).

## 4. Coding-Agent & Google Antigravity Integration (`CodingAgentAdapterService`)
Located in `src/modules/ai-cos/adapters/coding-agent.adapter.ts`:
- **Mode 1 (`isolated_worktree`)**: Inspects real workspace files, prepares isolated Git branch (`cos/<cycle>/<task>`) and PR packages with verification commands, and never commits directly to `main`.
- **Mode 2 (`external_handoff`)**: Generates a structured **Antigravity Handoff Bundle** containing the objective, scoped file targets, architectural constraints, and test commands, placing the task in `awaiting_external_handoff` until confirmed.

## 5. End-to-End Sample Workflows (`/cos` Command Centre)
- **Workflow A (`workflow_a_editor_ux`)**: Website Editor UX simplification (Research + Product + Design + CTO -> Medium-Risk Approval Gate -> Engineering + Independent QA).
- **Workflow B (`workflow_b_online_courses_90d`)**: 90-day online course entitlements (Research + Product + CTO + Legal -> Medium-Risk Approval Gate -> Engineering + Independent QA).
- **Workflow C (`workflow_c_turf_concurrency_bug`)**: Autonomous low-risk cricket turf slot concurrency bug investigation, fix, and QA verification (including automatic Engineering rework loop if QA detects a defect).
- **Workflow D (`workflow_d_security_audit`)**: Pre-production security, tenant-isolation, and architecture readiness audit.
- **Workflow E (`workflow_e_autonomous_continuation`)**: Durable step-level checkpoints for asynchronous background execution.
- **Workflow F (`workflow_f_roadmap_reprioritisation`)**: Roadmap reprioritisation that supersedes obsolete planned tasks and records a `superseded` link in the immutable Decision Ledger.
