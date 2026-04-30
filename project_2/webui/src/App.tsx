import { useState, useEffect } from 'react';
import { JoinScreen } from './components/JoinScreen';
import { ChatScreen } from './components/ChatScreen';
import { useWebSocket } from './hooks/useWebSocket';
import './styles/index.css';

type Screen = 'join' | 'chat';

export default function App() {
  const [screen, setScreen] = useState<Screen>('join');
  const [callsign, setCallsign] = useState('');

  const {
    connectionStatus,
    messages,
    connectError,
    connect,
    disconnect,
    sendMessage,
    manualReconnect,
  } = useWebSocket();

  // Transition to chat as soon as the socket opens
  useEffect(() => {
    if (connectionStatus === 'connected' && screen === 'join') {
      setScreen('chat');
    }
  }, [connectionStatus, screen]);

  const handleJoin = (cs: string) => {
    setCallsign(cs);
    connect(cs);
  };

  const handleLeave = () => {
    disconnect();
    setScreen('join');
    setCallsign('');
  };

  if (screen === 'chat') {
    return (
      <ChatScreen
        callsign={callsign}
        messages={messages}
        connectionStatus={connectionStatus}
        onSend={sendMessage}
        onLeave={handleLeave}
        onReconnect={manualReconnect}
      />
    );
  }

  return (
    <JoinScreen
      onJoin={handleJoin}
      connectionStatus={connectionStatus}
      error={connectError}
    />
  );
}
