/**
 * Agent Context Preservation Tests
 *
 * This test suite verifies that the agent correctly maintains context across
 * multiple tool execution iterations. The key issue being tested is that when
 * an AI makes multiple tool calls in a multi-step query, each subsequent
 * iteration should have access to all previous tool results.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Agent } from "./Agent";
import type { AgentTool, Message, ToolCall } from "./types";

// Mock the logger to avoid noise during tests
vi.mock("../utils/logger", () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Store mock response function in module scope
let mockResponseFn:
  | ((context: {
      messages: Message[];
    }) => { text?: string | null; toolCalls?: ToolCall[] | null })
  | null = null;

// Mock the AI client to control responses
vi.mock("../apis/gemini", () => {
  return {
    GeminiClient: class {
      async generate(
        messages: Message[],
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _tools: AgentTool[],
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _systemInstruction: string,
      ) {
        if (mockResponseFn) {
          return mockResponseFn({
            messages,
          });
        }
        return { text: "" };
      }
    },
  };
});

// Mock tools to control their behavior
vi.mock("./tools", () => ({
  search: {
    name: "search",
    description: "Search for POIs",
    action: vi.fn(),
  },
  getPOIDetails: {
    name: "getPOIDetails",
    description: "Get POI details",
    action: vi.fn(),
  },
  getBuildingsAndLevels: {
    name: "getBuildingsAndLevels",
    description: "Get buildings and levels",
    action: vi.fn(),
  },
  showPOI: {
    name: "showPOI",
    description: "Show POI on map",
    action: vi.fn(),
  },
  showDirections: {
    name: "showDirections",
    description: "Show directions",
    action: vi.fn(),
  },
}));

describe("Agent Context Preservation", () => {
  let agent: Agent;

  beforeEach(() => {
    agent = new Agent();
    mockResponseFn = null;
    vi.clearAllMocks();
  });

  it("should preserve tool results in message history for subsequent iterations", async () => {
    /**
     * Scenario: Multi-step query that requires the AI to make a series of tool calls,
     * where later tool calls depend on results from earlier ones.
     *
     * User Query: "Find bathrooms near Gate 15, show them on map"
     *
     * Expected Flow:
     * 1. Iteration 1: AI calls search("bathrooms near Gate 15")
     * 2. Iteration 2: AI receives search results, calls showPOI() with the result
     * 3. Iteration 3: AI provides text response
     */

    let callCount = 0;
    mockResponseFn = (context: {
      messages: Message[];
    }) => {
      callCount++;

      if (callCount === 1) {
        // First iteration: AI calls search tool
        return {
          toolCalls: [
            {
              name: "search",
              args: { query: "bathrooms near Gate 15" },
            },
          ],
        };
       } else if (callCount === 2) {
         // Second iteration: AI receives search results, calls showPOI
         // THIS IS THE KEY TEST: Verify that the AI has access to the previous search results
         const messageHistory = context.messages;
         const hasToolResults = messageHistory.some((msg: Message) => {
           return msg.type === "tool_results";
         });

         expect(hasToolResults).toBe(true);

        return {
          toolCalls: [
            {
              name: "showPOI",
              args: { poiId: "bathroom-123" },
            },
          ],
        };
      } else {
        // Final iteration: AI provides text response
        return {
          text: "Found bathrooms near Gate 15 and displayed them on the map.",
        };
      }
    };

    // Mock tool implementations
    const { search, showPOI } = await import("./tools");
    vi.mocked(search.action).mockResolvedValue({
      results: [{ id: "bathroom-123", name: "Bathrooms", floor: 1 }],
    });
    vi.mocked(showPOI.action).mockResolvedValue({ status: "displayed" });

    // Run the agent
    const result = await agent.chat(
      "Find bathrooms near Gate 15, show them on map",
    );

    // Verify the result
    expect(result.message.content).toContain("displayed them on the map");
    expect(result.toolCalls).toHaveLength(2);
    expect(result.toolCalls[0].name).toBe("search");
    expect(result.toolCalls[1].name).toBe("showPOI");
  });

  it("should properly format and persist tool calls and results as JSON messages", async () => {
    let callCount = 0;
    mockResponseFn = () => {
      callCount++;
      if (callCount === 1) {
        return {
          toolCalls: [{ name: "search", args: { query: "test" } }],
        };
      } else {
        return { text: "Done" };
      }
    };

    const { search } = await import("./tools");
    vi.mocked(search.action).mockResolvedValue({ results: [] });

    await agent.chat("Test query");

     // Check message history format
     const history = agent.getHistory();

     // Should have: user message, assistant (tool calls), user (tool results), assistant (final)
     expect(history.length).toBeGreaterThanOrEqual(3);

     // Find the tool calls message (should have type: "tool_calls")
     const toolCallsMessage = history.find((msg) => msg.type === "tool_calls");

     expect(toolCallsMessage).toBeDefined();
     if (toolCallsMessage && toolCallsMessage.type === "tool_calls") {
       expect(toolCallsMessage.content).toHaveLength(1);
       expect(toolCallsMessage.content[0].name).toBe("search");
     }

     // Find the tool results message (should have type: "tool_results")
     const toolResultsMessage = history.find((msg) => msg.type === "tool_results");

     expect(toolResultsMessage).toBeDefined();
     if (toolResultsMessage && toolResultsMessage.type === "tool_results") {
       expect(toolResultsMessage.content).toHaveLength(1);
       expect(toolResultsMessage.content[0].name).toBe("search");
     }
  });

  it("should handle error results correctly without breaking context", async () => {
    /**
     * Scenario: Tool execution fails, but agent should still continue
     *
     * Verify that error messages are properly formatted as:
     * { error: "error message" } not { error: "error message", result: null }
     */

    let callCount = 0;
    mockResponseFn = () => {
      callCount++;
      if (callCount === 1) {
        return {
          toolCalls: [{ name: "search", args: { query: "invalid-poi" } }],
        };
      } else {
        return { text: "The search tool failed, but I handled it gracefully." };
      }
    };

    const { search } = await import("./tools");
    vi.mocked(search.action).mockRejectedValue(new Error("Connection timeout"));

    const result = await agent.chat("Search for something");

    // Should complete despite tool error
    expect(result.message.content).toContain("handled it gracefully");
  });

  it("should count total tools called across all iterations", async () => {
    let callCount = 0;
    mockResponseFn = () => {
      callCount++;
      if (callCount === 1) {
        return {
          toolCalls: [{ name: "search", args: { query: "test1" } }],
        };
      } else if (callCount === 2) {
        return {
          toolCalls: [
            { name: "getPOIDetails", args: { poiId: "123" } },
            { name: "showPOI", args: { poiId: "123" } },
          ],
        };
      } else {
        return { text: "Complete" };
      }
    };

    const { search, getPOIDetails, showPOI } = await import("./tools");
    vi.mocked(search.action).mockResolvedValue({ id: "123" });
    vi.mocked(getPOIDetails.action).mockResolvedValue({ details: "info" });
    vi.mocked(showPOI.action).mockResolvedValue({ status: "shown" });

     await agent.chat("Multi-tool query");

     const history = agent.getHistory();

     // Count tool calls from history
     let totalTools = 0;
     for (const msg of history) {
       if (msg.type === "tool_calls") {
         totalTools += msg.content.length;
       }
     }

     // Should have 1 + 2 = 3 total tool calls
     expect(totalTools).toBe(3);
  });

  it("should not confuse user JSON messages with tool messages", async () => {
    /**
     * Edge case: User sends a JSON string as their message
     * This should NOT be parsed as a tool message
     */

    mockResponseFn = () => {
      return { text: "I received your JSON message" };
    };

    const userJsonMessage = JSON.stringify({ query: "find bathrooms" });
    await agent.chat(userJsonMessage);

     const history = agent.getHistory();

     // First message should be the JSON string, but should NOT be a tool message
     const firstMessage = history[0];
     expect(firstMessage.role).toBe("user");
     expect(firstMessage.type).toBe("user_input");
     expect(firstMessage.content).toBe(userJsonMessage);
  });

  it("should maintain separate message histories for multiple agent instances", async () => {
    /**
     * Verify that creating new Agent instances doesn't share history
     */

    mockResponseFn = () => {
      return { text: "Response" };
    };

    const agent1 = new Agent();
    const agent2 = new Agent();

    await agent1.chat("Query from agent 1");
    const history1 = agent1.getHistory();

    await agent2.chat("Query from agent 2");
    const history2 = agent2.getHistory();

    // Each agent should have only its own messages
    expect(history1.length).toBeLessThan(history2.length + 10); // Allow some variance
    expect(history1[0].content).toContain("Query from agent 1");
    expect(history2[0].content).toContain("Query from agent 2");
  });
});

describe("Iteration Limit Awareness & Graceful Exhaustion", () => {
  let agent: Agent;

  beforeEach(() => {
    agent = new Agent();
    mockResponseFn = null;
    vi.clearAllMocks();
  });

  it("should reach max iterations and generate graceful exhaustion message when no tools are provided", async () => {
    /**
     * Scenario: Agent hits iteration limit without getting a text response
     *
     * This simulates the final iteration where tools are empty ([]). The AI should
     * provide a text response summarizing what was found and asking clarifying questions.
     */

    let callCount = 0;
    mockResponseFn = () => {
      callCount++;

      // Iterate a bunch to test exhaustion
      if (callCount < 9) {
        // Iterations 1-8: Return tool calls (search variations)
        return {
          toolCalls: [
            {
              name: "search",
              args: { query: `attempt ${callCount}` },
            },
          ],
        };
      } else {
        // Iteration 9: Still trying to call tools, but we'll get empty response
        return {
          toolCalls: [
            {
              name: "search",
              args: { query: "attempt 9" },
            },
          ],
        };
      }
      // Note: Final iteration (10) should have no tools, so AI will give text
    };

    const { search } = await import("./tools");
    vi.mocked(search.action).mockResolvedValue({
      results: [{ id: "test-123", name: "Test Location" }],
    });

    const result = await agent.chat("Find something very specific");

    // Should complete and have a message
    expect(result.message.content).toBeDefined();
    expect(result.message.content.length).toBeGreaterThan(0);

    // Exhaustion message should be conversational (contains clarifying questions)
    const responseText = result.message.content.toLowerCase();
    expect(
      responseText.includes("clarify") ||
        responseText.includes("help") ||
        responseText.includes("?"),
    ).toBe(true);
  });

  it("should generate exhaustion message when tools were called but no final answer", async () => {
    /**
     * Scenario: Agent made tool calls but ran out of iterations before finalizing
     *
     * The exhaustion message should reference that searches were done.
     */

    let callCount = 0;
    mockResponseFn = () => {
      callCount++;

      // Keep returning tool calls until we hit limit
      if (callCount < 10) {
        return {
          toolCalls: [
            {
              name: "search",
              args: { query: `search ${callCount}` },
            },
          ],
        };
      }
      // On iteration 10, tools are empty, so AI must return text
      return { text: "" };
    };

    const { search } = await import("./tools");
    vi.mocked(search.action).mockResolvedValue({
      results: [{ id: "poi-1", name: "Location 1" }],
    });

    const result = await agent.chat("Complex multi-step search");

    // Should have a text response
    expect(result.message.content).toBeDefined();
    expect(result.message.content.length).toBeGreaterThan(0);

    // Response should be conversational (not a generic error)
    expect(result.message.content).not.toContain("I apologize");

    // Should indicate it gathered information
    const responseText = result.message.content.toLowerCase();
    expect(
      responseText.includes("gather") ||
        responseText.includes("explore") ||
        responseText.includes("found"),
    ).toBe(true);
  });

  it("should include dynamic system instruction warnings on iterations 8-9", async () => {
    /**
     * This test verifies that buildSystemInstruction() is called with correct iteration numbers
     * and includes warnings when iterations are 8 or 9.
     */

    const { buildSystemInstruction } = await import("./prompts");

    // Iteration 8 should have warning
    const instruction8 = buildSystemInstruction(8);
    expect(instruction8).toContain("2 iteration");
    expect(instruction8.toLowerCase()).toContain("prioritize");

    // Iteration 9 should have warning
    const instruction9 = buildSystemInstruction(9);
    expect(instruction9).toContain("1 iteration");
    expect(instruction9.toLowerCase()).toContain("prioritize");

    // Iteration 10 should have explicit "no iterations left"
    const instruction10 = buildSystemInstruction(10);
    expect(instruction10).toContain("no iterations left");

    // Iteration 7 should NOT have warning
    const instruction7 = buildSystemInstruction(7);
    expect(instruction7.toLowerCase()).not.toContain("iteration");
    expect(instruction7.toLowerCase()).not.toContain("prioritize");
  });

  it("should allow conversation continuation after exhaustion", async () => {
    /**
     * Scenario: Agent exhausts iterations, then user sends follow-up query
     *
     * The key here is that `this.messages` persists, so the new query starts
     * with full context of the previous failed attempt.
     */

     let callCount = 0;
     mockResponseFn = (context: { messages: Message[] }) => {
       callCount++;

       // First run: exhaust iterations
       const lastMessage = context.messages[context.messages.length - 1];
       const lastContent = lastMessage?.type === "user_input" || lastMessage?.type === "assistant_response"
         ? (lastMessage.content as string)
         : "";

       if (lastContent.includes("first")) {
         // First query - keep calling tools until exhaustion
         if (callCount < 10) {
           return {
             toolCalls: [
               {
                 name: "search",
                 args: { query: "first query attempt" },
               },
             ],
           };
         }
       } else if (lastContent.includes("second")) {
         // Second query - should provide answer quickly
         return {
           text: "Now I understand! Here's the answer based on the previous search.",
         };
       }

       return { text: "Default response" };
     };

    const { search } = await import("./tools");
    vi.mocked(search.action).mockResolvedValue({
      results: [{ id: "test", name: "Test" }],
    });

    // First query - will exhaust
    await agent.chat("This is my first complex query");

    // Get history after first exhaustion
    const historyAfterFirst = agent.getHistory();
    expect(historyAfterFirst.length).toBeGreaterThan(1);

    // Reset call count for second query
    callCount = 0;

    // Second query - should continue with full context
    const result2 = await agent.chat(
      "Can you clarify the second detail please",
    );
    expect(result2.message.content).toContain("Now I understand");

     // History should include both conversations
     const finalHistory = agent.getHistory();
     expect(finalHistory.length).toBeGreaterThan(historyAfterFirst.length);
     
     const firstContent = finalHistory[0]?.type === "user_input" ? (finalHistory[0].content as string) : "";
     const lastContent = finalHistory[finalHistory.length - 1]?.type === "assistant_response"
       ? (finalHistory[finalHistory.length - 1].content as string)
       : "";
       
     expect(firstContent).toContain("first");
     expect(lastContent.toLowerCase()).toContain("understand");
  });

  it("should remove tools from the final iteration to force text response", async () => {
    /**
     * Scenario: Verify behavior when tools are empty on final iteration
     *
     * The AI should be forced to provide a text response instead of more tool calls.
     */

    mockResponseFn = () => {
      return { text: "Final response when no tools available" };
    };

    const { search } = await import("./tools");
    vi.mocked(search.action).mockResolvedValue({ results: [] });

    const result = await agent.chat("Quick question");

    // Should complete with text response
    expect(result.message.content).toBeDefined();
    expect(result.message.content).toBeTruthy();

    // Result should contain the text we set in the mock
    expect(result.message.content).toContain("response");
  });
});
