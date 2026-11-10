# Archive Catalogue & Preserved Codebase Index (`ARCHIVE_INDEX.md`)

**Repository:** `https://github.com/sabbisurendra-dev/build_any_website`  
**Purpose:** Central catalogue of preserved, reusable, and deprecated implementations archived outside the active production execution bundle.

> [!NOTE]
> Code in this directory is strictly excluded from active TypeScript compilation (`tsconfig.json`) and Next.js production builds. It exists to guarantee zero functionality loss and provide an easily discoverable repository of previous engineering work for future platform capabilities.

---

## Catalogue of Preserved Modules

| Module ID | Module Name | Domain | Tags | Original Path | Replacement Module | Status | Reuse Suitability |
|---|---|---|---|---|---|---|---|
| `ARC-WB-001` | Inline In-Canvas Widget Preview | Website Builder | `WEBSITE_BUILDER`, `WIDGET`, `EDITOR` | `src/components/editor/editor-canvas.tsx` | `src/components/editor/widget-canvas-preview.tsx` | Archived | **High:** Self-contained single-file preview for headless or iframe embeds. |
| `ARC-PER-001` | Synchronous Full-Snapshot File Persistence | Persistence | `PERSISTENCE`, `RUNTIME_STORE`, `DEPRECATED` | `src/modules/persistence/runtime-store.ts` | Debounced Asynchronous Persistence Queue | Deprecated | **Low:** Reference only for debugging single-threaded file-locking behaviors. |

---

## Detailed Module Records

### 1. `ARC-WB-001`: Inline In-Canvas Widget Preview
- **Domain:** Website Builder & Visual Editor
- **Archive Location:** `archive/website-builder/inline-widget-canvas-preview/`
- **Capabilities:**
  - 11 built-in wireframe previews with CSS container queries.
  - Sizing-aware column span adaptations (`colSpan <= 4` vs `colSpan >= 9`).
  - Integrated theme color tokens (`brandAccentHex`).
- **Dependencies:** `lucide-react`, `@/components/ui/badge`, `@/components/ui/button`.
- **Reason for Archival:** Decomposed out of `editor-canvas.tsx` to enable `React.memo` wrapping and prevent re-rendering all widgets during drag/drop operations.
- **Future Integration:** Can be extracted into a standalone NPM widget preview kit or imported into Storybook.

---

### 2. `ARC-PER-001`: Synchronous Full-Snapshot File Persistence
- **Domain:** Multi-Tenant SaaS Persistence
- **Archive Location:** `archive/deprecated-implementations/synchronous-json-persistence/`
- **Capabilities:**
  - Synchronous `readFileSync`, `writeFileSync`, and `statSync` against `.runtime-state.json`.
- **Dependencies:** `node:fs`, `node:path`.
- **Reason for Archival:** Replaced with debounced coalesced writes (50ms window) to prevent Node.js event-loop blocking on 250 KB payload serialization.
- **Future Integration:** Kept as historical benchmark reference for performance regressions.

---

## Archival Criteria & Guidelines

When archiving future modules, always ensure:
1. Complete source code, type definitions, and README.md are preserved.
2. The archived code is not referenced by active `src/` modules.
3. The module is logged in this `ARCHIVE_INDEX.md` with appropriate domain tags.
