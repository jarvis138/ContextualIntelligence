/**
 * Metrics Utility
 * 
 * This file exports simplified metrics functions to be used by services,
 * without requiring them to directly access the MetricsService singleton.
 */

import { metricsService } from './metrics';

/**
 * Simple metrics utility object that can be used by services
 */
export const metrics = {
  /**
   * Increment a counter metric
   * @param name The name of the metric to increment
   * @param labels Optional labels to attach to the metric
   * @param value Optional value to increment by (defaults to 1)
   */
  increment(name: string, labels?: Record<string, string>, value: number = 1): void {
    metricsService.increment(name, value, labels);
  },

  /**
   * Set a gauge metric value
   * @param name The name of the metric to set
   * @param value The value to set
   * @param labels Optional labels to attach to the metric
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    metricsService.setGauge(name, value, labels);
  },

  /**
   * Record a histogram value (typically for timings)
   * @param name The name of the metric
   * @param value The value to record
   * @param labels Optional labels to attach to the metric
   */
  histogram(name: string, value: number, labels?: Record<string, string>): void {
    metricsService.recordTiming(name, value, labels);
  },

  /**
   * Start a timer for measuring operation duration
   * Returns a function that, when called, stops the timer and records the duration
   * @param name The name of the timing metric
   * @param labels Optional labels to attach to the metric
   */
  startTimer(name: string, labels?: Record<string, string>): () => number {
    return metricsService.startTimer(name, labels);
  }
};