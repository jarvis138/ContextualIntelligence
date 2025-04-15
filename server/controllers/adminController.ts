import { Request, Response } from 'express';
import { adminService } from '../services/adminService';
import type { SystemMetric, SystemEvent, Backup, AuditLog } from '@shared/schema';

/**
 * Generates sample data for testing the admin dashboard
 * This is only for development purposes and should be removed in production
 */
export async function generateSampleData(req: Request, res: Response) {
  try {
    // Sample system metrics for CPU
    for (let i = 0; i < 20; i++) {
      await adminService.recordMetric({
        type: 'cpu',
        name: 'system_cpu_usage',
        value: (Math.random() * 70 + 10).toFixed(1),
        unit: 'percent',
        metadata: { source: 'system_monitor' }
      });
    }

    // Sample system metrics for Memory
    for (let i = 0; i < 20; i++) {
      await adminService.recordMetric({
        type: 'memory',
        name: 'system_memory_usage',
        value: (Math.random() * 60 + 20).toFixed(1),
        unit: 'percent',
        metadata: { source: 'system_monitor' }
      });
    }

    // Sample system metrics for API
    for (let i = 0; i < 20; i++) {
      await adminService.recordMetric({
        type: 'api',
        name: 'api_response_time',
        value: (Math.random() * 300 + 50).toFixed(0),
        unit: 'ms',
        metadata: { endpoint: '/api/documents' }
      });
    }

    // Sample system events
    const eventTypes = [
      { 
        severity: 'info' as const, 
        messages: [
          'System update completed successfully',
          'Database backup completed',
          'New user registered',
          'Document processing completed',
          'Search index rebuild completed'
        ]
      },
      { 
        severity: 'warning' as const, 
        messages: [
          'High memory usage detected',
          'API rate limit approaching maximum',
          'Document processing taking longer than expected',
          'Multiple failed login attempts detected',
          'Connection pool nearing capacity'
        ]
      },
      { 
        severity: 'error' as const, 
        messages: [
          'Database connection error',
          'Document processing failed',
          'Integration authentication error',
          'File storage error',
          'API rate limit exceeded'
        ]
      },
      { 
        severity: 'critical' as const, 
        messages: [
          'Database server down',
          'Out of memory error',
          'Critical security vulnerability detected',
          'System file corruption detected',
          'Service unavailable due to multiple failures'
        ]
      }
    ];

    for (let i = 0; i < 20; i++) {
      const typeIndex = Math.floor(Math.random() * eventTypes.length);
      const eventType = eventTypes[typeIndex];
      const messageIndex = Math.floor(Math.random() * eventType.messages.length);
      
      await adminService.recordEvent({
        severity: eventType.severity,
        message: eventType.messages[messageIndex],
        source: Math.random() > 0.5 ? 'system' : 'application',
        details: { timestamp: new Date().toISOString() }
      });
    }

    // Sample audit logs
    const actions = ['create', 'update', 'delete', 'access', 'export'];
    const entityTypes = ['document', 'project', 'user', 'integration', 'report'];
    
    for (let i = 0; i < 30; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];
      const entityId = Math.floor(Math.random() * 100) + 1;
      
      await adminService.recordAuditLog({
        userId: 6, // Use the admin user we created
        action,
        entityType,
        entityId,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      });
    }

    // Sample backup records
    const statuses = ['completed', 'failed', 'in_progress'] as const;
    
    for (let i = 0; i < 10; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      await adminService.recordBackup({
        filename: `backup_${date.toISOString().split('T')[0]}.zip`,
        status,
        size: Math.floor(Math.random() * 1000) + 500,
        path: '/backups/',
        type: 'full',
        createdBy: 6 // Use the admin user we created
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Sample data generated successfully' 
    });
  } catch (error: any) {
    console.error('Error generating sample data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate sample data', 
      error: error.message 
    });
  }
}