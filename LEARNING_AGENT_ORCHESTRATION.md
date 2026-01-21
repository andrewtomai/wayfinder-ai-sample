# Understanding AI Agent Orchestration

A guide to the patterns and design principles behind AI agent systems that orchestrate LLM thinking with tool execution.

**Intended for**: Developers wanting to understand how agent loops work, what makes them powerful, and how to build or extend agentic systems.

---

## Quick Overview

### What is an AI Agent Loop?

An AI agent isn't just a simple "question → answer" system. It's a **loop**—a repeated cycle of thinking, acting, and reacting:

1. **Think**: Send information to the LLM with available actions (called "tools")
2. **Act**: The LLM decides which tool(s) to use and what parameters to send
3. **Observe**: Execute those tools and collect the results
4. **React**: Send results back to the LLM for further analysis
5. **Loop**: Repeat until the LLM provides a final answer

Imagine a research assistant who has access to a database, search engine, and calculator:

- User asks: "What's the average height of Scandinavian men?"
- Assistant **thinks**: "I need to search for this data"
- Assistant **acts**: Searches the database for height statistics
- Assistant **observes**: Gets back raw data including various measurements
- Assistant **reacts**: "Based on data from X, the average is Y"

That's an agent loop. The assistant is the LLM, the database lookups are tool executions, and the loop is what makes multi-step reasoning possible.

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

#### Step-by-Step Logic

Let's walk through the key steps of the agent loop:

**Step 1: User sends message**

The user's message is added to the conversation history. This history becomes your state machine—everything that happens is recorded here and persists across iterations.

**Step 2: Enter the loop**

Start looping (typically 1-10 iterations). On the final iteration, tools will be withheld from the request to force the LLM to provide a text answer.

**Step 3: Send to LLM**

Call the LLM with three things:

- **Message history**: Everything that's happened so far
- **Available tools**: The functions the LLM can invoke
- **System instruction**: Guidelines for behavior (changes based on iteration count)

**Step 4a: Handle tool calls**

When the LLM responds with tool calls:

1. Execute each tool in parallel
2. Record what the LLM wanted to do
3. Record what actually happened (results or errors)
4. Loop back to the LLM with the results

The LLM reads the results and decides whether to call more tools or provide a final answer.

**Step 4b: Handle text response**

When the LLM provides a text answer:

1. Add it to history
2. Exit the loop
3. Return the result to the user

**Step 5: Handle exhaustion**

If you hit the maximum iterations without a text response, generate a graceful fallback message asking the user for clarification.

### Message History: The Persistent State Machine

The key insight: **everything that happens is recorded in the message history**. This is your state machine.

A message can be one of four types:

- **User input**: The user asked something
- **Assistant response**: The LLM provided a final answer
- **Tool calls**: The LLM decided to invoke one or more tools
- **Tool results**: You executed those tools and got results

Each message is atomic and represents one logical action in the conversation.

#### Example: Full Conversation History

Here's a typical conversation flow:

```
1. User: "What's the average height of Scandinavian men?"
   ↓
2. LLM decides to search: "I'll search for Scandinavian population data"
   ↓
3. Tool result: Gets back raw statistics
   ↓
4. LLM decides to calculate: "I'll average the heights from that data"
   ↓
5. Tool result: Calculator returns 180cm
   ↓
6. LLM provides answer: "Based on the data, the average is 180cm"
```

Notice: the entire loop is recorded. The next user message comes in, and all of this history goes back to the LLM. It has full context for the next iteration.

### Iteration Management and Dynamic Prompting

The system uses iterations to guide behavior and prevent infinite loops. The system instruction changes based on which iteration you're on.

#### Iterations 1-7: Full Capabilities

On early iterations, the LLM has full access to tools and standard system instructions apply.

#### Iterations 8-9: Wrap-Up Mode

As you approach the iteration limit, the system instruction includes guidance:

```
Note: You have 2 iterations remaining. Prioritize providing an answer.
If you need more information, ask the user directly rather than
running more searches. Think about what you already know.
```

This steers the LLM toward wrapping up instead of continuing to explore.

#### Iteration 10 (Final): No Tools (Force Answer)

On the final iteration, tools are removed from the request entirely. The system instruction becomes:

```
You have no iterations left. You must provide a final answer based
on what you know. If you cannot answer, explain what information
you would need.
```

With no tools available, the LLM must respond with text. This prevents infinite loops.

#### Why Dynamic Prompting Matters

The key is that **system instructions change based on state**. The LLM gets increasingly pressured to wrap up, then is forced to. This is more elegant than arbitrary cutoffs—it guides the LLM toward the right behavior before forcing it.

### What Gets Sent to the LLM: The API Request

Every time you call the LLM, you send the same three things: conversation history, available tools, and system instructions. The format varies by provider, but the structure is universal.

#### Universal Structure

```
POST /api/generate
{
  "messages": [             ← Full conversation history
    {
      "role": "user",       ← Who sent this (user or assistant)
      "content": "..."
    }
  ],
  "tools": [                ← Available functions LLM can call
    {
      "name": "search",
      "description": "Search for information...",
      "parameters": {
        "type": "object",
        "properties": {...}
      }
    }
  ],
  "systemInstruction": "You are an assistant...",  ← Role + guidelines
  "config": {
    "temperature": 0.7
  }
}
```

#### Breaking Down Each Section

**1. Messages (Conversation History)**

Your full message history formatted for the LLM. This is the critical part—it includes:

- User input
- Previous tool calls (what the LLM wanted to do)
- Tool results (what actually happened)
- Previous responses (what the LLM already said)

The LLM reads this entire history and reasons about the next step.

**2. Tools (Function Declarations)**

Each tool is described with:

- **name**: Identifier (e.g., "search")
- **description**: What it does in natural language
- **parameters**: Required parameters and their types (as a schema)

This tells the LLM what functions are available and what arguments they accept. The LLM uses this to decide which tools to call.

**3. System Instruction (Role + Guidelines)**

A text prompt that defines how the LLM should behave:

```
You are a research assistant. Your role is to help answer questions
using available information sources.

Core Principles:
- Be thorough but concise
- Take action first: search for information rather than asking
- Always cite your sources
- If unsure, admit it

Available tools: search, calculate, summarize
```

This sets the LLM's personality and approach.

#### The Full Request/Response Cycle

```
Your App                          LLM Provider                Your App
────────                          ────────────                ────────
Prepare request:
  ├─ Format message history
  ├─ Include tool definitions
  └─ Include system instruction
           │
           └─ Send HTTP POST ──────────────→ Receive request
                                             │
                                             ├─ Parse messages
                                             ├─ Read available tools
                                             ├─ Reason about next step
                                             │
                                             └─ Respond with either:
                                                ├─ Tool calls
                                                └─ Text answer
                                             │
Response arrives ←─────────────────────────
   │
   ├─ If tool calls:
   │  ├─ Execute each tool in your app
   │  ├─ Add results to message history
   │  └─ Call LLM again (loop)
   │
   └─ If text:
      ├─ Add to history
      └─ Return to user
```

Key insight: **You're not asking the LLM a question and getting an answer. You're having an async conversation where the LLM suggests actions, you execute them, and it reasons about results.**

### Tool Flexibility and Extensibility

The power of agent systems is that tools are just functions—they can do anything. From the LLM's perspective, it simply invokes them by name. What happens inside is entirely up to you.

#### Tool Definition Pattern

Every tool needs:

```
name: string                    // Identifier (e.g., "search")
description: string             // Natural language explanation
parameters: schema              // Required parameters and types
action: async function          // The actual implementation
```

The `action` function receives the parameters and returns a result. That's it.

#### Example Tool Types

**Example 1: Simple Data Lookup**

A tool that fetches data without side effects:

```
Tool: getUserData
Input: { userId: number }
Output: { name, email, createdAt, ... }
Implementation: Query database and return user record
```

**Example 2: Search with Filtering**

A tool that performs complex queries:

```
Tool: search
Input: { query: string, filters: {...}, limit: number }
Output: Array of ranked results
Implementation: Query search index with multiple filters,
               rank by relevance, return top N results
```

**Example 3: Side Effects (State Changes)**

A tool that modifies application state or UI:

```
Tool: bookmark
Input: { itemId: string }
Output: { success: boolean, bookmarkId: string }
Implementation: Save bookmark to database
              Update UI to show bookmark icon
              Return confirmation
```

**Example 4: Chained Operations**

A tool that coordinates multiple steps:

```
Tool: generateReport
Input: { datasetId: string, format: 'pdf' | 'json' }
Output: { reportUrl: string, generatedAt: timestamp }
Implementation: Step 1: Query raw data from database
               Step 2: Analyze and calculate metrics
               Step 3: Generate formatted output
               Step 4: Upload to cloud storage
               Step 5: Return URL
```

#### Error Handling Pattern

All tools should return consistent results, whether they succeed or fail:

```
Success: { name, result }
Failure: { name, error }
```

When a tool fails, include the error message. The LLM sees this and can decide how to handle it:

- Retry with different parameters
- Try an alternative approach
- Ask the user for clarification
- Give up and explain the limitation

The key is that tool failures are recoverable—they're just data the LLM sees.

#### Why This Flexibility Matters

Because tools are functions in your codebase, they can:

- **Call external APIs** (weather, maps, payment services)
- **Query databases** (user data, inventory, analytics)
- **Perform computations** (calculations, format conversions, aggregations)
- **Trigger workflows** (send emails, create tickets, schedule tasks)
- **Update UI state** (highlight elements, scroll to location, open panels)
- **Chain multiple operations** (fetch data → process → save → notify)

The LLM gains instant access to all of this without needing to know how it works. You define what's available, and the LLM decides when to use it.

---

## Provider Independence

One of the most important design decisions in agent systems is separating the agent loop logic from the LLM provider. This allows you to swap providers without touching the core orchestration.

### The Abstraction

Define a simple interface that any LLM provider must implement:

```
Interface: AIClient
  generate(
    messages: Message[],
    tools: Tool[],
    systemInstruction: string
  ) → Promise<Response>

Response:
  text: string | null
  toolCalls: ToolCall[] | null
```

This is the contract. Any provider (OpenAI, Claude, Gemini, local LLM) just implements this method.

### Provider Implementation

Each provider takes the agent's generic format and converts it to their API:

```
GeminiClient (implements AIClient)
  ├─ Converts messages to Gemini format
  ├─ Calls Gemini API
  └─ Converts response back to generic format

ClaudeClient (implements AIClient)
  ├─ Converts messages to Claude format
  ├─ Calls Claude API
  └─ Converts response back to generic format

OpenAIClient (implements AIClient)
  ├─ Converts messages to OpenAI format
  ├─ Calls OpenAI API
  └─ Converts response back to generic format
```

The agent loop code is completely identical for all of them.

### What Changes vs. What Stays the Same

**Provider-Specific (varies by LLM)**:
- API endpoint URL
- Request format (how to structure the HTTP body)
- Response format (how to parse the response)
- Parameter styles (tool parameter schemas might vary slightly)

**Provider-Agnostic (identical across all LLMs)**:
- Message history structure
- Tool execution logic
- Loop mechanism (think → act → observe → loop)
- Iteration management
- Error handling patterns

This means: **If you understand the agent loop, you understand it for any provider.** The only difference is the translation layer.

---

## Key Takeaways

1. **Agent loops are conversation loops**: Send context → LLM reasons → Execute actions → Send results → Repeat. The loop is what enables multi-step reasoning.

2. **State lives in message history**: Every interaction (user message, tool call, tool result, LLM response) is recorded. The LLM always has full context because we send the entire history each time.

3. **Tools are just functions**: They can do anything—query databases, call APIs, update UI, perform calculations. The LLM doesn't care how; it just invokes them by name.

4. **Iteration limits are safety guards**: Iterations prevent infinite loops by gradually constraining the LLM's options, then forcing a final answer.

5. **Abstraction enables flexibility**: The provider abstraction means your core agent logic works with any LLM—Gemini, Claude, OpenAI, local models.

6. **Message history is the state machine**: Everything that happens is persisted and sent back to the LLM. The history is your debugging tool and your context source.

---

## Next Steps

To deepen your understanding of agent orchestration:

- **Trace a full loop**: Run an agent in your application and watch the message history grow through multiple iterations
- **Understand your prompts**: Study the system instructions and see how they guide LLM behavior
- **Try adding a tool**: Pick a simple capability (fetch data, do a calculation) and add it as a tool
- **Implement a new provider**: If you're using one LLM provider, try swapping in another to see how little core logic changes
- **Debug agent failures**: When the agent behaves unexpectedly, check the message history—it tells you exactly what happened at each step
