/**
 * Gemini API Client
 *
 * Implements the IAIClient interface for Google Gemini API.
 * Handles all Gemini-specific translation and communication.
 *
 * ## Thought Signature Support
 *
 * This client supports thought signatures for Gemini 3+ models. Thought signatures
 * are encrypted tokens representing the model's internal reasoning that must be:
 *
 * 1. **Extracted** from API responses (in `parseResponse`)
 * 2. **Stored** in ToolCall objects via the `thoughtSignature` field
 * 3. **Re-injected** into subsequent API requests (in `buildContents`)
 *
 * ### Gemini Model Differences:
 * - **Gemini 3 (Pro/Flash)**: Signatures are MANDATORY on function calls. The first
 *   function call part in each step of the current turn must include its signature.
 *   Omitting a signature triggers a 400 error.
 * - **Gemini 2.5**: Signatures are optional and behavior differs (see Thinking docs).
 *
 * ### Signature Rules:
 * - For sequential function calls: each call has its own signature
 * - For parallel function calls: only the FIRST call has a signature
 * - Signatures are valid for exactly ONE turn (single exchange with the user)
 * - Each new user message starts a new turn; previous turn signatures must still
 *   be preserved in history, but new signatures will be generated for new calls
 *
 * ### Error Handling:
 * - 400 errors with "thought_signature" in the message indicate missing/invalid signatures
 * - The client logs detailed error info to help debug signature issues
 */

import type {
  AgentTool,
  Message,
  ToolCall,
  GenerateResponse,
} from "@core/agent";
import type { IAIClient } from "@core/agent";
import logger from "@core/logger";

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
  | { text: string; thoughtSignature?: string }
  | {
      functionCall: { name: string; args: Record<string, unknown> };
      thoughtSignature?: string;
    }
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
    return this.generateWithRetry(messages, tools, systemInstruction, 0);
  }

  /**
   * Generate with retry logic for malformed function calls
   */
  private async generateWithRetry(
    messages: Message[],
    tools: AgentTool[],
    systemInstruction: string,
    retryCount: number,
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

      // Check for MALFORMED_FUNCTION_CALL and retry once
      const finishReason = geminiResponse.candidates?.[0]?.finishReason;
      if (finishReason === "MALFORMED_FUNCTION_CALL" && retryCount === 0) {
        logger.error("Gemini returned MALFORMED_FUNCTION_CALL, retrying...", {
          finishReason,
        });
        return this.generateWithRetry(
          messages,
          tools,
          systemInstruction,
          retryCount + 1,
        );
      }

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
   *
   * For tool calls, re-injects thought signatures into the Gemini-specific format.
   * Signatures must be preserved exactly as received - they are opaque tokens that
   * the API uses to validate function calls on Gemini 3+ models.
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
            thoughtSignature: tc.thoughtSignature,
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
   *
   * Extracts thought signatures from function call parts when present.
   * For Gemini 3+ models, the first function call in each step must have a signature.
   * For parallel function calls, only the first call will have a signature per Gemini API rules.
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
          thoughtSignature: part.thoughtSignature,
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
