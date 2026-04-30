import type { ConnectionStatus } from '../types';

interface Props {
  status: ConnectionStatus;
}

const CONFIG: Record<ConnectionStatus, { dotClass: string; label: string }> = {
  connecting:    { dotClass: 'status-dot--connecting',    label: 'Connecting…'      },
  connected:     { dotClass: 'status-dot--connected',     label: 'Connected'        },
  disconnected:  { dotClass: 'status-dot--disconnected',  label: 'Disconnected'     },
  reconnecting:  { dotClass: 'status-dot--reconnecting',  label: 'Reconnecting…'    },
  lost:          { dotClass: 'status-dot--lost',          label: 'Connection lost'  },
};

export function StatusIndicator({ status }: Props) {
  const { dotClass, label } = CONFIG[status];
  return (
    <div
      className="status-indicator"
      data-status={status}
      role="status"
      aria-live="polite"
      aria-label={`Connection status: ${label}`}
    >
      <span className={`status-dot ${dotClass}`} aria-hidden="true" />
      <span className="status-text">{label}</span>
    </div>
  );
}
