/**
 * Task API Routes
 * 
 * This module defines the API routes for task management.
 */

import { Router } from 'express';
import { 
  getTasks, 
  getTaskById, 
  createTask, 
  updateTask, 
  deleteTask,
  getTaskComments,
  addTaskComment
} from '../../controllers/taskController';
import { authenticateToken, authorizeRoles } from '../../middleware/auth';
import { validateBody, validateParams } from '../../middleware/validation';
import { z } from 'zod';

// Create router
const taskRoutes = Router();

// Task status enum
const TaskStatus = ['pending', 'in_progress', 'review', 'completed', 'blocked'] as const;

// Validation schemas
const taskIdParamSchema = z.object({
  id: z.string().refine(val => !isNaN(parseInt(val)), {
    message: 'Task ID must be a valid number'
  })
});

const createTaskBodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(TaskStatus).default('pending'),
  projectId: z.number().int().positive(),
  assigneeId: z.number().int().positive().optional(),
  teamId: z.number().int().positive().optional(),
  dueDate: z.string().datetime().optional(),
});

const updateTaskBodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(TaskStatus).optional(),
  assigneeId: z.number().int().positive().nullish(),
  teamId: z.number().int().positive().nullish(),
  dueDate: z.string().datetime().nullish(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field is required for update'
});

const addCommentBodySchema = z.object({
  content: z.string().min(1)
});

// Routes
// GET /api/tasks - Get all tasks
taskRoutes.get('/',
  authenticateToken,
  getTasks
);

// GET /api/tasks/:id - Get task by ID
taskRoutes.get('/:id',
  authenticateToken,
  validateParams(taskIdParamSchema),
  getTaskById
);

// POST /api/tasks - Create a new task
taskRoutes.post('/',
  authenticateToken,
  validateBody(createTaskBodySchema),
  createTask
);

// PATCH /api/tasks/:id - Update an existing task
taskRoutes.patch('/:id',
  authenticateToken,
  validateParams(taskIdParamSchema),
  validateBody(updateTaskBodySchema),
  updateTask
);

// DELETE /api/tasks/:id - Delete a task
taskRoutes.delete('/:id',
  authenticateToken,
  validateParams(taskIdParamSchema),
  deleteTask
);

// GET /api/tasks/:id/comments - Get task comments
taskRoutes.get('/:id/comments',
  authenticateToken,
  validateParams(taskIdParamSchema),
  getTaskComments
);

// POST /api/tasks/:id/comments - Add comment to task
taskRoutes.post('/:id/comments',
  authenticateToken,
  validateParams(taskIdParamSchema),
  validateBody(addCommentBodySchema),
  addTaskComment
);

export { taskRoutes };