/**
 * Message Filter Tests
 *
 * Tests for utility functions that identify and filter tool messages
 * from the chat display, since tool calls/results are implementation details.
 */

import { describe, it, expect } from "vitest";
import {
  isToolMessage,
  filterToolMessages,
  type Message,
} from "./messageFilter";

describe("Message Filter Utilities", () => {
  describe("isToolMessage", () => {
    it("should identify toolCalls messages", () => {
      const content = JSON.stringify({
        toolCalls: [{ name: "search", args: { query: "bathroom" } }],
      });

      expect(isToolMessage(content)).toBe(true);
    });

    it("should identify toolResults messages", () => {
      const content = JSON.stringify({
        toolResults: [
          {
            name: "search",
            result: [{ id: 1, name: "Bathroom" }],
          },
        ],
      });

      expect(isToolMessage(content)).toBe(true);
    });

    it("should identify messages with both toolCalls and toolResults", () => {
      const content = JSON.stringify({
        toolCalls: [{ name: "test", args: {} }],
        toolResults: [{ name: "test", result: null }],
      });

      expect(isToolMessage(content)).toBe(true);
    });

    it("should not identify plain text messages", () => {
      expect(isToolMessage("This is a plain text message")).toBe(false);
    });

    it("should not identify regular JSON without tool fields", () => {
      const content = JSON.stringify({
        message: "Hello",
        data: { key: "value" },
      });

      expect(isToolMessage(content)).toBe(false);
    });

    it("should handle invalid JSON gracefully", () => {
      expect(isToolMessage("{invalid json")).toBe(false);
    });

    it("should handle empty string", () => {
      expect(isToolMessage("")).toBe(false);
    });

    it("should handle null string", () => {
      expect(isToolMessage("null")).toBe(false);
    });

    it("should handle JSON array", () => {
      const content = JSON.stringify([
        { name: "item1" },
        { name: "item2" },
      ]);

      expect(isToolMessage(content)).toBe(false);
    });

    it("should handle empty toolCalls array", () => {
      const content = JSON.stringify({ toolCalls: [] });

      expect(isToolMessage(content)).toBe(true); // Still a tool message even if empty
    });

    it("should handle empty toolResults array", () => {
      const content = JSON.stringify({ toolResults: [] });

      expect(isToolMessage(content)).toBe(true); // Still a tool message even if empty
    });

    it("should not identify messages with only toolResults: null", () => {
      const content = JSON.stringify({ toolResults: null });

      expect(isToolMessage(content)).toBe(false); // null is falsy
    });

    it("should not identify messages with only toolCalls: null", () => {
      const content = JSON.stringify({ toolCalls: null });

      expect(isToolMessage(content)).toBe(false); // null is falsy
    });

    it("should handle very long tool messages", () => {
      const longResult = {
        name: "search",
        result: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Location ${i}`,
          score: Math.random(),
        })),
      };
      const content = JSON.stringify({
        toolResults: [longResult],
      });

      expect(isToolMessage(content)).toBe(true);
    });

    it("should handle deeply nested tool data", () => {
      const content = JSON.stringify({
        toolResults: [
          {
            name: "complexTool",
            result: {
              level1: {
                level2: {
                  level3: {
                    level4: {
                      data: "deep value",
                    },
                  },
                },
              },
            },
          },
        ],
      });

      expect(isToolMessage(content)).toBe(true);
    });

    it("should identify error tool results", () => {
      const content = JSON.stringify({
        toolResults: [
          {
            name: "search",
            error: "Search failed: connection timeout",
          },
        ],
      });

      expect(isToolMessage(content)).toBe(true);
    });
  });

  describe("filterToolMessages", () => {
    it("should filter out tool call messages", () => {
      const messages: Message[] = [
        {
          id: "1",
          role: "user",
          content: "Find me a bathroom",
          timestamp: new Date(),
        },
        {
          id: "2",
          role: "assistant",
          content: JSON.stringify({
            toolCalls: [{ name: "search", args: { query: "bathroom" } }],
          }),
          timestamp: new Date(),
        },
        {
          id: "3",
          role: "assistant",
          content: "I found some bathrooms nearby",
          timestamp: new Date(),
        },
      ];

      const filtered = filterToolMessages(messages);

      expect(filtered).toHaveLength(2);
      expect(filtered[0]?.id).toBe("1");
      expect(filtered[1]?.id).toBe("3");
    });

    it("should filter out tool result messages", () => {
      const messages: Message[] = [
        {
          id: "1",
          role: "user",
          content: "What's nearby?",
          timestamp: new Date(),
        },
        {
          id: "2",
          role: "user",
          content: JSON.stringify({
            toolResults: [
              {
                name: "search",
                result: [{ id: 1, name: "Bathroom" }],
              },
            ],
          }),
          timestamp: new Date(),
        },
        {
          id: "3",
          role: "assistant",
          content: "Here's what I found",
          timestamp: new Date(),
        },
      ];

      const filtered = filterToolMessages(messages);

      expect(filtered).toHaveLength(2);
      expect(filtered[0]?.id).toBe("1");
      expect(filtered[1]?.id).toBe("3");
    });

    it("should preserve all non-tool messages", () => {
      const messages: Message[] = [
        {
          id: "1",
          role: "user",
          content: "Hello",
          timestamp: new Date(),
        },
        {
          id: "2",
          role: "assistant",
          content: "Hi there",
          timestamp: new Date(),
        },
        {
          id: "3",
          role: "user",
          content: "How are you?",
          timestamp: new Date(),
        },
        {
          id: "4",
          role: "assistant",
          content: "I'm doing great",
          timestamp: new Date(),
        },
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
          id: "1",
          role: "assistant",
          content: JSON.stringify({
            toolCalls: [{ name: "test", args: {} }],
          }),
          timestamp: new Date(),
        },
        {
          id: "2",
          role: "user",
          content: JSON.stringify({
            toolResults: [{ name: "test", result: null }],
          }),
          timestamp: new Date(),
        },
      ];

      const filtered = filterToolMessages(messages);

      expect(filtered).toHaveLength(0);
    });

    it("should preserve message order after filtering", () => {
      const messages: Message[] = [
        {
          id: "1",
          role: "user",
          content: "Message 1",
          timestamp: new Date(),
        },
        {
          id: "2",
          role: "assistant",
          content: JSON.stringify({
            toolCalls: [{ name: "search", args: {} }],
          }),
          timestamp: new Date(),
        },
        {
          id: "3",
          role: "user",
          content: "Message 3",
          timestamp: new Date(),
        },
        {
          id: "4",
          role: "assistant",
          content: JSON.stringify({
            toolResults: [{ name: "search", result: [] }],
          }),
          timestamp: new Date(),
        },
        {
          id: "5",
          role: "user",
          content: "Message 5",
          timestamp: new Date(),
        },
      ];

      const filtered = filterToolMessages(messages);

      expect(filtered).toHaveLength(3);
      expect(filtered.map((m) => m.id)).toEqual(["1", "3", "5"]);
    });

    it("should handle messages with JSON-like content that isn't tool messages", () => {
      const messages: Message[] = [
        {
          id: "1",
          role: "user",
          content: JSON.stringify({
            location: { lat: 32.5, lng: -97.5 },
            query: "find restaurants",
          }),
          timestamp: new Date(),
        },
        {
          id: "2",
          role: "assistant",
          content: "I found 3 restaurants",
          timestamp: new Date(),
        },
      ];

      const filtered = filterToolMessages(messages);

      expect(filtered).toHaveLength(2); // Both should be kept
      expect(filtered[0]?.id).toBe("1");
    });

    it("should not modify original array", () => {
      const messages: Message[] = [
        {
          id: "1",
          role: "user",
          content: "Test",
          timestamp: new Date(),
        },
        {
          id: "2",
          role: "assistant",
          content: JSON.stringify({
            toolCalls: [{ name: "test", args: {} }],
          }),
          timestamp: new Date(),
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
            id: String(i),
            role: "user",
            content: `Regular message ${i}`,
            timestamp: new Date(),
          });
        } else {
          messages.push({
            id: String(i),
            role: "assistant",
            content: JSON.stringify({
              toolCalls: [{ name: "search", args: { q: `term${i}` } }],
            }),
            timestamp: new Date(),
          });
        }
      }

      const filtered = filterToolMessages(messages);

      expect(filtered).toHaveLength(50);
      expect(filtered.every((m) => !isToolMessage(m.content))).toBe(true);
    });

    it("should handle messages with malformed JSON gracefully", () => {
      const messages: Message[] = [
        {
          id: "1",
          role: "user",
          content: "{malformed json",
          timestamp: new Date(),
        },
        {
          id: "2",
          role: "assistant",
          content: "Valid response",
          timestamp: new Date(),
        },
      ];

      const filtered = filterToolMessages(messages);

      expect(filtered).toHaveLength(2); // Both kept since first isn't valid JSON
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle typical chat history with tools", () => {
      const messages: Message[] = [
        {
          id: "msg-1",
          role: "user",
          content: "Where's the nearest coffee shop?",
          timestamp: new Date(),
        },
        {
          id: "msg-2",
          role: "assistant",
          content: JSON.stringify({
            toolCalls: [
              { name: "search", args: { term: "coffee", limit: 5 } },
            ],
          }),
          timestamp: new Date(),
        },
        {
          id: "msg-3",
          role: "user",
          content: JSON.stringify({
            toolResults: [
              {
                name: "search",
                result: [
                  { poiId: "1", name: "Starbucks", score: 0.95 },
                  { poiId: "2", name: "Peet's Coffee", score: 0.92 },
                ],
              },
            ],
          }),
          timestamp: new Date(),
        },
        {
          id: "msg-4",
          role: "assistant",
          content:
            "I found 2 coffee shops: Starbucks on Level 2 and Peet's Coffee on Level 1",
          timestamp: new Date(),
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
        {
          id: "1",
          role: "user",
          content: "Find restaurants",
          timestamp: new Date(),
        },
        {
          id: "2",
          role: "assistant",
          content: JSON.stringify({
            toolCalls: [{ name: "search", args: { term: "restaurant" } }],
          }),
          timestamp: new Date(),
        },
        {
          id: "3",
          role: "user",
          content: JSON.stringify({
            toolResults: [
              { name: "search", result: [{ id: "r1", name: "Pizza Place" }] },
            ],
          }),
          timestamp: new Date(),
        },
        {
          id: "4",
          role: "assistant",
          content: "Found a pizza place",
          timestamp: new Date(),
        },
        // Turn 2
        {
          id: "5",
          role: "user",
          content: "Get directions there",
          timestamp: new Date(),
        },
        {
          id: "6",
          role: "assistant",
          content: JSON.stringify({
            toolCalls: [{ name: "showDirections", args: { waypoints: [0, 1] } }],
          }),
          timestamp: new Date(),
        },
        {
          id: "7",
          role: "user",
          content: JSON.stringify({
            toolResults: [
              {
                name: "showDirections",
                result: { distance: 150, duration: 2 },
              },
            ],
          }),
          timestamp: new Date(),
        },
        {
          id: "8",
          role: "assistant",
          content: "It's 150 meters away, about 2 minutes walk",
          timestamp: new Date(),
        },
      ];

      const filtered = filterToolMessages(messages);

      expect(filtered).toHaveLength(4);
      expect(filtered.map((m) => m.id)).toEqual(["1", "4", "5", "8"]);
    });
  });
});
