import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Helper function to check and handle failed HTTP responses
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Enhanced API request function with error handling
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    let body: string | undefined = undefined;
    
    if (data) {
      try {
        body = JSON.stringify(data);
      } catch (jsonError) {
        console.error(`Failed to stringify request data for ${method} ${url}:`, jsonError, data);
        throw new Error(`Invalid request data: ${jsonError.message}`);
      }
    }
    
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API request failed for ${method} ${url}:`, error);
    throw error; // Re-throw for the calling code to handle
  }
}

// QueryFunction with error handling
type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      
      try {
        return await res.json();
      } catch (parseError) {
        console.error(`Failed to parse JSON response for ${queryKey[0]}:`, parseError);
        throw new Error(`Invalid JSON response: ${parseError.message}`);
      }
    } catch (error) {
      console.error(`Query failed for ${queryKey[0]}:`, error);
      throw error; // Re-throw to let react-query handle it
    }
  };

// Configure the QueryClient with proper error handling
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
