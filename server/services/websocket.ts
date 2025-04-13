import WebSocket from 'ws';
import { Server } from 'http';

interface WebSocketMessage {
  type: string;
  data: any;
}

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    ws.on('message', (messageData) => {
      try {
        const message: WebSocketMessage = JSON.parse(messageData.toString());
        handleMessage(wss, ws, message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connection',
      data: { status: 'connected', timestamp: new Date().toISOString() }
    }));
  });

  return wss;
}

function handleMessage(wss: WebSocketServer, sender: WebSocket, message: WebSocketMessage) {
  console.log('Received message:', message.type);

  switch (message.type) {
    case 'update': {
      // Broadcast update to all clients except sender
      const broadcastMessage = JSON.stringify(message);
      wss.clients.forEach((client) => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
          client.send(broadcastMessage);
        }
      });
      break;
    }
    
    case 'activity': {
      // Broadcast new activity to all clients
      const broadcastMessage = JSON.stringify({
        type: 'activity',
        data: {
          ...message.data,
          timestamp: new Date().toISOString()
        }
      });
      
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(broadcastMessage);
        }
      });
      break;
    }
    
    case 'ping': {
      // Reply with pong only to sender
      sender.send(JSON.stringify({
        type: 'pong',
        data: { 
          received: message.data,
          timestamp: new Date().toISOString()
        }
      }));
      break;
    }
    
    default: {
      // Unknown message type
      sender.send(JSON.stringify({
        type: 'error',
        data: { 
          message: `Unknown message type: ${message.type}`,
          originalMessage: message,
          timestamp: new Date().toISOString()
        }
      }));
    }
  }
}
