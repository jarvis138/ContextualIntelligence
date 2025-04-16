/**
 * Trend Analysis Service
 * 
 * This service provides analytics and trend detection capabilities for project data.
 * It analyzes time-series data to identify patterns, trends, and anomalies.
 */

import { db } from '../../db';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { projects, tasks, activities, users, documents } from '@shared/schema';
import { logger } from '../observability';

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
}

export interface TrendAnalysisResult {
  data: TimeSeriesPoint[];
  trend: {
    direction: 'increasing' | 'decreasing' | 'stable';
    magnitude: number; // Rate of change
    confidence: number; // 0 to 1
  };
  seasonality?: {
    detected: boolean;
    period?: number; // Days
    strength?: number; // 0 to 1
  };
  forecast?: TimeSeriesPoint[]; // Predicted future values
}

export interface TrendParams {
  entityType: 'project' | 'task' | 'user' | 'document' | 'activity';
  metricType: 'count' | 'completion_rate' | 'activity_rate' | 'processing_time';
  startDate: Date;
  endDate: Date;
  interval: 'day' | 'week' | 'month';
  entityId?: number;
  includeForecasting?: boolean;
}

/**
 * Perform trend analysis on time series data
 */
export async function analyzeTrend(params: TrendParams): Promise<TrendAnalysisResult> {
  try {
    // Get time series data
    const timeSeriesData = await getTimeSeriesData(params);
    
    // Calculate trend direction and magnitude
    const trend = calculateTrend(timeSeriesData);
    
    // Check for seasonality
    const seasonality = detectSeasonality(timeSeriesData);
    
    // Generate forecast if requested
    let forecast: TimeSeriesPoint[] | undefined;
    if (params.includeForecasting) {
      forecast = generateForecast(timeSeriesData, trend, seasonality);
    }
    
    return {
      data: timeSeriesData,
      trend,
      seasonality,
      forecast
    };
  } catch (error) {
    logger.error('Error in trend analysis', { error, params });
    throw new Error('Failed to perform trend analysis');
  }
}

/**
 * Get time series data based on parameters
 */
async function getTimeSeriesData(params: TrendParams): Promise<TimeSeriesPoint[]> {
  const { entityType, metricType, startDate, endDate, interval, entityId } = params;
  
  // Define the interval expression based on the specified interval
  let timeGrouping: any;
  if (interval === 'day') {
    timeGrouping = sql`DATE_TRUNC('day', timestamp)`;
  } else if (interval === 'week') {
    timeGrouping = sql`DATE_TRUNC('week', timestamp)`;
  } else {
    timeGrouping = sql`DATE_TRUNC('month', timestamp)`;
  }
  
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
          .from(projects)
          .where(
            and(
              entityId ? eq(projects.id, entityId) : sql`1=1`,
              gte(projects.createdAt, startDate),
              lte(projects.createdAt, endDate)
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
        .from(tasks)
        .where(
          and(
            entityId ? eq(tasks.id, entityId) : sql`1=1`,
            gte(tasks.createdAt, startDate),
            lte(tasks.createdAt, endDate)
          )
        )
        .groupBy(timeGrouping)
        .orderBy(timeGrouping);
        break;
        
      case 'activity':
        query = db.select({
          timestamp: timeGrouping.as('timestamp'),
          value: sql`COUNT(*)`.as('value')
        })
        .from(activities)
        .where(
          and(
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
          value: sql`COUNT(DISTINCT ${activities.userId})`.as('value')
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
        .from(documents)
        .where(
          and(
            entityId ? eq(documents.id, entityId) : sql`1=1`,
            gte(documents.createdAt, startDate),
            lte(documents.createdAt, endDate)
          )
        )
        .groupBy(timeGrouping)
        .orderBy(timeGrouping);
        break;
        
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
    
    // Execute query
    const result = await query;
    
    // Transform and fill gaps in the time series
    return fillTimeSeriesGaps(result, startDate, endDate, interval);
  } catch (error) {
    logger.error('Error fetching time series data', { error, params });
    throw error;
  }
}

/**
 * Fill gaps in time series data with zero values
 */
function fillTimeSeriesGaps(
  data: TimeSeriesPoint[], 
  startDate: Date, 
  endDate: Date, 
  interval: 'day' | 'week' | 'month'
): TimeSeriesPoint[] {
  const filledData: TimeSeriesPoint[] = [];
  const dataMap = new Map<string, number>();
  
  // Create a map of existing data points
  data.forEach(point => {
    const dateKey = point.timestamp.toISOString().split('T')[0];
    dataMap.set(dateKey, point.value);
  });
  
  // Fill in all points in the date range
  const current = new Date(startDate);
  const intervalMs = 
    interval === 'day' ? 86400000 : 
    interval === 'week' ? 604800000 : 
    2592000000; // month (30 days)
  
  while (current <= endDate) {
    const dateKey = current.toISOString().split('T')[0];
    filledData.push({
      timestamp: new Date(current),
      value: dataMap.get(dateKey) || 0
    });
    
    // Move to next interval
    current.setTime(current.getTime() + intervalMs);
  }
  
  return filledData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Calculate the trend direction and magnitude
 */
function calculateTrend(data: TimeSeriesPoint[]): {
  direction: 'increasing' | 'decreasing' | 'stable';
  magnitude: number;
  confidence: number;
} {
  if (data.length < 2) {
    return {
      direction: 'stable',
      magnitude: 0,
      confidence: 0
    };
  }
  
  // Simple linear regression for trend
  const n = data.length;
  const xValues = data.map((_, i) => i);
  const yValues = data.map(point => point.value);
  
  // Calculate means
  const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
  const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;
  
  // Calculate slope (m) and y-intercept (b) for y = mx + b
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
    denominator += Math.pow(xValues[i] - xMean, 2);
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  
  // Calculate coefficient of determination (R²) for confidence
  const predictedYValues = xValues.map(x => slope * x + (yMean - slope * xMean));
  const ssRes = yValues.reduce((sum, y, i) => sum + Math.pow(y - predictedYValues[i], 2), 0);
  const ssTot = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const rSquared = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;
  
  // Normalize the magnitude to be between 0 and 1
  // We'll use the percentage change over the period, capped at 100%
  const firstValue = data[0].value;
  const lastValue = data[data.length - 1].value;
  const percentChange = firstValue !== 0 ? 
    Math.abs((lastValue - firstValue) / firstValue) : 0;
  const normalizedMagnitude = Math.min(1, percentChange);
  
  return {
    direction: slope > 0.05 ? 'increasing' : slope < -0.05 ? 'decreasing' : 'stable',
    magnitude: normalizedMagnitude,
    confidence: Math.max(0, Math.min(1, rSquared)) // Ensure it's between 0 and 1
  };
}

/**
 * Detect seasonality in time series data
 */
function detectSeasonality(data: TimeSeriesPoint[]): {
  detected: boolean;
  period?: number;
  strength?: number;
} {
  // Need enough data points to detect seasonality
  if (data.length < 14) {
    return { detected: false };
  }
  
  // Detrend the data (simple differencing)
  const values = data.map(point => point.value);
  const diffValues: number[] = [];
  
  for (let i = 1; i < values.length; i++) {
    diffValues.push(values[i] - values[i-1]);
  }
  
  // Use autocorrelation to find periodicity
  const maxLag = Math.floor(diffValues.length / 2);
  const acf: number[] = [];
  
  for (let lag = 1; lag <= maxLag; lag++) {
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < diffValues.length - lag; i++) {
      numerator += diffValues[i] * diffValues[i + lag];
      denominator += diffValues[i] * diffValues[i];
    }
    
    acf.push(denominator !== 0 ? numerator / denominator : 0);
  }
  
  // Find peaks in autocorrelation function (simple peak detection)
  const peaks: number[] = [];
  
  for (let i = 1; i < acf.length - 1; i++) {
    if (acf[i] > acf[i-1] && acf[i] > acf[i+1] && acf[i] > 0.2) {
      peaks.push(i + 1); // +1 because we're using 1-based lag
    }
  }
  
  if (peaks.length === 0) {
    return { detected: false };
  }
  
  // Use the first significant peak as the period
  const period = peaks[0];
  const strength = acf[period - 1]; // -1 to convert back to 0-based index
  
  return {
    detected: true,
    period,
    strength
  };
}

/**
 * Generate forecast for future values
 */
function generateForecast(
  data: TimeSeriesPoint[],
  trend: { direction: string; magnitude: number; confidence: number },
  seasonality: { detected: boolean; period?: number; strength?: number }
): TimeSeriesPoint[] {
  // If we don't have enough data, return empty forecast
  if (data.length < 3) {
    return [];
  }
  
  const forecastPeriods = 5; // Forecast the next 5 periods
  const lastTimestamp = data[data.length - 1].timestamp;
  const lastValue = data[data.length - 1].value;
  const forecast: TimeSeriesPoint[] = [];
  
  // Calculate interval in milliseconds
  const interval = data.length > 1 
    ? (data[1].timestamp.getTime() - data[0].timestamp.getTime()) 
    : 86400000; // Default to 1 day
  
  // Simple trend-based forecasting
  const trendFactor = 
    trend.direction === 'increasing' ? trend.magnitude :
    trend.direction === 'decreasing' ? -trend.magnitude : 0;
  
  for (let i = 1; i <= forecastPeriods; i++) {
    const forecastTimestamp = new Date(lastTimestamp.getTime() + interval * i);
    
    // Start with trend-based forecast
    let forecastValue = lastValue * (1 + trendFactor * i);
    forecastValue = Math.max(0, forecastValue); // No negative values
    
    // Add seasonality if detected
    if (seasonality.detected && seasonality.period && seasonality.strength) {
      const seasonIndex = (data.length + i) % seasonality.period;
      if (seasonIndex < data.length) {
        const seasonalEffect = data[seasonIndex].value - 
          (data[seasonIndex > 0 ? seasonIndex - 1 : 0].value);
        forecastValue += seasonalEffect * (seasonality.strength || 0);
      }
    }
    
    forecast.push({
      timestamp: forecastTimestamp,
      value: forecastValue
    });
  }
  
  return forecast;
}

/**
 * Get top metrics for a given entity
 */
export async function getTopMetrics(
  entityType: 'project' | 'user' | 'task', 
  limit: number = 5
): Promise<{ id: number; name: string; value: number }[]> {
  try {
    let query;
    
    switch (entityType) {
      case 'project':
        // Top projects by activity count
        query = db
          .select({
            id: projects.id,
            name: projects.name,
            value: sql`COUNT(${activities.id})`.as('activity_count')
          })
          .from(projects)
          .leftJoin(activities, eq(activities.entityId, projects.id))
          .where(eq(activities.entityType, 'project'))
          .groupBy(projects.id, projects.name)
          .orderBy(desc(sql`activity_count`))
          .limit(limit);
        break;
        
      case 'user':
        // Top users by activity count
        query = db
          .select({
            id: users.id,
            name: users.username,
            value: sql`COUNT(${activities.id})`.as('activity_count')
          })
          .from(users)
          .leftJoin(activities, eq(activities.userId, users.id))
          .groupBy(users.id, users.username)
          .orderBy(desc(sql`activity_count`))
          .limit(limit);
        break;
        
      case 'task':
        // Top tasks by activity time spent
        query = db
          .select({
            id: tasks.id,
            name: tasks.title,
            value: sql`COUNT(${activities.id})`.as('activity_count')
          })
          .from(tasks)
          .leftJoin(activities, eq(activities.entityId, tasks.id))
          .where(eq(activities.entityType, 'task'))
          .groupBy(tasks.id, tasks.title)
          .orderBy(desc(sql`activity_count`))
          .limit(limit);
        break;
        
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
    
    return await query;
  } catch (error) {
    logger.error('Error fetching top metrics', { error, entityType });
    throw error;
  }
}