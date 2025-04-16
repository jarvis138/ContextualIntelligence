/**
 * AI API Hooks
 * 
 * This file provides React hooks for interacting with the AI API endpoints.
 * These hooks handle data fetching, error handling, and state management.
 */

import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Entity,
  Relation,
  DocumentAnalysis,
  ProjectInsight,
  SentimentAnalysis,
  EntitiesResponse,
  RelationsResponse,
  DocumentAnalysisResponse,
  ProjectInsightsResponse,
  SentimentResponse,
  SummarizeResponse,
  ProjectInsightsRequest
} from '@/types/ai-types';
import { useToast } from './use-toast';

/**
 * Hook for extracting entities from text
 */
export function useEntityExtraction() {
  const { toast } = useToast();
  
  return useMutation<Entity[], Error, string>({
    mutationFn: async (text: string) => {
      const response = await apiRequest('POST', '/api/ai/entities', { text });
      const data = await response.json() as EntitiesResponse;
      return data.entities;
    },
    onError: (error) => {
      toast({
        title: 'Entity extraction failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
}

/**
 * Hook for extracting relations from text
 */
export function useRelationExtraction() {
  const { toast } = useToast();
  
  return useMutation<Relation[], Error, { text: string; entities?: Entity[] }>({
    mutationFn: async ({ text, entities }) => {
      const response = await apiRequest('POST', '/api/ai/relations', { text, entities });
      const data = await response.json() as RelationsResponse;
      return data.relations;
    },
    onError: (error) => {
      toast({
        title: 'Relation extraction failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
}

/**
 * Hook for analyzing documents
 */
export function useDocumentAnalysis() {
  const { toast } = useToast();
  
  return useMutation<DocumentAnalysis, Error, string>({
    mutationFn: async (text: string) => {
      const response = await apiRequest('POST', '/api/ai/document-analysis', { text });
      const data = await response.json() as DocumentAnalysisResponse;
      return data.analysis;
    },
    onError: (error) => {
      toast({
        title: 'Document analysis failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
}

/**
 * Hook for generating project insights
 */
export function useProjectInsights() {
  const { toast } = useToast();
  
  return useMutation<ProjectInsight[], Error, ProjectInsightsRequest>({
    mutationFn: async (context) => {
      const response = await apiRequest('POST', '/api/ai/project-insights', context);
      const data = await response.json() as ProjectInsightsResponse;
      return data.insights;
    },
    onError: (error) => {
      toast({
        title: 'Project insights generation failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
}

/**
 * Hook for sentiment analysis
 */
export function useSentimentAnalysis() {
  const { toast } = useToast();
  
  return useMutation<SentimentAnalysis, Error, string>({
    mutationFn: async (text: string) => {
      const response = await apiRequest('POST', '/api/ai/sentiment', { text });
      const data = await response.json() as SentimentResponse;
      return data.sentiment;
    },
    onError: (error) => {
      toast({
        title: 'Sentiment analysis failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
}

/**
 * Hook for text summarization
 */
export function useTextSummarization() {
  const { toast } = useToast();
  
  return useMutation<string, Error, { text: string; maxLength?: number }>({
    mutationFn: async ({ text, maxLength }) => {
      const response = await apiRequest('POST', '/api/ai/summarize', { text, maxLength });
      const data = await response.json() as SummarizeResponse;
      return data.summary;
    },
    onError: (error) => {
      toast({
        title: 'Text summarization failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
}