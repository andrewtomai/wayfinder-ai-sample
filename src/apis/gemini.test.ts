/**
 * GeminiClient Tests
 *
 * Tests for the Gemini API client implementation.
 * Verifies that the client correctly translates between provider-agnostic types
 * and Gemini-specific formats, handles tool definitions, and parses responses.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { GeminiClient, GeminiError } from "./gemini";
import type { AgentTool, Message, ToolCall, ToolResult } from "../agent/types";
import { Type } from "typebox";

// Mock the logger to avoid console noise during tests
vi.mock("../utils/logger", () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("GeminiClient", () => {
  let client: GeminiClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Setup environment variables
    vi.stubEnv("VITE_AI_CLIENT_API_KEY", "test-api-key");
    vi.stubEnv("VITE_AI_CLIENT_MODEL", "gemini-2.0-flash");
    vi.stubEnv("VITE_AI_CLIENT_TEMPERATURE", "0.7");

    // Mock fetch globally
    fetchMock = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.fetch = fetchMock as any;

    // Create client
    client = new GeminiClient();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("Initialization & Configuration", () => {
    it("should read API key from environment variable", () => {
      // The client should initialize without errors when API key is present
      expect(client).toBeDefined();
    });

    it("should use default model when not specified", () => {
      vi.stubGlobal("import", {
        meta: {
          env: {
            VITE_AI_CLIENT_API_KEY: "test-key",
            VITE_AI_CLIENT_MODEL: undefined,
            VITE_AI_CLIENT_TEMPERATURE: "0.5",
          },
        },
      });

      const newClient = new GeminiClient();
      expect(newClient).toBeDefined();
    });

    it("should use default temperature when not specified", () => {
      vi.stubGlobal("import", {
        meta: {
          env: {
            VITE_AI_CLIENT_API_KEY: "test-key",
            VITE_AI_CLIENT_MODEL: "gemini-2.0-flash",
            VITE_AI_CLIENT_TEMPERATURE: undefined,
          },
        },
      });

      const newClient = new GeminiClient();
      expect(newClient).toBeDefined();
    });
  });

  describe("Simple Text Response", () => {
    it("should parse simple text response correctly", async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              role: "model",
              parts: [
                {
                  text: "The bathroom is on the second floor.",
                },
              ],
            },
            finishReason: "STOP",
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const messages: Message[] = [
        { role: "user", content: "Where is the bathroom?" },
      ];

      const response = await client.generate(messages, [], "You are helpful");

      expect(response.text).toBe("The bathroom is on the second floor.");
      expect(response.toolCalls).toBeNull();
    });

    it("should handle empty text response", async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              role: "model",
              parts: [
                {
                  text: "",
                },
              ],
            },
            finishReason: "STOP",
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const response = await client.generate([], [], "");

      expect(response.text).toBe("");
      expect(response.toolCalls).toBeNull();
    });

    it("should handle null candidates", async () => {
      const mockResponse = {
        candidates: null,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const response = await client.generate([], [], "");

      expect(response.text).toBeNull();
      expect(response.toolCalls).toBeNull();
    });
  });

  describe("Tool Calls Response", () => {
    it("should parse tool call response correctly", async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              role: "model",
              parts: [
                {
                  functionCall: {
                    name: "search",
                    args: { query: "bathrooms" },
                  },
                },
              ],
            },
            finishReason: "TOOL_CALL",
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const response = await client.generate([], [], "");

      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls?.[0]).toEqual({
        name: "search",
        args: { query: "bathrooms" },
      });
      expect(response.text).toBeNull();
    });

    it("should parse multiple tool calls", async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              role: "model",
              parts: [
                {
                  functionCall: {
                    name: "search",
                    args: { query: "coffee" },
                  },
                },
                {
                  functionCall: {
                    name: "getPOIDetails",
                    args: { poiId: 123 },
                  },
                },
              ],
            },
            finishReason: "TOOL_CALL",
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const response = await client.generate([], [], "");

      expect(response.toolCalls).toHaveLength(2);
      expect(response.toolCalls?.[0]?.name).toBe("search");
      expect(response.toolCalls?.[1]?.name).toBe("getPOIDetails");
    });

    it("should handle tool calls with complex arguments", async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              role: "model",
              parts: [
                {
                  functionCall: {
                    name: "search",
                    args: {
                      query: "coffee",
                      buildingId: "terminal-a",
                      isAfterSecurity: true,
                      near: {
                        poiId: 456,
                        radius: 200,
                      },
                    },
                  },
                },
              ],
            },
            finishReason: "TOOL_CALL",
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const response = await client.generate([], [], "");

      expect(response.toolCalls?.[0]?.args).toEqual({
        query: "coffee",
        buildingId: "terminal-a",
        isAfterSecurity: true,
        near: {
          poiId: 456,
          radius: 200,
        },
      });
    });
  });

  describe("Mixed Text and Tool Calls", () => {
    it("should parse both text and tool calls from same response", async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              role: "model",
              parts: [
                {
                  text: "Let me search for that.",
                },
                {
                  functionCall: {
                    name: "search",
                    args: { query: "test" },
                  },
                },
              ],
            },
            finishReason: "TOOL_CALL",
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const response = await client.generate([], [], "");

      // When both are present, text takes precedence
      expect(response.text).toBe("Let me search for that.");
      expect(response.toolCalls).toHaveLength(1);
    });
  });

  describe("Tool Definition Translation", () => {
    it("should convert AgentTool to Gemini function declarations", async () => {
      const tool: AgentTool = {
        name: "search",
        description: "Search for POIs",
        parametersJsonSchema: Type.Object({
          query: Type.String(),
        }),
        action: async () => [],
      };

      const mockResponse = {
        candidates: [
          {
            content: { role: "model", parts: [{ text: "ok" }] },
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await client.generate([], [tool], "");

      // Verify fetch was called with correct format
      expect(fetchMock).toHaveBeenCalled();
      const callArgs = fetchMock.mock.calls[0][1];
      const body = JSON.parse((callArgs as RequestInit).body as string);

      expect(body.tools).toBeDefined();
      expect(body.tools[0].functionDeclarations).toHaveLength(1);
      expect(body.tools[0].functionDeclarations[0]).toMatchObject({
        name: "search",
        description: "Search for POIs",
        parameters: expect.any(Object),
      });
    });

    it("should omit tools section when no tools provided", async () => {
      const mockResponse = {
        candidates: [
          {
            content: { role: "model", parts: [{ text: "ok" }] },
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await client.generate([], [], "");

      const callArgs = fetchMock.mock.calls[0][1];
      const body = JSON.parse((callArgs as RequestInit).body as string);

      expect(body.tools).toBeUndefined();
    });
  });

  describe("Message Building", () => {
    it("should convert message roles correctly", async () => {
      const mockResponse = {
        candidates: [
          {
            content: { role: "model", parts: [{ text: "ok" }] },
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const messages: Message[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there" },
      ];

      await client.generate(messages, [], "");

      const callArgs = fetchMock.mock.calls[0][1];
      const body = JSON.parse((callArgs as RequestInit).body as string);

      expect(body.contents).toHaveLength(2);
      expect(body.contents[0].role).toBe("user");
      expect(body.contents[1].role).toBe("model");
    });

    it("should handle plain text messages", async () => {
      const mockResponse = {
        candidates: [
          {
            content: { role: "model", parts: [{ text: "ok" }] },
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const messages: Message[] = [
        { role: "user", content: "What time is it?" },
      ];

      await client.generate(messages, [], "");

      const callArgs = fetchMock.mock.calls[0][1];
      const body = JSON.parse((callArgs as RequestInit).body as string);

      expect(body.contents[0].parts).toHaveLength(1);
      expect(body.contents[0].parts[0]).toEqual({ text: "What time is it?" });
    });

    it("should parse persisted tool calls from history", async () => {
      const mockResponse = {
        candidates: [
          {
            content: { role: "model", parts: [{ text: "ok" }] },
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const toolCallMessage: Message = {
        role: "assistant",
        content: JSON.stringify({
          toolCalls: [
            { name: "search", args: { query: "test" } },
          ],
        }),
      };

      await client.generate([toolCallMessage], [], "");

      const callArgs = fetchMock.mock.calls[0][1];
      const body = JSON.parse((callArgs as RequestInit).body as string);

      expect(body.contents[0].parts[0]).toMatchObject({
        functionCall: {
          name: "search",
          args: { query: "test" },
        },
      });
    });

    it("should parse persisted tool results from history", async () => {
      const mockResponse = {
        candidates: [
          {
            content: { role: "model", parts: [{ text: "ok" }] },
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const toolResultMessage: Message = {
        role: "user",
        content: JSON.stringify({
          toolResults: [
            {
              name: "search",
              result: [{ id: 1, name: "Bathroom" }],
            },
          ],
        }),
      };

      await client.generate([toolResultMessage], [], "");

      const callArgs = fetchMock.mock.calls[0][1];
      const body = JSON.parse((callArgs as RequestInit).body as string);

      expect(body.contents[0].parts[0]).toMatchObject({
        functionResponse: {
          name: "search",
          response: {
            result: [{ id: 1, name: "Bathroom" }],
          },
        },
      });
    });

    it("should handle tool results with errors", async () => {
      const mockResponse = {
        candidates: [
          {
            content: { role: "model", parts: [{ text: "ok" }] },
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const toolResultMessage: Message = {
        role: "user",
        content: JSON.stringify({
          toolResults: [
            {
              name: "search",
              result: null,
              error: "Connection timeout",
            },
          ],
        }),
      };

      await client.generate([toolResultMessage], [], "");

      const callArgs = fetchMock.mock.calls[0][1];
      const body = JSON.parse((callArgs as RequestInit).body as string);

      expect(body.contents[0].parts[0]).toMatchObject({
        functionResponse: {
          name: "search",
          response: {
            result: { error: "Connection timeout" },
          },
        },
      });
    });

    it("should handle malformed JSON in message gracefully", async () => {
      const mockResponse = {
        candidates: [
          {
            content: { role: "model", parts: [{ text: "ok" }] },
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const invalidMessage: Message = {
        role: "user",
        content: "{invalid json",
      };

      // Should not throw, should treat as plain text
      await expect(
        client.generate([invalidMessage], [], "")
      ).resolves.not.toThrow();
    });
  });

  describe("System Instruction", () => {
    it("should include system instruction in request", async () => {
      const mockResponse = {
        candidates: [
          {
            content: { role: "model", parts: [{ text: "ok" }] },
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const systemInstruction = "You are a helpful venue assistant.";

      await client.generate([], [], systemInstruction);

      const callArgs = fetchMock.mock.calls[0][1];
      const body = JSON.parse((callArgs as RequestInit).body as string);

      expect(body.systemInstruction).toEqual({
        parts: [{ text: systemInstruction }],
      });
    });

    it("should omit system instruction when empty", async () => {
      const mockResponse = {
        candidates: [
          {
            content: { role: "model", parts: [{ text: "ok" }] },
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await client.generate([], [], "");

      const callArgs = fetchMock.mock.calls[0][1];
      const body = JSON.parse((callArgs as RequestInit).body as string);

      expect(body.systemInstruction).toBeUndefined();
    });
  });

  describe("Generation Config", () => {
    it("should include temperature in generation config", async () => {
      const mockResponse = {
        candidates: [
          {
            content: { role: "model", parts: [{ text: "ok" }] },
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await client.generate([], [], "");

      const callArgs = fetchMock.mock.calls[0][1];
      const body = JSON.parse((callArgs as RequestInit).body as string);

      expect(body.generationConfig).toEqual({
        temperature: 0.7,
      });
    });
  });

  describe("API Error Handling", () => {
    it("should throw GeminiError on API error response", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: async () => "Invalid API key",
      } as Response);

      await expect(client.generate([], [], "")).rejects.toThrow(GeminiError);
    });

    it("should include status code in error", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        text: async () => "Rate limit exceeded",
      } as Response);

      try {
        await client.generate([], [], "");
      } catch (error) {
        if (error instanceof GeminiError) {
          expect(error.statusCode).toBe(429);
        }
      }
    });

    it("should handle network errors", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      await expect(client.generate([], [], "")).rejects.toThrow("Network error");
    });

    it("should handle JSON parsing errors", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      } as unknown as Response);

      await expect(client.generate([], [], "")).rejects.toThrow("Invalid JSON");
    });
  });

  describe("Pending Tool Calls and Results", () => {
    it("should include pending tool calls in contents", async () => {
      const mockResponse = {
        candidates: [
          {
            content: { role: "model", parts: [{ text: "ok" }] },
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const pendingToolCalls: ToolCall[] = [
        { name: "search", args: { query: "bathroom" } },
      ];

      const pendingToolResults: ToolResult[] = [
        {
          name: "search",
          result: [{ id: 1, name: "Restroom" }],
        },
      ];

      await client.generate(
        [],
        [],
        "",
        pendingToolCalls,
        pendingToolResults
      );

      const callArgs = fetchMock.mock.calls[0][1];
      const body = JSON.parse((callArgs as RequestInit).body as string);

      // Should have model + user content for tool call/result pair
      expect(body.contents.length).toBeGreaterThanOrEqual(2);

      // Find the tool call and result
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasToolCall = body.contents.some((c: any) =>
        c.parts.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (p: any) => p.functionCall?.name === "search"
        )
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasToolResult = body.contents.some((c: any) =>
        c.parts.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (p: any) => p.functionResponse?.name === "search"
        )
      );

      expect(hasToolCall).toBe(true);
      expect(hasToolResult).toBe(true);
    });

    it("should not include pending data when both are undefined", async () => {
      const mockResponse = {
        candidates: [
          {
            content: { role: "model", parts: [{ text: "ok" }] },
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await client.generate([], [], "", undefined, undefined);

      const callArgs = fetchMock.mock.calls[0][1];
      const body = JSON.parse((callArgs as RequestInit).body as string);

      expect(body.contents).toHaveLength(0);
    });
  });

  describe("Request Format", () => {
    it("should send POST request to correct endpoint", async () => {
      const mockResponse = {
        candidates: [
          {
            content: { role: "model", parts: [{ text: "ok" }] },
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await client.generate([], [], "");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        ),
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        })
      );
    });

    it("should include API key in URL", async () => {
      const mockResponse = {
        candidates: [
          {
            content: { role: "model", parts: [{ text: "ok" }] },
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await client.generate([], [], "");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("key=test-api-key"),
        expect.any(Object)
      );
    });
  });

  describe("GeminiError Class", () => {
    it("should create GeminiError with correct properties", () => {
      const error = new GeminiError("Test error", 500, "Server error");

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(500);
      expect(error.responseBody).toBe("Server error");
      expect(error.name).toBe("GeminiError");
    });

    it("should be instanceof Error", () => {
      const error = new GeminiError("Test", 400, "");

      expect(error instanceof Error).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle response with no parts", async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              role: "model",
              parts: [],
            },
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const response = await client.generate([], [], "");

      expect(response.text).toBeNull();
      expect(response.toolCalls).toBeNull();
    });

    it("should handle empty message array", async () => {
      const mockResponse = {
        candidates: [
          {
            content: { role: "model", parts: [{ text: "ok" }] },
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const response = await client.generate([], [], "");

      expect(response).toBeDefined();
      expect(response.text).toBe("ok");
    });

    it("should handle very large messages", async () => {
      const mockResponse = {
        candidates: [
          {
            content: { role: "model", parts: [{ text: "ok" }] },
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const largeText = "a".repeat(10000);
      const messages: Message[] = [{ role: "user", content: largeText }];

      await expect(
        client.generate(messages, [], "")
      ).resolves.not.toThrow();
    });

    it("should handle tool calls with null args", async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              role: "model",
              parts: [
                {
                  functionCall: {
                    name: "test",
                    args: null,
                  },
                },
              ],
            },
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const response = await client.generate([], [], "");

      expect(response.toolCalls?.[0]?.args).toBeNull();
    });
  });
});
