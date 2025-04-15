import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

// Fix for Vite WebSocket connection in Replit environment
// This prevents the "Failed to construct WebSocket: The URL is invalid" error

// Define a function to correctly format WebSocket URL
function getProperWebSocketUrl(wsUrl: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  
  // Extract query parameters if present
  let search = '';
  try {
    const urlParts = wsUrl.split('?');
    if (urlParts.length > 1) {
      search = '?' + urlParts[1];
    }
  } catch (e) {
    console.warn('Error parsing WebSocket URL query params:', e);
  }
  
  // If it's a Vite HMR WebSocket
  if (wsUrl.includes('vite') || wsUrl.includes('hmr')) {
    return `${protocol}//${host}/__vite_hmr${search}`;
  }
  
  // For other WebSockets, use the host with the original path
  try {
    // Try to parse the URL to extract the path
    const urlObj = new URL(wsUrl);
    return `${protocol}//${host}${urlObj.pathname}${search}`;
  } catch {
    // If parsing fails, just use the base connection
    return `${protocol}//${host}/ws${search}`;
  }
}

// Only patch WebSocket if we're running in development mode with HMR
if (import.meta.hot) {
  try {
    const originalWebSocket = window.WebSocket;
    
    class PatchedWebSocket extends originalWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        try {
          let finalUrl = url;
          
          // Only rewrite string URLs
          if (typeof url === 'string') {
            if (url.includes('localhost') || url.includes('undefined')) {
              finalUrl = getProperWebSocketUrl(url);
              console.log(`WebSocket URL rewritten from ${url} to ${finalUrl}`);
            }
          }
          
          super(finalUrl, protocols);
        } catch (error) {
          console.error('Error in PatchedWebSocket constructor:', error);
          // Create a dummy WebSocket that doesn't throw but doesn't connect either
          // This allows the app to continue running even if WebSocket fails
          super(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}://${window.location.host}/ws`);
        }
      }
    }
    
    // Override the WebSocket constructor
    window.WebSocket = PatchedWebSocket as any;
    console.log('WebSocket constructor patched for Replit environment');
  } catch (error) {
    console.error('Failed to patch WebSocket:', error);
  }
}

// Import remix icon CSS from CDN
const remixIconLink = document.createElement("link");
remixIconLink.href = "https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css";
remixIconLink.rel = "stylesheet";
document.head.appendChild(remixIconLink);

// Add inter font family
const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Roboto+Mono&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

// Set title
document.title = "Contextual Project Intelligence Hub";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
