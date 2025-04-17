import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface User {
  id: number;
  username: string;
  fullName?: string;
  email?: string;
  role: string;
  avatar?: string;
  tenantId?: number;
  authMethod?: string;
}

export function useUser() {
  const queryClient = useQueryClient();
  const [authChecked, setAuthChecked] = useState(false);

  // Get the current user data
  const { data: user, isLoading, isError, error } = useQuery({
    queryKey: ['/api/v1/auth/me'],
    queryFn: async () => {
      try {
        const response = await apiRequest({ 
          url: '/api/v1/auth/me', 
          method: 'GET'
        });
        return response.data;
      } catch (err) {
        if (err.response?.status === 401) {
          // If unauthorized, clear stored credentials
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('admin_authenticated');
        }
        throw err;
      }
    },
    retry: false,
    enabled: true,
    refetchOnWindowFocus: false,
    onSettled: () => {
      setAuthChecked(true);
    }
  });

  // Login mutation
  const login = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await apiRequest({
        url: '/api/v1/auth/login',
        method: 'POST',
        data: credentials
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem('token', data.token);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        
        // For admin routes
        if (data.user?.role === 'admin') {
          localStorage.setItem('admin_authenticated', 'true');
        }
        
        // Refetch user data
        queryClient.invalidateQueries({ queryKey: ['/api/v1/auth/me'] });
      }
    }
  });

  // Logout mutation
  const logout = useMutation({
    mutationFn: async () => {
      try {
        await apiRequest({
          url: '/api/v1/auth/logout',
          method: 'POST'
        });
      } catch (error) {
        // Even if the API call fails, we'll remove tokens from localStorage
        console.error('Error during logout:', error);
      }
      
      // Clear localStorage items
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('admin_authenticated');
      
      // Clear user from React Query cache
      queryClient.invalidateQueries({ queryKey: ['/api/v1/auth/me'] });
      queryClient.setQueryData(['/api/v1/auth/me'], null);
    }
  });

  // Check token on initial load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setAuthChecked(true);
    }
  }, []);

  return {
    user,
    isLoading: isLoading && !authChecked,
    isAuthenticated: !!user,
    isError,
    error,
    login: login.mutate,
    isLoginLoading: login.isPending,
    logout: logout.mutate,
    isLogoutLoading: logout.isPending,
    isAdmin: user?.role === 'admin'
  };
}