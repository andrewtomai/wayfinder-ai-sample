# AGENTS.md - Development Guide for AI Coding Agents

This guide is for agentic coding tools and AI assistants working in this repository.

## Build, Lint, and Test Commands

### Available Scripts
All commands are run with `yarn` (package manager: yarn@4.12.0):

```bash
# Development server for an example (run from examples/chat-agent, etc.)
cd examples/chat-agent && yarn dev

# Build for production (runs type check first)
yarn build

# Type checking only
yarn check-types

# Linting (ESLint)
yarn lint

# Run all tests
yarn test

# Run a single test file
yarn test packages/wayfinder/search/SearchEngine.test.ts

# Run tests matching a pattern
yarn test --grep "should find POI by exact name match"

# Watch mode for tests
yarn test --watch

# Test with coverage
yarn test --coverage
```

## TypeScript Configuration

- **Target**: ES2022
- **Strict Mode**: Enabled
- **Module**: ESNext
- **JSX**: react-jsx

**Key Compiler Options**:
- `noUnusedLocals: true` - Fail on unused variables
- `noUnusedParameters: true` - Fail on unused parameters
- `noFallthroughCasesInSwitch: true` - Enforce switch case completion
- `verbatimModuleSyntax: true` - Preserve module syntax as written
- `skipLibCheck: true` - Skip library type checking

Run `yarn check-types` to validate without building.

## Code Style Guidelines

### Imports
- Use **absolute imports** from package names (e.g., `@wayfinder/search`, `@wayfinder/types`)
- Import types using `type` keyword: `import type { MyType } from "..."`
- Separate imports into blocks: external → relative types → relative code
- Example:
  ```typescript
  import { GeminiClient } from "@gemini/gemini";
  import type { IAIClient } from "./IAIClient";
  import type { AgentTool } from "./types";
  import logger from "@logger";
  ```

### Formatting
- **Prettier**: Not configured; follow ESLint rules
- **Line Length**: Aim for readability (reasonable line breaks)
- **Indentation**: 2 spaces (enforced by project setup)
- **Semicolons**: Always use them
- **Quotes**: Double quotes for strings (enforced by ESLint)

### Naming Conventions
- **Classes**: PascalCase (`Agent`, `SearchEngine`, `GeminiClient`)
- **Interfaces**: PascalCase with `I` prefix (`IAIClient`, `IConfig`)
- **Functions/Methods**: camelCase (`executeTool`, `search`)
- **Constants**: UPPER_SNAKE_CASE for exported constants (`MAX_ITERATIONS`)
- **Private Fields**: Use `#` or prefix with `private` (`private client`, `private tools`)
- **Type Aliases**: PascalCase (`ToolResult`, `Message`)

### TypeScript & Type Safety
- Always include explicit return types on functions
- Use `Record<string, unknown>` for flexible object types
- Avoid `any` — use `unknown` with type guards instead
- Use `const` for all variables (no `let` unless reassignment needed)
- Type imports separate from value imports with `type` keyword
- Use `Static<typeof Schema>` pattern with Typebox for runtime validation

### Error Handling
- **Catch blocks**: Always check `error instanceof Error` before accessing `.message`
- **Pattern**:
  ```typescript
  try {
    const result = await tool.action(args);
    return { name, result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Tool failed: ${name}`, { error: errorMessage });
    return { name, result: null, error: errorMessage };
  }
  ```
- Return structured error objects: `{ name, result: null, error: string }`
- Log errors with context using `logger.error(msg, data)`

### Comments & Documentation
- Add JSDoc comments for public methods and classes
- Use block comments for sections: `// ============================================================================`
- Inline comments for complex logic (keep minimal)
- Document function purpose, parameters, and return types in JSDoc
- Example:
  ```typescript
  /**
   * Execute a tool by name with given arguments
   */
  private async executeTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<ToolResult> {
  ```

### File Organization
- Section comments divide logical areas with `// ====`
- Group related methods together
- Private methods below public ones
- Type definitions at top of file

## Testing Guidelines

### Test Framework
- **Framework**: Vitest (configured in vite.config.ts)
- **Pattern**: Standard describe/it/expect syntax (similar to Jest)

### Running Tests
```bash
# Run single file
yarn test packages/wayfinder/search/SearchEngine.test.ts

# Run by test name
yarn test --grep "should find POI by exact name match"

# Watch mode
yarn test --watch

# Coverage
yarn test --coverage
```

### Test Structure
- Use `describe()` for grouping related tests
- Use `beforeEach()` for test setup and mocks
- Use `expect()` for assertions
- Test naming: `should [expected behavior]`
- Example:
  ```typescript
  describe("SearchEngine", () => {
    let searchEngine: SearchEngine;
    beforeEach(() => {
      searchEngine = new SearchEngine(mockPOIs);
    });
    it("should find POI by exact name match", () => {
      const results = searchEngine.search({ term: "Starbucks" });
      expect(results.length).toBe(1);
      expect(results[0]?.name).toBe("Starbucks Coffee");
    });
  });
  ```

## Repository Structure

The repository is organized as a monorepo with two main sections:

**Packages** (`packages/`) - Core modules used across examples:
- `agent/` - AI agent orchestration and loop logic
- `gemini/` - Gemini API client integration
- `wayfinder/` - Wayfinder venue API client with search capabilities
- `logger/` - Logging utility for debugging

**Examples** (`examples/`) - Standalone applications demonstrating specific implementations:
- `chat-agent/` - React-based chat interface that uses agent packages
- `kiosk-mode/` - Example kiosk-mode implementation

## Key Patterns

### Agent Loop Pattern
The Agent class implements a thinking loop:
1. User sends message → added to history
2. Call AI client with tools available
3. If tool calls returned → execute tools, add results to history, loop
4. If text response returned → add to history, break loop
5. Return final result after MAX_ITERATIONS or text response

### Tool Interface
```typescript
interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  action: (args: Record<string, unknown>) => Promise<unknown>;
}
```

### Error Returns
Always return structured results with error field:
```typescript
{ name: string, result: unknown | null, error?: string }
```

## Logging

Use the provided logger utility (packages/logger/index.ts):
```typescript
import logger from "@logger";

logger.debug(message, data);   // Indented debug output
logger.info(message, data);    // Info output
logger.warn(message, data);    // Warning output
logger.error(message, data);   // Error output with red styling
```

Logger is browser-console only with colored output. Use for debugging agent flow.

## Project Stack

- **React 19** for UI
- **Vite** + **Rolldown** for bundling
- **TypeScript 5.9** for type safety
- **Vitest** for testing
- **ESLint 9** with TypeScript plugin for linting
- **Typebox** for schema validation
- **Fuse.js** for fuzzy search
- **locusmap-sdk** for venue navigation

---

**Last Updated**: February 2026
