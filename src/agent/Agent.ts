/**
 * AI Agent
 *
 * Orchestrates the AI "thinking" loop - handling tool calls,
 * executing tools, and continuing the conversation until complete.
 */

import { GeminiClient } from "../apis/gemini";
import type { IAIClient } from "./IAIClient";
import type {
  AgentMessage,
  AgentRunResult,
  AgentTool,
  Message,
  ToolCall,
  ToolResult,
} from "./types";

import {
  search,
  getPOIDetails,
  getBuildingsAndLevels,
  showPOI,
  showDirections,
} from "./tools";
import { buildSystemInstruction, MAX_ITERATIONS } from "./prompts";
import logger from "../utils/logger";

// ============================================================================
// Agent Class
// ============================================================================

export class Agent {
  private client: IAIClient;
  private messages: Message[] = [];
  private tools: AgentTool[] = [
    search,
    getPOIDetails,
    getBuildingsAndLevels,
    showPOI,
    showDirections,
  ];
  private toolRegistry: Map<string, AgentTool>;

  constructor() {
    this.client = new GeminiClient();
    this.toolRegistry = new Map(this.tools.map((tool) => [tool.name, tool]));
  }

  /**
   * Count total tools that have been called across all message history
   */
  private countToolsInHistory(): number {
    let totalTools = 0;
    for (const msg of this.messages) {
      if (msg.type === "tool_calls") {
        totalTools += msg.content.length;
      }
    }
    return totalTools;
  }

  /**
   * Execute a tool by name with given arguments
   */
  private async executeTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<ToolResult> {
    const tool = this.toolRegistry.get(name);

    if (!tool) {
      logger.error(`Tool not found: ${name}`);
      return {
        name,
        result: null,
        error: `Unknown tool: ${name}`,
      };
    }

    logger.info(`Executing tool: ${name}`, { args });

    try {
      const result = await tool.action(args);
      logger.info(`Tool result: ${name}`, result);
      return { name, result };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(`Tool failed: ${name}`, { error: errorMessage });
      return {
        name,
        result: null,
        error: errorMessage,
      };
    }
  }

  /**
   * Build a conversational exhaustion message when iterations run out.
   *
   * Provides a helpful summary with clarifying questions to guide the user
   * toward a better follow-up query.
   */
  private buildExhaustionMessage(
    toolResults: ToolResult[],
    toolCalls: ToolCall[],
  ): string {
    // Extract successful results
    const successfulResults = toolResults.filter((r) => !r.error && r.result);
    const failedResults = toolResults.filter((r) => r.error);

    // Count successful vs failed tool calls
    const successCount = successfulResults.length;
    const failureCount = failedResults.length;

    // Build conversational message based on what happened
    if (successCount === 0 && failureCount === 0) {
      // No tools were called at all
      return `I wasn't able to explore much before running out of iteration space. Could you help me refine your request? For example:
- Are you looking for a specific type of location (restaurant, restroom, exit, etc.)?
- Do you have a building or floor in mind?
- Can you describe what you're looking for in different words?

With a bit more detail, I should be able to give you a much better answer!`;
    }

    if (successCount > 0 && failureCount === 0) {
      // Some successful searches
      const toolNames = toolCalls.map((t) => t.name).join(", ");
      return `I've explored the venue and found some information (called: ${toolNames}), but I'm running low on thinking space. Here's what I gathered:

Based on the results, could you clarify:
- Which of the results interests you most?
- Are you looking for something more specific?
- Would you like directions to one of these locations?

Feel free to ask me to dig deeper—I can continue from where I left off!`;
    }

    if (failureCount > 0) {
      // Some failures occurred
      return `I tried searching for what you're looking for, but hit some limits before I could fully complete it. Let me ask a few clarifying questions:
- What specific location or amenity are you searching for?
- Do you know which building or floor it might be in?
- Is there a different way you'd describe what you're looking for?

Let me try again with that extra info—I'm usually pretty good at finding things!`;
    }

    // Fallback
    return `I've gathered what I could, but ran out of thinking space before finishing up. Feel free to ask a follow-up question or provide more details—I'm here to help!`;
  }

  /**
   * Process a user message and run the agent loop
   */
  async chat(userMessage: string): Promise<AgentRunResult> {
    logger.info(`User: "${userMessage}"`);

    // Add user message to history
    this.messages.push({ role: "user", type: "user_input", content: userMessage });

    const allToolCalls: ToolCall[] = [];
    const allToolResults: ToolResult[] = [];
    let finalText = "";
    let iterations = 0;

    // Agent loop - continue until we get a text response or hit max iterations
    while (iterations < MAX_ITERATIONS) {
      iterations++;
      logger.debug(`Iteration ${iterations}/${MAX_ITERATIONS}`);

      // Build system instruction with iteration awareness
      const systemInstruction = buildSystemInstruction(iterations);

      // On the final iteration, don't provide tools - forces text response
      const toolsForThisIteration =
        iterations === MAX_ITERATIONS ? [] : this.tools;

      // Call AI client with current message history (which includes all tool calls/results from previous iterations)
      const response = await this.client.generate(
        this.messages,
        toolsForThisIteration,
        systemInstruction,
      );

      if (response.toolCalls && response.toolCalls.length > 0) {
        logger.info(
          `AI called ${response.toolCalls.length} tool(s): ${response.toolCalls.map((t) => t.name).join(", ")}`,
        );

        // Collect results for this iteration
        const toolResults: ToolResult[] = [];

        // Execute each tool call
        for (const tc of response.toolCalls) {
          allToolCalls.push(tc);

          // Execute the tool
          const toolResult = await this.executeTool(tc.name, tc.args);
          allToolResults.push(toolResult);
          toolResults.push(toolResult);
        }

        // Add tool calls to message history
        this.messages.push({
          role: "assistant",
          type: "tool_calls",
          content: response.toolCalls,
        });

        // Add tool results to message history
        this.messages.push({
          role: "user",
          type: "tool_results",
          content: toolResults,
        });

        logger.debug(
          `Total tools called so far: ${this.countToolsInHistory()}`,
        );

        // Continue loop to let model process the results
      } else {
        // No function calls - we have a text response
        finalText = response.text ?? "";
        logger.info(`Assistant: "${finalText}"`);

         // Add assistant response to message history
         if (finalText) {
           this.messages.push({
             role: "assistant",
             type: "assistant_response",
             content: finalText,
           });
         }

        break;
      }
    }

     // If we hit max iterations without a response, generate a conversational exhaustion message
     if (iterations >= MAX_ITERATIONS && !finalText) {
       logger.warn(`Hit max iterations (${MAX_ITERATIONS}), stopping loop`);
       finalText = this.buildExhaustionMessage(allToolResults, allToolCalls);
       this.messages.push({
         role: "assistant",
         type: "assistant_response",
         content: finalText,
       });
     }

    const resultMessage: AgentMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: finalText,
      timestamp: new Date(),
      toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
      toolResults: allToolResults.length > 0 ? allToolResults : undefined,
    };

    logger.info(`Agent finished in ${iterations} iteration(s)`);

    return {
      message: resultMessage,
      toolCalls: allToolCalls,
      toolResults: allToolResults,
    };
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.messages = [];
  }

  /**
   * Get the current conversation history
   */
  getHistory(): Message[] {
    return [...this.messages];
  }
}
