/**
 * Utility functions for filtering tool messages from chat display
 *
 * Tool messages are implementation details (tool calls/results)
 * that shouldn't be shown to users in the chat interface.
 */

import type { Message } from "../agent/types";

/**
 * Check if a message contains tool calls or results
 * These are implementation details that shouldn't be shown to users
 */
export function isToolMessage(msg: Message): boolean {
  return msg.type === "tool_calls" || msg.type === "tool_results";
}

/**
 * Filter out tool messages from a message list
 * Used to display only user and assistant text messages to the user
 */
export function filterToolMessages(messages: Message[]): Message[] {
  return messages.filter((msg) => !isToolMessage(msg));
}
