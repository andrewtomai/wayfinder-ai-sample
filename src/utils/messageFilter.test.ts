/**
 * Message Filter Tests
 *
 * Tests for utility functions that identify and filter tool messages
 * from the chat display, since tool calls/results are implementation details.
 */

import { describe, it, expect } from "vitest";
import { isToolMessage, filterToolMessages } from "./messageFilter";
import type { Message } from "../agent/types";

describe("Message Filter Utilities", () => {
  describe("isToolMessage", () => {
    it("should identify tool_calls messages", () => {
      const msg: Message = {
        role: "assistant",
        type: "tool_calls",
        content: [{ name: "search", args: { query: "bathroom" } }],
      };

      expect(isToolMessage(msg)).toBe(true);
    });

    it("should identify tool_results messages", () => {
      const msg: Message = {
        role: "user",
        type: "tool_results",
        content: [
          {
            name: "search",
            result: [{ id: 1, name: "Bathroom" }],
          },
        ],
      };

      expect(isToolMessage(msg)).toBe(true);
    });

    it("should not identify user_input messages", () => {
      const msg: Message = {
        role: "user",
        type: "user_input",
        content: "This is a plain text message",
      };

      expect(isToolMessage(msg)).toBe(false);
    });

    it("should not identify assistant_response messages", () => {
      const msg: Message = {
        role: "assistant",
        type: "assistant_response",
        content: "Here's what I found",
      };

      expect(isToolMessage(msg)).toBe(false);
    });

    it("should handle empty toolCalls array", () => {
      const msg: Message = {
        role: "assistant",
        type: "tool_calls",
        content: [],
      };

      expect(isToolMessage(msg)).toBe(true); // Still a tool message even if empty
    });

    it("should handle empty toolResults array", () => {
      const msg: Message = {
        role: "user",
        type: "tool_results",
        content: [],
      };

      expect(isToolMessage(msg)).toBe(true); // Still a tool message even if empty
    });

    it("should identify tool results with errors", () => {
       const msg: Message = {
         role: "user",
         type: "tool_results",
         content: [
           {
             name: "search",
             result: null,
             error: "Search failed: connection timeout",
           },
         ],
       };

       expect(isToolMessage(msg)).toBe(true);
     });
  });

  describe("filterToolMessages", () => {
    it("should filter out tool call messages", () => {
      const messages: Message[] = [
        { role: "user", type: "user_input", content: "Find me a bathroom" },
        {
          role: "assistant",
          type: "tool_calls",
          content: [{ name: "search", args: { query: "bathroom" } }],
        },
        { role: "assistant", type: "assistant_response", content: "I found some bathrooms nearby" },
      ];

      const filtered = filterToolMessages(messages);

      expect(filtered).toHaveLength(2);
      expect(filtered[0]?.type).toBe("user_input");
      expect(filtered[1]?.type).toBe("assistant_response");
    });

    it("should filter out tool result messages", () => {
      const messages: Message[] = [
        { role: "user", type: "user_input", content: "What's nearby?" },
        {
          role: "user",
          type: "tool_results",
          content: [
            {
              name: "search",
              result: [{ id: 1, name: "Bathroom" }],
            },
          ],
        },
        { role: "assistant", type: "assistant_response", content: "Here's what I found" },
      ];

      const filtered = filterToolMessages(messages);

      expect(filtered).toHaveLength(2);
      expect(filtered[0]?.type).toBe("user_input");
      expect(filtered[1]?.type).toBe("assistant_response");
    });

    it("should preserve all non-tool messages", () => {
      const messages: Message[] = [
        { role: "user", type: "user_input", content: "Hello" },
        { role: "assistant", type: "assistant_response", content: "Hi there" },
        { role: "user", type: "user_input", content: "How are you?" },
        { role: "assistant", type: "assistant_response", content: "I'm doing great" },
      ];

      const filtered = filterToolMessages(messages);

      expect(filtered).toHaveLength(4);
      expect(filtered).toEqual(messages);
    });

    it("should handle empty message array", () => {
      const messages: Message[] = [];

      const filtered = filterToolMessages(messages);

      expect(filtered).toEqual([]);
    });

    it("should handle array with only tool messages", () => {
      const messages: Message[] = [
        {
          role: "assistant",
          type: "tool_calls",
          content: [{ name: "test", args: {} }],
        },
        {
          role: "user",
          type: "tool_results",
          content: [{ name: "test", result: null }],
        },
      ];

      const filtered = filterToolMessages(messages);

      expect(filtered).toHaveLength(0);
    });

    it("should preserve message order after filtering", () => {
      const messages: Message[] = [
        { role: "user", type: "user_input", content: "Message 1" },
        {
          role: "assistant",
          type: "tool_calls",
          content: [{ name: "search", args: {} }],
        },
        { role: "user", type: "user_input", content: "Message 3" },
        {
          role: "user",
          type: "tool_results",
          content: [{ name: "search", result: [] }],
        },
        { role: "user", type: "user_input", content: "Message 5" },
      ];

      const filtered = filterToolMessages(messages);

      expect(filtered).toHaveLength(3);
      expect(filtered.map((m) => m.content)).toEqual(["Message 1", "Message 3", "Message 5"]);
    });

    it("should not modify original array", () => {
      const messages: Message[] = [
        { role: "user", type: "user_input", content: "Test" },
        {
          role: "assistant",
          type: "tool_calls",
          content: [{ name: "test", args: {} }],
        },
      ];

      const originalLength = messages.length;
      const filtered = filterToolMessages(messages);

      expect(messages.length).toBe(originalLength);
      expect(filtered.length).toBe(1);
    });

    it("should handle mixed tool messages efficiently", () => {
      const messages: Message[] = [];

      // Create 100 messages, half tool messages, half regular
      for (let i = 0; i < 100; i++) {
        if (i % 2 === 0) {
          messages.push({
            role: "user",
            type: "user_input",
            content: `Regular message ${i}`,
          });
        } else {
          messages.push({
            role: "assistant",
            type: "tool_calls",
            content: [{ name: "search", args: { q: `term${i}` } }],
          });
        }
      }

      const filtered = filterToolMessages(messages);

      expect(filtered).toHaveLength(50);
      expect(filtered.every((m) => !isToolMessage(m))).toBe(true);
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle typical chat history with tools", () => {
      const messages: Message[] = [
        { role: "user", type: "user_input", content: "Where's the nearest coffee shop?" },
        {
          role: "assistant",
          type: "tool_calls",
          content: [{ name: "search", args: { term: "coffee", limit: 5 } }],
        },
        {
          role: "user",
          type: "tool_results",
          content: [
            {
              name: "search",
              result: [
                { poiId: "1", name: "Starbucks", score: 0.95 },
                { poiId: "2", name: "Peet's Coffee", score: 0.92 },
              ],
            },
          ],
        },
        {
          role: "assistant",
          type: "assistant_response",
          content: "I found 2 coffee shops: Starbucks on Level 2 and Peet's Coffee on Level 1",
        },
      ];

      const filtered = filterToolMessages(messages);

      // Should only show user query and final assistant response
      expect(filtered).toHaveLength(2);
      expect(filtered[0]?.content).toBe("Where's the nearest coffee shop?");
      expect(filtered[1]?.content).toContain("I found 2 coffee shops");
    });

    it("should handle multi-turn conversation with multiple tool calls", () => {
      const messages: Message[] = [
        // Turn 1
        { role: "user", type: "user_input", content: "Find restaurants" },
        {
          role: "assistant",
          type: "tool_calls",
          content: [{ name: "search", args: { term: "restaurant" } }],
        },
        {
          role: "user",
          type: "tool_results",
          content: [{ name: "search", result: [{ id: "r1", name: "Pizza Place" }] }],
        },
        { role: "assistant", type: "assistant_response", content: "Found a pizza place" },
        // Turn 2
        { role: "user", type: "user_input", content: "Get directions there" },
        {
          role: "assistant",
          type: "tool_calls",
          content: [{ name: "showDirections", args: { waypoints: [0, 1] } }],
        },
        {
          role: "user",
          type: "tool_results",
          content: [
            {
              name: "showDirections",
              result: { distance: 150, duration: 2 },
            },
          ],
        },
        {
          role: "assistant",
          type: "assistant_response",
          content: "It's 150 meters away, about 2 minutes walk",
        },
      ];

      const filtered = filterToolMessages(messages);

      expect(filtered).toHaveLength(4);
       expect(
         filtered.map((m) => {
           if (m.type === "user_input" || m.type === "assistant_response") {
             return m.content;
           }
           return "";
         })
       ).toEqual(["Find restaurants", "Found a pizza place", "Get directions there", "It's 150 meters away, about 2 minutes walk"]);
    });
  });
});
