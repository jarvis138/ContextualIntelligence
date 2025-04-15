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
      // Check if this is a Vite HMR WebSocket connection
      if (typeof url === 'string' && url.includes('vite') && url.includes('localhost')) {
        // Replace localhost with the actual host, maintaining the path and query parameters
        const urlObj = new URL(url);
        const newUrl = `${protocol}//${host}${urlObj.pathname}${urlObj.search}`;
        super(newUrl, protocols);
      } else {
        super(url, protocols);
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
