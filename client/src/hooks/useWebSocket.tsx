import { useState, useEffect, useRef } from 'react';

interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
  timestamp?: string;
}

interface UseWebSocketReturn {
  connected: boolean;
  connecting: boolean;
  messages: WebSocketMessage[];
  sendMessage: (message: any) => void;
  lastError: string | null;
}

/**
 * Custom hook for interacting with the WebSocket server
 * 
 * @returns WebSocket state and methods for interaction
 */
export function useWebSocket(): UseWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  
  // Connect to the WebSocket server on mount
  useEffect(() => {
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return; // Already connected or connecting
    }
    
    // Setup WebSocket connection
    const connect = () => {
      try {
        setConnecting(true);
        
        // In Replit, we need to be careful about the WebSocket URL construction
        
        // Properly handle Replit domains and WebSocket protocol
        let wsUrl: string;
        
        if (window.location.hostname.includes('.repl.co') || window.location.hostname.includes('.replit.app')) {
          // This is a Replit deployment
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const host = window.location.host;
          wsUrl = `${protocol}//${host}/ws`;
        } else if (import.meta.env.DEV) {
          // Local development
          const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
          wsUrl = `ws://localhost:${port}/ws`;
        } else {
          // Production environment but not on Replit
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const host = window.location.host;
          wsUrl = `${protocol}//${host}/ws`;
        }
        
        console.log('Connecting to WebSocket server at:', wsUrl);
        
        // Create the WebSocket with error handling
        let socket: WebSocket;
        try {
          socket = new WebSocket(wsUrl);
          
          // Add a timeout to detect connection issues
          const connectionTimeout = setTimeout(() => {
            if (socket.readyState !== WebSocket.OPEN) {
              console.warn('WebSocket connection timeout, closing socket to retry');
              socket.close();
            }
          }, 5000);
          
          // Clear timeout once connected
          socket.addEventListener('open', () => {
            clearTimeout(connectionTimeout);
          });
        } catch (wsError) {
          console.error('Initial WebSocket construction failed:', wsError);
          
          // Fallback attempt with alternative protocol
          if (wsUrl.startsWith('wss:')) {
            console.log('Trying fallback WebSocket connection with ws:// protocol');
            wsUrl = wsUrl.replace('wss:', 'ws:');
          } else {
            console.log('Trying fallback WebSocket connection with wss:// protocol');
            wsUrl = wsUrl.replace('ws:', 'wss:');
          }
          
          console.log('Fallback WebSocket URL:', wsUrl);
          socket = new WebSocket(wsUrl);
        }
        socketRef.current = socket;
        
        // Connection opened
        socket.addEventListener('open', () => {
          console.log('WebSocket connection established');
          setConnected(true);
          setConnecting(false);
          setLastError(null);
          
          // Send a ping to test the connection
          socket.send(JSON.stringify({ type: 'ping' }));
        });
        
        // Listen for messages
        socket.addEventListener('message', (event) => {
          try {
            // Check if it's a simple pong message
            if (event.data === 'pong') {
              console.log('Received simple pong');
              return;
            }
            
            // Parse JSON messages
            const message = JSON.parse(event.data);
            console.log('WebSocket message received:', message);
            
            // Add to messages state (except pings/pongs)
            if (message.type !== 'ping' && message.type !== 'pong') {
              setMessages((prevMessages) => [...prevMessages, message]);
            }
          } catch (e) {
            console.error('Error parsing WebSocket message:', e);
            console.log('Raw message:', event.data);
          }
        });
        
        // Connection closed
        socket.addEventListener('close', (event) => {
          console.log('WebSocket connection closed, code:', event.code, 'reason:', event.reason);
          setConnected(false);
          setConnecting(false);
          
          // Don't treat normal closure as an error
          if (event.code !== 1000) {
            setLastError(`Connection closed (${event.code}): ${event.reason || 'No reason provided'}`);
          }
          
          // Attempt to reconnect after a delay if not a normal closure or if the page is still active
          if (event.code !== 1000 && document.visibilityState === 'visible') {
            setTimeout(connect, 3000);
          }
        });
        
        // Connection error
        socket.addEventListener('error', (event) => {
          console.error('WebSocket error:', event);
          setLastError('Connection error occurred');
          setConnecting(false);
          
          // The error event is usually followed by a close event, so we'll handle reconnection there
        });
        
      } catch (error) {
        console.error('Error setting up WebSocket:', error);
        setLastError(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setConnecting(false);
        
        // Attempt to reconnect after a delay
        setTimeout(connect, 3000);
      }
    };
    
    // Initial connection
    connect();
    
    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        // Use code 1000 for normal closure
        socketRef.current.close(1000, 'Component unmounting');
      }
    };
  }, []);
  
  // Function to send a message to the server
  const sendMessage = (message: any) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setLastError('Cannot send message: WebSocket not connected');
      return;
    }
    
    try {
      const messageString = typeof message === 'string' ? message : JSON.stringify(message);
      socketRef.current.send(messageString);
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      setLastError(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  return {
    connected,
    connecting,
    messages,
    sendMessage,
    lastError
  };
}

// Create a component to test the WebSocket connection
export function WebSocketTester() {
  const { connected, connecting, messages, sendMessage, lastError } = useWebSocket();
  const [message, setMessage] = useState('');
  
  const handleSendMessage = () => {
    if (message) {
      sendMessage({
        type: 'chat',
        sender: 'UI Tester',
        content: message
      });
      setMessage('');
    }
  };
  
  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-2">WebSocket Connection Tester</h2>
      
      <div className="flex items-center mb-4">
        <span className="mr-2">Status:</span>
        {connecting ? (
          <span className="text-yellow-500">Connecting...</span>
        ) : connected ? (
          <span className="text-green-500">Connected</span>
        ) : (
          <span className="text-red-500">Disconnected</span>
        )}
      </div>
      
      {lastError && (
        <div className="p-2 mb-4 bg-red-50 text-red-700 rounded border border-red-200">
          Error: {lastError}
        </div>
      )}
      
      <div className="mb-4">
        <div className="flex mb-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-l"
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            disabled={!connected || !message}
            className="px-4 py-2 bg-blue-500 text-white rounded-r disabled:opacity-50"
          >
            Send
          </button>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => sendMessage({ type: 'ping' })}
            disabled={!connected}
            className="px-3 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
          >
            Send Ping
          </button>
          
          <button
            onClick={() => sendMessage({ type: 'notification', title: 'Test Notification', body: 'This is a test notification' })}
            disabled={!connected}
            className="px-3 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
          >
            Test Notification
          </button>
        </div>
      </div>
      
      <div>
        <h3 className="font-medium mb-2">Messages:</h3>
        <div className="border rounded bg-gray-50 p-2 h-60 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-500 italic">No messages yet</p>
          ) : (
            <div className="space-y-2">
              {messages.map((msg, index) => (
                <div key={index} className="p-2 bg-white rounded border text-sm">
                  <div className="font-medium">{msg.type}</div>
                  <div className="text-xs text-gray-500">
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : 'No timestamp'}
                  </div>
                  <pre className="mt-1 text-xs whitespace-pre-wrap overflow-auto max-h-20">
                    {JSON.stringify(msg.data || msg, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}