/**
 * Task Controller
 * 
 * This module provides controller functions for task-related API endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { createSuccessResponse, createPaginatedResponse } from '../utils/apiResponse';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/apiError';
import { z } from 'zod';

// Task status enum
const TaskStatus = ['pending', 'in_progress', 'review', 'completed', 'blocked'] as const;

// Schema for task creation validation
const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(TaskStatus).default('pending'),
  projectId: z.number().int().positive(),
  assigneeId: z.number().int().positive().optional(),
  teamId: z.number().int().positive().optional(),
  dueDate: z.string().datetime().optional(),
});

// Schema for task update validation
const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(TaskStatus).optional(),
  assigneeId: z.number().int().positive().nullish(),
  teamId: z.number().int().positive().nullish(),
  dueDate: z.string().datetime().nullish(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field is required for update'
});

/**
 * Get all tasks with pagination and filtering
 */
export async function getTasks(req: Request, res: Response, next: NextFunction) {
  try {
    // Get pagination parameters from query
    const page = parseInt(req.query.page as string || '1');
    const pageSize = parseInt(req.query.pageSize as string || '10');
    
    // Get filter parameters
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    const status = req.query.status as string;
    const assigneeId = req.query.assigneeId ? parseInt(req.query.assigneeId as string) : undefined;
    const teamId = req.query.teamId ? parseInt(req.query.teamId as string) : undefined;
    
    // Get tasks from storage with filtering
    // Assuming getTasks will be implemented in storage with filtering options
    const tasks = []; // await storage.getTasks({ projectId, status, assigneeId, teamId });
    
    // Apply pagination in memory (this would ideally be done at the database level)
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedTasks = tasks.slice(start, end);
    
    // Return paginated response
    return res.json(createPaginatedResponse(
      paginatedTasks,
      tasks.length,
      page,
      pageSize
    ));
  } catch (error) {
    next(error);
  }
}

/**
 * Get task by ID
 */
export async function getTaskById(req: Request, res: Response, next: NextFunction) {
  try {
    const taskId = parseInt(req.params.id);
    
    if (isNaN(taskId)) {
      throw new BadRequestError('Invalid task ID');
    }
    
    // Get task from storage
    // Assuming getTask will be implemented in storage
    const task = null; // await storage.getTask(taskId);
    
    if (!task) {
      throw new NotFoundError('Task not found');
    }
    
    // Check if user has access to the task
    // This would check project membership and user's role/permissions
    
    return res.json(createSuccessResponse(task));
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new task
 */
export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate request body
    const taskData = createTaskSchema.parse(req.body);
    
    // Check if the project exists
    // Assuming getProject will be implemented in storage
    const project = null; // await storage.getProject(taskData.projectId);
    
    if (!project) {
      throw new BadRequestError('Project not found');
    }
    
    // Check if user has permission to create tasks in this project
    // This would check project membership and user's role/permissions
    
    // Check if assignee exists if assigneeId is provided
    if (taskData.assigneeId) {
      const assignee = await storage.getUser(taskData.assigneeId);
      
      if (!assignee) {
        throw new BadRequestError('Assignee not found');
      }
    }
    
    // Check if team exists if teamId is provided
    if (taskData.teamId) {
      // Assuming getTeam will be implemented in storage
      const team = null; // await storage.getTeam(taskData.teamId);
      
      if (!team) {
        throw new BadRequestError('Team not found');
      }
    }
    
    // Parse dueDate if provided
    const dueDate = taskData.dueDate ? new Date(taskData.dueDate) : undefined;
    
    // Create task
    const newTask = {
      id: 1, // This would be set by the database
      ...taskData,
      dueDate,
      createdAt: new Date(),
      updatedAt: new Date()
    }; // await storage.createTask({ ...taskData, dueDate });
    
    return res.status(201).json(createSuccessResponse(newTask));
  } catch (error) {
    next(error);
  }
}

/**
 * Update an existing task
 */
export async function updateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const taskId = parseInt(req.params.id);
    
    if (isNaN(taskId)) {
      throw new BadRequestError('Invalid task ID');
    }
    
    // Validate request body
    const taskData = updateTaskSchema.parse(req.body);
    
    // Get existing task
    // Assuming getTask will be implemented in storage
    const existingTask = null; // await storage.getTask(taskId);
    
    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }
    
    // Check if user has permission to update this task
    // This would check project membership, task assignment, and user's role/permissions
    
    // Check if assignee exists if assigneeId is provided
    if (taskData.assigneeId !== undefined && taskData.assigneeId !== null) {
      const assignee = await storage.getUser(taskData.assigneeId);
      
      if (!assignee) {
        throw new BadRequestError('Assignee not found');
      }
    }
    
    // Check if team exists if teamId is provided
    if (taskData.teamId !== undefined && taskData.teamId !== null) {
      // Assuming getTeam will be implemented in storage
      const team = null; // await storage.getTeam(taskData.teamId);
      
      if (!team) {
        throw new BadRequestError('Team not found');
      }
    }
    
    // Parse dueDate if provided
    const dueDate = taskData.dueDate ? new Date(taskData.dueDate) : existingTask.dueDate;
    
    // Update task
    const updatedTask = {
      ...existingTask,
      ...taskData,
      dueDate,
      updatedAt: new Date()
    }; // await storage.updateTask(taskId, { ...taskData, dueDate });
    
    return res.json(createSuccessResponse(updatedTask));
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a task
 */
export async function deleteTask(req: Request, res: Response, next: NextFunction) {
  try {
    const taskId = parseInt(req.params.id);
    
    if (isNaN(taskId)) {
      throw new BadRequestError('Invalid task ID');
    }
    
    // Get existing task
    // Assuming getTask will be implemented in storage
    const existingTask = null; // await storage.getTask(taskId);
    
    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }
    
    // Check if user has permission to delete this task
    // This would check project ownership, task assignment, and user's role/permissions
    
    // Delete task
    // Assuming deleteTask will be implemented in storage
    // await storage.deleteTask(taskId);
    
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
}

/**
 * Get task comments
 */
export async function getTaskComments(req: Request, res: Response, next: NextFunction) {
  try {
    const taskId = parseInt(req.params.id);
    
    if (isNaN(taskId)) {
      throw new BadRequestError('Invalid task ID');
    }
    
    // Get existing task
    // Assuming getTask will be implemented in storage
    const existingTask = null; // await storage.getTask(taskId);
    
    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }
    
    // Check if user has access to the task
    // This would check project membership and user's role/permissions
    
    // Get task comments
    // Assuming getTaskComments will be implemented in storage
    const comments = []; // await storage.getTaskComments(taskId);
    
    return res.json(createSuccessResponse(comments));
  } catch (error) {
    next(error);
  }
}

/**
 * Add comment to task
 */
export async function addTaskComment(req: Request, res: Response, next: NextFunction) {
  try {
    const taskId = parseInt(req.params.id);
    
    if (isNaN(taskId)) {
      throw new BadRequestError('Invalid task ID');
    }
    
    // Validate request body
    const { content } = req.body;
    
    if (!content || typeof content !== 'string') {
      throw new BadRequestError('Comment content is required');
    }
    
    // Get existing task
    // Assuming getTask will be implemented in storage
    const existingTask = null; // await storage.getTask(taskId);
    
    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }
    
    // Check if user has access to the task
    // This would check project membership and user's role/permissions
    
    // Add comment
    // Assuming addTaskComment will be implemented in storage
    const newComment = {
      id: 1, // This would be set by the database
      content,
      userId: req.user?.id,
      entityType: 'task',
      entityId: taskId,
      createdAt: new Date(),
      updatedAt: new Date()
    }; // await storage.addComment({ content, userId: req.user.id, entityType: 'task', entityId: taskId });
    
    return res.status(201).json(createSuccessResponse(newComment));
  } catch (error) {
    next(error);
  }
}