/**
 * API Response Utilities
 * 
 * This module provides standardized response formatting for all API endpoints
 * to ensure consistent response structure throughout the application.
 */

export interface ApiResponseMeta {
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    pages: number;
  };
  timestamp?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiResponseMeta;
}

/**
 * Create a successful API response
 * 
 * @param data The data to include in the response
 * @param meta Optional metadata for the response
 * @returns A standardized successful API response
 */
export function createSuccessResponse<T>(data: T, meta?: ApiResponseMeta): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      ...meta,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Create an error API response
 * 
 * @param code Error code for client identification
 * @param message User-friendly error message
 * @param details Additional error details (for debugging)
 * @returns A standardized error API response
 */
export function createErrorResponse(code: string, message: string, details?: any): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Create a paginated response
 * 
 * @param data The paginated data to include in the response
 * @param total Total number of items
 * @param page Current page number
 * @param pageSize Number of items per page
 * @param additionalMeta Additional metadata to include
 * @returns A standardized paginated API response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
  additionalMeta?: Omit<ApiResponseMeta, 'pagination'>
): ApiResponse<T[]> {
  const pages = Math.ceil(total / pageSize);
  
  return {
    success: true,
    data,
    meta: {
      ...additionalMeta,
      pagination: {
        total,
        page,
        pageSize,
        pages
      },
      timestamp: new Date().toISOString()
    }
  };
}