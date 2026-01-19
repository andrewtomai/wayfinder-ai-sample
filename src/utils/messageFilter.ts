/**
 * Utility functions for filtering tool messages from chat display
 *
 * Tool messages are implementation details (JSON-serialized tool calls/results)
 * that shouldn't be shown to users in the chat interface.
 */

/**
 * Message type that matches ChatMessage component interface
 */
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

/**
 * Check if a message contains serialized tool calls or results
 * These are implementation details that shouldn't be shown to users
 */
export function isToolMessage(content: string): boolean {
  try {
    const parsed = JSON.parse(content);
    return !!(parsed.toolCalls || parsed.toolResults);
  } catch {
    return false;
  }
}

/**
 * Filter out tool messages from a message list
 * Used to display only user and assistant text messages to the user
 */
export function filterToolMessages(messages: Message[]): Message[] {
  return messages.filter((msg) => !isToolMessage(msg.content));
}
