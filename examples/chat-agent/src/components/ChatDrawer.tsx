import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage, TypingIndicator } from "./ChatMessage";
import { ChatInput, ChatSuggestions } from "./ChatInput";
import type { Message } from "./ChatMessage";
import { Agent } from "@core/agent";
import type { AgentConfig } from "@core/agent";
import { GeminiClient } from "@core/gemini";
import {
  search,
  getPOIDetails,
  getBuildingsAndLevels,
  getCategories,
  showPOI,
  showDirections,
  getSecurityWaitTimes,
} from "../tools";
import { buildSystemInstruction, MAX_ITERATIONS } from "../prompts";
import styles from "./ChatDrawer.module.css";

// Initialize the agent once with full configuration
const agentConfig: AgentConfig = {
  client: new GeminiClient(),
  tools: [search, getPOIDetails, getBuildingsAndLevels, getCategories, showPOI, showDirections, getSecurityWaitTimes],
  buildSystemInstruction,
  maxIterations: MAX_ITERATIONS,
};
const agent = new Agent(agentConfig);

export function ChatDrawer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Call the AI agent
      const result = await agent.chat(content);

      const assistantMessage: Message = {
        id: result.message.id,
        role: "assistant",
        content: result.message.content,
        timestamp: result.message.timestamp,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Agent error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";

      // Add error message to chat
      const errorAssistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `I'm sorry, I encountered an error: ${errorMessage}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorAssistantMessage]);
    } finally {
      setIsTyping(false);
    }
  }, []);

  const handleSuggestionSelect = useCallback(
    (suggestion: string) => {
      handleSendMessage(suggestion);
    },
    [handleSendMessage],
  );

  const showEmptyState = messages.length === 0 && !isTyping;

  return (
    <div className={styles.chatDrawer}>
      <div className={styles.chatHeader}>
        <h2>Venue Assistant</h2>
        <p>Ask me about locations, directions, and amenities</p>
      </div>

      <div className={styles.chatMessages}>
        {showEmptyState ? (
          <div className={styles.chatEmptyState}>
            <svg
              className={styles.chatEmptyIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <h3>Welcome to Venue Assistant</h3>
            <p>
              Ask me anything about this venue - find locations, get directions,
              or discover amenities.
            </p>
            <ChatSuggestions
              suggestions={[
                "Where can I get a snack?",
                "Get directions to my gate",
                "Find coffee shops nearby",
              ]}
              onSelect={handleSuggestionSelect}
            />
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} />
    </div>
  );
}
