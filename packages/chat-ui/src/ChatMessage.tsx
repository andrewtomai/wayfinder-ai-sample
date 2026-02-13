import ReactMarkdown from "react-markdown";
import type { Message } from "./types";
import styles from "./ChatMessage.module.css";

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
        {message.timestamp.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}
