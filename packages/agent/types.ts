// ============================================================================
// Agent Types
// ============================================================================
/**
 * A tool that the agent can execute.
 *
 * Each tool has a name, description, JSON schema for input validation,
 * and an action function that performs the tool's operation.
 */
export interface AgentTool {
  name: string;
  description: string;
  parametersJsonSchema: object;
  responseJsonSchema?: object;
  action: (args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * A message returned by the agent after processing a user query.
 *
 * Contains the AI's response text and metadata about tool calls/results made during execution.
 */
export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

/**
 * The result of running the agent on a user message.
 *
 * Contains the final message, and arrays of all tool calls and results that occurred
 * during the execution loop.
 */
export interface AgentRunResult {
  message: AgentMessage;
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
}

/**
 * Represents a single message in the conversation history.
 *
 * Uses a discriminated union pattern (tagged union) where the `type` field
 * determines the structure and content type of the message. This eliminates
 * all parsing magic and provides full type safety.
 *
 * Four distinct message types:
 * - user_input: User's chat query or follow-up
 * - assistant_response: AI's text response to the user
 * - tool_calls: AI requesting execution of tools
 * - tool_results: Results from executing tools
 *
 * @example
 * // User sends a question
 * { role: "user", type: "user_input", content: "Where is the bathroom?" }
 *
 * @example
 * // AI requests tool execution
 * { role: "assistant", type: "tool_calls", content: [{ name: "search", args: {...} }] }
 *
 * @example
 * // Results from tool execution
 * { role: "user", type: "tool_results", content: [{ name: "search", result: {...} }] }
 *
 * @example
 * // AI's final text response
 * { role: "assistant", type: "assistant_response", content: "The bathroom is on the second floor." }
 */
export type Message =
  | {
      role: "user";
      type: "user_input";
      content: string;
    }
  | {
      role: "assistant";
      type: "assistant_response";
      content: string;
    }
  | {
      role: "assistant";
      type: "tool_calls";
      content: ToolCall[];
    }
  | {
      role: "user";
      type: "tool_results";
      content: ToolResult[];
    };

/**
 * Represents a tool call requested by the AI.
 *
 * When an AI decides it needs to use a tool to answer a query, it returns a ToolCall
 * with the tool name and arguments. The agent then executes the tool and passes results back.
 *
 * @interface ToolCall
 * @property {string} name - The name of the tool to invoke (e.g., "search_locations")
 * @property {Record<string, unknown>} args - The arguments to pass to the tool as key-value pairs
 * @property {string} [thoughtSignature] - Provider-specific metadata for preserving model reasoning.
 *   For Gemini 3+ models, this is an encrypted token representing the model's internal reasoning
 *   that must be preserved and passed back in conversation history. The signature is opaque and
 *   should be stored verbatim without modification. Optional field - not all providers use this.
 *   For parallel function calls, only the first call in a response will have a signature.
 *   Signatures are valid for one turn and must be re-sent exactly as received in subsequent requests.
 */
export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  thoughtSignature?: string;
}

/**
 * Represents the result of executing a tool.
 *
 * After a ToolCall is executed, the result is wrapped in a ToolResult and sent back
 * to the AI so it can incorporate the real data into its response.
 *
 * @interface ToolResult
 * @property {string} name - The name of the tool that was executed
 * @property {unknown} result - The data returned by the tool execution
 * @property {string} [error] - Optional error message if the tool execution failed
 */
export interface ToolResult {
  name: string;
  result: unknown;
  error?: string;
}

/**
 * Represents the response from the AI after processing a request.
 *
 * The AI may respond with:
 * - `text` only: A final answer to the user's query
 * - `toolCalls` only: Requests to execute tools (agent will execute and call generate again)
 * - Both: The AI may provide context along with tool requests
 * - Neither: Should not happen; indicates an error or unexpected state
 *
 * @interface GenerateResponse
 * @property {string | null} text - The AI's text response, or null if only tool calls are being made
 * @property {ToolCall[] | null} toolCalls - An array of tool calls the AI wants to make, or null if providing a final response
 */
export interface GenerateResponse {
  text: string | null;
  toolCalls: ToolCall[] | null;
}
