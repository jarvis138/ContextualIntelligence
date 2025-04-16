import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

// Import admin page directly
import AdminPage from "@/pages/admin-page";

// Apply the same styles as the main app
import './index.css';

// Use the same query client config as the main app
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60000,
    },
  },
});

function AdminPortal() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminPage />
      <Toaster />
    </QueryClientProvider>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<AdminPortal />);
} else {
  console.error('Root element not found');
}