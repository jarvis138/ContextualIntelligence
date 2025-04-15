/**
 * User API Routes
 * 
 * This module defines the API routes for user management.
 */

import { Router } from 'express';
import { getUsers, getUserById, createUser, updateUser, deleteUser } from '../../controllers/userController';
import { authenticateToken, authorizeRoles } from '../../middleware/auth';
import { validateBody, validateParams } from '../../middleware/validation';
import { z } from 'zod';

// Create router
const userRoutes = Router();

// Validation schemas
const userIdParamSchema = z.object({
  id: z.string().refine(val => !isNaN(parseInt(val)), {
    message: 'ID must be a valid number'
  })
});

const createUserBodySchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
  email: z.string().email(),
  fullName: z.string().min(1).max(100),
  role: z.enum(['admin', 'manager', 'user', 'viewer']).default('user'),
});

const updateUserBodySchema = z.object({
  username: z.string().min(3).max(50).optional(),
  password: z.string().min(8).max(100).optional(),
  email: z.string().email().optional(),
  fullName: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'manager', 'user', 'viewer']).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field is required for update'
});

// Routes
// GET /api/users - Get all users (requires admin or manager role)
userRoutes.get('/', 
  authenticateToken, 
  authorizeRoles('admin', 'manager'), 
  getUsers
);

// GET /api/users/:id - Get user by ID
userRoutes.get('/:id', 
  authenticateToken,
  validateParams(userIdParamSchema),
  getUserById
);

// POST /api/users - Create a new user (requires admin role)
userRoutes.post('/',
  authenticateToken,
  authorizeRoles('admin'),
  validateBody(createUserBodySchema),
  createUser
);

// PATCH /api/users/:id - Update an existing user
userRoutes.patch('/:id',
  authenticateToken,
  validateParams(userIdParamSchema),
  validateBody(updateUserBodySchema),
  updateUser
);

// DELETE /api/users/:id - Delete a user (requires admin role)
userRoutes.delete('/:id',
  authenticateToken,
  authorizeRoles('admin'),
  validateParams(userIdParamSchema),
  deleteUser
);

export { userRoutes };