/**
 * Gemini API Client
 *
 * Implements the IAIClient interface for Google Gemini API.
 * Handles all Gemini-specific translation and communication.
 */

import type {
  AgentTool,
  Message,
  ToolCall,
  ToolResult,
  GenerateResponse,
} from "../agent/types";
import type { IAIClient } from "../agent/IAIClient";
import logger from "../utils/logger";

// ============================================================================
// Constants
// ============================================================================

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-2.0-flash";

// ============================================================================
// Gemini-Specific Types (internal)
// ============================================================================

interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: object;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: { result: unknown } } };

interface GeminiResponse {
  candidates: Array<{
    content: GeminiContent;
    finishReason: string;
  }>;
}

interface GeminiGenerateRequest {
  contents: GeminiContent[];
  tools?: Array<{
    functionDeclarations: GeminiFunctionDeclaration[];
  }>;
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
  generationConfig?: {
    temperature?: number;
  };
}

// ============================================================================
// Gemini Client Class
// ============================================================================

export class GeminiClient implements IAIClient {
  private apiKey: string;
  private model: string;
  private temperature: number;

  constructor() {
    this.apiKey =
      (import.meta.env.VITE_AI_CLIENT_API_KEY as string | undefined) ?? "";
    this.model =
      (import.meta.env.VITE_AI_CLIENT_MODEL as string | undefined) ??
      DEFAULT_MODEL;
    this.temperature =
      parseFloat(import.meta.env.VITE_AI_CLIENT_TEMPERATURE as string) ?? 0.7;

    if (!this.apiKey) {
      console.warn(
        "AI client API key not configured. Set VITE_AI_CLIENT_API_KEY in your .env file.",
      );
    }
  }

  /**
   * Generate a response from the model
   */
  async generate(
    messages: Message[],
    tools: AgentTool[],
    systemInstruction: string,
    pendingToolCalls?: ToolCall[],
    pendingToolResults?: ToolResult[],
  ): Promise<GenerateResponse> {
    const contents = this.buildContents(
      messages,
      pendingToolCalls,
      pendingToolResults,
    );
    const functionDeclarations = this.toFunctionDeclarations(tools);

    const request: GeminiGenerateRequest = {
      contents,
      generationConfig: {
        temperature: this.temperature,
      },
    };

    if (functionDeclarations.length > 0) {
      request.tools = [{ functionDeclarations }];
    }

    if (systemInstruction) {
      request.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const url = `${GEMINI_BASE_URL}/models/${this.model}:generateContent?key=${this.apiKey}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          `Gemini API error ${response.status}: ${response.statusText}`,
          { statusCode: response.status, error: errorText.slice(0, 200) },
        );
        throw new GeminiError(
          `Gemini API error: ${response.status} ${response.statusText}`,
          response.status,
          errorText,
        );
      }

      const geminiResponse: GeminiResponse = await response.json();
      return this.parseResponse(geminiResponse);
    } catch (error) {
      if (error instanceof GeminiError) {
        throw error; // Already logged above
      }
      logger.error(
        `Gemini request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Convert agent tools to Gemini function declarations
   */
  private toFunctionDeclarations(
    tools: AgentTool[],
  ): GeminiFunctionDeclaration[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parametersJsonSchema,
    }));
  }

  /**
   * Build Gemini contents from messages and pending tool interactions
   */
  private buildContents(
    messages: Message[],
    pendingToolCalls?: ToolCall[],
    pendingToolResults?: ToolResult[],
  ): GeminiContent[] {
    const contents: GeminiContent[] = messages.map((msg) => {
      const role = msg.role === "user" ? "user" : "model";

      // Only parse JSON if it looks like a tool message (starts with { and contains toolCalls/toolResults)
      if (msg.content.startsWith("{")) {
        try {
          const parsed = JSON.parse(msg.content);

          // Handle tool calls persisted in history
          if (parsed.toolCalls && Array.isArray(parsed.toolCalls)) {
            const parts: GeminiPart[] = parsed.toolCalls.map(
              (tc: ToolCall) => ({
                functionCall: { name: tc.name, args: tc.args },
              }),
            );
            return { role: role as "user" | "model", parts };
          }

          // Handle tool results persisted in history
          if (parsed.toolResults && Array.isArray(parsed.toolResults)) {
            const parts: GeminiPart[] = parsed.toolResults.map(
              (tr: ToolResult) => ({
                functionResponse: {
                  name: tr.name,
                  response: {
                    result: tr.error ? { error: tr.error } : tr.result,
                  },
                },
              }),
            );
            return { role: role as "user" | "model", parts };
          }
        } catch {
          // Log warning if JSON parsing fails
          logger.warn(
            `Failed to parse tool message as JSON: ${msg.content.slice(0, 50)}...`,
          );
          // Fall through to plain text handling below
        }
      }

      // Treat as plain text message (regular user/assistant messages)
      return { role, parts: [{ text: msg.content }] };
    });

    // Add pending tool calls and results if present
    if (pendingToolCalls && pendingToolResults) {
      for (let i = 0; i < pendingToolCalls.length; i++) {
        const tc = pendingToolCalls[i];
        const tr = pendingToolResults[i];

        // Model's function call
        contents.push({
          role: "model",
          parts: [{ functionCall: { name: tc.name, args: tc.args } }],
        });

        // Function response
        contents.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name: tr.name,
                response: {
                  result: tr.error ? { error: tr.error } : tr.result,
                },
              },
            },
          ],
        });
      }
    }

    return contents;
  }

  /**
   * Parse Gemini response into provider-agnostic format
   */
  private parseResponse(response: GeminiResponse): GenerateResponse {
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      return { text: null, toolCalls: null };
    }

    let text: string | null = null;
    const toolCalls: ToolCall[] = [];

    for (const part of parts) {
      if ("text" in part) {
        text = part.text;
      } else if ("functionCall" in part) {
        toolCalls.push({
          name: part.functionCall.name,
          args: part.functionCall.args,
        });
      }
    }

    return {
      text,
      toolCalls: toolCalls.length > 0 ? toolCalls : null,
    };
  }
}

// ============================================================================
// Custom error class for Gemini API errors
// ============================================================================

export class GeminiError extends Error {
  statusCode: number;
  responseBody: string;

  constructor(message: string, statusCode: number, responseBody: string) {
    super(message);
    this.name = "GeminiError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}
