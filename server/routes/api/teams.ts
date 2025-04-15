/**
 * Team API Routes
 * 
 * This module defines the API routes for team management.
 */

import { Router } from 'express';
import { 
  getTeams, 
  getTeamById, 
  createTeam, 
  updateTeam, 
  deleteTeam,
  getTeamMembers,
  addTeamMember,
  removeTeamMember
} from '../../controllers/teamController';
import { authenticateToken, authorizeRoles } from '../../middleware/auth';
import { validateBody, validateParams } from '../../middleware/validation';
import { z } from 'zod';

// Create router
const teamRoutes = Router();

// Validation schemas
const teamIdParamSchema = z.object({
  id: z.string().refine(val => !isNaN(parseInt(val)), {
    message: 'Team ID must be a valid number'
  })
});

const userIdParamSchema = z.object({
  id: z.string().refine(val => !isNaN(parseInt(val)), {
    message: 'Team ID must be a valid number'
  }),
  userId: z.string().refine(val => !isNaN(parseInt(val)), {
    message: 'User ID must be a valid number'
  })
});

const createTeamBodySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  icon: z.string().optional(),
});

const updateTeamBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field is required for update'
});

const addTeamMemberBodySchema = z.object({
  userId: z.number().int().positive(),
  role: z.string().optional()
});

// Routes
// GET /api/teams - Get all teams
teamRoutes.get('/',
  authenticateToken,
  getTeams
);

// GET /api/teams/:id - Get team by ID
teamRoutes.get('/:id',
  authenticateToken,
  validateParams(teamIdParamSchema),
  getTeamById
);

// POST /api/teams - Create a new team
teamRoutes.post('/',
  authenticateToken,
  validateBody(createTeamBodySchema),
  createTeam
);

// PATCH /api/teams/:id - Update an existing team
teamRoutes.patch('/:id',
  authenticateToken,
  validateParams(teamIdParamSchema),
  validateBody(updateTeamBodySchema),
  updateTeam
);

// DELETE /api/teams/:id - Delete a team
teamRoutes.delete('/:id',
  authenticateToken,
  validateParams(teamIdParamSchema),
  deleteTeam
);

// GET /api/teams/:id/members - Get team members
teamRoutes.get('/:id/members',
  authenticateToken,
  validateParams(teamIdParamSchema),
  getTeamMembers
);

// POST /api/teams/:id/members - Add team member
teamRoutes.post('/:id/members',
  authenticateToken,
  validateParams(teamIdParamSchema),
  validateBody(addTeamMemberBodySchema),
  addTeamMember
);

// DELETE /api/teams/:id/members/:userId - Remove team member
teamRoutes.delete('/:id/members/:userId',
  authenticateToken,
  validateParams(userIdParamSchema),
  removeTeamMember
);

export { teamRoutes };