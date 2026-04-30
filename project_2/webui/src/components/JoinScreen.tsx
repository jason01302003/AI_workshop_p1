import { useState, type FormEvent } from 'react';
import type { ConnectionStatus } from '../types';

interface Props {
  onJoin: (callsign: string) => void;
  connectionStatus: ConnectionStatus;
  error: string | null;
}

const CALLSIGN_RE = /^[a-zA-Z0-9_]{1,20}$/;

export function JoinScreen({ onJoin, connectionStatus, error }: Props) {
  const [value, setValue] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!CALLSIGN_RE.test(trimmed)) {
      setLocalError('1–20 characters: letters, numbers, and underscores only.');
      return;
    }
    setLocalError('');
    onJoin(trimmed);
  };

  const isConnecting = connectionStatus === 'connecting';
  const displayError = localError || error;

  return (
    <div className="join-screen">
      <div className="join-card">
        {/* Icon */}
        <div className="join-icon-wrap" aria-hidden="true">
          <svg
            className="join-icon-svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>

        <h1 className="join-title">Anonymous Chat</h1>
        <p className="join-subtitle">Join the conversation anonymously</p>

        <form className="join-form" onSubmit={handleSubmit} noValidate>
          <div className="input-group">
            <label htmlFor="callsign" className="input-label">
              Callsign
            </label>
            <input
              id="callsign"
              className={`input-field${displayError ? ' input-field--error' : ''}`}
              type="text"
              placeholder="Enter your callsign..."
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (localError) setLocalError('');
              }}
              maxLength={20}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck="false"
              disabled={isConnecting}
              aria-describedby={displayError ? 'callsign-error' : 'callsign-hint'}
              aria-invalid={!!displayError}
            />
            {displayError ? (
              <p id="callsign-error" className="input-error" role="alert">
                {displayError}
              </p>
            ) : (
              <p id="callsign-hint" className="input-hint">
                Letters, numbers, and underscores only (max 20 chars)
              </p>
            )}
          </div>

          <button
            type="submit"
            className="join-btn"
            disabled={isConnecting || value.trim().length === 0}
          >
            {isConnecting ? 'Connecting…' : 'Join Chat'}
          </button>
        </form>

        <div className="join-status-row">
          <span className="status-dot status-dot--ready" aria-hidden="true" />
          <span className="join-status-label">Ready to connect</span>
        </div>
      </div>
    </div>
  );
}
