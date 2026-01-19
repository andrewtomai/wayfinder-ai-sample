import { useState, useRef, useEffect } from "react";
import styles from "./ChatInput.module.css";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// Send icon SVG component
function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  );
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = "Ask about the venue...",
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (trimmed && !disabled) {
      onSendMessage(trimmed);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  return (
    <div className={styles.chatInputArea}>
      <div className={styles.chatInputWrapper}>
        <textarea
          ref={textareaRef}
          className={styles.chatInput}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          aria-label="Chat message input"
        />
        <button
           className={styles.chatSendButton}
           onClick={handleSubmit}
           disabled={!input.trim() || disabled}
           aria-label="Send message"
           type="button"
         >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}

interface ChatSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export function ChatSuggestions({ suggestions, onSelect }: ChatSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className={styles.chatSuggestions}>
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          className={styles.chatSuggestion}
          onClick={() => onSelect(suggestion)}
          type="button"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
