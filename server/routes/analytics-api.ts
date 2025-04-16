/**
 * Analytics API Router
 * 
 * Router for advanced analytics endpoints that provide data visualization and insights.
 * These endpoints support the Phase 4 analytics dashboard features.
 */

import { Router } from 'express';
import { logger } from '../services/observability';
import { authenticateToken } from '../auth';
import { db } from '../db';
import { 
  activities, 
  teams, 
  projects, 
  documents, 
  users, 
  systemEvents 
} from '@shared/schema';
import { eq, and, sql, gte, desc } from 'drizzle-orm';

export const analyticsApiRouter = Router();
const analyticsLogger = logger.createChildLogger({ component: 'AnalyticsAPI' });

// Apply authentication middleware for all analytics routes
analyticsApiRouter.use(authenticateToken);

// Helper function to parse time range
function parseTimeRange(timeRange: string): Date {
  const now = new Date();
  
  switch(timeRange) {
    case '7d':
      return new Date(now.setDate(now.getDate() - 7));
    case '30d':
      return new Date(now.setDate(now.getDate() - 30));
    case '90d':
      return new Date(now.setDate(now.getDate() - 90));
    case 'year':
      return new Date(now.setFullYear(now.getFullYear() - 1));
    default:
      return new Date(now.setDate(now.getDate() - 30)); // Default to 30 days
  }
}

// Get overall metrics for the dashboard
analyticsApiRouter.get('/metrics', async (req, res) => {
  try {
    const timeRange = req.query.timeRange as string || '30d';
    const fromDate = parseTimeRange(timeRange);
    
    // Get project metrics
    const [projectsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(projects);
    
    const [activeProjectsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(
        and(
          eq(projects.status, 'active'),
          eq(projects.isArchived, false)
        )
      );
    
    // Get document metrics
    const [documentsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(documents);
    
    const [recentDocumentsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(gte(documents.createdAt, fromDate));
    
    // Get user metrics
    const [usersCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    
    const [activeUsersCount] = await db
      .select({ count: sql<number>`count(distinct("userId"))` })
      .from(activities)
      .where(gte(activities.timestamp, fromDate));
    
    const [newUsersCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(gte(users.createdAt, fromDate));
    
    // Get completion rate
    // Calculate as percentage of completed tasks compared to total tasks
    const [completionMetrics] = await db
      .select({
        total: sql<number>`count(*)`,
        completed: sql<number>`sum(case when "status" = 'completed' then 1 else 0 end)`
      })
      .from(projects);
    
    const completionRate = Math.round(
      (completionMetrics.completed / completionMetrics.total) * 100
    ) || 0;
    
    // Calculate growth rates (simplified for demo)
    const projectsGrowth = Math.round((activeProjectsCount.count / projectsCount.count) * 100) - 80;
    const documentsGrowth = Math.round((recentDocumentsCount.count / documentsCount.count) * 100) - 90;
    const usersGrowth = Math.round((newUsersCount.count / usersCount.count) * 100) - 95;
    
    res.json({
      totalProjects: projectsCount.count,
      activeProjects: activeProjectsCount.count,
      projectsGrowth,
      
      totalDocuments: documentsCount.count,
      processedDocuments: recentDocumentsCount.count,
      documentsGrowth,
      
      totalUsers: usersCount.count,
      activeUsers: activeUsersCount.count,
      newUsers: newUsersCount.count, 
      usersGrowth,
      
      completionRate
    });
  } catch (error) {
    analyticsLogger.error('Error fetching metrics data', { error });
    res.status(500).json({ error: 'Failed to fetch metrics data' });
  }
});

// Get team data for charts
analyticsApiRouter.get('/teams', async (req, res) => {
  try {
    const teamsData = await db
      .select({
        id: teams.id,
        name: teams.name,
        progress: sql<number>`coalesce((
          select avg(case when p.status = 'completed' then 100
                 when p.status = 'in_progress' then p."completionPercentage"
                 else 0 end)
          from ${projects} p
          where p."teamId" = ${teams.id}
        ), 0)`.as('progress'),
        memberCount: sql<number>`(
          select count(*) from "teamMembers" tm
          where tm."teamId" = ${teams.id}
        )`.as('memberCount'),
        taskCount: sql<number>`(
          select count(*) from ${projects} p
          where p."teamId" = ${teams.id}
        )`.as('taskCount')
      })
      .from(teams)
      .where(eq(teams.isArchived, false));
    
    res.json(teamsData);
  } catch (error) {
    analyticsLogger.error('Error fetching teams data', { error });
    res.status(500).json({ error: 'Failed to fetch teams data' });
  }
});

// Get activity data for charts
analyticsApiRouter.get('/activities', async (req, res) => {
  try {
    const timeRange = req.query.timeRange as string || '30d';
    const fromDate = parseTimeRange(timeRange);
    
    const activitiesData = await db
      .select({
        id: activities.id,
        type: activities.type,
        projectId: activities.projectId,
        userId: activities.userId,
        timestamp: activities.timestamp,
        details: activities.details
      })
      .from(activities)
      .where(gte(activities.timestamp, fromDate))
      .orderBy(desc(activities.timestamp))
      .limit(1000);
    
    res.json(activitiesData);
  } catch (error) {
    analyticsLogger.error('Error fetching activities data', { error });
    res.status(500).json({ error: 'Failed to fetch activities data' });
  }
});

// Get anomaly alerts
analyticsApiRouter.get('/anomalies', async (req, res) => {
  try {
    const timeRange = req.query.timeRange as string || '30d';
    const fromDate = parseTimeRange(timeRange);
    
    // Get system events marked as anomalies
    const anomalies = await db
      .select({
        id: systemEvents.id,
        type: systemEvents.type,
        description: systemEvents.message,
        severity: systemEvents.severity,
        timeDetected: systemEvents.timestamp
      })
      .from(systemEvents)
      .where(
        and(
          gte(systemEvents.timestamp, fromDate),
          eq(systemEvents.category, 'anomaly')
        )
      )
      .orderBy(desc(systemEvents.timestamp))
      .limit(10);
    
    // Transform timestamps to relative time
    const anomaliesWithRelativeTime = anomalies.map(anomaly => {
      const timestamp = new Date(anomaly.timeDetected);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
      
      let relativeTime;
      if (diffInSeconds < 60) {
        relativeTime = `${diffInSeconds} seconds ago`;
      } else if (diffInSeconds < 3600) {
        relativeTime = `${Math.floor(diffInSeconds / 60)} minutes ago`;
      } else if (diffInSeconds < 86400) {
        relativeTime = `${Math.floor(diffInSeconds / 3600)} hours ago`;
      } else {
        relativeTime = `${Math.floor(diffInSeconds / 86400)} days ago`;
      }
      
      return {
        ...anomaly,
        timeDetected: relativeTime
      };
    });
    
    res.json(anomaliesWithRelativeTime);
  } catch (error) {
    analyticsLogger.error('Error fetching anomalies data', { error });
    res.status(500).json({ error: 'Failed to fetch anomalies data' });
  }
});

// Get relationship data for visualization
analyticsApiRouter.get('/relationships', async (req, res) => {
  try {
    const { focusId, sourceType, maxNodes = 50, minScore = 0.1 } = req.query;
    const filter = req.query.filter as string;
    const strengthFilter = parseFloat(req.query.strengthFilter as string) || 0.1;
    
    // For now, return placeholder data for the relationship graph
    // In a real implementation, this would fetch data from the relationship discovery service
    
    // Get data from the relationship discovery service
    const relationshipData = await fetch(`${process.env.API_BASE_URL}/api/relationships`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.headers.authorization?.split(' ')[1]}`
      },
      body: JSON.stringify({
        focusId,
        sourceType,
        maxNodes: parseInt(maxNodes as string),
        minScore,
        filter: filter !== 'all' ? filter : undefined,
        strengthFilter
      })
    }).then(res => res.json());
    
    res.json(relationshipData);
  } catch (error) {
    analyticsLogger.error('Error fetching relationship data', { error });
    res.status(500).json({ error: 'Failed to fetch relationship data' });
  }
});

analyticsLogger.info('Analytics API router initialized');