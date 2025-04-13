import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeProjectData, generateInsights } from '../../services/nlp';
import { Project } from '../../../shared/schema';

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    summary: 'This is a test summary',
                    insights: [
                      {
                        type: 'warning',
                        content: 'Test warning insight',
                        confidence: 0.85
                      },
                      {
                        type: 'success',
                        content: 'Test success insight',
                        confidence: 0.92
                      }
                    ],
                    status: 'on track',
                    recommendations: ['Test recommendation 1', 'Test recommendation 2']
                  })
                }
              }
            ]
          })
        }
      }
    }))
  };
});

describe('NLP Service', () => {
  let mockProject: Project;

  beforeEach(() => {
    mockProject = {
      id: 1,
      name: 'Test Project',
      description: 'This is a test project',
      startDate: new Date(),
      endDate: new Date(),
      status: 'in_progress',
      progress: 50,
      ownerId: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Reset environment variables for testing
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  describe('analyzeProjectData', () => {
    it('should analyze project data and return properly formatted results', async () => {
      const result = await analyzeProjectData(mockProject, [], [], [], []);
      
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('recommendations');
      
      expect(result.summary).toBe('This is a test summary');
      expect(result.insights).toHaveLength(2);
      expect(result.insights[0].type).toBe('warning');
      expect(result.insights[1].type).toBe('success');
      expect(result.status).toBe('on track');
      expect(result.recommendations).toHaveLength(2);
    });

    it('should throw an error if the API key is not set', async () => {
      delete process.env.OPENAI_API_KEY;
      
      await expect(analyzeProjectData(mockProject, [], [], [], [])).rejects.toThrow();
    });
  });

  describe('generateInsights', () => {
    it('should generate insights for a project', async () => {
      const results = await generateInsights(mockProject, [], [], [], []);
      
      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('warning');
      expect(results[1].type).toBe('success');
    });
  });
});