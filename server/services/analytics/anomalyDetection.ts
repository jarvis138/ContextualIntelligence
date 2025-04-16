/**
 * Anomaly Detection Service
 * 
 * This service provides anomaly detection capabilities for project data.
 * It identifies unusual patterns and outliers in various metrics.
 */

import { db } from '../../db';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { projects, tasks, activities, users, documents, systemMetrics, systemEvents } from '@shared/schema';
import { logger } from '../observability';
import { TimeSeriesPoint } from './trendAnalysis';

export interface AnomalyDetectionConfig {
  entityType: 'project' | 'task' | 'user' | 'document' | 'activity' | 'system';
  metricType: 'count' | 'completion_rate' | 'activity_rate' | 'processing_time' | 'response_time' | 'error_rate';
  sensitivity: 'low' | 'medium' | 'high';
  lookbackPeriod: number; // Days
  entityId?: number;
}

export interface AnomalyDetectionResult {
  anomalies: Anomaly[];
  totalDataPoints: number;
  anomalyPercentage: number;
  mostSevereAnomaly?: Anomaly;
}

export interface Anomaly {
  timestamp: Date;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
  metricType: string;
  entityType: string;
  entityId?: number;
}

/**
 * Detect anomalies in time series data
 */
export async function detectAnomalies(
  config: AnomalyDetectionConfig
): Promise<AnomalyDetectionResult> {
  try {
    // Get time series data
    const timeSeriesData = await getTimeSeriesData(config);
    
    // Calculate statistics for anomaly detection
    const { mean, stdDev } = calculateStatistics(timeSeriesData.map(point => point.value));
    
    // Set threshold based on sensitivity
    const thresholdMultiplier = 
      config.sensitivity === 'low' ? 3.0 :
      config.sensitivity === 'medium' ? 2.5 : 2.0;
    
    // Detect anomalies
    const anomalies: Anomaly[] = [];
    
    for (const point of timeSeriesData) {
      const deviation = (point.value - mean) / (stdDev || 1); // Avoid division by zero
      const absDeviation = Math.abs(deviation);
      
      if (absDeviation > thresholdMultiplier) {
        // Calculate severity
        let severity: 'low' | 'medium' | 'high';
        if (absDeviation > thresholdMultiplier * 1.5) {
          severity = 'high';
        } else if (absDeviation > thresholdMultiplier * 1.2) {
          severity = 'medium';
        } else {
          severity = 'low';
        }
        
        anomalies.push({
          timestamp: point.timestamp,
          value: point.value,
          expectedValue: mean,
          deviation: deviation,
          severity,
          metricType: config.metricType,
          entityType: config.entityType,
          entityId: config.entityId
        });
      }
    }
    
    // Sort anomalies by deviation (descending)
    anomalies.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
    
    const anomalyPercentage = timeSeriesData.length > 0 
      ? (anomalies.length / timeSeriesData.length) * 100 
      : 0;
    
    return {
      anomalies,
      totalDataPoints: timeSeriesData.length,
      anomalyPercentage,
      mostSevereAnomaly: anomalies.length > 0 ? anomalies[0] : undefined
    };
  } catch (error) {
    logger.error('Error detecting anomalies', { error, config });
    throw error;
  }
}

/**
 * Get time series data based on configuration
 */
async function getTimeSeriesData(
  config: AnomalyDetectionConfig
): Promise<TimeSeriesPoint[]> {
  const { entityType, metricType, lookbackPeriod, entityId } = config;
  
  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - lookbackPeriod);
  
  // Define the time grouping (daily)
  const timeGrouping = sql`DATE_TRUNC('day', timestamp)`;
  
  try {
    let query;
    
    // Different queries based on entity type and metric
    switch (entityType) {
      case 'project':
        if (metricType === 'completion_rate') {
          query = db.select({
            timestamp: timeGrouping.as('timestamp'),
            value: sql`AVG(CASE WHEN ${tasks.status} = 'completed' THEN 1 ELSE 0 END) * 100`.as('value')
          })
          .from(tasks)
          .where(
            and(
              entityId ? eq(tasks.projectId, entityId) : sql`1=1`,
              gte(tasks.updatedAt, startDate),
              lte(tasks.updatedAt, endDate)
            )
          )
          .groupBy(timeGrouping)
          .orderBy(timeGrouping);
        } else {
          query = db.select({
            timestamp: timeGrouping.as('timestamp'),
            value: sql`COUNT(*)`.as('value')
          })
          .from(activities)
          .where(
            and(
              eq(activities.entityType, 'project'),
              entityId ? eq(activities.entityId, entityId) : sql`1=1`,
              gte(activities.timestamp, startDate),
              lte(activities.timestamp, endDate)
            )
          )
          .groupBy(timeGrouping)
          .orderBy(timeGrouping);
        }
        break;
        
      case 'task':
        query = db.select({
          timestamp: timeGrouping.as('timestamp'),
          value: sql`COUNT(*)`.as('value')
        })
        .from(activities)
        .where(
          and(
            eq(activities.entityType, 'task'),
            entityId ? eq(activities.entityId, entityId) : sql`1=1`,
            gte(activities.timestamp, startDate),
            lte(activities.timestamp, endDate)
          )
        )
        .groupBy(timeGrouping)
        .orderBy(timeGrouping);
        break;
        
      case 'user':
        query = db.select({
          timestamp: timeGrouping.as('timestamp'),
          value: sql`COUNT(*)`.as('value')
        })
        .from(activities)
        .where(
          and(
            entityId ? eq(activities.userId, entityId) : sql`1=1`,
            gte(activities.timestamp, startDate),
            lte(activities.timestamp, endDate)
          )
        )
        .groupBy(timeGrouping)
        .orderBy(timeGrouping);
        break;
        
      case 'document':
        query = db.select({
          timestamp: timeGrouping.as('timestamp'),
          value: sql`COUNT(*)`.as('value')
        })
        .from(activities)
        .where(
          and(
            eq(activities.entityType, 'document'),
            entityId ? eq(activities.entityId, entityId) : sql`1=1`,
            gte(activities.timestamp, startDate),
            lte(activities.timestamp, endDate)
          )
        )
        .groupBy(timeGrouping)
        .orderBy(timeGrouping);
        break;
        
      case 'system':
        if (metricType === 'error_rate') {
          query = db.select({
            timestamp: timeGrouping.as('timestamp'),
            value: sql`COUNT(CASE WHEN ${systemEvents.severity} = 'error' THEN 1 ELSE NULL END) * 100.0 / COUNT(*)`.as('value')
          })
          .from(systemEvents)
          .where(
            and(
              gte(systemEvents.timestamp, startDate),
              lte(systemEvents.timestamp, endDate)
            )
          )
          .groupBy(timeGrouping)
          .orderBy(timeGrouping);
        } else if (metricType === 'response_time') {
          query = db.select({
            timestamp: timeGrouping.as('timestamp'),
            value: sql`AVG(${systemMetrics.value})`.as('value')
          })
          .from(systemMetrics)
          .where(
            and(
              eq(systemMetrics.type, 'api'),
              gte(systemMetrics.timestamp, startDate),
              lte(systemMetrics.timestamp, endDate)
            )
          )
          .groupBy(timeGrouping)
          .orderBy(timeGrouping);
        } else {
          throw new Error(`Unsupported metric type for system: ${metricType}`);
        }
        break;
        
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
    
    // Execute query
    const result = await query;
    
    return result;
  } catch (error) {
    logger.error('Error fetching time series data for anomaly detection', { error, config });
    throw error;
  }
}

/**
 * Calculate statistics (mean and standard deviation)
 */
function calculateStatistics(values: number[]): { mean: number; stdDev: number } {
  if (values.length === 0) {
    return { mean: 0, stdDev: 0 };
  }
  
  // Calculate mean
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  
  // Calculate standard deviation
  const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
  const variance = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  return { mean, stdDev };
}

/**
 * Detect access pattern anomalies
 */
export async function detectAccessPatternAnomalies(
  sensitivity: 'low' | 'medium' | 'high',
  lookbackPeriod: number = 30
): Promise<AnomalyDetectionResult> {
  try {
    // Get user access data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - lookbackPeriod);
    
    // Get user activity counts by day and hour
    const accessPatterns = await db
      .select({
        userId: activities.userId,
        hour: sql`EXTRACT(HOUR FROM timestamp)`.as('hour'),
        count: sql`COUNT(*)`.as('count')
      })
      .from(activities)
      .where(
        and(
          gte(activities.timestamp, startDate),
          lte(activities.timestamp, endDate)
        )
      )
      .groupBy(activities.userId, sql`EXTRACT(HOUR FROM timestamp)`)
      .orderBy(activities.userId, sql`EXTRACT(HOUR FROM timestamp)`);
    
    // Aggregate by user
    const userPatterns: Record<string, number[]> = {};
    
    for (const pattern of accessPatterns) {
      const userId = pattern.userId.toString();
      if (!userPatterns[userId]) {
        userPatterns[userId] = Array(24).fill(0);
      }
      userPatterns[userId][pattern.hour] = pattern.count;
    }
    
    // Calculate typical pattern (average across all users)
    const typicalPattern = Array(24).fill(0);
    const userCount = Object.keys(userPatterns).length;
    
    if (userCount > 0) {
      for (const userId in userPatterns) {
        const pattern = userPatterns[userId];
        for (let hour = 0; hour < 24; hour++) {
          typicalPattern[hour] += pattern[hour];
        }
      }
      
      for (let hour = 0; hour < 24; hour++) {
        typicalPattern[hour] /= userCount;
      }
    }
    
    // Calculate deviation threshold based on sensitivity
    const thresholdMultiplier = 
      sensitivity === 'low' ? 3.0 :
      sensitivity === 'medium' ? 2.5 : 2.0;
    
    // Detect anomalies
    const anomalies: Anomaly[] = [];
    const timeSeriesData: TimeSeriesPoint[] = [];
    
    for (const userId in userPatterns) {
      const pattern = userPatterns[userId];
      
      // Normalize the pattern for comparison
      const totalActivity = pattern.reduce((sum, count) => sum + count, 0);
      
      if (totalActivity > 0) {
        // Calculate deviations from typical pattern
        for (let hour = 0; hour < 24; hour++) {
          const normalizedValue = pattern[hour] / totalActivity;
          const normalizedTypical = typicalPattern[hour] > 0 
            ? typicalPattern[hour] / typicalPattern.reduce((sum, count) => sum + count, 0)
            : 0;
          
          const expectedValue = normalizedTypical;
          const deviation = normalizedValue - normalizedTypical;
          
          // Create timestamp for this hour
          const timestamp = new Date();
          timestamp.setHours(hour, 0, 0, 0);
          
          timeSeriesData.push({
            timestamp,
            value: normalizedValue
          });
          
          // Check if this is an anomaly
          if (Math.abs(deviation) > thresholdMultiplier * 0.1) { // Adjust threshold for normalized values
            // Determine severity
            let severity: 'low' | 'medium' | 'high';
            if (Math.abs(deviation) > thresholdMultiplier * 0.2) {
              severity = 'high';
            } else if (Math.abs(deviation) > thresholdMultiplier * 0.15) {
              severity = 'medium';
            } else {
              severity = 'low';
            }
            
            anomalies.push({
              timestamp,
              value: normalizedValue,
              expectedValue,
              deviation,
              severity,
              metricType: 'access_pattern',
              entityType: 'user',
              entityId: parseInt(userId)
            });
          }
        }
      }
    }
    
    // Sort anomalies by deviation (descending)
    anomalies.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
    
    const anomalyPercentage = timeSeriesData.length > 0 
      ? (anomalies.length / timeSeriesData.length) * 100 
      : 0;
    
    return {
      anomalies,
      totalDataPoints: timeSeriesData.length,
      anomalyPercentage,
      mostSevereAnomaly: anomalies.length > 0 ? anomalies[0] : undefined
    };
  } catch (error) {
    logger.error('Error detecting access pattern anomalies', { error, sensitivity, lookbackPeriod });
    throw error;
  }
}

/**
 * Check for data quality anomalies
 */
export async function detectDataQualityAnomalies(
  lookbackPeriod: number = 30
): Promise<AnomalyDetectionResult> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - lookbackPeriod);
    
    // Get document data
    const documents = await db
      .select()
      .from(documents)
      .where(
        and(
          gte(documents.createdAt, startDate),
          lte(documents.createdAt, endDate)
        )
      );
    
    const timeSeriesData: TimeSeriesPoint[] = [];
    const anomalies: Anomaly[] = [];
    
    // Group documents by day for time series
    const documentsByDay: Record<string, any[]> = {};
    
    for (const doc of documents) {
      const dateKey = new Date(doc.createdAt).toISOString().split('T')[0];
      if (!documentsByDay[dateKey]) {
        documentsByDay[dateKey] = [];
      }
      documentsByDay[dateKey].push(doc);
    }
    
    // Check for quality issues
    for (const dateKey in documentsByDay) {
      const docs = documentsByDay[dateKey];
      const timestamp = new Date(dateKey);
      
      // Calculate metrics
      const totalDocs = docs.length;
      let missingTitleCount = 0;
      let missingContentCount = 0;
      let duplicateTitleCount = 0;
      
      // Check for missing data
      docs.forEach(doc => {
        if (!doc.title || doc.title.trim() === '') {
          missingTitleCount++;
        }
        if (!doc.content || doc.content.trim() === '') {
          missingContentCount++;
        }
      });
      
      // Check for duplicates
      const titles = docs.map(doc => doc.title);
      const uniqueTitles = new Set(titles);
      duplicateTitleCount = titles.length - uniqueTitles.size;
      
      // Calculate quality score (higher is worse)
      const qualityIssuePercentage = totalDocs > 0 
        ? ((missingTitleCount + missingContentCount + duplicateTitleCount) / totalDocs) * 100
        : 0;
      
      timeSeriesData.push({
        timestamp,
        value: qualityIssuePercentage
      });
      
      // Add anomaly if quality issues exceed threshold
      if (qualityIssuePercentage > 20) { // More than 20% of documents have issues
        let severity: 'low' | 'medium' | 'high';
        
        if (qualityIssuePercentage > 50) {
          severity = 'high';
        } else if (qualityIssuePercentage > 30) {
          severity = 'medium';
        } else {
          severity = 'low';
        }
        
        anomalies.push({
          timestamp,
          value: qualityIssuePercentage,
          expectedValue: 0, // Ideally, we want 0% issues
          deviation: qualityIssuePercentage,
          severity,
          metricType: 'data_quality',
          entityType: 'document'
        });
      }
    }
    
    // Sort anomalies by severity
    anomalies.sort((a, b) => b.value - a.value);
    
    const anomalyPercentage = timeSeriesData.length > 0 
      ? (anomalies.length / timeSeriesData.length) * 100 
      : 0;
    
    return {
      anomalies,
      totalDataPoints: timeSeriesData.length,
      anomalyPercentage,
      mostSevereAnomaly: anomalies.length > 0 ? anomalies[0] : undefined
    };
  } catch (error) {
    logger.error('Error detecting data quality anomalies', { error, lookbackPeriod });
    throw error;
  }
}