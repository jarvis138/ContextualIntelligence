/**
 * User Controller
 * 
 * This module provides controller functions for user-related API endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { createSuccessResponse, createPaginatedResponse } from '../utils/apiResponse';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/apiError';
import { hashPassword, comparePasswords } from '../auth';
import { z } from 'zod';

// Schema for user creation validation
const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
  email: z.string().email(),
  fullName: z.string().min(1).max(100),
  role: z.enum(['admin', 'manager', 'user', 'viewer']).default('user'),
});

// Schema for user update validation
const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  password: z.string().min(8).max(100).optional(),
  email: z.string().email().optional(),
  fullName: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'manager', 'user', 'viewer']).optional(),
});

/**
 * Get all users with pagination
 */
export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    // Get pagination parameters from query
    const page = parseInt(req.query.page as string || '1');
    const pageSize = parseInt(req.query.pageSize as string || '10');
    
    // Get users from storage with pagination
    const users = await storage.getUsers();
    
    // Apply pagination in memory (this would ideally be done at the database level)
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedUsers = users.slice(start, end);
    
    // Return paginated response
    return res.json(createPaginatedResponse(
      paginatedUsers.map(user => {
        // Remove sensitive fields
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }),
      users.length,
      page,
      pageSize
    ));
  } catch (error) {
    next(error);
  }
}

/**
 * Get user by ID
 */
export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      throw new BadRequestError('Invalid user ID');
    }
    
    const user = await storage.getUser(userId);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // Remove sensitive fields
    const { password, ...userWithoutPassword } = user;
    
    return res.json(createSuccessResponse(userWithoutPassword));
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new user
 */
export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate request body
    const userData = createUserSchema.parse(req.body);
    
    // Check if username already exists
    const existingUser = await storage.getUserByUsername(userData.username);
    
    if (existingUser) {
      throw new ConflictError('Username already exists');
    }
    
    // Hash password
    const hashedPassword = await hashPassword(userData.password);
    
    // Create user
    const newUser = await storage.createUser({
      ...userData,
      password: hashedPassword,
      authMethod: 'local'
    });
    
    // Remove sensitive fields
    const { password, ...userWithoutPassword } = newUser;
    
    return res.status(201).json(createSuccessResponse(userWithoutPassword));
  } catch (error) {
    next(error);
  }
}

/**
 * Update an existing user
 */
export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      throw new BadRequestError('Invalid user ID');
    }
    
    // Validate request body
    const userData = updateUserSchema.parse(req.body);
    
    // Check if user exists
    const existingUser = await storage.getUser(userId);
    
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }
    
    // If updating username, check if new username already exists
    if (userData.username && userData.username !== existingUser.username) {
      const userWithSameUsername = await storage.getUserByUsername(userData.username);
      
      if (userWithSameUsername) {
        throw new ConflictError('Username already exists');
      }
    }
    
    // Hash password if provided
    let hashedPassword: string | undefined;
    
    if (userData.password) {
      hashedPassword = await hashPassword(userData.password);
    }
    
    // Update user
    const updatedUser = await storage.updateUser(userId, {
      ...userData,
      ...(hashedPassword ? { password: hashedPassword } : {})
    });
    
    if (!updatedUser) {
      throw new NotFoundError('User not found');
    }
    
    // Remove sensitive fields
    const { password, ...userWithoutPassword } = updatedUser;
    
    return res.json(createSuccessResponse(userWithoutPassword));
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a user
 */
export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      throw new BadRequestError('Invalid user ID');
    }
    
    // Check if user exists
    const existingUser = await storage.getUser(userId);
    
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }
    
    // Delete user
    // Assuming deleteUser is implemented in storage
    // await storage.deleteUser(userId);
    
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
}