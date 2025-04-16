import { QueryClient } from "@tanstack/react-query";

interface ApiRequestOptions {
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  on401?: "throw" | "returnNull";
}

interface GetQueryFnOptions {
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  on401?: "throw" | "returnNull";
}

// Create a query client instance - note that we also create one in App.tsx
// This is used directly by our hooks while the one in App.tsx is used by the Provider
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60000,
    },
  },
});

/**
 * Create a fetch function for use with react-query
 * @param options Options to customize the fetch behavior
 */
export const getQueryFn = (options: GetQueryFnOptions = {}) => {
  return async ({ queryKey }: { queryKey: string[] }) => {
    const [endpoint] = queryKey;
    
    const response = await fetch(endpoint, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: options.credentials || "include",
    });

    if (response.status === 401) {
      if (options.on401 === "returnNull") {
        return null;
      }
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || response.statusText;
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  };
};

/**
 * Make an API request with JSON body
 * @param method HTTP method
 * @param endpoint API endpoint
 * @param data Request body
 * @param options Request options
 */
export const apiRequest = async (
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  endpoint: string,
  data?: any,
  options: ApiRequestOptions = {}
) => {
  const response = await fetch(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: options.credentials || "include",
    body: data ? JSON.stringify(data) : undefined,
  });

  if (response.status === 401) {
    if (options.on401 === "returnNull") {
      return { json: () => null };
    }
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || errorData.error || response.statusText;
    throw new Error(errorMessage);
  }

  return response;
};