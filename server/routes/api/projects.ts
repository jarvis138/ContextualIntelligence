/**
 * Project API Routes
 * 
 * This module defines the API routes for project management.
 */

import { Router } from 'express';
import { 
  getProjects, 
  getProjectById, 
  createProject, 
  updateProject, 
  deleteProject,
  getProjectMembers,
  addProjectMember
} from '../../controllers/projectController';
import { authenticateToken, authorizeRoles } from '../../middleware/auth';
import { validateBody, validateParams } from '../../middleware/validation';
import { z } from 'zod';

// Create router
const projectRoutes = Router();

// Project status enum
const ProjectStatus = ['planning', 'active', 'on_hold', 'completed', 'archived'] as const;

// Validation schemas
const projectIdParamSchema = z.object({
  id: z.string().refine(val => !isNaN(parseInt(val)), {
    message: 'Project ID must be a valid number'
  })
});

const createProjectBodySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  status: z.enum(ProjectStatus).default('planning'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateProjectBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  status: z.enum(ProjectStatus).optional(),
  progress: z.number().min(0).max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field is required for update'
});

const addProjectMemberBodySchema = z.object({
  userId: z.number().int().positive()
});

// Routes
// GET /api/projects - Get all projects
projectRoutes.get('/',
  authenticateToken,
  getProjects
);

// GET /api/projects/:id - Get project by ID
projectRoutes.get('/:id',
  authenticateToken,
  validateParams(projectIdParamSchema),
  getProjectById
);

// POST /api/projects - Create a new project
projectRoutes.post('/',
  authenticateToken,
  validateBody(createProjectBodySchema),
  createProject
);

// PATCH /api/projects/:id - Update an existing project
projectRoutes.patch('/:id',
  authenticateToken,
  validateParams(projectIdParamSchema),
  validateBody(updateProjectBodySchema),
  updateProject
);

// DELETE /api/projects/:id - Delete a project
projectRoutes.delete('/:id',
  authenticateToken,
  validateParams(projectIdParamSchema),
  deleteProject
);

// GET /api/projects/:id/members - Get project members
projectRoutes.get('/:id/members',
  authenticateToken,
  validateParams(projectIdParamSchema),
  getProjectMembers
);

// POST /api/projects/:id/members - Add project member
projectRoutes.post('/:id/members',
  authenticateToken,
  validateParams(projectIdParamSchema),
  validateBody(addProjectMemberBodySchema),
  addProjectMember
);

export { projectRoutes };