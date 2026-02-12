/**
 * AI Client Interface
 *
 * Provider-agnostic types and interface for AI clients.
 * Any AI provider (Gemini, Claude, OpenAI, etc.) should implement this interface.
 *
 * This architecture allows different AI backends to be swapped without changing
 * the agent logic or UI components.
 */

import type {
  AgentTool,
  GenerateResponse,
  Message,
} from "./types";

/**
 * AI Client Interface - The main contract that all AI providers must implement.
 *
 * Implementations should:
 * 1. Convert provider-specific types to/from these common types
 * 2. Handle tool definitions in the provider's native format
 * 3. Manage API calls and error handling internally
 * 4. Return consistent GenerateResponse objects regardless of provider
 *
 * @interface IAIClient
 */
export interface IAIClient {
  /**
   * Generate an AI response based on conversation context and available tools.
   *
   * This method runs a single step of the AI reasoning loop. The agent may call
   * this multiple times if the AI requests tool execution.
   *
   * The messages array contains the complete conversation history including:
   * - User queries
   * - Assistant responses (text)
   * - Tool calls (serialized as JSON in assistant messages)
   * - Tool results (serialized as JSON in user messages)
   *
   * @param {Message[]} messages - The complete conversation history up to this point,
   *                               including all tool calls and results from previous iterations
   * @param {AgentTool[]} tools - The set of tools available for the AI to use
   * @param {string} systemInstruction - The system prompt that guides AI behavior
   *
   * @returns {Promise<GenerateResponse>} The AI's response, which may include text and/or tool calls
   *
   * @example
   * // Initial query
   * const response = await client.generate(
   *   [{ role: "user", content: "Where is the bathroom?" }],
   *   [searchTool],
   *   "You are a helpful venue assistant"
   * );
   * // response.toolCalls might be [{ name: "search_locations", args: { query: "bathroom" } }]
   *
   * @example
   * // Multi-iteration conversation
   * // After tool execution, tool calls and results are added to messages
   * const followUp = await client.generate(
   *   [
   *     { role: "user", content: "Where is the bathroom?" },
   *     { role: "assistant", content: JSON.stringify({ toolCalls: [...] }) },
   *     { role: "user", content: JSON.stringify({ toolResults: [...] }) },
   *   ],
   *   [searchTool],
   *   "You are a helpful venue assistant"
   * );
   * // followUp.text might be "The nearest bathroom is on the second floor"
   */
  generate(
    messages: Message[],
    tools: AgentTool[],
    systemInstruction: string,
  ): Promise<GenerateResponse>;
}
