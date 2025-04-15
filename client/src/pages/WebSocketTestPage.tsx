import React from 'react';
import { WebSocketTester } from '@/hooks/useWebSocket';

export default function WebSocketTestPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">WebSocket Connection Test</h1>
      <p className="mb-4 text-gray-600">
        This page allows you to test the real-time WebSocket connection between the client and server.
        You can send messages to the server and see the responses below.
      </p>
      <div className="p-4 bg-white rounded-lg shadow-md">
        <WebSocketTester />
      </div>
    </div>
  );
}