## ADDED Requirements

### Requirement: Independent build configuration
Each example application SHALL have its own `vite.config.ts` and `tsconfig.json` files to enable standalone building and development.

#### Scenario: Example has own Vite config
- **WHEN** a developer inspects an example directory in `examples/`
- **THEN** the directory contains a `vite.config.ts` file with example-specific configuration

#### Scenario: Example has own TypeScript config
- **WHEN** a developer inspects an example directory in `examples/`
- **THEN** the directory contains a `tsconfig.json` that extends the base config

### Requirement: Core package imports
Example applications SHALL import shared functionality from `@core/*` packages using package names, not relative paths.

#### Scenario: Import uses package scope
- **WHEN** an example needs to use the Agent class
- **THEN** it imports via `import { Agent } from "@core/agent"` (not `../../packages/agent`)

#### Scenario: No cross-example imports
- **WHEN** a developer reviews example code
- **THEN** there are no imports from other example directories

### Requirement: Independent execution
Each example application SHALL be independently runnable using Yarn workspace commands.

#### Scenario: Dev server startup
- **WHEN** a developer runs `yarn workspace @examples/chat-agent dev`
- **THEN** the chat-agent example starts its development server

#### Scenario: Production build
- **WHEN** a developer runs `yarn workspace @examples/chat-agent build`
- **THEN** the chat-agent example produces a production build

### Requirement: Example-specific code ownership
Tools definitions, system prompts, UI components, and application entry points SHALL remain within each example's directory.

#### Scenario: Tools stay in example
- **WHEN** a developer inspects the chat-agent example
- **THEN** `tools.ts` exists in `examples/chat-agent/` (not in `packages/`)

#### Scenario: Prompts stay in example
- **WHEN** a developer inspects the chat-agent example
- **THEN** `prompts.ts` exists in `examples/chat-agent/` (not in `packages/`)

#### Scenario: Entry point in example
- **WHEN** a developer inspects an example directory
- **THEN** `App.tsx` and `main.tsx` exist in the example directory

### Requirement: Example dependency declarations
Each example's `package.json` SHALL explicitly declare its dependencies on `@core/*` packages.

#### Scenario: Dependencies declared
- **WHEN** a developer inspects an example's `package.json`
- **THEN** it lists required `@core/*` packages in the `dependencies` field

#### Scenario: Workspace protocol used
- **WHEN** a developer inspects an example's dependency on a core package
- **THEN** the version uses workspace protocol (e.g., `"@core/agent": "workspace:*"`)
