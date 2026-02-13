# Shared Chat Agent Tools

A reusable package of Wayfinder tools for venue-based AI examples. These tools enable agent implementations to interact with venue data including POI search, building structures, categories, and real-time security information.

## Installation

The package is designed for use within this monorepo. Add it to your example's dependencies:

```json
{
  "dependencies": {
    "@core/agent-tools": "workspace:*"
  }
}
```

## Usage

### Import Individual Tools

Import specific tools as needed:

```typescript
import { 
  getBuildingsAndLevels, 
  getPOIDetails, 
  getCategories,
  showPOI,
  getSecurityWaitTimes
} from "@core/agent-tools";

// Use in your agent configuration
const tools = [getBuildingsAndLevels, getPOIDetails, getCategories];
```

### Import All Tools as an Array

Use the bundled export for convenience:

```typescript
import tools from "@core/agent-tools";

// Pass directly to agent
const agent = new Agent({
  tools,
  // ... other config
});
```

### Mixed Approach

Combine shared tools with example-specific tools:

```typescript
import tools from "@core/agent-tools";
import { myCustomTool } from "./tools";

// Use individually or combine
const allTools = [
  ...tools,
  myCustomTool
];
```

## Available Tools

### getBuildingsAndLevels

Get the complete venue structure showing all buildings and floors. Returns building names, IDs, and nested floor information.

**Parameters:** None

**Returns:** `BuildingsAndLevels` - Venue structure with buildings and floors

### getPOIDetails

Get complete details about a specific POI including description, images, keywords, real-time status, exact position, and nearby landmarks.

**Parameters:**

- `poiId` (number): POI ID from search results

**Returns:** `POI` - Full POI details with metadata

### getCategories

Get the complete list of all POI categories available in the venue. Categories are hierarchical with dot notation (e.g., 'eat.coffee', 'restroom.accessible').

**Parameters:** None

**Returns:** `string[]` - Array of category strings

### showPOI

Display a specific POI on the map UI and get its complete details. Both highlights the POI visually and returns full information.

**Parameters:**

- `poiId` (number): POI ID to display

**Returns:** `POI` - Full POI details with metadata

### getSecurityWaitTimes

Get current wait times for all security checkpoints in the venue. Returns checkpoint name, ID, category, and real-time queue data.

**Parameters:** None

**Returns:** `SecurityWaitTimeResult[]` - Array of security checkpoint information with wait times

## Type Safety

All tools conform to the `AgentTool` interface from `@core/agent`. When using TypeScript, imports are automatically type-safe.

## Integration with Agent

These tools work seamlessly with the Agent class:

```typescript
import { Agent } from "@core/agent";
import { GeminiClient } from "@core/gemini";
import tools from "@core/agent-tools";

const agent = new Agent({
  client: new GeminiClient(),
  tools,
  buildSystemInstruction: (tools) => { /* ... */ },
  maxIterations: 10
});

// Agent can now use any of the shared tools
const result = await agent.chat("Where is the nearest coffee shop?");
```

## Best Practices

1. **Import what you need**: Use individual imports when you only need specific tools to reduce bundle size
2. **Use the bundled export for convenience**: If you want all tools, use the `default export` for clarity
3. **Combine with example-specific tools**: Examples may have custom tools alongside shared tools
4. **Type your tool definitions**: Leverage TypeScript for tool parameter validation

## Notes

- These tools require a valid Wayfinder SDK instance (from `@core/wayfinder`)
- The tools are async and should be handled within an agent loop
- Each tool is standalone and can be used independently
- Tools maintain compatibility with the basic-agent example pattern
