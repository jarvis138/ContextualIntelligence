/**
 * Analytics Services Index
 * 
 * This file exports all analytics-related services for use throughout the application.
 */

export * from './trendAnalysis';
export * from './predictiveAnalytics';
export * from './anomalyDetection';
export * from './scheduledReports';

// Initialize analytics services
import { initializeScheduledReports } from './scheduledReports';
import { logger } from '../observability';

/**
 * Initialize all analytics services
 */
export async function initializeAnalyticsServices(): Promise<void> {
  try {
    logger.info('Initializing analytics services');
    
    // Initialize scheduled reports
    await initializeScheduledReports();
    
    logger.info('Analytics services initialized successfully');
  } catch (error) {
    logger.error('Error initializing analytics services', { error });
    throw error;
  }
}