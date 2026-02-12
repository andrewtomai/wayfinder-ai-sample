## ADDED Requirements

### Requirement: Root workspace configuration
The root `package.json` SHALL define a workspaces array containing `packages/*` and `examples/*` globs to enable Yarn workspace functionality.

#### Scenario: Workspaces array defined
- **WHEN** a developer inspects the root `package.json`
- **THEN** the file contains `"workspaces": ["packages/*", "examples/*"]`

#### Scenario: Root package is private
- **WHEN** a developer inspects the root `package.json`
- **THEN** the file contains `"private": true` to prevent accidental publishing

### Requirement: Package scoping convention
Shared packages SHALL use the `@core/` scope prefix. Example applications SHALL use the `@examples/` scope prefix.

#### Scenario: Core package naming
- **WHEN** a developer creates a new shared package in `packages/`
- **THEN** the package name in `package.json` MUST follow the pattern `@core/<package-name>`

#### Scenario: Example package naming
- **WHEN** a developer creates a new example application in `examples/`
- **THEN** the package name in `package.json` MUST follow the pattern `@examples/<example-name>`

### Requirement: Shared TypeScript base configuration
The repository root SHALL provide a `tsconfig.base.json` file containing shared compiler options that all packages extend.

#### Scenario: Base config exists at root
- **WHEN** a developer inspects the repository root
- **THEN** a `tsconfig.base.json` file exists with shared compiler options (strict mode, target, module settings)

#### Scenario: Package extends base config
- **WHEN** a developer inspects any package's `tsconfig.json`
- **THEN** it contains `"extends": "../../tsconfig.base.json"` (or appropriate relative path)

### Requirement: Package barrel exports
Each `@core/*` package SHALL export its public API via a barrel `index.ts` file with explicit named exports.

#### Scenario: Barrel file exists
- **WHEN** a developer inspects a `@core/*` package directory
- **THEN** an `index.ts` file exists at the package root

#### Scenario: Named exports only
- **WHEN** a developer imports from a `@core/*` package
- **THEN** all exports are named exports (no default exports)

### Requirement: Package metadata fields
Each package's `package.json` SHALL define `name`, `main`, and `types` fields to enable proper module resolution.

#### Scenario: Required fields present
- **WHEN** a developer inspects any package's `package.json`
- **THEN** the file contains `name`, `main` (pointing to entry file), and `types` (pointing to TypeScript declarations)

#### Scenario: Cross-package resolution works
- **WHEN** an example imports from `@core/agent`
- **THEN** Yarn resolves the import to `packages/agent/` via workspace linking
