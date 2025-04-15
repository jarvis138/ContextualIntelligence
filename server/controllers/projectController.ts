/**
 * Project Controller
 * 
 * This module provides controller functions for project-related API endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { createSuccessResponse, createPaginatedResponse } from '../utils/apiResponse';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/apiError';
import { z } from 'zod';

// Project status enum
const ProjectStatus = ['planning', 'active', 'on_hold', 'completed', 'archived'] as const;

// Schema for project creation validation
const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  status: z.enum(ProjectStatus).default('planning'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Schema for project update validation
const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  status: z.enum(ProjectStatus).optional(),
  progress: z.number().min(0).max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Get all projects with pagination and filtering
 */
export async function getProjects(req: Request, res: Response, next: NextFunction) {
  try {
    // Get pagination parameters from query
    const page = parseInt(req.query.page as string || '1');
    const pageSize = parseInt(req.query.pageSize as string || '10');
    
    // Get filter parameters
    const status = req.query.status as string;
    
    // Get projects from storage
    // Assuming getProjects will be implemented in storage
    const projects = []; // await storage.getProjects();
    
    // Filter projects by status if provided
    const filteredProjects = status 
      ? projects.filter(project => project.status === status)
      : projects;
    
    // Apply pagination in memory (this would ideally be done at the database level)
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedProjects = filteredProjects.slice(start, end);
    
    // Return paginated response
    return res.json(createPaginatedResponse(
      paginatedProjects,
      filteredProjects.length,
      page,
      pageSize
    ));
  } catch (error) {
    next(error);
  }
}

/**
 * Get project by ID
 */
export async function getProjectById(req: Request, res: Response, next: NextFunction) {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      throw new BadRequestError('Invalid project ID');
    }
    
    // Get project from storage
    // Assuming getProject will be implemented in storage
    const project = null; // await storage.getProject(projectId);
    
    if (!project) {
      throw new NotFoundError('Project not found');
    }
    
    // Check if user has access to the project
    // This would typically check if the user is a member of the project
    // or has the required permissions
    
    return res.json(createSuccessResponse(project));
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new project
 */
export async function createProject(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate request body
    const projectData = createProjectSchema.parse(req.body);
    
    // Set the owner to the current user
    const ownerId = req.user?.id;
    
    if (!ownerId) {
      throw new ForbiddenError('User not authenticated');
    }
    
    // Parse dates if provided
    const startDate = projectData.startDate ? new Date(projectData.startDate) : undefined;
    const endDate = projectData.endDate ? new Date(projectData.endDate) : undefined;
    
    // Ensure startDate is before endDate
    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestError('Start date must be before end date');
    }
    
    // Create project
    // Assuming createProject will be implemented in storage
    const newProject = {
      id: 1, // This would be set by the database
      ...projectData,
      ownerId,
      startDate,
      endDate,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }; // await storage.createProject({ ...projectData, ownerId, startDate, endDate });
    
    return res.status(201).json(createSuccessResponse(newProject));
  } catch (error) {
    next(error);
  }
}

/**
 * Update an existing project
 */
export async function updateProject(req: Request, res: Response, next: NextFunction) {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      throw new BadRequestError('Invalid project ID');
    }
    
    // Validate request body
    const projectData = updateProjectSchema.parse(req.body);
    
    // Get existing project
    // Assuming getProject will be implemented in storage
    const existingProject = null; // await storage.getProject(projectId);
    
    if (!existingProject) {
      throw new NotFoundError('Project not found');
    }
    
    // Check if user has permission to update the project
    // This would typically check if the user is the owner or has admin rights
    if (req.user?.role !== 'admin' && existingProject.ownerId !== req.user?.id) {
      throw new ForbiddenError('You do not have permission to update this project');
    }
    
    // Parse dates if provided
    const startDate = projectData.startDate ? new Date(projectData.startDate) : existingProject.startDate;
    const endDate = projectData.endDate ? new Date(projectData.endDate) : existingProject.endDate;
    
    // Ensure startDate is before endDate
    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestError('Start date must be before end date');
    }
    
    // Update project
    // Assuming updateProject will be implemented in storage
    const updatedProject = {
      ...existingProject,
      ...projectData,
      startDate,
      endDate,
      updatedAt: new Date()
    }; // await storage.updateProject(projectId, { ...projectData, startDate, endDate });
    
    return res.json(createSuccessResponse(updatedProject));
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a project
 */
export async function deleteProject(req: Request, res: Response, next: NextFunction) {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      throw new BadRequestError('Invalid project ID');
    }
    
    // Get existing project
    // Assuming getProject will be implemented in storage
    const existingProject = null; // await storage.getProject(projectId);
    
    if (!existingProject) {
      throw new NotFoundError('Project not found');
    }
    
    // Check if user has permission to delete the project
    // This would typically check if the user is the owner or has admin rights
    if (req.user?.role !== 'admin' && existingProject.ownerId !== req.user?.id) {
      throw new ForbiddenError('You do not have permission to delete this project');
    }
    
    // Delete project
    // Assuming deleteProject will be implemented in storage
    // await storage.deleteProject(projectId);
    
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
}

/**
 * Get project members
 */
export async function getProjectMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      throw new BadRequestError('Invalid project ID');
    }
    
    // Get existing project
    // Assuming getProject will be implemented in storage
    const existingProject = null; // await storage.getProject(projectId);
    
    if (!existingProject) {
      throw new NotFoundError('Project not found');
    }
    
    // Get project members
    // Assuming getProjectMembers will be implemented in storage
    const members = []; // await storage.getProjectMembers(projectId);
    
    return res.json(createSuccessResponse(members));
  } catch (error) {
    next(error);
  }
}

/**
 * Add a member to a project
 */
export async function addProjectMember(req: Request, res: Response, next: NextFunction) {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      throw new BadRequestError('Invalid project ID');
    }
    
    const userId = parseInt(req.body.userId);
    
    if (isNaN(userId)) {
      throw new BadRequestError('Invalid user ID');
    }
    
    // Get existing project
    // Assuming getProject will be implemented in storage
    const existingProject = null; // await storage.getProject(projectId);
    
    if (!existingProject) {
      throw new NotFoundError('Project not found');
    }
    
    // Check if user has permission to add members to the project
    // This would typically check if the user is the owner or has admin rights
    if (req.user?.role !== 'admin' && existingProject.ownerId !== req.user?.id) {
      throw new ForbiddenError('You do not have permission to add members to this project');
    }
    
    // Check if user exists
    const user = await storage.getUser(userId);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // Add member to project
    // Assuming addProjectMember will be implemented in storage
    // await storage.addProjectMember(projectId, userId);
    
    return res.status(201).json(createSuccessResponse({ message: 'Member added to project' }));
  } catch (error) {
    next(error);
  }
}