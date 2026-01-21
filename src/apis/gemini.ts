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
  ): Promise<GenerateResponse> {
    const contents = this.buildContents(messages);
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
   * Build Gemini contents from messages
   *
   * Converts the agent's message history (including tool calls and results)
   * to Gemini's content format. Uses discriminated unions to determine message type.
   */
  private buildContents(messages: Message[]): GeminiContent[] {
    return messages.map((msg) => {
      const role = msg.role === "user" ? "user" : "model";

      switch (msg.type) {
        case "user_input":
        case "assistant_response":
          // Plain text messages
          return { role, parts: [{ text: msg.content }] };

        case "tool_calls": {
          // Tool calls from assistant
          const toolCallParts: GeminiPart[] = msg.content.map((tc) => ({
            functionCall: { name: tc.name, args: tc.args },
          }));
          return { role: role as "user" | "model", parts: toolCallParts };
        }

        case "tool_results": {
          // Tool results from execution
          const toolResultParts: GeminiPart[] = msg.content.map((tr) => ({
            functionResponse: {
              name: tr.name,
              response: {
                result: tr.error ? { error: tr.error } : tr.result,
              },
            },
          }));
          return { role: role as "user" | "model", parts: toolResultParts };
        }
      }
    });
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
