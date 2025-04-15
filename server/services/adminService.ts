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
  systemMetricTypeEnum,
  systemEventSeverityEnum,
  backupStatusEnum
} from "@shared/schema";
import { desc, eq, sql, and, gte, lte, SQL } from "drizzle-orm";
import { Pool, QueryResult } from "@neondatabase/serverless";

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
    type?: (typeof systemMetricTypeEnum.enumValues)[number],
    limit: number = 100,
    startDate?: Date,
    endDate?: Date
  ): Promise<SystemMetric[]> {
    const query = db.select().from(systemMetrics);
    const conditions: SQL<unknown>[] = [];

    if (type) {
      conditions.push(eq(systemMetrics.type, type));
    }

    if (startDate && endDate) {
      conditions.push(
        and(
          gte(systemMetrics.timestamp, startDate),
          lte(systemMetrics.timestamp, endDate)
        )
      );
    } else if (startDate) {
      conditions.push(gte(systemMetrics.timestamp, startDate));
    } else if (endDate) {
      conditions.push(lte(systemMetrics.timestamp, endDate));
    }

    if (conditions.length > 0) {
      return query
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(systemMetrics.timestamp))
        .limit(limit);
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
    severity?: (typeof systemEventSeverityEnum.enumValues)[number],
    source?: string,
    limit: number = 100,
    acknowledged?: boolean
  ): Promise<SystemEvent[]> {
    const query = db.select().from(systemEvents);
    const conditions: SQL<unknown>[] = [];

    if (severity) {
      conditions.push(eq(systemEvents.severity, severity));
    }

    if (source) {
      conditions.push(eq(systemEvents.source, source));
    }

    if (acknowledged !== undefined) {
      conditions.push(eq(systemEvents.acknowledged, acknowledged));
    }

    if (conditions.length > 0) {
      return query
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(systemEvents.timestamp))
        .limit(limit);
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
    status?: (typeof backupStatusEnum.enumValues)[number],
    limit: number = 50
  ): Promise<Backup[]> {
    const query = db.select().from(backups);
    const conditions: SQL<unknown>[] = [];

    if (status) {
      conditions.push(eq(backups.status, status));
    }

    if (conditions.length > 0) {
      return query
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(backups.createdAt))
        .limit(limit);
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
    const query = db.select().from(auditLogs);
    const conditions: SQL<unknown>[] = [];

    if (userId) {
      conditions.push(eq(auditLogs.userId, userId));
    }

    if (action) {
      conditions.push(eq(auditLogs.action, action));
    }

    if (entityType) {
      conditions.push(eq(auditLogs.entityType, entityType));
    }

    if (conditions.length > 0) {
      return query
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(auditLogs.timestamp))
        .limit(limit);
    }

    return query
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
  }

  /**
   * Get database statistics
   * @returns Database statistics including table counts
   */
  public async getDatabaseStats(): Promise<{
    tableStats: QueryResult<Record<string, unknown>>;
    databaseSize?: Record<string, unknown>;
    indexStats: QueryResult<Record<string, unknown>>;
    error?: string;
  }> {
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
      const dbSizeResult = await db.execute(sql`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as db_size
      `);

      // Get the first row from the result
      const dbSize = dbSizeResult.rows && dbSizeResult.rows.length > 0 
        ? dbSizeResult.rows[0] as Record<string, unknown>
        : undefined;

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
        databaseSize: dbSize,
        indexStats
      };
    } catch (error) {
      console.error("Error getting database stats:", error);
      return { 
        tableStats: { rows: [] } as QueryResult<Record<string, unknown>>,
        indexStats: { rows: [] } as QueryResult<Record<string, unknown>>,
        error: "Failed to retrieve database statistics" 
      };
    }
  }

  /**
   * Get system performance metrics from the database
   * @returns System performance metrics
   */
  public async getSystemPerformance(): Promise<{
    cpu: SystemMetric[];
    memory: SystemMetric[];
    api: SystemMetric[];
    error?: string;
  }> {
    try {
      // Get CPU metrics
      const cpuMetrics = await db.select()
        .from(systemMetrics)
        .where(eq(systemMetrics.type, systemMetricTypeEnum.enumValues[1])) // "cpu"
        .orderBy(desc(systemMetrics.timestamp))
        .limit(50);

      // Get memory metrics
      const memoryMetrics = await db.select()
        .from(systemMetrics)
        .where(eq(systemMetrics.type, systemMetricTypeEnum.enumValues[2])) // "memory"
        .orderBy(desc(systemMetrics.timestamp))
        .limit(50);

      // Get API metrics
      const apiMetrics = await db.select()
        .from(systemMetrics)
        .where(eq(systemMetrics.type, systemMetricTypeEnum.enumValues[5])) // "api"
        .orderBy(desc(systemMetrics.timestamp))
        .limit(50);

      return {
        cpu: cpuMetrics,
        memory: memoryMetrics,
        api: apiMetrics
      };
    } catch (error) {
      console.error("Error getting system performance:", error);
      return { 
        cpu: [],
        memory: [],
        api: [],
        error: "Failed to retrieve system performance metrics" 
      };
    }
  }
}

export const adminService = new AdminService();