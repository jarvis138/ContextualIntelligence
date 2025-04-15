import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

// Fix for Vite WebSocket connection in Replit environment
// This prevents the "Failed to construct WebSocket: The URL is invalid" error
if (import.meta.hot) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const originalWebSocket = window.WebSocket;
  
  class CustomWebSocket extends originalWebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      try {
        // Check if this is a Vite HMR WebSocket connection (even with invalid URL format)
        if (typeof url === 'string') {
          if (url.includes('vite')) {
            // Handle malformed Vite URLs that might have "localhost:undefined"
            if (url.includes('localhost:undefined') || url.includes('localhost')) {
              // Extract query parameters if present
              let search = '';
              try {
                const urlParts = url.split('?');
                if (urlParts.length > 1) {
                  search = '?' + urlParts[1];
                }
              } catch (e) {
                console.warn('Error parsing WebSocket URL query params:', e);
              }
              
              // Construct a valid WebSocket URL using the current host
              const newUrl = `${protocol}//${host}/__vite_hmr${search}`;
              console.log(`Rewrote WebSocket URL from ${url} to ${newUrl}`);
              super(newUrl, protocols);
              return;
            }
          }
        }
        
        // Default case: use the original URL
        super(url, protocols);
      } catch (error) {
        console.error('Error in CustomWebSocket constructor:', error);
        // Fallback to a default WebSocket connection to the current host
        const fallbackUrl = `${protocol}//${host}/__vite_hmr`;
        console.warn(`Using fallback WebSocket URL: ${fallbackUrl}`);
        super(fallbackUrl, protocols);
      }
    }
  }
  
  // Override the WebSocket constructor for Vite's HMR connections
  window.WebSocket = CustomWebSocket;
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
