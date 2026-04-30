import { useRef, useState, useCallback, useEffect } from 'react';
import type { ServerMessage, ConnectionStatus } from '../types';
import { WS_ENDPOINT } from '../config';

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 30000;

export interface UseWebSocketReturn {
  connectionStatus: ConnectionStatus;
  messages: ServerMessage[];
  connectError: string | null;
  connect: (callsign: string) => void;
  disconnect: () => void;
  sendMessage: (text: string) => boolean;
  manualReconnect: () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const callsignRef = useRef('');
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalRef = useRef(false);
  const everConnectedRef = useRef(false);

  // Stable ref to openWs so ws.onclose can call it recursively without stale closures
  const openWsRef = useRef<(callsign: string) => void>(() => {});

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<ServerMessage[]>([]);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Reassigned every render so closures always get the latest version via the ref
  openWsRef.current = (callsign: string) => {
    const ws = new WebSocket(`${WS_ENDPOINT}?callsign=${encodeURIComponent(callsign)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      everConnectedRef.current = true;
      retryCountRef.current = 0;
      setConnectError(null);
      setStatus('connected');
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as ServerMessage;
        setMessages((prev) => [...prev, data]);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      if (intentionalRef.current) return;

      if (!everConnectedRef.current) {
        // Connection was rejected before it ever opened (e.g. bad callsign → 400)
        setStatus('disconnected');
        setConnectError('Connection failed. Check your callsign and try again.');
        return;
      }

      if (retryCountRef.current >= MAX_RETRIES) {
        setStatus('lost');
        return;
      }

      const delay = Math.min(BASE_DELAY_MS * 2 ** retryCountRef.current, MAX_DELAY_MS);
      retryCountRef.current += 1;
      setStatus('reconnecting');

      retryTimerRef.current = setTimeout(() => {
        openWsRef.current(callsignRef.current);
      }, delay);
    };

    ws.onerror = () => {
      // onclose fires right after; logging only
      console.error('[ws] error');
    };
  };

  const clearTimer = useCallback(() => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(
    (callsign: string) => {
      clearTimer();
      intentionalRef.current = true;
      wsRef.current?.close();
      intentionalRef.current = false;

      callsignRef.current = callsign;
      retryCountRef.current = 0;
      everConnectedRef.current = false;
      setMessages([]);
      setConnectError(null);
      setStatus('connecting');
      openWsRef.current(callsign);
    },
    [clearTimer],
  );

  const disconnect = useCallback(() => {
    clearTimer();
    intentionalRef.current = true;
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('disconnected');
  }, [clearTimer]);

  const sendMessage = useCallback((text: string): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'sendMessage', text }));
      return true;
    }
    return false;
  }, []);

  const manualReconnect = useCallback(() => {
    clearTimer();
    retryCountRef.current = 0;
    everConnectedRef.current = true; // treat as reconnect, not initial
    setStatus('connecting');
    openWsRef.current(callsignRef.current);
  }, [clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      intentionalRef.current = true;
      wsRef.current?.close();
    };
  }, [clearTimer]);

  return { connectionStatus: status, messages, connectError, connect, disconnect, sendMessage, manualReconnect };
}
