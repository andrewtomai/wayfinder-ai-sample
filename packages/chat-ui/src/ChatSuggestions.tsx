import styles from "./ChatInput.module.css";

interface ChatSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export function ChatSuggestions({
  suggestions,
  onSelect,
}: ChatSuggestionsProps) {
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
