## Why

This repository is meant to inspire developers by showing what's possible with the locusmaps-sdk. Currently it's a single example (chat agent), but we want to showcase multiple features (chat agent, kiosk mode, etc.) while maintaining clear separation between example-specific code and reusable "core" packages that are shared across samples.

## What Changes

- Restructure repository from single-app to monorepo with multiple examples
- Move current chat-agent code into `examples/chat-agent/`
- Create placeholder for new `examples/kiosk-mode/` example
- Extract shared code into focused packages under `packages/`:
  - `@core/agent` - Agent orchestration (Agent.ts, IAIClient.ts, types.ts, messageFilter.ts)
  - `@core/gemini` - Gemini AI client
  - `@core/wayfinder` - Wayfinder/LocusMaps SDK wrapper, types, and search
  - `@core/logger` - Shared logging utility
- Keep example-specific code in each example:
  - Tools definitions (tools.ts)
  - System prompts (prompts.ts)
  - UI components and styling
  - App entry point (App.tsx, main.tsx)
- Update build/dev tooling to support running individual examples
- Root-level README becomes an index pointing to individual examples

## Capabilities

### New Capabilities

- `monorepo-workspace`: Yarn workspaces configuration enabling shared dependencies and cross-package imports between `packages/*` and `examples/*`
- `example-isolation`: Each example is a standalone app that can be run, built, and understood independently while importing from `@core/*` packages

### Modified Capabilities
<!-- None - this is a structural reorganization, not a behavior change -->

## Impact

**Target Structure:**

```
/
├── packages/
│   ├── agent/                # @core/agent
│   │   ├── Agent.ts
│   │   ├── IAIClient.ts
│   │   ├── types.ts
│   │   └── messageFilter.ts
│   │
│   ├── gemini/               # @core/gemini
│   │   └── index.ts
│   │
│   ├── wayfinder/            # @core/wayfinder
│   │   ├── index.ts
│   │   ├── search/
│   │   └── types/
│   │
│   └── logger/               # @core/logger
│       └── index.ts
│
├── examples/
│   ├── chat-agent/           # @examples/chat-agent
│   │   ├── tools.ts
│   │   ├── prompts.ts
│   │   ├── components/
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   └── kiosk-mode/           # @examples/kiosk-mode (placeholder)
│
└── package.json              # workspace root
```

- **package.json**: Root becomes workspace root; each package/example gets its own package.json
- **Build scripts**: Per-example commands (e.g., `yarn workspace @examples/chat-agent dev`)
- **Imports**: Examples import from `@core/*` instead of relative paths
- **TypeScript**: Shared tsconfig base with per-package extensions
- **Developer experience**: Clear separation makes it easy to understand what's shared vs. example-specific
