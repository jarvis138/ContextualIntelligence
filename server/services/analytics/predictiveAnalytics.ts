/**
 * Predictive Analytics Service
 * 
 * This service provides predictive analytics capabilities for project data.
 * It uses statistical models to predict future outcomes and identify risk factors.
 */

import { db } from '../../db';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { projects, tasks, activities, users, documents } from '@shared/schema';
import { logger } from '../observability';
import { analyzeTrend, TrendParams, TimeSeriesPoint } from './trendAnalysis';

export interface PredictionResult {
  entityId: number;
  entityType: 'project' | 'task' | 'document';
  predictedValue: number;
  predictedLabel: string;
  confidence: number;
  factors: {
    factor: string;
    weight: number;
  }[];
}

export interface RiskAnalysisResult {
  entityId: number;
  entityType: 'project' | 'task';
  riskScore: number; // 0 to 100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    factor: string;
    impact: number; // 0 to 1
    description: string;
  }[];
}

export interface ProjectCompletionPrediction {
  projectId: number;
  projectName: string;
  predictedCompletionDate: Date;
  confidence: number;
  riskFactors: string[];
  delayProbability: number;
}

/**
 * Predict project completion date
 */
export async function predictProjectCompletion(
  projectId: number
): Promise<ProjectCompletionPrediction> {
  try {
    // Get project information
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    
    if (!project) {
      throw new Error(`Project with id ${projectId} not found`);
    }
    
    // Get tasks for this project
    const projectTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId));
    
    // Get task completion rate trend
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    
    const trendParams: TrendParams = {
      entityType: 'project',
      metricType: 'completion_rate',
      startDate: threeMonthsAgo,
      endDate: now,
      interval: 'day',
      entityId: projectId,
      includeForecasting: true
    };
    
    const trendAnalysis = await analyzeTrend(trendParams);
    
    // Calculate completion metrics
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter(task => task.status === 'completed').length;
    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
    
    // If no tasks or all tasks completed, return now as completion date
    if (totalTasks === 0 || completedTasks === totalTasks) {
      return {
        projectId,
        projectName: project.name,
        predictedCompletionDate: new Date(),
        confidence: 1,
        riskFactors: [],
        delayProbability: 0
      };
    }
    
    // Calculate average task completion time
    const completedTasksWithDates = projectTasks.filter(
      task => task.status === 'completed' && task.completedAt && task.createdAt
    );
    
    let avgCompletionTime = 0;
    if (completedTasksWithDates.length > 0) {
      const completionTimes = completedTasksWithDates.map(task => {
        const created = new Date(task.createdAt!);
        const completed = new Date(task.completedAt!);
        return completed.getTime() - created.getTime();
      });
      
      avgCompletionTime = completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;
    } else {
      // Default to 7 days if no completed tasks with dates
      avgCompletionTime = 7 * 24 * 60 * 60 * 1000;
    }
    
    // Predict completion date based on current rate and remaining tasks
    const remainingTasks = totalTasks - completedTasks;
    const estimatedTimeRemaining = remainingTasks * avgCompletionTime;
    
    // Adjust based on trend direction
    let adjustmentFactor = 1;
    if (trendAnalysis.trend.direction === 'increasing') {
      // Completion rate is increasing, so we may finish earlier
      adjustmentFactor = Math.max(0.7, 1 - trendAnalysis.trend.magnitude);
    } else if (trendAnalysis.trend.direction === 'decreasing') {
      // Completion rate is decreasing, so we may finish later
      adjustmentFactor = Math.min(1.5, 1 + trendAnalysis.trend.magnitude);
    }
    
    const adjustedTimeRemaining = estimatedTimeRemaining * adjustmentFactor;
    const predictedCompletionDate = new Date(now.getTime() + adjustedTimeRemaining);
    
    // Calculate confidence based on trend confidence and data availability
    const confidenceBase = trendAnalysis.trend.confidence;
    const dataAvailabilityFactor = Math.min(1, completedTasksWithDates.length / 10); // max out at 10+ tasks
    const confidence = confidenceBase * 0.7 + dataAvailabilityFactor * 0.3;
    
    // Identify risk factors
    const riskFactors: string[] = [];
    let delayProbability = 0.2; // Base probability
    
    if (trendAnalysis.trend.direction === 'decreasing') {
      riskFactors.push('Decreasing completion rate trend');
      delayProbability += 0.2;
    }
    
    if (completionRate < 0.3) {
      riskFactors.push('Low overall completion rate (<30%)');
      delayProbability += 0.2;
    }
    
    const lastWeek = new Date();
    lastWeek.setDate(now.getDate() - 7);
    
    const recentActivities = await db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, 'project'),
          eq(activities.entityId, projectId),
          gte(activities.timestamp, lastWeek)
        )
      );
    
    if (recentActivities.length < 3) {
      riskFactors.push('Low recent activity');
      delayProbability += 0.1;
    }
    
    // Cap delay probability at 0.9
    delayProbability = Math.min(0.9, delayProbability);
    
    return {
      projectId,
      projectName: project.name,
      predictedCompletionDate,
      confidence,
      riskFactors,
      delayProbability
    };
  } catch (error) {
    logger.error('Error predicting project completion', { error, projectId });
    throw error;
  }
}

/**
 * Analyze risk factors for a project
 */
export async function analyzeProjectRisks(projectId: number): Promise<RiskAnalysisResult> {
  try {
    // Get project information
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    
    if (!project) {
      throw new Error(`Project with id ${projectId} not found`);
    }
    
    // Get tasks for this project
    const projectTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId));
    
    // Calculate risk factors
    const factors: {
      factor: string;
      impact: number;
      description: string;
    }[] = [];
    
    let riskScore = 0;
    
    // Factor 1: Task completion rate
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter(task => task.status === 'completed').length;
    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 1;
    
    const completionRiskImpact = 1 - completionRate;
    riskScore += completionRiskImpact * 30; // 30% weight
    
    if (completionRiskImpact > 0.3) {
      factors.push({
        factor: 'Task completion rate',
        impact: completionRiskImpact,
        description: `${Math.round(completionRate * 100)}% of tasks completed (${completedTasks}/${totalTasks})`
      });
    }
    
    // Factor 2: Recent activity
    const now = new Date();
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(now.getDate() - 14);
    
    const recentActivities = await db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, 'project'),
          eq(activities.entityId, projectId),
          gte(activities.timestamp, twoWeeksAgo)
        )
      );
    
    const activityRiskImpact = recentActivities.length < 5 ? 
      Math.max(0, (5 - recentActivities.length) / 5) : 0;
    
    riskScore += activityRiskImpact * 25; // 25% weight
    
    if (activityRiskImpact > 0.3) {
      factors.push({
        factor: 'Recent activity',
        impact: activityRiskImpact,
        description: `Low recent activity (${recentActivities.length} activities in last 2 weeks)`
      });
    }
    
    // Factor 3: Task distribution
    const inProgressTasks = projectTasks.filter(task => task.status === 'in_progress').length;
    const blockedTasks = projectTasks.filter(task => task.status === 'blocked').length;
    
    const taskDistributionRiskImpact = totalTasks > 0 ? 
      (blockedTasks * 1.5 + inProgressTasks * 0.5) / totalTasks : 0;
    
    riskScore += taskDistributionRiskImpact * 25; // 25% weight
    
    if (blockedTasks > 0) {
      factors.push({
        factor: 'Blocked tasks',
        impact: Math.min(1, blockedTasks / Math.max(1, totalTasks)),
        description: `${blockedTasks} tasks are currently blocked`
      });
    }
    
    // Factor 4: Timeline
    const daysSinceCreation = (now.getTime() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const timelineRiskImpact = Math.min(1, Math.max(0, (daysSinceCreation - 30) / 60));
    
    riskScore += timelineRiskImpact * 20; // 20% weight
    
    if (timelineRiskImpact > 0.3) {
      factors.push({
        factor: 'Project timeline',
        impact: timelineRiskImpact,
        description: `Project has been active for ${Math.round(daysSinceCreation)} days`
      });
    }
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    
    if (riskScore < 25) {
      riskLevel = 'low';
    } else if (riskScore < 50) {
      riskLevel = 'medium';
    } else if (riskScore < 75) {
      riskLevel = 'high';
    } else {
      riskLevel = 'critical';
    }
    
    return {
      entityId: projectId,
      entityType: 'project',
      riskScore,
      riskLevel,
      factors: factors.sort((a, b) => b.impact - a.impact)
    };
  } catch (error) {
    logger.error('Error analyzing project risks', { error, projectId });
    throw error;
  }
}

/**
 * Predict future project metrics
 */
export async function predictFutureMetrics(
  entityType: 'project' | 'task' | 'user' | 'document' | 'activity',
  metricType: 'count' | 'completion_rate' | 'activity_rate',
  timeframe: 'week' | 'month' | 'quarter'
): Promise<{
  current: number;
  predicted: number;
  percentChange: number;
  confidence: number;
}> {
  try {
    // Set up time ranges
    const now = new Date();
    const pastStartDate = new Date();
    const futureEndDate = new Date();
    
    // Set past period for analysis
    switch (timeframe) {
      case 'week':
        pastStartDate.setDate(now.getDate() - 28); // 4 weeks back
        futureEndDate.setDate(now.getDate() + 7); // 1 week ahead
        break;
      case 'month':
        pastStartDate.setMonth(now.getMonth() - 3); // 3 months back
        futureEndDate.setMonth(now.getMonth() + 1); // 1 month ahead
        break;
      case 'quarter':
        pastStartDate.setMonth(now.getMonth() - 6); // 6 months back
        futureEndDate.setMonth(now.getMonth() + 3); // 3 months ahead
        break;
    }
    
    // Get trend analysis
    const trendParams: TrendParams = {
      entityType,
      metricType,
      startDate: pastStartDate,
      endDate: now,
      interval: timeframe === 'week' ? 'day' : 'week',
      includeForecasting: true
    };
    
    const trendAnalysis = await analyzeTrend(trendParams);
    
    // Get current metric value (average of last 3 data points)
    const recentPoints = trendAnalysis.data.slice(-3);
    const current = recentPoints.length > 0 
      ? recentPoints.reduce((sum, point) => sum + point.value, 0) / recentPoints.length
      : 0;
    
    // Use forecast if available, otherwise extrapolate from trend
    let predicted: number;
    let confidence: number;
    
    if (trendAnalysis.forecast && trendAnalysis.forecast.length > 0) {
      const forecastPoints = trendAnalysis.forecast;
      predicted = forecastPoints.reduce((sum, point) => sum + point.value, 0) / forecastPoints.length;
      confidence = trendAnalysis.trend.confidence;
    } else {
      // Simple extrapolation based on trend
      const multiplier = 
        trendAnalysis.trend.direction === 'increasing' ? 1 + trendAnalysis.trend.magnitude :
        trendAnalysis.trend.direction === 'decreasing' ? 1 - trendAnalysis.trend.magnitude :
        1;
      
      predicted = current * multiplier;
      confidence = trendAnalysis.trend.confidence * 0.7; // Lower confidence for simple extrapolation
    }
    
    // Calculate percent change
    const percentChange = current !== 0 
      ? ((predicted - current) / current) * 100 
      : 0;
    
    return {
      current,
      predicted,
      percentChange,
      confidence
    };
  } catch (error) {
    logger.error('Error predicting future metrics', { error, entityType, metricType, timeframe });
    throw error;
  }
}