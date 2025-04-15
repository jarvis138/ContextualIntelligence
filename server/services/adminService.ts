import { db } from "../db";
import {
  systemMetrics,
  systemEvents,
  backups,
  auditLogs,
  insertSystemMetricSchema,
  insertSystemEventSchema,
  insertBackupSchema,
  insertAuditLogSchema,
  type SystemMetric,
  type SystemEvent,
  type Backup,
  type AuditLog,
  type InsertSystemMetric,
  type InsertSystemEvent,
  type InsertBackup,
  type InsertAuditLog,
} from "@shared/schema";
import { desc, eq, sql, and, gte, lte } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";

/**
 * Admin Service for system monitoring and administration
 */
export class AdminService {
  /**
   * Record a system metric
   * @param metric Metric data to record
   * @returns The created metric record
   */
  public async recordMetric(metricData: InsertSystemMetric): Promise<SystemMetric> {
    const validatedData = insertSystemMetricSchema.parse(metricData);
    const [metric] = await db.insert(systemMetrics).values(validatedData).returning();
    return metric;
  }

  /**
   * Get system metrics with optional filtering
   * @param type Optional metric type to filter by
   * @param limit Optional limit on number of records to return
   * @param startDate Optional start date for time range filtering
   * @param endDate Optional end date for time range filtering
   * @returns Array of system metrics
   */
  public async getMetrics(
    type?: string,
    limit: number = 100,
    startDate?: Date,
    endDate?: Date
  ): Promise<SystemMetric[]> {
    let query = db.select().from(systemMetrics);

    if (type) {
      query = query.where(eq(systemMetrics.type, type));
    }

    if (startDate && endDate) {
      query = query.where(
        and(
          gte(systemMetrics.timestamp, startDate),
          lte(systemMetrics.timestamp, endDate)
        )
      );
    } else if (startDate) {
      query = query.where(gte(systemMetrics.timestamp, startDate));
    } else if (endDate) {
      query = query.where(lte(systemMetrics.timestamp, endDate));
    }

    return query
      .orderBy(desc(systemMetrics.timestamp))
      .limit(limit);
  }

  /**
   * Record a system event
   * @param eventData Event data to record
   * @returns The created event record
   */
  public async recordEvent(eventData: InsertSystemEvent): Promise<SystemEvent> {
    const validatedData = insertSystemEventSchema.parse(eventData);
    const [event] = await db.insert(systemEvents).values(validatedData).returning();
    return event;
  }

  /**
   * Get system events with optional filtering
   * @param severity Optional severity level to filter by
   * @param source Optional source to filter by
   * @param limit Optional limit on number of records to return
   * @param acknowledged Optional filter for acknowledged status
   * @returns Array of system events
   */
  public async getEvents(
    severity?: string,
    source?: string,
    limit: number = 100,
    acknowledged?: boolean
  ): Promise<SystemEvent[]> {
    let query = db.select().from(systemEvents);

    if (severity) {
      query = query.where(eq(systemEvents.severity, severity));
    }

    if (source) {
      query = query.where(eq(systemEvents.source, source));
    }

    if (acknowledged !== undefined) {
      query = query.where(eq(systemEvents.acknowledged, acknowledged));
    }

    return query
      .orderBy(desc(systemEvents.timestamp))
      .limit(limit);
  }

  /**
   * Acknowledge a system event
   * @param eventId ID of the event to acknowledge
   * @param userId ID of the user acknowledging the event
   * @returns True if successful, false otherwise
   */
  public async acknowledgeEvent(eventId: number, userId: number): Promise<boolean> {
    try {
      await db.update(systemEvents)
        .set({
          acknowledged: true,
          acknowledgedBy: userId,
          acknowledgedAt: new Date()
        })
        .where(eq(systemEvents.id, eventId));
      return true;
    } catch (error) {
      console.error("Error acknowledging event:", error);
      return false;
    }
  }

  /**
   * Record a backup
   * @param backupData Backup data to record
   * @returns The created backup record
   */
  public async recordBackup(backupData: InsertBackup): Promise<Backup> {
    const validatedData = insertBackupSchema.parse(backupData);
    const [backup] = await db.insert(backups).values(validatedData).returning();
    return backup;
  }

  /**
   * Get backup records with optional filtering
   * @param status Optional status to filter by
   * @param limit Optional limit on number of records to return
   * @returns Array of backup records
   */
  public async getBackups(
    status?: string,
    limit: number = 50
  ): Promise<Backup[]> {
    let query = db.select().from(backups);

    if (status) {
      query = query.where(eq(backups.status, status));
    }

    return query
      .orderBy(desc(backups.createdAt))
      .limit(limit);
  }

  /**
   * Record an audit log entry
   * @param auditData Audit log data to record
   * @returns The created audit log record
   */
  public async recordAuditLog(auditData: InsertAuditLog): Promise<AuditLog> {
    const validatedData = insertAuditLogSchema.parse(auditData);
    const [log] = await db.insert(auditLogs).values(validatedData).returning();
    return log;
  }

  /**
   * Get audit logs with optional filtering
   * @param userId Optional user ID to filter by
   * @param action Optional action to filter by
   * @param entityType Optional entity type to filter by
   * @param limit Optional limit on number of records to return
   * @returns Array of audit logs
   */
  public async getAuditLogs(
    userId?: number,
    action?: string,
    entityType?: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    let query = db.select().from(auditLogs);

    if (userId) {
      query = query.where(eq(auditLogs.userId, userId));
    }

    if (action) {
      query = query.where(eq(auditLogs.action, action));
    }

    if (entityType) {
      query = query.where(eq(auditLogs.entityType, entityType));
    }

    return query
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
  }

  /**
   * Get database statistics
   * @returns Database statistics including table counts
   */
  public async getDatabaseStats(): Promise<any> {
    try {
      // Get table row counts
      const tableStats = await db.execute(sql`
        SELECT 
          tablename, 
          n_live_tup as row_count
        FROM 
          pg_stat_user_tables
        ORDER BY 
          n_live_tup DESC
      `);

      // Get database size
      const dbSize = await db.execute(sql`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as db_size
      `);

      // Get index statistics
      const indexStats = await db.execute(sql`
        SELECT
          indexrelname as index_name,
          relname as table_name,
          idx_scan as index_scans
        FROM
          pg_stat_user_indexes
        ORDER BY
          idx_scan DESC
        LIMIT 20
      `);

      return {
        tableStats,
        databaseSize: dbSize[0],
        indexStats
      };
    } catch (error) {
      console.error("Error getting database stats:", error);
      return { error: "Failed to retrieve database statistics" };
    }
  }

  /**
   * Get system performance metrics from the database
   * @returns System performance metrics
   */
  public async getSystemPerformance(): Promise<any> {
    try {
      // Get CPU metrics
      const cpuMetrics = await db.select()
        .from(systemMetrics)
        .where(eq(systemMetrics.type, "cpu"))
        .orderBy(desc(systemMetrics.timestamp))
        .limit(50);

      // Get memory metrics
      const memoryMetrics = await db.select()
        .from(systemMetrics)
        .where(eq(systemMetrics.type, "memory"))
        .orderBy(desc(systemMetrics.timestamp))
        .limit(50);

      // Get API metrics
      const apiMetrics = await db.select()
        .from(systemMetrics)
        .where(eq(systemMetrics.type, "api"))
        .orderBy(desc(systemMetrics.timestamp))
        .limit(50);

      return {
        cpu: cpuMetrics,
        memory: memoryMetrics,
        api: apiMetrics
      };
    } catch (error) {
      console.error("Error getting system performance:", error);
      return { error: "Failed to retrieve system performance metrics" };
    }
  }
}

export const adminService = new AdminService();