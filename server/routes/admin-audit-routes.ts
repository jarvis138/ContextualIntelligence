/**
 * Admin Audit Routes
 * 
 * API routes for administrators to access and manage audit logs.
 * Includes filtering, pagination, and export capabilities.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuditService, AuditCategory, AuditSeverity } from '../services/auditService';
import { authorizeRoles } from '../auth';
import { createObjectCsvStringifier } from 'csv-writer';

// Initialize router
const router = Router();

// Validate route access - only admins can access audit logs
router.use(authorizeRoles('admin'));

// Schema for audit log query parameters
const auditQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  userId: z.coerce.number().int().optional(),
  tenantId: z.coerce.number().int().optional(),
  action: z.string().optional(),
  category: z.nativeEnum(AuditCategory).optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  severity: z.nativeEnum(AuditSeverity).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  success: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  search: z.string().optional(),
  format: z.enum(['json', 'csv']).optional().default('json')
});

// GET /api/admin/audit-logs - Get audit logs with filtering and pagination
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    // Parse and validate query parameters
    const validationResult = auditQuerySchema.safeParse(req.query);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: validationResult.error.errors
      });
    }
    
    const {
      page, limit, userId, tenantId, action, category,
      resourceType, resourceId, severity, fromDate, toDate,
      success, search, format
    } = validationResult.data;
    
    // Build filter object
    const filters: any = {
      userId,
      tenantId,
      action,
      category,
      resourceType,
      resourceId,
      severity,
      fromDate,
      toDate,
      success
    };
    
    // If search is provided, we need a more complex query
    if (search) {
      // In a real implementation, this would search across description, action, etc.
      // This is just a placeholder for the search functionality
      filters.search = search;
    }
    
    // Remove undefined values from filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });
    
    // Calculate pagination
    const offset = (page - 1) * limit;
    
    // Query audit logs
    const logs = await AuditService.query(filters, limit, offset);
    
    // Get total count for pagination metadata
    const countFilters = { ...filters };
    const totalLogs = await AuditService.count(countFilters);
    const totalPages = Math.ceil(totalLogs / limit);
    
    // Generate different formats
    if (format === 'csv') {
      // Generate CSV
      const csvStringifier = createObjectCsvStringifier({
        header: [
          { id: 'id', title: 'ID' },
          { id: 'timestamp', title: 'Timestamp' },
          { id: 'userId', title: 'User ID' },
          { id: 'tenantId', title: 'Tenant ID' },
          { id: 'action', title: 'Action' },
          { id: 'category', title: 'Category' },
          { id: 'severity', title: 'Severity' },
          { id: 'resourceType', title: 'Resource Type' },
          { id: 'resourceId', title: 'Resource ID' },
          { id: 'description', title: 'Description' },
          { id: 'success', title: 'Success' },
          { id: 'ipAddress', title: 'IP Address' },
          { id: 'userAgent', title: 'User Agent' }
        ]
      });
      
      const csvHeader = csvStringifier.getHeaderString();
      const csvRecords = csvStringifier.stringifyRecords(logs);
      const csvContent = csvHeader + csvRecords;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvContent);
    }
    
    // Return JSON response
    return res.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        totalItems: totalLogs,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Failed to retrieve audit logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/admin/audit-logs/export - Export audit logs
router.get('/audit-logs/export', async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const validationResult = auditQuerySchema.safeParse(req.query);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: validationResult.error.errors
      });
    }
    
    const {
      userId, tenantId, action, category,
      resourceType, resourceId, severity, fromDate, toDate,
      success, search, format
    } = validationResult.data;
    
    // Build filter object
    const filters: any = {
      userId,
      tenantId,
      action,
      category,
      resourceType,
      resourceId,
      severity,
      fromDate,
      toDate,
      success
    };
    
    if (search) {
      filters.search = search;
    }
    
    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });
    
    // Get all matching logs (no pagination for export)
    const logs = await AuditService.query(filters, 10000, 0);
    
    // Generate CSV
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'id', title: 'ID' },
        { id: 'timestamp', title: 'Timestamp' },
        { id: 'userId', title: 'User ID' },
        { id: 'tenantId', title: 'Tenant ID' },
        { id: 'action', title: 'Action' },
        { id: 'category', title: 'Category' },
        { id: 'severity', title: 'Severity' },
        { id: 'resourceType', title: 'Resource Type' },
        { id: 'resourceId', title: 'Resource ID' },
        { id: 'description', title: 'Description' },
        { id: 'success', title: 'Success' },
        { id: 'ipAddress', title: 'IP Address' },
        { id: 'userAgent', title: 'User Agent' }
      ]
    });
    
    const csvHeader = csvStringifier.getHeaderString();
    const csvRecords = csvStringifier.stringifyRecords(logs);
    const csvContent = csvHeader + csvRecords;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
    return res.send(csvContent);
  } catch (error) {
    console.error('Failed to export audit logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export audit logs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/admin/audit-logs/report - Generate a security report
router.get('/audit-logs/report', async (req: Request, res: Response) => {
  try {
    // Parse parameters
    const tenantId = req.query.tenantId ? parseInt(req.query.tenantId as string) : undefined;
    const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : undefined;
    const toDate = req.query.toDate ? new Date(req.query.toDate as string) : undefined;
    
    // Generate report
    const report = await AuditService.generateSecurityReport(tenantId, fromDate, toDate);
    
    return res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Failed to generate security report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate security report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/admin/audit-logs/:id - Get a specific audit log entry
router.get('/audit-logs/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid audit log ID'
      });
    }
    
    const log = await AuditService.getById(id);
    
    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found'
      });
    }
    
    return res.json({
      success: true,
      log
    });
  } catch (error) {
    console.error('Failed to retrieve audit log:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit log',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Export router
export default router;