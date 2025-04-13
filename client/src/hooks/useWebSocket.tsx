import { useState, useEffect, useCallback, useRef } from 'react';
import { WebSocketMessage } from '@/lib/types';

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  reconnectInterval?: number;
  reconnectAttempts?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  
  const { 
    onMessage,
    reconnectInterval = 3000,
    reconnectAttempts = 5
  } = options;

  const connect = useCallback(() => {
    // Close existing socket if it exists
    if (socketRef.current) {
      socketRef.current.close();
    }

    try {
      // Determine WebSocket protocol based on page protocol
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        setError(null);
        setReconnectCount(0);
      };

      socket.onclose = (event) => {
        setIsConnected(false);
        
        // If connection was closed abnormally and we haven't exceeded reconnect attempts
        if (!event.wasClean && reconnectCount < reconnectAttempts) {
          const timeout = window.setTimeout(() => {
            setReconnectCount(prev => prev + 1);
            connect();
          }, reconnectInterval);
          
          reconnectTimeoutRef.current = timeout;
        }
      };

      socket.onerror = (event) => {
        setError(new Error('WebSocket error'));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage;
          if (onMessage) {
            onMessage(data);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown WebSocket error'));
    }
  }, [reconnectCount, reconnectAttempts, reconnectInterval, onMessage]);

  const sendMessage = useCallback((type: string, data: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, data }));
      return true;
    }
    return false;
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  // Use empty dependency array to only connect on mount and disconnect on unmount
  // The actual implementations of connect and disconnect already have proper dependencies
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isConnected,
    error,
    sendMessage,
    reconnectCount,
    connect,
    disconnect
  };
}
