import { useState, type FormEvent, type KeyboardEvent } from 'react';

interface Props {
  onSend: (text: string) => boolean;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled = false }: Props) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    const sent = onSend(trimmed);
    if (sent) setText('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <form className="msg-input-form" onSubmit={handleSubmit} aria-label="Send a message">
      <input
        className="msg-input-field"
        type="text"
        placeholder="Type a message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={1000}
        disabled={disabled}
        aria-label="Message text"
        autoComplete="off"
      />
      <button
        type="submit"
        className="msg-send-btn"
        disabled={disabled || !text.trim()}
        aria-label="Send message"
      >
        {/* Lucide "send" icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </form>
  );
}
