import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { QueryClient } from '@tanstack/react-query';

// Create a query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60000,
    },
  },
});

interface ApiRequestConfig extends AxiosRequestConfig {
  skipAuthHeader?: boolean;
}

/**
 * Make an API request with proper token handling
 */
export async function apiRequest(config: ApiRequestConfig): Promise<AxiosResponse> {
  const { skipAuthHeader = false, ...axiosConfig } = config;
  
  // Add authorization header if not skipped
  if (!skipAuthHeader) {
    const token = localStorage.getItem('token');
    if (token) {
      axiosConfig.headers = {
        ...axiosConfig.headers,
        Authorization: `Bearer ${token}`
      };
    }
  }

  try {
    return await axios(axiosConfig);
  } catch (error) {
    // Handle 401 Unauthorized errors by trying to refresh the token
    if (error.response?.status === 401 && !config.url?.includes('/auth/refresh')) {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        try {
          // Attempt to refresh the token
          const refreshResponse = await axios({
            url: '/api/v1/auth/refresh',
            method: 'POST',
            data: { refreshToken }
          });
          
          // If successful, update the token in localStorage
          if (refreshResponse.data.token) {
            localStorage.setItem('token', refreshResponse.data.token);
            
            // Update authorization header with new token
            axiosConfig.headers = {
              ...axiosConfig.headers,
              Authorization: `Bearer ${refreshResponse.data.token}`
            };
            
            // Retry the original request with the new token
            return await axios(axiosConfig);
          }
        } catch (refreshError) {
          // If token refresh fails, clear tokens and let the original error propagate
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('admin_authenticated');
        }
      } else {
        // If no refresh token is available, clear any existing tokens
        localStorage.removeItem('token');
        localStorage.removeItem('admin_authenticated');
      }
    }
    
    // Re-throw the original error
    throw error;
  }
}