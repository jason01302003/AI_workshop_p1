import { useEffect, useRef } from 'react';
import type { ServerMessage } from '../types';
import { MessageItem } from './MessageItem';

interface Props {
  messages: ServerMessage[];
  ownCallsign: string;
}

export function MessageList({ messages, ownCallsign }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="msg-list" role="log" aria-label="Chat messages" aria-live="polite">
      <div className="msg-list-inner">
        {messages.length === 0 && (
          <p className="msg-empty">No messages yet. Say hello! 👋</p>
        )}
        {messages.map((msg, idx) => (
          <MessageItem key={idx} message={msg} ownCallsign={ownCallsign} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
