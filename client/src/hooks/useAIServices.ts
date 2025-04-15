import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "../lib/queryClient";

interface AIServiceStatus {
  openai: boolean;
  perplexity: boolean;
}

/**
 * Hook to check the availability status of AI services
 * Components can use this to conditionally render AI features based on API key availability
 */
export function useAIServices() {
  const {
    data: status,
    isLoading,
    error,
  } = useQuery<AIServiceStatus>({
    queryKey: ["/api/ai/status"],
    queryFn: getQueryFn(),
    // Don't refetch too often as the API keys won't change during a session
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    isOpenAIAvailable: status?.openai || false,
    isPerplexityAvailable: status?.perplexity || false,
    isLoading,
    error,
  };
}