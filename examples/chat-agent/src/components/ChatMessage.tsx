import ReactMarkdown from "react-markdown";
import styles from "./ChatMessage.module.css";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div className={`${styles.chatMessage} ${styles[message.role]}`}>
      <div className={styles.chatMessageContent}>
        {message.role === "assistant" ? (
          <ReactMarkdown>{message.content}</ReactMarkdown>
        ) : (
          message.content
        )}
      </div>
      <span className={styles.chatMessageTime}>
        {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className={styles.typingIndicator}>
      <span></span>
      <span></span>
      <span></span>
    </div>
  );
}
