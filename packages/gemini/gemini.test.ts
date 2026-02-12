/**
 * GeminiClient Tests
 *
 * Tests for the Gemini API client implementation.
 * Verifies that the client correctly translates between provider-agnostic types
 * and Gemini-specific formats, handles tool definitions, and parses responses.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { GeminiClient, GeminiError } from "./gemini";
import type { AgentTool, Message } from "@core/agent";
import { Type } from "typebox";

// Mock the logger to avoid console noise during tests
vi.mock("@core/logger", () => ({
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
         { role: "user", type: "user_input", content: "Where is the bathroom?" },
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
         { role: "user", type: "user_input", content: "Hello" },
         { role: "assistant", type: "assistant_response", content: "Hi there" },
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
         { role: "user", type: "user_input", content: "What time is it?" },
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
         type: "tool_calls",
         content: [
           { name: "search", args: { query: "test" } },
         ],
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
         type: "tool_results",
         content: [
           {
             name: "search",
             result: [{ id: 1, name: "Bathroom" }],
           },
         ],
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
         type: "tool_results",
         content: [
           {
             name: "search",
             result: null,
             error: "Connection timeout",
           },
         ],
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
         type: "user_input",
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

  describe("Tool Calls and Results in Message History", () => {
    it("should include tool calls from message history in contents", async () => {
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
         { role: "user", type: "user_input", content: "Find bathrooms" },
         {
           role: "assistant",
           type: "tool_calls",
           content: [{ name: "search", args: { query: "bathroom" } }],
         },
       ];

      await client.generate(messages, [], "");

      const callArgs = fetchMock.mock.calls[0][1];
      const body = JSON.parse((callArgs as RequestInit).body as string);

      // Should have the user message + assistant message with tool call
      expect(body.contents.length).toBeGreaterThanOrEqual(2);

      // Find the tool call
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasToolCall = body.contents.some((c: any) =>
        c.parts.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (p: any) => p.functionCall?.name === "search"
        )
      );

      expect(hasToolCall).toBe(true);
    });

    it("should include tool results from message history in contents", async () => {
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
         { role: "user", type: "user_input", content: "Find bathrooms" },
         {
           role: "assistant",
           type: "tool_calls",
           content: [{ name: "search", args: { query: "bathroom" } }],
         },
         {
           role: "user",
           type: "tool_results",
           content: [
             {
               name: "search",
               result: [{ id: 1, name: "Restroom" }],
             },
           ],
         },
       ];

      await client.generate(messages, [], "");

      const callArgs = fetchMock.mock.calls[0][1];
      const body = JSON.parse((callArgs as RequestInit).body as string);

      // Find the tool result
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasToolResult = body.contents.some((c: any) =>
        c.parts.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (p: any) => p.functionResponse?.name === "search"
        )
      );

      expect(hasToolResult).toBe(true);
    });

    it("should handle empty message history", async () => {
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
       const messages: Message[] = [{ role: "user", type: "user_input", content: largeText }];

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

  // ============================================================================
  // Thought Signature Tests
  // ============================================================================

  describe("Thought Signature Support", () => {
    describe("Signature Extraction", () => {
      it("should extract thoughtSignature from function call response", async () => {
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
                    thoughtSignature: "encrypted-signature-token-abc123",
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
        expect(response.toolCalls?.[0]?.thoughtSignature).toBe(
          "encrypted-signature-token-abc123"
        );
      });

      it("should handle function calls without thoughtSignature (backward compatibility)", async () => {
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
                    // No thoughtSignature field
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
        expect(response.toolCalls?.[0]?.thoughtSignature).toBeUndefined();
      });

      it("should extract signature from first call only in parallel function calls", async () => {
        // Per Gemini API: only the first function call has a signature in parallel calls
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
                    thoughtSignature: "first-call-signature",
                  },
                  {
                    functionCall: {
                      name: "getPOIDetails",
                      args: { poiId: 123 },
                    },
                    // No signature on second parallel call
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
        expect(response.toolCalls?.[0]?.thoughtSignature).toBe("first-call-signature");
        expect(response.toolCalls?.[1]?.thoughtSignature).toBeUndefined();
      });
    });

    describe("Signature Re-injection", () => {
      it("should include thoughtSignature when building request from tool_calls message", async () => {
        const mockResponse = {
          candidates: [
            {
              content: { role: "model", parts: [{ text: "Here are the results" }] },
            },
          ],
        };

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const messages: Message[] = [
          { role: "user", type: "user_input", content: "Find coffee shops" },
          {
            role: "assistant",
            type: "tool_calls",
            content: [
              {
                name: "search",
                args: { query: "coffee" },
                thoughtSignature: "preserved-signature-xyz",
              },
            ],
          },
          {
            role: "user",
            type: "tool_results",
            content: [
              { name: "search", result: [{ id: 1, name: "Starbucks" }] },
            ],
          },
        ];

        await client.generate(messages, [], "");

        const callArgs = fetchMock.mock.calls[0][1];
        const body = JSON.parse((callArgs as RequestInit).body as string);

        // Find the tool call content
        const toolCallContent = body.contents.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (c: any) => c.parts.some((p: any) => p.functionCall)
        );

        expect(toolCallContent).toBeDefined();
        expect(toolCallContent.parts[0].thoughtSignature).toBe("preserved-signature-xyz");
      });

      it("should not include thoughtSignature field when absent from ToolCall", async () => {
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
          {
            role: "assistant",
            type: "tool_calls",
            content: [
              {
                name: "search",
                args: { query: "coffee" },
                // No thoughtSignature
              },
            ],
          },
        ];

        await client.generate(messages, [], "");

        const callArgs = fetchMock.mock.calls[0][1];
        const body = JSON.parse((callArgs as RequestInit).body as string);

        const toolCallPart = body.contents[0].parts[0];
        expect(toolCallPart.functionCall).toBeDefined();
        expect(toolCallPart.thoughtSignature).toBeUndefined();
      });
    });

    describe("Round-Trip Tests", () => {
      it("should preserve signature through extract -> store -> re-inject cycle", async () => {
        const originalSignature = "round-trip-signature-test-12345";

        // Step 1: API returns tool call with signature
        const extractResponse = {
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
                    thoughtSignature: originalSignature,
                  },
                ],
              },
              finishReason: "TOOL_CALL",
            },
          ],
        };

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => extractResponse,
        } as Response);

        // Extract the tool call
        const messages1: Message[] = [
          { role: "user", type: "user_input", content: "Find bathrooms" },
        ];
        const response1 = await client.generate(messages1, [], "");

        // Verify extraction
        expect(response1.toolCalls?.[0]?.thoughtSignature).toBe(originalSignature);

        // Step 2: Re-inject by including in next request
        const finalResponse = {
          candidates: [
            {
              content: {
                role: "model",
                parts: [{ text: "The bathroom is on floor 2" }],
              },
              finishReason: "STOP",
            },
          ],
        };

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => finalResponse,
        } as Response);

        // Build next request with the stored tool call (including signature)
        const messages2: Message[] = [
          { role: "user", type: "user_input", content: "Find bathrooms" },
          {
            role: "assistant",
            type: "tool_calls",
            content: response1.toolCalls!, // Includes signature
          },
          {
            role: "user",
            type: "tool_results",
            content: [{ name: "search", result: [{ id: 1, name: "Restroom" }] }],
          },
        ];

        await client.generate(messages2, [], "");

        // Verify signature was re-injected in the request
        const callArgs = fetchMock.mock.calls[1][1];
        const body = JSON.parse((callArgs as RequestInit).body as string);

        const toolCallContent = body.contents.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (c: any) => c.parts.some((p: any) => p.functionCall)
        );

        expect(toolCallContent.parts[0].thoughtSignature).toBe(originalSignature);
      });
    });

    describe("Multi-Turn Conversations", () => {
      it("should preserve signatures across multiple turns", async () => {
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

        // Multi-turn conversation with multiple tool calls
        const messages: Message[] = [
          { role: "user", type: "user_input", content: "Find coffee" },
          {
            role: "assistant",
            type: "tool_calls",
            content: [
              { name: "search", args: { query: "coffee" }, thoughtSignature: "sig-turn-1" },
            ],
          },
          {
            role: "user",
            type: "tool_results",
            content: [{ name: "search", result: [{ id: 1 }] }],
          },
          { role: "assistant", type: "assistant_response", content: "Found some options" },
          { role: "user", type: "user_input", content: "Get details on the first one" },
          {
            role: "assistant",
            type: "tool_calls",
            content: [
              { name: "getDetails", args: { poiId: 1 }, thoughtSignature: "sig-turn-2" },
            ],
          },
          {
            role: "user",
            type: "tool_results",
            content: [{ name: "getDetails", result: { name: "Starbucks" } }],
          },
        ];

        await client.generate(messages, [], "");

        const callArgs = fetchMock.mock.calls[0][1];
        const body = JSON.parse((callArgs as RequestInit).body as string);

        // Find all tool call contents
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolCallContents = body.contents.filter((c: any) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          c.parts.some((p: any) => p.functionCall)
        );

        expect(toolCallContents).toHaveLength(2);
        expect(toolCallContents[0].parts[0].thoughtSignature).toBe("sig-turn-1");
        expect(toolCallContents[1].parts[0].thoughtSignature).toBe("sig-turn-2");
      });
    });

    describe("Parallel Function Calls with Signatures", () => {
      it("should preserve signature on first call only when re-injecting parallel calls", async () => {
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

        // Message with parallel tool calls - only first has signature
        const messages: Message[] = [
          {
            role: "assistant",
            type: "tool_calls",
            content: [
              { name: "search", args: { query: "coffee" }, thoughtSignature: "parallel-sig" },
              { name: "getDetails", args: { poiId: 1 } }, // No signature
            ],
          },
        ];

        await client.generate(messages, [], "");

        const callArgs = fetchMock.mock.calls[0][1];
        const body = JSON.parse((callArgs as RequestInit).body as string);

        const parts = body.contents[0].parts;
        expect(parts[0].thoughtSignature).toBe("parallel-sig");
        expect(parts[1].thoughtSignature).toBeUndefined();
      });
    });
  });
});
