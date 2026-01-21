# Understanding AI Agent Orchestration

A learning document explaining how our AI agent works, how it communicates with LLMs, and why the design is so flexible.

**Intended for**: Team developers wanting to understand the agent architecture and extend it with new tools or providers.

---

## Quick Overview

### What is an AI Agent Loop?

An AI agent isn't just a simple "question → answer" system. It's a **loop**—a repeated cycle of thinking, acting, and reacting:

1. **Think**: Send information to the LLM with available actions (called "tools")
2. **Act**: The LLM decides which tool(s) to use and what parameters to send
3. **Observe**: Execute those tools and collect the results
4. **React**: Send results back to the LLM for further analysis
5. **Loop**: Repeat until the LLM provides a final answer

Imagine an airport information desk attendant who has walkie-talkies to different departments:

- User asks: "Where's the nearest bathroom near Gate 15?"
- Attendant **thinks**: "I need to search for bathrooms near that gate"
- Attendant **acts**: Radios the map system asking for bathroom POIs near Gate 15
- Attendant **observes**: Gets back 3 bathrooms with distances
- Attendant **reacts**: "The closest is 50 meters away in Terminal A"

That's an agent loop. The attendant is the LLM, the radio calls are tool executions, and the loop is what makes multi-step reasoning possible.

### Three Key Concepts

#### 1. **What You Send to the LLM**

Every time you communicate with an LLM, you send three key things:

- **Conversation History**: Everything that's been said so far (user messages, your responses, tool calls you made, results you got back)
- **Available Tools**: A list of actions the LLM can take, with descriptions and required parameters
- **System Instructions**: Guidelines for how the LLM should behave

The LLM reads all of this, reasons about what to do next, and either:

- Calls a tool (e.g., "search for bathrooms")
- Provides a final text answer to the user

You then loop back with the tool results and send everything again.

#### 2. **The App as Agent Orchestrator**

The agent app is the "conductor" orchestrating this entire dance. It:

- **Maintains state**: Keeps the full conversation history so the LLM always has context
- **Manages iterations**: Runs the loop repeatedly (up to 10 times by default) until the LLM decides to answer
- **Executes tools**: When the LLM calls a tool, actually runs that code
- **Handles errors**: If a tool fails, captures the error and sends it back to the LLM for recovery
- **Prevents infinite loops**: Stops after max iterations and asks for clarification

The app doesn't do the reasoning—the LLM does. The app just facilitates the conversation and keeps everything organized.

#### 3. **Tools Can Do Anything**

A "tool" is just a JavaScript function. When the LLM calls a tool, we execute that function. This means tools can:

- **Query a database** (e.g., search for POIs)
- **Call an external API** (e.g., get real-time flight info)
- **Perform calculations** (e.g., route optimization)
- **Update the UI** (e.g., show a POI on the map)
- **Modify state** (e.g., bookmark a location)
- **Combine multiple operations** (e.g., search, filter, sort, then display)

From the LLM's perspective, it just says "I want you to call tool X with parameters Y." We then run whatever code we've attached to that tool. This is incredibly powerful because it means the LLM can trigger any behavior in your app.

### Why This Matters

Understanding this architecture helps you:

- **Add new capabilities**: Add a new tool → LLM automatically gains that capability
- **Debug agent behavior**: Understand why the agent made certain choices (check the loop iterations)
- **Optimize costs**: Reduce tool calls and iterations = fewer API calls = lower costs
- **Build multi-step workflows**: Complex tasks like "find restaurants, filter by cuisine, show directions" become natural

---

## Deep Dive: Agent Orchestration

### The Agent Loop Mechanism

The core of the system is a simple but powerful loop. Let's trace through exactly what happens.

#### High-Level Flow

```
User sends message
    ↓
[Add to conversation history]
    ↓
Loop starts (iteration 1-10)
    ↓
    ├─→ Send to LLM: (history + available tools + system instruction)
    │
    ├─→ LLM responds with either:
    │   A) Tool calls (e.g., "call search with term='bathroom'")
    │   B) Text response (e.g., "Here are the bathrooms...")
    │
    ├─→ If A (Tool calls):
    │   ├─ Execute each tool
    │   ├─ Collect results (including errors)
    │   ├─ Add results to history
    │   └─ Loop back to LLM with updated history
    │
    └─→ If B (Text response):
        ├─ Add to history
        ├─ Return result to user
        └─ Exit loop

If loop reaches 10 iterations without text response:
    ├─ Generate conversational message asking for clarification
    └─ Return that message
```

#### Step-by-Step with Code

Let's look at the actual code in `src/agent/Agent.ts` and walk through each step:

**Step 1: User sends message**

```typescript
// src/agent/Agent.ts:162
this.messages.push({
  role: "user",
  type: "user_input",
  content: userMessage,
});
```

The message is added to the conversation history. This history is your state machine—everything persists here.

**Step 2: Enter the loop**

```typescript
// src/agent/Agent.ts:170
while (this.iteration < MAX_ITERATIONS) {
  this.iteration++;
  // ... decision logic
}
```

We loop up to 10 times. On iteration 10, tools are removed from the request, forcing the LLM to provide a text answer.

**Step 3: Send to LLM**

```typescript
// src/agent/Agent.ts:182-186
const response = await this.client.generate(
  this.messages, // Full conversation history
  toolsForThisIteration, // Tools (empty on iteration 10)
  systemInstruction, // Role + guidelines + iteration count
);
```

We send three things:

- `this.messages`: Everything that's happened so far
- `toolsForThisIteration`: The functions the LLM can call
- `systemInstruction`: How to behave (changes based on iteration count)

**Step 4a: Handle tool calls**

```typescript
// src/agent/Agent.ts:188-224
if (response.toolCalls) {
  // Execute each tool
  const toolResults = await Promise.all(
    response.toolCalls.map((call) => this.executeTool(call.name, call.args)),
  );

  // Add to history: what the assistant wanted to do
  this.messages.push({
    role: "assistant",
    type: "tool_calls",
    content: response.toolCalls,
  });

  // Add to history: what happened when we did it
  this.messages.push({
    role: "user",
    type: "tool_results",
    content: toolResults,
  });

  // Loop continues, LLM sees the results and decides next step
}
```

When the LLM calls tools:

1. We execute them (in parallel with `Promise.all`)
2. Record what the LLM wanted to do
3. Record what actually happened
4. Loop back to the LLM with the results

The LLM might then call more tools, or provide a final answer.

**Step 4b: Handle text response**

```typescript
// src/agent/Agent.ts:225-239
if (response.text) {
  finalText = response.text;
  this.messages.push({
    role: "assistant",
    type: "assistant_response",
    content: finalText,
  });
  break;
}
```

When the LLM provides a text answer, we add it to history and exit the loop.

**Step 5: Handle exhaustion**

```typescript
// src/agent/Agent.ts:243-252
if (this.iteration >= MAX_ITERATIONS) {
  if (!finalText) {
    finalText = "I've reached my iteration limit without a clear answer...";
    // Generate a conversational fallback
  }
}
```

If we hit 10 iterations without a text response, we generate a friendly message and exit gracefully.

### Message History: The Persistent State

The key insight: **everything that happens is recorded in the message history**. This is your state machine.

```typescript
// src/agent/types.ts:73-93
type Message =
  | { role: "user"; type: "user_input"; content: string }
  | { role: "assistant"; type: "assistant_response"; content: string }
  | { role: "assistant"; type: "tool_calls"; content: ToolCall[] }
  | { role: "user"; type: "tool_results"; content: ToolResult[] };
```

Each message is a discriminated union—the `type` field tells you exactly what kind of message it is:

- `user_input`: User asked something
- `assistant_response`: LLM gave a final answer
- `tool_calls`: LLM decided to call tools
- `tool_results`: We executed those tools and got results

#### Example: Full Conversation History

Here's what the history might look like for "Where's the nearest bathroom near Gate 15?":

```typescript
[
  // 1. User asks
  {
    role: "user",
    type: "user_input",
    content: "Where's the nearest bathroom near Gate 15?"
  },

  // 2. LLM decides to search
  {
    role: "assistant",
    type: "tool_calls",
    content: [
      {
        name: "search",
        args: { term: "bathroom", near: { poiId: 456 } }
      }
    ]
  },

  // 3. Search results come back
  {
    role: "user",
    type: "tool_results",
    content: [
      {
        name: "search",
        result: [
          { poiId: 789, name: "Restroom A", distance: 50 },
          { poiId: 790, name: "Restroom B", distance: 120 }
        ]
      }
    ]
  },

  // 4. LLM decides to show the closest one on map
  {
    role: "assistant",
    type: "tool_calls",
    content: [
      {
        name: "showPOI",
        args: { poiId: 789 }
      }
    ]
  },

  // 5. Map updated
  {
    role: "user",
    type: "tool_results",
    content: [
      {
        name: "showPOI",
        result: { poiId: 789, name: "Restroom A", ... }
      }
    ]
  },

  // 6. LLM provides final answer
  {
    role: "assistant",
    type: "assistant_response",
    content: "The nearest bathroom is Restroom A, just 50 meters away..."
  }
]
```

Notice: the entire loop is recorded. The next time you send a message, all of this history goes back to the LLM. It has full context.

### Iteration Management and Dynamic Prompting

The system uses iterations to guide behavior and prevent infinite loops. The system instruction changes based on which iteration you're on.

#### Iterations 1-7: Full Capabilities

On early iterations, the LLM has full access to tools and the system instruction is standard.

#### Iterations 8-9: Wrap-Up Mode

On iterations 8-9, the system instruction includes a warning:

```
Note: You have 2 iterations remaining. Prioritize providing an answer.
If you need more information, ask the user directly rather than
running more searches. Think about what you already know.
```

This guides the LLM to wrap up instead of continuing to search.

#### Iteration 10: No Tools (Force Answer)

On iteration 10, tools are removed from the request:

```typescript
// src/agent/Agent.ts:178-180
const toolsForThisIteration =
  this.iteration === MAX_ITERATIONS ? [] : this.tools;
```

The system instruction becomes:

```
You have no iterations left. You must provide a final answer based
on what you know. If you cannot answer, explain what information
you would need.
```

With no tools available, the LLM must respond with text. This prevents infinite loops.

#### System Instruction Building

```typescript
// src/agent/prompts.ts:90-108
function buildSystemInstruction(iteration: number): string {
  let instruction = baseInstruction;

  if (iteration >= MAX_ITERATIONS) {
    instruction += "\n\nYou have no iterations left...";
  } else if (iteration + 2 >= MAX_ITERATIONS) {
    instruction += `\n\nNote: You have ${MAX_ITERATIONS - iteration} iterations remaining...`;
  }

  return instruction;
}
```

This dynamic adjustment is key to good agent behavior: the LLM gets increasingly pressure to wrap up, then is forced to.

### What Gets Sent to the LLM: The API Request

Let's look at exactly what you're sending to the LLM each time you call `generate()`.

#### Provider-Agnostic Structure

Though we'll show Gemini as an example, this structure generalizes to any LLM (Claude, OpenAI, etc.):

```
POST /api/generate
{
  "contents": [               ← Full conversation history
    {
      "role": "user",         ← Role of who sent this message
      "parts": [              ← One or more parts (text, tool calls, results)
        { "text": "..." },
        { "functionCall": {...} },
        { "functionResponse": {...} }
      ]
    }
  ],
  "tools": [                  ← Available functions LLM can call
    {
      "name": "search",
      "description": "Search for POIs...",
      "parameters": {
        "type": "object",
        "properties": {...}
      }
    }
  ],
  "systemInstruction": "You are an airport assistant...",  ← Role + guidelines
  "generationConfig": {
    "temperature": 0.7
  }
}
```

#### Breaking Down Each Section

**1. Contents (Conversation History)**

Your full message history formatted for the LLM:

```typescript
// src/apis/gemini.ts:173-205
contents: this.messages.map((msg) => {
  if (msg.type === "user_input") {
    return {
      role: "user",
      parts: [{ text: msg.content }],
    };
  }
  if (msg.type === "tool_calls") {
    return {
      role: "model", // In Gemini, "model" = "assistant"
      parts: msg.content.map((call) => ({
        functionCall: {
          name: call.name,
          args: call.args,
        },
      })),
    };
  }
  if (msg.type === "tool_results") {
    return {
      role: "user",
      parts: msg.content.map((result) => ({
        functionResponse: {
          name: result.name,
          response: { result: result.result },
        },
      })),
    };
  }
  // ... etc
});
```

Each message from your history is transformed into the LLM's format.

**2. Tools (Function Declarations)**

The tools you defined, formatted as schema:

```typescript
// src/agent/tools.ts
export const search: AgentTool = {
  name: "search",
  description: "Search for points of interest...",
  parametersJsonSchema: SearchInput,  // Typebox schema
  action: async (args) => {
    // ... actual implementation
  }
};

// Becomes in API request:
{
  "name": "search",
  "description": "Search for points of interest...",
  "parameters": {
    "type": "object",
    "properties": {
      "term": { "type": "string", "description": "..." },
      "buildingId": { "type": "number", "description": "..." }
      // ... from schema
    }
  }
}
```

The schema tells the LLM what parameters are required and what types they are.

**3. System Instruction (Role + Guidelines)**

A text prompt that defines how the LLM should behave:

```
You are the SFO Airport Assistant. Your role is to help travelers
find facilities, navigate the terminal, and answer questions.

Core Principles:
- Be friendly and concise
- Take action first: if user asks a question, search for the answer
  rather than asking for clarification
- When presenting POIs, include distance and location

You have these tools available: [list of tool names]
```

This is the "role play" prompt that guides the LLM's personality and approach.

#### The Full Request/Response Cycle

```
Your App                          LLM Provider                Your App
────────                          ────────────                ────────
Call generate()
│
├─ Prepare request:
│  ├─ Format message history
│  ├─ Include tool definitions
│  ├─ Include system instruction
│
└─ Send HTTP POST ──────────────→ Receive at /generate
                                  │
                                  ├─ Read conversation history
                                  ├─ Read available tools
                                  ├─ Reason about next step
                                  │
                                  └─ Respond with either:
                                     ├─ Tool calls (e.g., "call search")
                                     └─ Text answer

Receive response ←────────────────
│
├─ If tool calls:
│  ├─ Execute each tool
│  ├─ Add to history
│  └─ Call generate() again (loop)
│
└─ If text:
   ├─ Add to history
   └─ Return to user
```

### Tool Flexibility and Extensibility

The power of this architecture is the flexibility of tools. A tool is just a function—it can do anything.

#### Tool Definition Structure

Every tool follows this interface:

```typescript
// src/agent/types.ts
interface AgentTool {
  name: string; // Identifier (e.g., "search")
  description: string; // What it does (for LLM)
  parametersJsonSchema: object; // Required parameters (Typebox schema)
  action: (args) => Promise<unknown>; // The actual implementation
}
```

The `action` function receives whatever parameters the LLM passed and can do anything.

#### Example 1: Simple Data Lookup

```typescript
// src/agent/tools.ts:32-43
export const getPOIDetails: AgentTool = {
  name: "getPOIDetails",
  description: "Get detailed information about a specific point of interest",
  parametersJsonSchema: GetPOIDetailsInput, // { poiId: number }
  action: async (args) => {
    const { poiId } = args;
    return map.getPOIDetails(poiId); // Fetch from map service
  },
};
```

This tool takes a POI ID and returns data. Simple, no side effects.

#### Example 2: Search with Filtering

```typescript
// src/agent/tools.ts:13-23
export const search: AgentTool = {
  name: "search",
  description: "Search for POIs with flexible filtering...",
  parametersJsonSchema: SearchInput, // { term, buildingId, categoryId, etc. }
  action: async (args) => {
    return map.search(args); // Complex query with multiple filters
  },
};
```

This tool executes a complex search. It can query with multiple parameters, apply filters, rank results. Same pattern.

#### Example 3: Side Effects (UI Updates)

```typescript
// src/agent/tools.ts:69-80
export const showPOI: AgentTool = {
  name: "showPOI",
  description: "Display a POI on the map...",
  parametersJsonSchema: ShowPOIInput, // { poiId: number }
  action: async (args) => {
    const { poiId } = args;
    const details = map.getPOIDetails(poiId);

    // Side effect: update UI
    map.showPOI(poiId);

    return details; // Also return data
  },
};
```

This tool does two things: updates the map UI and returns data. Tools can have side effects.

#### Example 4: Chained Operations

```typescript
// src/agent/tools.ts:89-100
export const showDirections: AgentTool = {
  name: "showDirections",
  description: "Get turn-by-turn directions between waypoints...",
  parametersJsonSchema: ShowDirectionsInput, // { waypoints: number[] }
  action: async (args) => {
    const { waypoints } = args;

    // Step 1: Compute route
    const directions = map.getDirections(waypoints);

    // Step 2: Update UI with visualization
    map.showDirections(waypoints);

    // Step 3: Return formatted result
    return directions;
  },
};
```

This tool chains multiple operations: compute route, visualize it, return results.

#### Error Handling: Uniform Pattern

All tools are executed in a try/catch block:

```typescript
// src/agent/Agent.ts:66-97
private async executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const tool = this.toolRegistry.get(name);

  if (!tool) {
    return { name, result: null, error: "Unknown tool" };
  }

  try {
    const result = await tool.action(args);
    return { name, result };  // Success
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(`Tool failed: ${name}`, { error: errorMessage });
    return { name, result: null, error: errorMessage };  // Failure
  }
}
```

Notice: whether a tool succeeds or fails, it returns the same structure. The LLM sees errors and can decide how to handle them (retry with different params, ask user for clarification, etc.).

#### Adding a New Tool

To add new capability, follow this pattern:

```typescript
// 1. Define parameter schema (Typebox)
const MyToolInput = Type.Object({
  param1: Type.String({ description: "What this is" }),
  param2: Type.Number({ description: "What this is" }),
});

// 2. Create tool object
export const myTool: AgentTool = {
  name: "myTool",
  description: "What this tool does, in natural language",
  parametersJsonSchema: MyToolInput,
  action: async (args) => {
    const { param1, param2 } = args as Static<typeof MyToolInput>;

    // Your implementation here
    // Can call APIs, query databases, update state, whatever
    const result = await doSomething(param1, param2);

    return result;
  },
};

// 3. Register it
// In Agent constructor:
this.toolRegistry.set("myTool", myTool);
```

That's it. The LLM now has access to your new capability.

---

## Provider Independence

One of the best design decisions in this codebase is the `IAIClient` interface. It decouples the agent logic from any specific LLM provider.

### The Interface

```typescript
// src/agent/IAIClient.ts
interface IAIClient {
  generate(
    messages: Message[],
    tools: AgentTool[],
    systemInstruction: string,
  ): Promise<GenerateResponse>;
}

interface GenerateResponse {
  text: string | null;
  toolCalls: ToolCall[] | null;
}
```

This is the contract. Any AI provider (Gemini, Claude, OpenAI) just needs to implement these two methods.

### Current Implementation: GeminiClient

```typescript
// src/apis/gemini.ts
export class GeminiClient implements IAIClient {
  async generate(
    messages: Message[],
    tools: AgentTool[],
    systemInstruction: string,
  ): Promise<GenerateResponse> {
    // Convert to Gemini format
    const request = {
      contents: this.buildContents(messages),
      tools: this.toFunctionDeclarations(tools),
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { temperature: 0.7 },
    };

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/...`,
    );

    // Parse and convert back to agent format
    return this.parseResponse(response);
  }
}
```

The agent doesn't care about this implementation. It just calls `generate()` and gets back a standard response.

### Swapping Providers

If you wanted to use Claude instead, you'd create:

```typescript
// src/apis/claudeClient.ts
export class ClaudeClient implements IAIClient {
  async generate(
    messages: Message[],
    tools: AgentTool[],
    systemInstruction: string,
  ): Promise<GenerateResponse> {
    // Different API format, different request structure
    // But same input, same output
    // ...
  }
}
```

Then in your agent setup:

```typescript
// Use Claude instead of Gemini
const client = new ClaudeClient(apiKey);
const agent = new Agent(client, tools);
```

The agent loop, tool execution, message history—**all stays identical**. Only the LLM provider changes.

### What's Provider-Specific vs. Generic

| Aspect                    | Provider-Specific | Generic |
| ------------------------- | ----------------- | ------- |
| API endpoint URL          | ✅                |         |
| Request format            | ✅                |         |
| Response format           | ✅                |         |
| Message history structure |                   | ✅      |
| Tool execution            |                   | ✅      |
| Loop mechanism            |                   | ✅      |
| Iteration management      |                   | ✅      |
| Error handling            |                   | ✅      |

This means if you understand the agent loop, you understand it for any provider. The only difference is the plumbing (request/response formatting).

---

## Key Takeaways

1. **Agent loops are conversation loops**: Send context → LLM reasons → Execute actions → Send results → Repeat. The loop is what enables multi-step reasoning.

2. **State lives in message history**: Every interaction (user message, tool call, tool result, LLM response) is recorded. The LLM always has full context because we send the entire history each time.

3. **Tools are just functions**: They can do anything—query databases, call APIs, update UI, perform calculations. The LLM doesn't care how; it just invokes them by name.
