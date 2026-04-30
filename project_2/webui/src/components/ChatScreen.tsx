import type { ServerMessage, ConnectionStatus } from '../types';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { StatusIndicator } from './StatusIndicator';

interface Props {
  callsign: string;
  messages: ServerMessage[];
  connectionStatus: ConnectionStatus;
  onSend: (text: string) => boolean;
  onLeave: () => void;
  onReconnect: () => void;
}

export function ChatScreen({
  callsign,
  messages,
  connectionStatus,
  onSend,
  onLeave,
  onReconnect,
}: Props) {
  const canSend = connectionStatus === 'connected';

  return (
    <div className="chat-screen">
      {/* Header */}
      <header className="chat-header">
        <div className="header-left">
          <button className="back-btn" onClick={onLeave} aria-label="Leave chat">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <svg
            className="header-chat-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="header-title">Anonymous Chat</span>
        </div>
        <div className="header-right">
          <StatusIndicator status={connectionStatus} />
        </div>
      </header>

      {/* Messages */}
      <main className="chat-main">
        <MessageList messages={messages} ownCallsign={callsign} />
      </main>

      {/* Input bar */}
      <div className="input-bar" role="region" aria-label="Message input">
        <div className="input-bar-inner">
          {connectionStatus === 'lost' ? (
            <div className="reconnect-banner">
              <span>Connection lost after multiple retries.</span>
              <button className="reconnect-btn" onClick={onReconnect}>
                Reconnect
              </button>
            </div>
          ) : (
            <MessageInput onSend={onSend} disabled={!canSend} />
          )}
        </div>
      </div>
    </div>
  );
}
