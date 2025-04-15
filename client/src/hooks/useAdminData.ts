import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { SystemMetric, SystemEvent, Backup, AuditLog } from '@shared/schema';

export interface SystemPerformance {
  cpu: SystemMetric[];
  memory: SystemMetric[];
  api: SystemMetric[];
  error?: string;
}

export interface DatabaseStats {
  tableStats: {
    rows: Array<{
      tablename: string;
      row_count: number;
    }>;
  };
  databaseSize?: {
    db_size: string;
  };
  indexStats: {
    rows: Array<{
      index_name: string;
      table_name: string;
      index_scans: number;
    }>;
  };
  error?: string;
}

// System Metrics
export function useSystemMetrics(type?: string, limit: number = 20) {
  return useQuery({
    queryKey: ['/api/admin/metrics', { type, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (limit) params.append('limit', limit.toString());
      
      const response = await apiRequest('GET', `/api/admin/metrics?${params.toString()}`);
      const data = await response.json();
      return data as SystemMetric[];
    }
  });
}

export function useCreateSystemMetric() {
  return useMutation({
    mutationFn: async (metricData: Omit<SystemMetric, 'id' | 'timestamp'>) => {
      const response = await apiRequest('POST', '/api/admin/metrics', metricData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/metrics'] });
    }
  });
}

// System Events
export function useSystemEvents(
  severity?: string, 
  source?: string, 
  limit: number = 20,
  acknowledged?: boolean
) {
  return useQuery({
    queryKey: ['/api/admin/events', { severity, source, limit, acknowledged }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (severity) params.append('severity', severity);
      if (source) params.append('source', source);
      if (limit) params.append('limit', limit.toString());
      if (acknowledged !== undefined) params.append('acknowledged', acknowledged.toString());
      
      const response = await apiRequest('GET', `/api/admin/events?${params.toString()}`);
      const data = await response.json();
      return data as SystemEvent[];
    }
  });
}

export function useCreateSystemEvent() {
  return useMutation({
    mutationFn: async (eventData: Omit<SystemEvent, 'id' | 'timestamp' | 'acknowledged' | 'acknowledgedBy' | 'acknowledgedAt'>) => {
      const response = await apiRequest('POST', '/api/admin/events', eventData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/events'] });
    }
  });
}

export function useAcknowledgeEvent() {
  return useMutation({
    mutationFn: async (eventId: number) => {
      const response = await apiRequest('POST', `/api/admin/events/${eventId}/acknowledge`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/events'] });
    }
  });
}

// Backups
export function useBackups(status?: string, limit: number = 20) {
  return useQuery({
    queryKey: ['/api/admin/backups', { status, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (limit) params.append('limit', limit.toString());
      
      const response = await apiRequest('GET', `/api/admin/backups?${params.toString()}`);
      const data = await response.json();
      return data as Backup[];
    }
  });
}

export function useCreateBackup() {
  return useMutation({
    mutationFn: async (backupData: Omit<Backup, 'id' | 'createdAt'>) => {
      const response = await apiRequest('POST', '/api/admin/backups', backupData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/backups'] });
    }
  });
}

// Audit Logs
export function useAuditLogs(
  userId?: number,
  action?: string,
  entityType?: string,
  limit: number = 20
) {
  return useQuery({
    queryKey: ['/api/admin/audit-logs', { userId, action, entityType, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId.toString());
      if (action) params.append('action', action);
      if (entityType) params.append('entityType', entityType);
      if (limit) params.append('limit', limit.toString());
      
      const response = await apiRequest('GET', `/api/admin/audit-logs?${params.toString()}`);
      const data = await response.json();
      return data as AuditLog[];
    }
  });
}

export function useCreateAuditLog() {
  return useMutation({
    mutationFn: async (logData: Omit<AuditLog, 'id' | 'timestamp'>) => {
      const response = await apiRequest('POST', '/api/admin/audit-logs', logData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/audit-logs'] });
    }
  });
}

// System Stats
export function useDatabaseStats() {
  return useQuery({
    queryKey: ['/api/admin/db-stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/db-stats');
      const data = await response.json();
      return data as DatabaseStats;
    }
  });
}

export function useSystemPerformance() {
  return useQuery({
    queryKey: ['/api/admin/system-performance'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/system-performance');
      const data = await response.json();
      return data as SystemPerformance;
    }
  });
}