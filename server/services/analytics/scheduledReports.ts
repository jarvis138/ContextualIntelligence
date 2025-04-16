/**
 * Scheduled Reports Service
 * 
 * This service provides capabilities for generating and scheduling regular reports
 * on project metrics and performance indicators.
 */

import { db } from '../../db';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { projects, tasks, activities, users, reports, reportSubscriptions } from '@shared/schema';
import { logger } from '../observability';
import nodemailer from 'nodemailer';
import cron from 'node-cron';
import { analyzeTrend } from './trendAnalysis';
import { analyzeProjectRisks, predictProjectCompletion } from './predictiveAnalytics';
import { detectAnomalies } from './anomalyDetection';

// Types for report generation
export interface ReportConfig {
  reportType: 'project' | 'team' | 'system';
  frequency: 'daily' | 'weekly' | 'monthly';
  entityId?: number; // Project ID or Team ID if applicable
  metrics: string[]; // Array of metrics to include
  includeAnomalies?: boolean;
  includePredictions?: boolean;
  includeRisks?: boolean;
  recipients: string[]; // Email addresses
}

export interface ReportData {
  id: string;
  title: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  summary: string;
  sections: ReportSection[];
}

export interface ReportSection {
  title: string;
  content: string;
  charts?: any[]; // Chart configuration
  tables?: any[]; // Table data
  metrics?: {
    name: string;
    value: number;
    change?: number;
    status?: 'positive' | 'negative' | 'neutral';
  }[];
}

// Store active cron jobs for scheduled reports
const activeReportJobs: Map<string, cron.ScheduledTask> = new Map();

// Initialize email transport
const emailTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || ''
  }
});

/**
 * Generate a report based on configuration
 */
export async function generateReport(config: ReportConfig): Promise<ReportData> {
  try {
    // Determine time period for report
    const now = new Date();
    const periodEnd = new Date(now);
    const periodStart = new Date(now);
    
    switch (config.frequency) {
      case 'daily':
        periodStart.setDate(periodEnd.getDate() - 1);
        break;
      case 'weekly':
        periodStart.setDate(periodEnd.getDate() - 7);
        break;
      case 'monthly':
        periodStart.setMonth(periodEnd.getMonth() - 1);
        break;
    }
    
    // Create report structure
    const reportId = `${config.reportType}-${config.entityId || 'all'}-${Date.now()}`;
    const reportData: ReportData = {
      id: reportId,
      title: generateReportTitle(config),
      generatedAt: now,
      period: {
        start: periodStart,
        end: periodEnd
      },
      summary: '',
      sections: []
    };
    
    // Add different sections based on report type
    switch (config.reportType) {
      case 'project':
        await addProjectSections(reportData, config, periodStart, periodEnd);
        break;
      case 'team':
        await addTeamSections(reportData, config, periodStart, periodEnd);
        break;
      case 'system':
        await addSystemSections(reportData, config, periodStart, periodEnd);
        break;
    }
    
    // Generate summary based on sections
    reportData.summary = generateSummary(reportData);
    
    // Store report in database
    await storeReport(reportData, config);
    
    return reportData;
  } catch (error) {
    logger.error('Error generating report', { error, config });
    throw error;
  }
}

/**
 * Schedule a report to be generated regularly
 */
export async function scheduleReport(config: ReportConfig): Promise<{ id: string; nextRunDate: Date }> {
  try {
    // Validate recipients
    if (!config.recipients || config.recipients.length === 0) {
      throw new Error('No recipients specified for scheduled report');
    }
    
    // Generate schedule ID
    const scheduleId = `${config.reportType}-${config.entityId || 'all'}-${Date.now()}`;
    
    // Determine cron expression based on frequency
    let cronExpression: string;
    let nextRunDate = new Date();
    
    switch (config.frequency) {
      case 'daily':
        // Run daily at 6:00 AM
        cronExpression = '0 6 * * *';
        nextRunDate.setHours(6, 0, 0, 0);
        if (nextRunDate < new Date()) {
          nextRunDate.setDate(nextRunDate.getDate() + 1);
        }
        break;
        
      case 'weekly':
        // Run weekly on Monday at 7:00 AM
        cronExpression = '0 7 * * 1';
        nextRunDate.setHours(7, 0, 0, 0);
        const dayOfWeek = nextRunDate.getDay();
        const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
        nextRunDate.setDate(nextRunDate.getDate() + daysUntilMonday);
        break;
        
      case 'monthly':
        // Run monthly on the 1st at 8:00 AM
        cronExpression = '0 8 1 * *';
        nextRunDate.setDate(1);
        nextRunDate.setHours(8, 0, 0, 0);
        if (nextRunDate < new Date()) {
          nextRunDate.setMonth(nextRunDate.getMonth() + 1);
        }
        break;
        
      default:
        throw new Error(`Unsupported frequency: ${config.frequency}`);
    }
    
    // Store subscription in database
    const [subscription] = await db
      .insert(reportSubscriptions)
      .values({
        id: scheduleId,
        type: config.reportType,
        entityId: config.entityId || null,
        frequency: config.frequency,
        recipients: config.recipients.join(','),
        metrics: config.metrics.join(','),
        includeAnomalies: config.includeAnomalies || false,
        includePredictions: config.includePredictions || false,
        includeRisks: config.includeRisks || false,
        nextRunAt: nextRunDate,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // Schedule the report generation job
    const job = cron.schedule(cronExpression, async () => {
      try {
        logger.info('Running scheduled report', { scheduleId });
        
        // Generate report
        const report = await generateReport(config);
        
        // Send report to recipients
        await sendReportEmail(report, config.recipients);
        
        // Update next run time
        const updatedRunDate = new Date();
        switch (config.frequency) {
          case 'daily':
            updatedRunDate.setDate(updatedRunDate.getDate() + 1);
            updatedRunDate.setHours(6, 0, 0, 0);
            break;
          case 'weekly':
            updatedRunDate.setDate(updatedRunDate.getDate() + 7);
            updatedRunDate.setHours(7, 0, 0, 0);
            break;
          case 'monthly':
            updatedRunDate.setMonth(updatedRunDate.getMonth() + 1);
            updatedRunDate.setDate(1);
            updatedRunDate.setHours(8, 0, 0, 0);
            break;
        }
        
        await db
          .update(reportSubscriptions)
          .set({
            lastRunAt: new Date(),
            nextRunAt: updatedRunDate,
            updatedAt: new Date()
          })
          .where(eq(reportSubscriptions.id, scheduleId));
      } catch (error) {
        logger.error('Error running scheduled report', { error, scheduleId });
      }
    });
    
    // Store job reference
    activeReportJobs.set(scheduleId, job);
    
    return {
      id: scheduleId,
      nextRunDate
    };
  } catch (error) {
    logger.error('Error scheduling report', { error, config });
    throw error;
  }
}

/**
 * Cancel a scheduled report
 */
export async function cancelScheduledReport(scheduleId: string): Promise<boolean> {
  try {
    // Stop the cron job
    const job = activeReportJobs.get(scheduleId);
    if (job) {
      job.stop();
      activeReportJobs.delete(scheduleId);
    }
    
    // Mark as cancelled in database
    const result = await db
      .update(reportSubscriptions)
      .set({
        active: false,
        updatedAt: new Date()
      })
      .where(eq(reportSubscriptions.id, scheduleId));
    
    return true;
  } catch (error) {
    logger.error('Error cancelling scheduled report', { error, scheduleId });
    throw error;
  }
}

/**
 * Send report via email
 */
async function sendReportEmail(report: ReportData, recipients: string[]): Promise<void> {
  try {
    // Basic HTML template for email
    const emailHtml = generateEmailHtml(report);
    
    // Send email
    const info = await emailTransport.sendMail({
      from: process.env.EMAIL_FROM || 'cpi-hub@example.com',
      to: recipients.join(','),
      subject: `${report.title} - ${formatDate(report.generatedAt)}`,
      html: emailHtml
    });
    
    logger.info('Report email sent', { reportId: report.id, messageId: info.messageId });
  } catch (error) {
    logger.error('Error sending report email', { error, reportId: report.id });
    throw error;
  }
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Generate a title for the report
 */
function generateReportTitle(config: ReportConfig): string {
  let baseTitle = '';
  
  switch (config.reportType) {
    case 'project':
      baseTitle = config.entityId ? 'Project Performance Report' : 'Projects Overview Report';
      break;
    case 'team':
      baseTitle = config.entityId ? 'Team Performance Report' : 'Teams Overview Report';
      break;
    case 'system':
      baseTitle = 'System Performance Report';
      break;
  }
  
  let frequencyPrefix = '';
  switch (config.frequency) {
    case 'daily':
      frequencyPrefix = 'Daily';
      break;
    case 'weekly':
      frequencyPrefix = 'Weekly';
      break;
    case 'monthly':
      frequencyPrefix = 'Monthly';
      break;
  }
  
  return `${frequencyPrefix} ${baseTitle}`;
}

/**
 * Generate a summary for the report
 */
function generateSummary(report: ReportData): string {
  // Extract key points from sections
  const keyPoints: string[] = [];
  
  report.sections.forEach(section => {
    if (section.metrics) {
      const significantMetrics = section.metrics.filter(m => 
        m.status === 'positive' || m.status === 'negative'
      );
      
      if (significantMetrics.length > 0) {
        significantMetrics.slice(0, 2).forEach(metric => {
          const direction = metric.change && metric.change > 0 ? 'increased' : 'decreased';
          const magnitude = metric.change ? Math.abs(metric.change) : 0;
          if (magnitude > 5) {
            keyPoints.push(`${metric.name} ${direction} by ${magnitude.toFixed(1)}%`);
          }
        });
      }
    }
  });
  
  // Create summary
  let summary = `This report covers the period from ${formatDate(report.period.start)} to ${formatDate(report.period.end)}. `;
  
  if (keyPoints.length > 0) {
    summary += 'Key highlights: ' + keyPoints.join('; ') + '.';
  } else {
    summary += 'No significant changes observed during this period.';
  }
  
  return summary;
}

/**
 * Add project-specific sections to the report
 */
async function addProjectSections(
  report: ReportData,
  config: ReportConfig,
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  // Get project details if specific project
  let projectName = 'All Projects';
  if (config.entityId) {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, config.entityId));
    
    if (project) {
      projectName = project.name;
    }
  }
  
  // Add overview section
  const overviewSection: ReportSection = {
    title: `${projectName} Overview`,
    content: `Performance overview for ${projectName} from ${formatDate(periodStart)} to ${formatDate(periodEnd)}.`,
    metrics: []
  };
  
  // Get activity counts
  const activitiesQuery = config.entityId 
    ? db
        .select({ count: sql`COUNT(*)` })
        .from(activities)
        .where(
          and(
            eq(activities.entityType, 'project'),
            eq(activities.entityId, config.entityId),
            gte(activities.timestamp, periodStart),
            lte(activities.timestamp, periodEnd)
          )
        )
    : db
        .select({ count: sql`COUNT(*)` })
        .from(activities)
        .where(
          and(
            eq(activities.entityType, 'project'),
            gte(activities.timestamp, periodStart),
            lte(activities.timestamp, periodEnd)
          )
        );
  
  const [activityResult] = await activitiesQuery;
  const activityCount = activityResult?.count || 0;
  
  // Get previous period activity count for comparison
  const previousStart = new Date(periodStart);
  const previousEnd = new Date(periodEnd);
  const periodDurationMs = periodEnd.getTime() - periodStart.getTime();
  
  previousStart.setTime(previousStart.getTime() - periodDurationMs);
  previousEnd.setTime(previousEnd.getTime() - periodDurationMs);
  
  const previousActivitiesQuery = config.entityId 
    ? db
        .select({ count: sql`COUNT(*)` })
        .from(activities)
        .where(
          and(
            eq(activities.entityType, 'project'),
            eq(activities.entityId, config.entityId),
            gte(activities.timestamp, previousStart),
            lte(activities.timestamp, previousEnd)
          )
        )
    : db
        .select({ count: sql`COUNT(*)` })
        .from(activities)
        .where(
          and(
            eq(activities.entityType, 'project'),
            gte(activities.timestamp, previousStart),
            lte(activities.timestamp, previousEnd)
          )
        );
  
  const [previousActivityResult] = await previousActivitiesQuery;
  const previousActivityCount = previousActivityResult?.count || 0;
  
  // Calculate change
  const activityChange = previousActivityCount > 0 
    ? ((activityCount - previousActivityCount) / previousActivityCount) * 100 
    : 0;
  
  // Add to metrics
  overviewSection.metrics?.push({
    name: 'Activity Count',
    value: activityCount,
    change: activityChange,
    status: activityChange > 5 ? 'positive' : activityChange < -5 ? 'negative' : 'neutral'
  });
  
  // Get task metrics
  const tasksQuery = config.entityId 
    ? db
        .select({
          total: sql`COUNT(*)`,
          completed: sql`COUNT(CASE WHEN status = 'completed' THEN 1 ELSE NULL END)`,
          inProgress: sql`COUNT(CASE WHEN status = 'in_progress' THEN 1 ELSE NULL END)`,
          blocked: sql`COUNT(CASE WHEN status = 'blocked' THEN 1 ELSE NULL END)`
        })
        .from(tasks)
        .where(eq(tasks.projectId, config.entityId))
    : db
        .select({
          total: sql`COUNT(*)`,
          completed: sql`COUNT(CASE WHEN status = 'completed' THEN 1 ELSE NULL END)`,
          inProgress: sql`COUNT(CASE WHEN status = 'in_progress' THEN 1 ELSE NULL END)`,
          blocked: sql`COUNT(CASE WHEN status = 'blocked' THEN 1 ELSE NULL END)`
        })
        .from(tasks);
  
  const [taskMetrics] = await tasksQuery;
  
  if (taskMetrics) {
    const completionRate = taskMetrics.total > 0 
      ? (taskMetrics.completed / taskMetrics.total) * 100 
      : 0;
    
    overviewSection.metrics?.push({
      name: 'Task Completion Rate',
      value: parseFloat(completionRate.toFixed(1)),
      status: completionRate > 70 ? 'positive' : completionRate < 30 ? 'negative' : 'neutral'
    });
    
    overviewSection.metrics?.push({
      name: 'Blocked Tasks',
      value: taskMetrics.blocked,
      status: taskMetrics.blocked > 5 ? 'negative' : 'positive'
    });
  }
  
  report.sections.push(overviewSection);
  
  // Add task status section
  if (taskMetrics) {
    const taskStatusSection: ReportSection = {
      title: 'Task Status Summary',
      content: 'Overview of task statuses and completion rates.',
      tables: [
        {
          headers: ['Status', 'Count', 'Percentage'],
          rows: [
            ['Completed', taskMetrics.completed, `${((taskMetrics.completed / taskMetrics.total) * 100).toFixed(1)}%`],
            ['In Progress', taskMetrics.inProgress, `${((taskMetrics.inProgress / taskMetrics.total) * 100).toFixed(1)}%`],
            ['Blocked', taskMetrics.blocked, `${((taskMetrics.blocked / taskMetrics.total) * 100).toFixed(1)}%`],
            ['Total', taskMetrics.total, '100%']
          ]
        }
      ]
    };
    
    report.sections.push(taskStatusSection);
  }
  
  // Add risk assessment if requested
  if (config.includeRisks && config.entityId) {
    try {
      const riskAnalysis = await analyzeProjectRisks(config.entityId);
      
      const riskSection: ReportSection = {
        title: 'Risk Assessment',
        content: `Current risk assessment for ${projectName}.`,
        metrics: [
          {
            name: 'Risk Score',
            value: Math.round(riskAnalysis.riskScore),
            status: riskAnalysis.riskScore > 70 ? 'negative' : 
                    riskAnalysis.riskScore > 30 ? 'neutral' : 'positive'
          }
        ],
        tables: [
          {
            headers: ['Risk Factor', 'Impact', 'Description'],
            rows: riskAnalysis.factors.map(factor => [
              factor.factor,
              `${Math.round(factor.impact * 100)}%`,
              factor.description
            ])
          }
        ]
      };
      
      report.sections.push(riskSection);
    } catch (error) {
      logger.warn('Error adding risk assessment to report', { error, projectId: config.entityId });
    }
  }
  
  // Add predictions if requested
  if (config.includePredictions && config.entityId) {
    try {
      const completionPrediction = await predictProjectCompletion(config.entityId);
      
      const predictionSection: ReportSection = {
        title: 'Project Predictions',
        content: 'Predictions based on current project metrics and historical data.',
        metrics: [
          {
            name: 'Predicted Completion Date',
            value: 0, // Special handling in template
            status: 'neutral'
          },
          {
            name: 'Delay Probability',
            value: Math.round(completionPrediction.delayProbability * 100),
            status: completionPrediction.delayProbability > 0.5 ? 'negative' : 'positive'
          }
        ],
        tables: completionPrediction.riskFactors.length > 0 ? [
          {
            headers: ['Risk Factors'],
            rows: completionPrediction.riskFactors.map(factor => [factor])
          }
        ] : undefined
      };
      
      // Store completion date for template rendering
      predictionSection.tables = predictionSection.tables || [];
      predictionSection.tables.push({
        headers: ['Metric', 'Value'],
        rows: [
          ['Predicted Completion Date', formatDate(completionPrediction.predictedCompletionDate)],
          ['Confidence', `${Math.round(completionPrediction.confidence * 100)}%`]
        ]
      });
      
      report.sections.push(predictionSection);
    } catch (error) {
      logger.warn('Error adding predictions to report', { error, projectId: config.entityId });
    }
  }
  
  // Add anomalies if requested
  if (config.includeAnomalies) {
    try {
      const anomalyConfig = {
        entityType: 'project' as const,
        metricType: 'count' as const,
        sensitivity: 'medium' as const,
        lookbackPeriod: 30,
        entityId: config.entityId
      };
      
      const anomalyResults = await detectAnomalies(anomalyConfig);
      
      if (anomalyResults.anomalies.length > 0) {
        const anomalySection: ReportSection = {
          title: 'Detected Anomalies',
          content: 'Unusual patterns detected in project metrics.',
          tables: [
            {
              headers: ['Date', 'Metric', 'Value', 'Expected', 'Deviation', 'Severity'],
              rows: anomalyResults.anomalies.slice(0, 5).map(anomaly => [
                formatDate(anomaly.timestamp),
                anomaly.metricType,
                anomaly.value.toFixed(2),
                anomaly.expectedValue.toFixed(2),
                `${(anomaly.deviation * 100).toFixed(1)}%`,
                anomaly.severity.charAt(0).toUpperCase() + anomaly.severity.slice(1)
              ])
            }
          ]
        };
        
        report.sections.push(anomalySection);
      }
    } catch (error) {
      logger.warn('Error adding anomalies to report', { error });
    }
  }
}

/**
 * Add team-specific sections to the report
 */
async function addTeamSections(
  report: ReportData,
  config: ReportConfig,
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  // Similar implementation to project sections, but focused on team metrics
  // Implementing basic structure for now
  const teamSection: ReportSection = {
    title: 'Team Performance',
    content: 'Overview of team activity and performance metrics.',
    metrics: []
  };
  
  // Get team information if specific team
  if (config.entityId) {
    const [team] = await db
      .select()
      .from('teams') // Assuming teams table exists
      .where(eq(sql`id`, config.entityId));
    
    if (team) {
      teamSection.title = `${team.name} Performance`;
    }
  }
  
  // Add team activity metrics
  // ... implementation details similar to project sections
  
  report.sections.push(teamSection);
}

/**
 * Add system-specific sections to the report
 */
async function addSystemSections(
  report: ReportData,
  config: ReportConfig,
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  // System performance metrics
  const systemSection: ReportSection = {
    title: 'System Performance',
    content: 'Overview of system performance and health metrics.',
    metrics: []
  };
  
  // ... implementation details
  
  report.sections.push(systemSection);
}

/**
 * Store report in database
 */
async function storeReport(report: ReportData, config: ReportConfig): Promise<void> {
  try {
    await db
      .insert(reports)
      .values({
        id: report.id,
        title: report.title,
        type: config.reportType,
        entityId: config.entityId || null,
        content: JSON.stringify(report),
        createdAt: new Date(),
        periodStart: report.period.start,
        periodEnd: report.period.end
      });
  } catch (error) {
    logger.error('Error storing report', { error, reportId: report.id });
    throw error;
  }
}

/**
 * Generate HTML for email
 */
function generateEmailHtml(report: ReportData): string {
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .report-header { margin-bottom: 20px; }
        .report-section { margin-bottom: 30px; }
        .section-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #2c3e50; }
        .metrics { display: flex; flex-wrap: wrap; margin-bottom: 20px; }
        .metric { margin-right: 20px; margin-bottom: 10px; }
        .metric-name { font-weight: bold; font-size: 14px; }
        .metric-value { font-size: 20px; font-weight: bold; }
        .positive { color: #27ae60; }
        .negative { color: #e74c3c; }
        .neutral { color: #7f8c8d; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <div class="report-header">
        <h1>${report.title}</h1>
        <p><strong>Period:</strong> ${formatDate(report.period.start)} to ${formatDate(report.period.end)}</p>
        <p>${report.summary}</p>
      </div>
  `;
  
  // Add sections
  report.sections.forEach(section => {
    html += `
      <div class="report-section">
        <div class="section-title">${section.title}</div>
        <p>${section.content}</p>
    `;
    
    // Add metrics
    if (section.metrics && section.metrics.length > 0) {
      html += '<div class="metrics">';
      
      section.metrics.forEach(metric => {
        html += `
          <div class="metric">
            <div class="metric-name">${metric.name}</div>
            <div class="metric-value ${metric.status || 'neutral'}">
              ${metric.value.toLocaleString()}
              ${metric.change ? (metric.change > 0 ? `↑ ${metric.change.toFixed(1)}%` : `↓ ${Math.abs(metric.change).toFixed(1)}%`) : ''}
            </div>
          </div>
        `;
      });
      
      html += '</div>';
    }
    
    // Add tables
    if (section.tables && section.tables.length > 0) {
      section.tables.forEach(table => {
        if (table.headers && table.rows) {
          html += '<table>';
          
          // Add headers
          html += '<tr>';
          table.headers.forEach(header => {
            html += `<th>${header}</th>`;
          });
          html += '</tr>';
          
          // Add rows
          table.rows.forEach(row => {
            html += '<tr>';
            row.forEach(cell => {
              html += `<td>${cell}</td>`;
            });
            html += '</tr>';
          });
          
          html += '</table>';
        }
      });
    }
    
    html += '</div>';
  });
  
  html += `
      <div style="color: #7f8c8d; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
        This is an automated report generated by CPI Hub. Please do not reply to this email.
      </div>
    </body>
    </html>
  `;
  
  return html;
}

/**
 * Initialize scheduled reports from database
 */
export async function initializeScheduledReports(): Promise<void> {
  try {
    // Get all active report subscriptions
    const subscriptions = await db
      .select()
      .from(reportSubscriptions)
      .where(eq(reportSubscriptions.active, true));
    
    logger.info('Initializing scheduled reports', { count: subscriptions.length });
    
    // Schedule each report
    for (const subscription of subscriptions) {
      try {
        // Convert database record to config
        const config: ReportConfig = {
          reportType: subscription.type as 'project' | 'team' | 'system',
          frequency: subscription.frequency as 'daily' | 'weekly' | 'monthly',
          entityId: subscription.entityId || undefined,
          metrics: subscription.metrics ? subscription.metrics.split(',') : [],
          includeAnomalies: subscription.includeAnomalies || false,
          includePredictions: subscription.includePredictions || false,
          includeRisks: subscription.includeRisks || false,
          recipients: subscription.recipients ? subscription.recipients.split(',') : []
        };
        
        // Determine cron expression
        let cronExpression: string;
        switch (subscription.frequency) {
          case 'daily':
            cronExpression = '0 6 * * *'; // 6:00 AM every day
            break;
          case 'weekly':
            cronExpression = '0 7 * * 1'; // 7:00 AM every Monday
            break;
          case 'monthly':
            cronExpression = '0 8 1 * *'; // 8:00 AM on the 1st of each month
            break;
          default:
            cronExpression = '0 6 * * *'; // Default to daily
        }
        
        // Schedule job
        const job = cron.schedule(cronExpression, async () => {
          try {
            logger.info('Running scheduled report', { subscriptionId: subscription.id });
            
            // Generate report
            const report = await generateReport(config);
            
            // Send report to recipients
            await sendReportEmail(report, config.recipients);
            
            // Update last run time and next run time
            const now = new Date();
            const nextRun = new Date(now);
            
            switch (subscription.frequency) {
              case 'daily':
                nextRun.setDate(nextRun.getDate() + 1);
                nextRun.setHours(6, 0, 0, 0);
                break;
              case 'weekly':
                nextRun.setDate(nextRun.getDate() + 7);
                nextRun.setHours(7, 0, 0, 0);
                break;
              case 'monthly':
                nextRun.setMonth(nextRun.getMonth() + 1);
                nextRun.setDate(1);
                nextRun.setHours(8, 0, 0, 0);
                break;
            }
            
            await db
              .update(reportSubscriptions)
              .set({
                lastRunAt: now,
                nextRunAt: nextRun,
                updatedAt: now
              })
              .where(eq(reportSubscriptions.id, subscription.id));
          } catch (error) {
            logger.error('Error running scheduled report', { error, subscriptionId: subscription.id });
          }
        });
        
        // Store job reference
        activeReportJobs.set(subscription.id, job);
        
        logger.info('Scheduled report initialized', { 
          subscriptionId: subscription.id,
          type: subscription.type,
          frequency: subscription.frequency
        });
      } catch (error) {
        logger.error('Error scheduling report', { error, subscriptionId: subscription.id });
      }
    }
  } catch (error) {
    logger.error('Error initializing scheduled reports', { error });
  }
}