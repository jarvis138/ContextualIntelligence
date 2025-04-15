/**
 * Team Controller
 * 
 * This module provides controller functions for team-related API endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { createSuccessResponse, createPaginatedResponse } from '../utils/apiResponse';
import { NotFoundError, BadRequestError, ForbiddenError, ConflictError } from '../utils/apiError';
import { z } from 'zod';

// Schema for team creation validation
const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  icon: z.string().optional(),
});

// Schema for team update validation
const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field is required for update'
});

/**
 * Get all teams with pagination
 */
export async function getTeams(req: Request, res: Response, next: NextFunction) {
  try {
    // Get pagination parameters from query
    const page = parseInt(req.query.page as string || '1');
    const pageSize = parseInt(req.query.pageSize as string || '10');
    
    // Get teams from storage
    // Assuming getTeams will be implemented in storage
    const teams = []; // await storage.getTeams();
    
    // Apply pagination in memory (this would ideally be done at the database level)
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedTeams = teams.slice(start, end);
    
    // Return paginated response
    return res.json(createPaginatedResponse(
      paginatedTeams,
      teams.length,
      page,
      pageSize
    ));
  } catch (error) {
    next(error);
  }
}

/**
 * Get team by ID
 */
export async function getTeamById(req: Request, res: Response, next: NextFunction) {
  try {
    const teamId = parseInt(req.params.id);
    
    if (isNaN(teamId)) {
      throw new BadRequestError('Invalid team ID');
    }
    
    // Get team from storage
    // Assuming getTeam will be implemented in storage
    const team = null; // await storage.getTeam(teamId);
    
    if (!team) {
      throw new NotFoundError('Team not found');
    }
    
    return res.json(createSuccessResponse(team));
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new team
 */
export async function createTeam(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate request body
    const teamData = createTeamSchema.parse(req.body);
    
    // Create team
    const newTeam = {
      id: 1, // This would be set by the database
      ...teamData,
      progress: 0
    }; // await storage.createTeam(teamData);
    
    // Add current user as team member and leader
    // Assuming addTeamMember will be implemented in storage
    // await storage.addTeamMember(newTeam.id, req.user.id, 'leader');
    
    return res.status(201).json(createSuccessResponse(newTeam));
  } catch (error) {
    next(error);
  }
}

/**
 * Update an existing team
 */
export async function updateTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const teamId = parseInt(req.params.id);
    
    if (isNaN(teamId)) {
      throw new BadRequestError('Invalid team ID');
    }
    
    // Validate request body
    const teamData = updateTeamSchema.parse(req.body);
    
    // Get existing team
    // Assuming getTeam will be implemented in storage
    const existingTeam = null; // await storage.getTeam(teamId);
    
    if (!existingTeam) {
      throw new NotFoundError('Team not found');
    }
    
    // Check if user has permission to update this team
    // This would check if the user is a team leader or has admin rights
    
    // Update team
    const updatedTeam = {
      ...existingTeam,
      ...teamData
    }; // await storage.updateTeam(teamId, teamData);
    
    return res.json(createSuccessResponse(updatedTeam));
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a team
 */
export async function deleteTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const teamId = parseInt(req.params.id);
    
    if (isNaN(teamId)) {
      throw new BadRequestError('Invalid team ID');
    }
    
    // Get existing team
    // Assuming getTeam will be implemented in storage
    const existingTeam = null; // await storage.getTeam(teamId);
    
    if (!existingTeam) {
      throw new NotFoundError('Team not found');
    }
    
    // Check if user has permission to delete this team
    // This would check if the user is a team leader or has admin rights
    
    // Check if team is associated with any projects
    // Assuming getTeamProjects will be implemented in storage
    const teamProjects = []; // await storage.getTeamProjects(teamId);
    
    if (teamProjects.length > 0) {
      throw new ConflictError('Cannot delete team that is associated with projects');
    }
    
    // Delete team
    // Assuming deleteTeam will be implemented in storage
    // await storage.deleteTeam(teamId);
    
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
}

/**
 * Get team members
 */
export async function getTeamMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const teamId = parseInt(req.params.id);
    
    if (isNaN(teamId)) {
      throw new BadRequestError('Invalid team ID');
    }
    
    // Get existing team
    // Assuming getTeam will be implemented in storage
    const existingTeam = null; // await storage.getTeam(teamId);
    
    if (!existingTeam) {
      throw new NotFoundError('Team not found');
    }
    
    // Get team members
    // Assuming getTeamMembers will be implemented in storage
    const members = []; // await storage.getTeamMembers(teamId);
    
    return res.json(createSuccessResponse(members));
  } catch (error) {
    next(error);
  }
}

/**
 * Add a member to a team
 */
export async function addTeamMember(req: Request, res: Response, next: NextFunction) {
  try {
    const teamId = parseInt(req.params.id);
    
    if (isNaN(teamId)) {
      throw new BadRequestError('Invalid team ID');
    }
    
    const userId = parseInt(req.body.userId);
    
    if (isNaN(userId)) {
      throw new BadRequestError('Invalid user ID');
    }
    
    const role = req.body.role || 'member';
    
    // Get existing team
    // Assuming getTeam will be implemented in storage
    const existingTeam = null; // await storage.getTeam(teamId);
    
    if (!existingTeam) {
      throw new NotFoundError('Team not found');
    }
    
    // Check if user has permission to add members to this team
    // This would check if the user is a team leader or has admin rights
    
    // Check if user exists
    const user = await storage.getUser(userId);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // Check if user is already a member of the team
    // Assuming getTeamMember will be implemented in storage
    const existingMember = null; // await storage.getTeamMember(teamId, userId);
    
    if (existingMember) {
      throw new ConflictError('User is already a member of this team');
    }
    
    // Add member to team
    // Assuming addTeamMember will be implemented in storage
    const newMember = {
      id: 1, // This would be set by the database
      teamId,
      userId,
      role
    }; // await storage.addTeamMember(teamId, userId, role);
    
    return res.status(201).json(createSuccessResponse(newMember));
  } catch (error) {
    next(error);
  }
}

/**
 * Remove a member from a team
 */
export async function removeTeamMember(req: Request, res: Response, next: NextFunction) {
  try {
    const teamId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    
    if (isNaN(teamId)) {
      throw new BadRequestError('Invalid team ID');
    }
    
    if (isNaN(userId)) {
      throw new BadRequestError('Invalid user ID');
    }
    
    // Get existing team
    // Assuming getTeam will be implemented in storage
    const existingTeam = null; // await storage.getTeam(teamId);
    
    if (!existingTeam) {
      throw new NotFoundError('Team not found');
    }
    
    // Check if user has permission to remove members from this team
    // This would check if the user is a team leader or has admin rights
    
    // Check if user is a member of the team
    // Assuming getTeamMember will be implemented in storage
    const existingMember = null; // await storage.getTeamMember(teamId, userId);
    
    if (!existingMember) {
      throw new NotFoundError('User is not a member of this team');
    }
    
    // Check if removing the only leader
    // This would prevent removing the last leader of a team
    
    // Remove member from team
    // Assuming removeTeamMember will be implemented in storage
    // await storage.removeTeamMember(teamId, userId);
    
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
}