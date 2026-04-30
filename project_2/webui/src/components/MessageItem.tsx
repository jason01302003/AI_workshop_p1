import type { ServerMessage } from '../types';

interface Props {
  message: ServerMessage;
  ownCallsign: string;
}

const USER_COLORS = [
  '#3B82F6', // blue
  '#A78BFA', // purple
  '#34D399', // emerald
  '#F59E0B', // amber
  '#F472B6', // pink
  '#60A5FA', // sky
  '#FB923C', // orange
];

function colorForCallsign(callsign: string): string {
  let hash = 0;
  for (let i = 0; i < callsign.length; i++) {
    hash = (callsign.charCodeAt(i) + ((hash << 5) - hash)) | 0;
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function MessageItem({ message, ownCallsign }: Props) {
  if (message.type === 'system') {
    const verb = message.event === 'user_joined' ? 'joined' : 'left';
    return (
      <div className="msg-system" aria-label={`${message.callsign} ${verb} the chat`}>
        <span>
          {message.callsign} {verb} the chat
        </span>
      </div>
    );
  }

  const isOwn = message.callsign === ownCallsign;
  const nameColor = isOwn ? '#DBEAFE' : colorForCallsign(message.callsign);
  const displayName = isOwn ? 'You' : message.callsign;
  const time = formatTime(message.timestamp);

  return (
    <div className={`msg-row ${isOwn ? 'msg-row--own' : 'msg-row--other'}`}>
      <div className={`msg-bubble ${isOwn ? 'msg-bubble--own' : 'msg-bubble--other'}`}>
        <span className="msg-name" style={{ color: nameColor }}>
          {displayName}
        </span>
        <p className="msg-text">{message.text}</p>
        {time && (
          <span className={`msg-time ${isOwn ? 'msg-time--own' : ''}`}>{time}</span>
        )}
      </div>
    </div>
  );
}
