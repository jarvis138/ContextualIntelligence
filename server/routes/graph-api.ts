import { Router, Request, Response } from 'express';
import { authenticateToken } from '../auth';
import { getMockGraphData, getMockNodeDetails, mockGraphSearch, createMockGraphData } from '../../client/src/lib/mockData';

export const graphApiRouter = Router();

/**
 * Get graph visualization data
 */
graphApiRouter.get('/visualization', authenticateToken, async (req: Request, res: Response) => {
  try {
    const nodeId = req.query.nodeId ? parseInt(req.query.nodeId as string) : undefined;
    const depth = req.query.depth ? parseInt(req.query.depth as string) : 2;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    
    // In a production environment, this would fetch data from the database
    // For now, we'll use mock data
    const graphData = getMockGraphData(nodeId, depth, limit);
    
    res.json(graphData);
  } catch (error) {
    console.error('Error fetching graph visualization data:', error);
    res.status(500).json({ error: 'Failed to fetch graph visualization data' });
  }
});

/**
 * Get node details by ID
 */
graphApiRouter.get('/nodes/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const nodeId = parseInt(req.params.id);
    
    // In a production environment, this would fetch data from the database
    // For now, we'll use mock data
    const nodeDetails = getMockNodeDetails(nodeId);
    
    if (!nodeDetails) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    res.json(nodeDetails);
  } catch (error) {
    console.error('Error fetching node details:', error);
    res.status(500).json({ error: 'Failed to fetch node details' });
  }
});

/**
 * Search for nodes
 */
graphApiRouter.get('/search', authenticateToken, async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    // In a production environment, this would search the database
    // For now, we'll use mock data
    const searchResults = await mockGraphSearch(query);
    
    res.json(searchResults);
  } catch (error) {
    console.error('Error searching nodes:', error);
    res.status(500).json({ error: 'Failed to search nodes' });
  }
});

/**
 * Get all nodes (with optional filtering)
 */
graphApiRouter.get('/nodes', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Basic implementation for now - in production this would include filtering
    const nodes = getMockGraphData().nodes;
    res.json(nodes);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    res.status(500).json({ error: 'Failed to fetch nodes' });
  }
});

/**
 * Get all edges (with optional filtering)
 */
graphApiRouter.get('/edges', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Basic implementation for now - in production this would include filtering
    const edges = getMockGraphData().links;
    res.json(edges);
  } catch (error) {
    console.error('Error fetching edges:', error);
    res.status(500).json({ error: 'Failed to fetch edges' });
  }
});

/**
 * Create a new node
 */
graphApiRouter.post('/nodes', authenticateToken, async (req: Request, res: Response) => {
  try {
    // In production this would create a node in the database
    // For now, just return a success message
    res.status(201).json({ message: 'Node created successfully', node: req.body });
  } catch (error) {
    console.error('Error creating node:', error);
    res.status(500).json({ error: 'Failed to create node' });
  }
});

/**
 * Create a new edge
 */
graphApiRouter.post('/edges', authenticateToken, async (req: Request, res: Response) => {
  try {
    // In production this would create an edge in the database
    // For now, just return a success message
    res.status(201).json({ message: 'Edge created successfully', edge: req.body });
  } catch (error) {
    console.error('Error creating edge:', error);
    res.status(500).json({ error: 'Failed to create edge' });
  }
});

/**
 * Update a node
 */
graphApiRouter.patch('/nodes/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const nodeId = parseInt(req.params.id);
    
    // In production this would update a node in the database
    // For now, just return a success message
    res.json({ message: 'Node updated successfully', id: nodeId, updates: req.body });
  } catch (error) {
    console.error('Error updating node:', error);
    res.status(500).json({ error: 'Failed to update node' });
  }
});

/**
 * Delete a node
 */
graphApiRouter.delete('/nodes/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const nodeId = parseInt(req.params.id);
    
    // In production this would delete a node from the database
    // For now, just return a success message
    res.json({ message: 'Node deleted successfully', id: nodeId });
  } catch (error) {
    console.error('Error deleting node:', error);
    res.status(500).json({ error: 'Failed to delete node' });
  }
});

/**
 * Seed graph data
 */
graphApiRouter.post('/seed', authenticateToken, async (req: Request, res: Response) => {
  try {
    // In production this would seed the database with initial graph data
    // For now, we just log that it would happen
    await createMockGraphData();
    
    res.json({ message: 'Graph data seeded successfully' });
  } catch (error) {
    console.error('Error seeding graph data:', error);
    res.status(500).json({ error: 'Failed to seed graph data' });
  }
});

export default graphApiRouter;