/**
 * Pipeline Utility
 * 
 * Provides a flexible pipeline pattern for processing data through multiple stages.
 * Used for document processing workflows, text extraction, and analysis.
 */

/**
 * Pipeline stage processor function type
 */
export type PipelineStageProcessor<T, U> = (input: T, context?: any) => Promise<U>;

/**
 * Pipeline stage definition
 */
export interface PipelineStage<T, U> {
  name: string;
  processor: PipelineStageProcessor<T, U>;
  enabled?: boolean;
}

/**
 * Pipeline execution result
 */
export interface PipelineResult<T> {
  data: T;
  stageResults: {
    stageName: string;
    success: boolean;
    error?: Error;
    duration: number;
  }[];
  startTime: Date;
  endTime: Date;
  durationMs: number;
}

/**
 * Creates a processing pipeline that executes multiple stages in sequence
 */
export function pipeline<T>(...stages: PipelineStage<any, any>[]): {
  execute: (initialInput: any, context?: any) => Promise<PipelineResult<T>>
} {
  return {
    async execute(initialInput: any, context: any = {}): Promise<PipelineResult<T>> {
      const enabledStages = stages.filter(stage => stage.enabled !== false);
      let currentInput = initialInput;
      const startTime = new Date();
      const stageResults: any[] = [];
      
      // Process each stage in sequence
      for (const stage of enabledStages) {
        const stageStartTime = Date.now();
        
        try {
          // Execute the stage processor
          currentInput = await stage.processor(currentInput, context);
          
          // Record stage result
          stageResults.push({
            stageName: stage.name,
            success: true,
            duration: Date.now() - stageStartTime
          });
        } catch (error) {
          // Record stage error
          stageResults.push({
            stageName: stage.name,
            success: false,
            error,
            duration: Date.now() - stageStartTime
          });
          
          // Log the error
          console.error(`Pipeline stage [${stage.name}] failed:`, error);
          
          // Stop pipeline on error
          break;
        }
      }
      
      const endTime = new Date();
      
      return {
        data: currentInput as T,
        stageResults,
        startTime,
        endTime,
        durationMs: endTime.getTime() - startTime.getTime()
      };
    }
  };
}

/**
 * Creates a simple stage for a pipeline
 */
export function createStage<T, U>(
  name: string,
  processor: PipelineStageProcessor<T, U>,
  enabled = true
): PipelineStage<T, U> {
  return { name, processor, enabled };
}

/**
 * Create conditional pipeline stage that only executes if condition is met
 */
export function conditionalStage<T>(
  name: string,
  condition: (input: T, context?: any) => Promise<boolean> | boolean,
  processor: PipelineStageProcessor<T, T>
): PipelineStage<T, T> {
  return {
    name,
    async processor(input: T, context?: any): Promise<T> {
      const shouldProcess = await condition(input, context);
      
      if (shouldProcess) {
        return processor(input, context);
      }
      
      return input; // Skip processing
    }
  };
}

/**
 * Create a branching pipeline stage that applies different processors based on conditions
 */
export function branchStage<T>(
  name: string,
  branches: {
    condition: (input: T, context?: any) => Promise<boolean> | boolean;
    processor: PipelineStageProcessor<T, T>;
  }[],
  defaultProcessor?: PipelineStageProcessor<T, T>
): PipelineStage<T, T> {
  return {
    name,
    async processor(input: T, context?: any): Promise<T> {
      // Find the first matching branch
      for (const branch of branches) {
        const shouldProcess = await branch.condition(input, context);
        
        if (shouldProcess) {
          return branch.processor(input, context);
        }
      }
      
      // Use default processor if provided, otherwise return input unchanged
      if (defaultProcessor) {
        return defaultProcessor(input, context);
      }
      
      return input;
    }
  };
}

/**
 * Create a pipeline stage that executes multiple processors in parallel and combines results
 */
export function parallelStage<T, U>(
  name: string,
  processors: PipelineStageProcessor<T, U>[],
  combiner: (results: U[]) => Promise<U> | U
): PipelineStage<T, U> {
  return {
    name,
    async processor(input: T, context?: any): Promise<U> {
      // Execute all processors in parallel
      const results = await Promise.all(
        processors.map(proc => proc(input, context))
      );
      
      // Combine results
      return combiner(results);
    }
  };
}

/**
 * Create a pipeline stage that retries on failure
 */
export function retryStage<T, U>(
  name: string,
  processor: PipelineStageProcessor<T, U>,
  options: {
    maxRetries: number;
    delayMs?: number;
    backoff?: boolean;
    retryIf?: (error: Error) => boolean;
  }
): PipelineStage<T, U> {
  return {
    name,
    async processor(input: T, context?: any): Promise<U> {
      let lastError: Error;
      
      for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
        try {
          return await processor(input, context);
        } catch (error) {
          lastError = error as Error;
          
          // Check if we should retry this error
          if (options.retryIf && !options.retryIf(error as Error)) {
            throw error;
          }
          
          // If this was the last attempt, throw the error
          if (attempt === options.maxRetries) {
            throw error;
          }
          
          // Calculate delay
          let delay = options.delayMs || 100;
          if (options.backoff) {
            delay *= Math.pow(2, attempt);
          }
          
          // Wait before next attempt
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // This should never be reached, but TypeScript requires a return
      throw lastError!;
    }
  };
}