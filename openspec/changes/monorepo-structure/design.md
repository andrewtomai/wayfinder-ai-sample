## Context

Currently this repository is a single React application that demonstrates AI-powered wayfinding using the locusmaps-sdk. The codebase mixes reusable infrastructure (agent orchestration, API clients, utilities) with example-specific code (tools, prompts, UI).

We're restructuring to a Yarn workspaces monorepo to:

1. Support multiple independent examples (chat-agent, kiosk-mode, future samples)
2. Clearly separate shared `@core/*` packages from `@examples/*` applications
3. Enable developers to understand and extract just what they need

**Current structure:** Single app with everything in `src/`
**Target structure:** Monorepo with `packages/` and `examples/` directories

## Goals / Non-Goals

**Goals:**

- Clear separation between shared packages and example applications
- Each example runnable independently (`yarn workspace @examples/chat-agent dev`)
- Shared TypeScript configuration with per-package overrides
- Minimal friction for adding new examples
- Developers can easily identify what's reusable vs. example-specific

**Non-Goals:**

- Publishing packages to npm (these are internal to the monorepo)
- Shared UI component library (each example owns its UI)
- Monorepo tooling like Nx or Turborepo (Yarn workspaces is sufficient for this scale)
- CI/CD pipeline changes (out of scope for this restructure)

## Decisions

### 1. Yarn Workspaces for Monorepo Management

**Decision:** Use Yarn 4 workspaces (already the package manager) rather than adding Nx, Turborepo, or Lerna.

**Rationale:**

- Already using Yarn 4 — no new tooling to learn
- Workspaces provide dependency hoisting and cross-package linking out of the box
- This is a small monorepo (4 packages, 2 examples) — heavyweight tooling is overkill
- Simpler for developers exploring the samples

**Alternatives considered:**

- Nx: Powerful but adds complexity and learning curve
- Turborepo: Good caching, but unnecessary for this scale
- Lerna: Mostly deprecated in favor of native workspace features

**Configuration:**

```json
{
  "private": true,
  "workspaces": ["packages/*", "examples/*"]
}
```

### 2. Package Scoping: `@core/*` and `@examples/*`

**Decision:** Use `@core/` scope for shared packages and `@examples/` scope for example apps.

**Rationale:**

- Clear naming convention signals what's reusable vs. app-specific
- `@core/` suggests internal infrastructure (not published)
- `@examples/` makes it obvious these are runnable samples

**Package names:**

- `@core/agent` - Agent orchestration
- `@core/gemini` - Gemini AI client
- `@core/wayfinder` - LocusMaps SDK wrapper
- `@core/logger` - Logging utility
- `@examples/chat-agent` - Current example app
- `@examples/kiosk-mode` - New kiosk example (placeholder)

### 3. TypeScript Configuration Strategy

**Decision:** Use a shared base `tsconfig.json` at root with per-package `tsconfig.json` files that extend it.

**Rationale:**

- Consistent compiler options across all packages
- Per-package configs can customize paths and includes
- Avoids duplication of strict mode settings, target, etc.

**Alternatives considered:**

- TypeScript project references: More complex setup, better for large monorepos with incremental builds. Overkill here.
- Single tsconfig with paths: Doesn't scale well, harder to understand package boundaries

**Structure:**

```
/tsconfig.base.json              # Shared compiler options
/packages/agent/tsconfig.json    # Extends base, defines local paths
/examples/chat-agent/tsconfig.json
```

### 4. Vite Configuration Per Example

**Decision:** Each example has its own `vite.config.ts` rather than a shared Vite config.

**Rationale:**

- Examples may have different entry points, plugins, or build requirements
- Keeps examples self-contained and easy to copy/extract
- Vite is fast enough that shared caching isn't critical

**Alternatives considered:**

- Shared Vite config with per-example overrides: Adds coupling, harder to understand

### 5. Package Exports Strategy

**Decision:** Each `@core/*` package exports via a barrel `index.ts` with explicit named exports.

**Rationale:**

- Clear public API surface for each package
- Enables tree-shaking
- Easy to understand what a package provides

**Example:**

```typescript
// packages/agent/index.ts
export { Agent } from "./Agent";
export type { IAIClient } from "./IAIClient";
export type { AgentTool, Message, ToolResult } from "./types";
export { filterMessages } from "./messageFilter";
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| **Increased complexity** — Monorepo structure is more complex than single app | Keep it simple: Yarn workspaces only, no extra tooling. Clear README explaining structure. |
| **Import path changes break existing code** — All imports need updating | Handled during migration. Search/replace from relative paths to `@core/*` imports. |
| **Workspace resolution issues** — Yarn may have trouble resolving cross-package deps | Ensure all packages have proper `package.json` with correct `main`/`types` fields. Test after setup. |
| **Developers may not understand monorepo** — Some devs unfamiliar with workspaces | Add root README explaining structure and common commands. Each example has its own README. |

## Migration Plan

1. **Create directory structure** — Create `packages/` and `examples/` directories with subdirectories for each package

2. **Set up root workspace configuration** — Update root `package.json` with workspaces config; create `tsconfig.base.json` with shared options

3. **Create package scaffolding** — Add `package.json`, `tsconfig.json`, and `index.ts` barrel exports for each `@core/*` package

4. **Move shared code to packages**
   - Move agent code to `packages/agent/`
   - Move gemini client to `packages/gemini/`
   - Move wayfinder code to `packages/wayfinder/`
   - Move logger to `packages/logger/`

5. **Create chat-agent example** — Move remaining code (App, components, tools, prompts) to `examples/chat-agent/`; update imports to use `@core/*`; add example-specific `package.json` and `vite.config.ts`

6. **Create kiosk-mode placeholder** — Scaffold `examples/kiosk-mode/` directory structure only

7. **Update root README** — Document monorepo structure and commands for running each example

8. **Verify everything works** — Run `yarn install`, `yarn workspace @examples/chat-agent dev`, and tests
