/**
 * Message type for chat UI components
 * Compatible with AgentMessage from @core/agent
 */
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}
