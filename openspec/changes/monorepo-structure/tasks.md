## 1. Root Workspace Setup

- [x] 1.1 Create `packages/` and `examples/` directories at repository root
- [x] 1.2 Update root `package.json` with `"private": true` and `"workspaces": ["packages/*", "examples/*"]`
- [x] 1.3 Create `tsconfig.base.json` with shared compiler options (strict, ES2022 target, ESNext module)

## 2. Core Package Scaffolding

- [x] 2.1 Create `packages/agent/` with `package.json` (`@core/agent`), `tsconfig.json`, and `index.ts` barrel
- [x] 2.2 Create `packages/gemini/` with `package.json` (`@core/gemini`), `tsconfig.json`, and `index.ts` barrel
- [x] 2.3 Create `packages/wayfinder/` with `package.json` (`@core/wayfinder`), `tsconfig.json`, and `index.ts` barrel
- [x] 2.4 Create `packages/logger/` with `package.json` (`@core/logger`), `tsconfig.json`, and `index.ts` barrel

## 3. Move Shared Code to Packages

- [x] 3.1 Move `src/agent/Agent.ts`, `IAIClient.ts`, `types.ts`, `messageFilter.ts` to `packages/agent/`
- [x] 3.2 Move `src/apis/gemini.ts` to `packages/gemini/`
- [x] 3.3 Move `src/apis/wayfinder/` contents to `packages/wayfinder/`
- [x] 3.4 Move `src/utils/logger.ts` to `packages/logger/`
- [x] 3.5 Update barrel exports in each package to expose public API

## 4. Chat-Agent Example Setup

- [x] 4.1 Create `examples/chat-agent/` directory structure
- [x] 4.2 Create `examples/chat-agent/package.json` with `@examples/chat-agent` name and `@core/*` dependencies using `workspace:*` protocol
- [x] 4.3 Create `examples/chat-agent/tsconfig.json` extending base config
- [x] 4.4 Create `examples/chat-agent/vite.config.ts` with example-specific configuration
- [x] 4.5 Move `src/agent/tools.ts` to `examples/chat-agent/`
- [x] 4.6 Move system prompts (if exists) to `examples/chat-agent/prompts.ts`
- [x] 4.7 Move UI components (`App.tsx`, `main.tsx`, `components/`) to `examples/chat-agent/`
- [x] 4.8 Update all imports in chat-agent to use `@core/*` packages instead of relative paths

## 5. Kiosk-Mode Placeholder

- [x] 5.1 Create `examples/kiosk-mode/` directory
- [x] 5.2 Create `examples/kiosk-mode/package.json` with `@examples/kiosk-mode` name
- [x] 5.3 Create `examples/kiosk-mode/tsconfig.json` extending base config
- [x] 5.4 Create minimal placeholder files (README.md explaining this is a placeholder)

## 6. Documentation and Cleanup

- [x] 6.1 Update root README.md to document monorepo structure and workspace commands
- [x] 6.2 Remove old `src/` directory after verifying all code is migrated
- [x] 6.3 Update root `package.json` scripts for workspace commands

## 7. Verification

- [x] 7.1 Run `yarn install` to verify workspace linking
- [x] 7.2 Run `yarn workspace @examples/chat-agent build` to verify production build (139ms build time)
- [x] 7.3 Run `yarn test` to verify functionality preserved (153 tests pass)
- [x] 7.4 Run dev server to verify example runs interactively
