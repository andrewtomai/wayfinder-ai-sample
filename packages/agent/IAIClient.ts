/**
 * AI Client Interface
 *
 * Provider-agnostic types and interface for AI clients.
 * Any AI provider (Gemini, Claude, OpenAI, etc.) should implement this interface.
 *
 * This architecture allows different AI backends to be swapped without changing
 * the agent logic or UI components.
 *
 * ## Thought Signatures
 *
 * Some AI providers (e.g., Gemini 3+) return thought signatures with tool calls.
 * These are encrypted tokens representing the model's internal reasoning that must
 * be preserved and passed back in conversation history.
 *
 * Implementations should:
 * - Extract thought signatures from API responses when available
 * - Include them in returned ToolCall objects via the `thoughtSignature` field
 * - Re-inject signatures when building requests from conversation history
 *
 * The Agent handles signature storage automatically - it just preserves whatever
 * ToolCall objects the client returns, including any signatures.
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
   * - Tool calls (including any thought signatures from the provider)
   * - Tool results (serialized as JSON in user messages)
   *
   * ## Thought Signatures
   *
   * When returning tool calls, implementations may include a `thoughtSignature`
   * field on each ToolCall object. This is provider-specific metadata that must
   * be preserved through the conversation. For Gemini 3+ models, this is mandatory
   * for the current turn's function calls.
   *
   * @param {Message[]} messages - The complete conversation history up to this point,
   *                               including all tool calls (with signatures) and results from previous iterations
   * @param {AgentTool[]} tools - The set of tools available for the AI to use
   * @param {string} systemInstruction - The system prompt that guides AI behavior
   *
   * @returns {Promise<GenerateResponse>} The AI's response, which may include text and/or tool calls
   *          (tool calls may include thoughtSignature fields for providers that use them)
   *
   * @example
   * // Initial query
   * const response = await client.generate(
   *   [{ role: "user", content: "Where is the bathroom?" }],
   *   [searchTool],
   *   "You are a helpful venue assistant"
   * );
   * // response.toolCalls might be [{ name: "search_locations", args: { query: "bathroom" }, thoughtSignature: "..." }]
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
