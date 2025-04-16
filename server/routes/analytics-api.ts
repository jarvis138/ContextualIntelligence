/**
 * Analytics API Router
 * 
 * This router handles analytics-related API endpoints
 */

import { Router } from 'express';
import { z } from 'zod';
import { 
  analyzeTrend,
  TrendParams,
  getTopMetrics,
  predictProjectCompletion,
  analyzeProjectRisks,
  predictFutureMetrics,
  detectAnomalies,
  detectAccessPatternAnomalies,
  detectDataQualityAnomalies,
  generateReport,
  scheduleReport,
  cancelScheduledReport,
  ReportConfig
} from '../services/analytics';
import { authenticateToken, authorizeRoles } from '../auth';
import { logger } from '../services/observability';

const router = Router();

// Middleware to authenticate all analytics routes
router.use(authenticateToken);

// Trend Analysis Endpoint
const trendParamsSchema = z.object({
  entityType: z.enum(['project', 'task', 'user', 'document', 'activity']),
  metricType: z.enum(['count', 'completion_rate', 'activity_rate', 'processing_time']),
  startDate: z.string().transform(val => new Date(val)),
  endDate: z.string().transform(val => new Date(val)),
  interval: z.enum(['day', 'week', 'month']),
  entityId: z.number().optional(),
  includeForecasting: z.boolean().optional().default(false)
});

router.post('/trends', async (req, res) => {
  try {
    const params = trendParamsSchema.parse(req.body);
    
    const result = await analyzeTrend(params as TrendParams);
    res.json(result);
  } catch (error) {
    logger.error('Error in trend analysis endpoint', { error });
    res.status(400).json({ error: error.message });
  }
});

// Top Metrics Endpoint
router.get('/top-metrics/:entityType', async (req, res) => {
  try {
    const entityType = req.params.entityType as 'project' | 'user' | 'task';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
    
    if (!['project', 'user', 'task'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }
    
    const result = await getTopMetrics(entityType, limit);
    res.json(result);
  } catch (error) {
    logger.error('Error in top metrics endpoint', { error });
    res.status(400).json({ error: error.message });
  }
});

// Project Prediction Endpoints
router.get('/projects/:projectId/completion-prediction', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    
    const result = await predictProjectCompletion(projectId);
    res.json(result);
  } catch (error) {
    logger.error('Error in project completion prediction endpoint', { error });
    res.status(400).json({ error: error.message });
  }
});

router.get('/projects/:projectId/risk-analysis', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    
    const result = await analyzeProjectRisks(projectId);
    res.json(result);
  } catch (error) {
    logger.error('Error in project risk analysis endpoint', { error });
    res.status(400).json({ error: error.message });
  }
});

// Future Metrics Prediction Endpoint
const futureMetricsSchema = z.object({
  entityType: z.enum(['project', 'task', 'user', 'document', 'activity']),
  metricType: z.enum(['count', 'completion_rate', 'activity_rate']),
  timeframe: z.enum(['week', 'month', 'quarter'])
});

router.post('/predict-metrics', async (req, res) => {
  try {
    const params = futureMetricsSchema.parse(req.body);
    
    const result = await predictFutureMetrics(
      params.entityType,
      params.metricType,
      params.timeframe
    );
    
    res.json(result);
  } catch (error) {
    logger.error('Error in predict metrics endpoint', { error });
    res.status(400).json({ error: error.message });
  }
});

// Anomaly Detection Endpoints
const anomalyDetectionSchema = z.object({
  entityType: z.enum(['project', 'task', 'user', 'document', 'activity', 'system']),
  metricType: z.enum([
    'count', 'completion_rate', 'activity_rate', 'processing_time', 
    'response_time', 'error_rate'
  ]),
  sensitivity: z.enum(['low', 'medium', 'high']),
  lookbackPeriod: z.number().min(1).max(365),
  entityId: z.number().optional()
});

router.post('/anomalies', async (req, res) => {
  try {
    const config = anomalyDetectionSchema.parse(req.body);
    
    const result = await detectAnomalies(config);
    res.json(result);
  } catch (error) {
    logger.error('Error in anomaly detection endpoint', { error });
    res.status(400).json({ error: error.message });
  }
});

router.post('/access-pattern-anomalies', async (req, res) => {
  try {
    const { sensitivity, lookbackPeriod } = req.body;
    
    if (!['low', 'medium', 'high'].includes(sensitivity)) {
      return res.status(400).json({ error: 'Invalid sensitivity' });
    }
    
    const result = await detectAccessPatternAnomalies(
      sensitivity,
      lookbackPeriod || 30
    );
    
    res.json(result);
  } catch (error) {
    logger.error('Error in access pattern anomaly detection endpoint', { error });
    res.status(400).json({ error: error.message });
  }
});

router.post('/data-quality-anomalies', async (req, res) => {
  try {
    const { lookbackPeriod } = req.body;
    
    const result = await detectDataQualityAnomalies(lookbackPeriod || 30);
    res.json(result);
  } catch (error) {
    logger.error('Error in data quality anomaly detection endpoint', { error });
    res.status(400).json({ error: error.message });
  }
});

// Reports Endpoints
const reportConfigSchema = z.object({
  reportType: z.enum(['project', 'team', 'system']),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  entityId: z.number().optional(),
  metrics: z.array(z.string()),
  includeAnomalies: z.boolean().optional().default(false),
  includePredictions: z.boolean().optional().default(false),
  includeRisks: z.boolean().optional().default(false),
  recipients: z.array(z.string().email())
});

router.post('/reports/generate', authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const config = reportConfigSchema.parse(req.body);
    
    const result = await generateReport(config as ReportConfig);
    res.json(result);
  } catch (error) {
    logger.error('Error in generate report endpoint', { error });
    res.status(400).json({ error: error.message });
  }
});

router.post('/reports/schedule', authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const config = reportConfigSchema.parse(req.body);
    
    const result = await scheduleReport(config as ReportConfig);
    res.json(result);
  } catch (error) {
    logger.error('Error in schedule report endpoint', { error });
    res.status(400).json({ error: error.message });
  }
});

router.post('/reports/cancel/:scheduleId', authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    const result = await cancelScheduledReport(scheduleId);
    res.json({ success: result });
  } catch (error) {
    logger.error('Error in cancel scheduled report endpoint', { error });
    res.status(400).json({ error: error.message });
  }
});

export const analyticsApiRouter = router;