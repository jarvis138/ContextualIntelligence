import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

type FetchOptions = {
  headers?: Record<string, string>;
  on401?: "returnNull" | "throw" | "default";
};

export function getQueryFn(options: FetchOptions = {}) {
  return async function queryFn({ queryKey }: { queryKey: (string | number)[] }): Promise<any> {
    let endpoint = Array.isArray(queryKey) ? queryKey[0] : queryKey;
    let id = queryKey.length > 1 ? queryKey[1] : null;

    if (id) {
      endpoint = `${endpoint}/${id}`;
    }

    const res = await fetch(endpoint, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (res.status === 401) {
      if (options.on401 === "returnNull") {
        return undefined;
      } else if (options.on401 === "throw") {
        throw new Error("Unauthorized");
      }
      // Default behavior is to throw and let the error boundary handle it
      throw new Error("Unauthorized");
    }

    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  };
}

export async function apiRequest(
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
  endpoint: string,
  data?: any,
  headers?: Record<string, string>
) {
  const res = await fetch(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${res.status} ${res.statusText}`);
  }

  return res;
}