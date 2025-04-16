import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

// Completely disable Vite HMR WebSocket for reliability
// This allows the app to run in Replit even if the WebSocket connection fails

// Disable and nullify HMR-related functionality to prevent errors
// Note: This means you'll need to refresh the page manually after making changes
if (import.meta.hot) {
  try {
    // Safely disable HMR to prevent WebSocket errors
    Object.defineProperty(window, 'WebSocket', {
      value: function() {
        // This is a dummy WebSocket that doesn't actually connect
        // It implements enough of the WebSocket API to prevent errors
        this.readyState = 3; // CLOSED
        this.send = function() {}; // No-op send
        this.close = function() {}; // No-op close
      },
      writable: false,
      configurable: false
    });
    
    console.log('WebSocket support disabled to improve stability');
    
    // Also disable HMR accept to prevent additional connection attempts
    if (typeof import.meta.hot.accept === 'function') {
      const originalAccept = import.meta.hot.accept;
      import.meta.hot.accept = function(...args: any[]) {
        console.log('HMR accept call intercepted and disabled');
        return undefined;
      };
    }
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
