import { useState, useEffect, useCallback, useRef } from 'react';
import { WebSocketMessage } from '@/lib/types';

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  reconnectInterval?: number;
  reconnectAttempts?: number;
  debugMode?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'failed'>('disconnected');
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const pingTimeoutRef = useRef<number | null>(null);
  
  const { 
    onMessage,
    reconnectInterval = 5000,
    reconnectAttempts = 5,
    debugMode = true // Enable debug mode by default during development
  } = options;

  // Setup a heartbeat mechanism to keep the connection alive
  const setupHeartbeat = useCallback((socket: WebSocket) => {
    // Clear any existing interval/timeout
    if (heartbeatIntervalRef.current) {
      window.clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (pingTimeoutRef.current) {
      window.clearTimeout(pingTimeoutRef.current);
      pingTimeoutRef.current = null;
    }
    
    // Set up a heartbeat every 30 seconds
    const heartbeatInterval = window.setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        if (debugMode) console.log('[WebSocket] Sending heartbeat ping');
        
        // Send a ping to the server
        socket.send(JSON.stringify({ type: 'ping', data: { timestamp: Date.now() } }));
        
        // Set a timeout for the pong response
        pingTimeoutRef.current = window.setTimeout(() => {
          if (debugMode) console.log('[WebSocket] No heartbeat response received, reconnecting');
          
          // If we don't get a pong back, close the connection and reconnect
          if (socket) {
            socket.close();
            connect();
          }
        }, 5000); // Wait 5 seconds for a response
      }
    }, 30000); // Send a heartbeat every 30 seconds
    
    heartbeatIntervalRef.current = heartbeatInterval;
  }, [debugMode]);
  
  const connect = useCallback(() => {
    // Clean up any existing intervals or timeouts
    if (heartbeatIntervalRef.current) {
      window.clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (pingTimeoutRef.current) {
      window.clearTimeout(pingTimeoutRef.current);
      pingTimeoutRef.current = null;
    }
    
    // Close existing socket if it exists
    if (socketRef.current) {
      socketRef.current.close();
    }

    try {
      setConnectionStatus('connecting');
      
      // Determine WebSocket protocol based on page protocol
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      
      // Use the same host as the current page to ensure port is included
      // Make sure the port is correctly included
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;
      
      if (debugMode) {
        console.log(`[WebSocket] Connecting to: ${wsUrl}`);
        console.log(`[WebSocket] Protocol: ${protocol}`);
        console.log(`[WebSocket] Host: ${host}`);
      }
      
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        if (debugMode) console.log('[WebSocket] Connection established');
        setIsConnected(true);
        setError(null);
        setReconnectCount(0);
        setConnectionStatus('connected');
        
        // Setup the heartbeat once connected
        setupHeartbeat(socket);
      };

      socket.onclose = (event) => {
        if (debugMode) {
          console.log(`[WebSocket] Connection closed: ${event.code} ${event.reason}`);
          console.log(`[WebSocket] Was clean close: ${event.wasClean}`);
        }
        
        setIsConnected(false);
        
        // Clear heartbeat interval/timeout on close
        if (heartbeatIntervalRef.current) {
          window.clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        
        if (pingTimeoutRef.current) {
          window.clearTimeout(pingTimeoutRef.current);
          pingTimeoutRef.current = null;
        }
        
        // If connection was closed abnormally and we haven't exceeded reconnect attempts
        if (!event.wasClean && reconnectCount < reconnectAttempts) {
          if (debugMode) console.log(`[WebSocket] Reconnecting in ${reconnectInterval}ms (attempt ${reconnectCount + 1}/${reconnectAttempts})`);
          
          setConnectionStatus('disconnected');
          
          const timeout = window.setTimeout(() => {
            setReconnectCount(prev => prev + 1);
            connect();
          }, reconnectInterval);
          
          reconnectTimeoutRef.current = timeout;
        } else {
          setConnectionStatus('failed');
        }
      };

      socket.onerror = (event) => {
        const wsError = new Error('WebSocket connection error');
        if (debugMode) {
          console.error('[WebSocket] Error:', wsError);
          console.error('[WebSocket] Event:', event);
        }
        setError(wsError);
      };

      socket.onmessage = (event) => {
        try {
          // Handle special case for pong response
          if (event.data === 'pong' || event.data === '"pong"') {
            if (debugMode) console.log('[WebSocket] Received heartbeat pong');
            
            // Clear the ping timeout since we got a response
            if (pingTimeoutRef.current) {
              window.clearTimeout(pingTimeoutRef.current);
              pingTimeoutRef.current = null;
            }
            return;
          }
          
          const data = JSON.parse(event.data) as WebSocketMessage;
          
          // Check if message is a pong response
          if (data.type === 'pong') {
            if (debugMode) console.log('[WebSocket] Received heartbeat pong');
            
            // Clear the ping timeout since we got a response
            if (pingTimeoutRef.current) {
              window.clearTimeout(pingTimeoutRef.current);
              pingTimeoutRef.current = null;
            }
            return;
          }
          
          if (debugMode) console.log('[WebSocket] Message received:', data);
          
          if (onMessage) {
            onMessage(data);
          }
        } catch (err) {
          console.error('[WebSocket] Error parsing message:', err);
          console.error('[WebSocket] Raw message:', event.data);
        }
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown WebSocket error');
      console.error('[WebSocket] Connection error:', error);
      setError(error);
      setConnectionStatus('failed');
    }
  }, [reconnectCount, reconnectAttempts, reconnectInterval, onMessage, debugMode, setupHeartbeat]);

  const sendMessage = useCallback((type: string, data: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, data });
      socketRef.current.send(message);
      if (options.debugMode) console.log('[WebSocket] Message sent:', { type, data });
      return true;
    }
    if (options.debugMode) console.log('[WebSocket] Failed to send message - socket not connected');
    return false;
  }, [options.debugMode]);

  const disconnect = useCallback(() => {
    // Clear any pending timeouts or intervals
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (heartbeatIntervalRef.current) {
      window.clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (pingTimeoutRef.current) {
      window.clearTimeout(pingTimeoutRef.current);
      pingTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      if (debugMode) console.log('[WebSocket] Manually disconnecting');
      socketRef.current.close();
      socketRef.current = null;
      setConnectionStatus('disconnected');
      setIsConnected(false);
    }
  }, [debugMode]);

  // Use empty dependency array to only connect on mount and disconnect on unmount
  // The actual implementations of connect and disconnect already have proper dependencies
  useEffect(() => {
    if (debugMode) console.log('[WebSocket] Component mounted, initiating connection');
    connect();
    
    return () => {
      if (debugMode) console.log('[WebSocket] Component unmounted, closing connection');
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
    disconnect,
    status: connectionStatus
  };
}
