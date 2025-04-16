/**
 * Graph API Router
 * 
 * Routes for graph-related operations and visualizations.
 */

import { Router } from 'express';
import { storage } from '../storage';
import { authenticateToken } from '../auth';
import { logger } from '../services/observability';

export const graphApiRouter = Router();
const graphLogger = logger.createChildLogger({ component: 'GraphAPIRouter' });

// Graph Visualization API Routes
graphApiRouter.get('/visualization', authenticateToken, async (req, res) => {
  try {
    const centralNodeId = req.query.nodeId ? parseInt(req.query.nodeId as string) : undefined;
    const depth = req.query.depth ? parseInt(req.query.depth as string) : 2;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    
    const graphData = await storage.getGraphForVisualization(centralNodeId, depth, limit);
    res.json(graphData);
  } catch (error) {
    graphLogger.error('Error fetching graph visualization data:', error);
    res.status(500).json({ error: 'Failed to fetch graph data' });
  }
});

graphApiRouter.get('/nodes', authenticateToken, async (req, res) => {
  try {
    const type = req.query.type as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
    
    const nodes = await storage.getGraphNodes(type, limit, offset);
    res.json(nodes);
  } catch (error) {
    graphLogger.error('Error fetching graph nodes:', error);
    res.status(500).json({ error: 'Failed to fetch graph nodes' });
  }
});

graphApiRouter.get('/edges', authenticateToken, async (req, res) => {
  try {
    const sourceId = req.query.sourceId ? parseInt(req.query.sourceId as string) : undefined;
    const targetId = req.query.targetId ? parseInt(req.query.targetId as string) : undefined;
    const type = req.query.type as string | undefined;
    
    const edges = await storage.getGraphEdges(sourceId, targetId, type);
    res.json(edges);
  } catch (error) {
    graphLogger.error('Error fetching graph edges:', error);
    res.status(500).json({ error: 'Failed to fetch graph edges' });
  }
});

graphApiRouter.get('/related/:nodeId', authenticateToken, async (req, res) => {
  try {
    const nodeId = parseInt(req.params.nodeId);
    const minWeight = req.query.minWeight ? parseFloat(req.query.minWeight as string) : 0.5;
    const maxConnections = req.query.maxConnections ? parseInt(req.query.maxConnections as string) : 10;
    
    const relatedNodes = await storage.findRelatedNodes(nodeId, minWeight, maxConnections);
    res.json(relatedNodes);
  } catch (error) {
    graphLogger.error('Error fetching related nodes:', error);
    res.status(500).json({ error: 'Failed to fetch related nodes' });
  }
});

// Node CRUD operations
graphApiRouter.post('/nodes', authenticateToken, async (req, res) => {
  try {
    const newNode = await storage.createGraphNode(req.body);
    res.status(201).json(newNode);
  } catch (error) {
    graphLogger.error('Error creating graph node:', error);
    res.status(500).json({ error: 'Failed to create graph node' });
  }
});

graphApiRouter.patch('/nodes/:id', authenticateToken, async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    const updatedNode = await storage.updateGraphNode(nodeId, req.body);
    
    if (!updatedNode) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    res.json(updatedNode);
  } catch (error) {
    graphLogger.error('Error updating graph node:', error);
    res.status(500).json({ error: 'Failed to update graph node' });
  }
});

graphApiRouter.delete('/nodes/:id', authenticateToken, async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    const result = await storage.deleteGraphNode(nodeId);
    
    if (!result) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    res.status(204).end();
  } catch (error) {
    graphLogger.error('Error deleting graph node:', error);
    res.status(500).json({ error: 'Failed to delete graph node' });
  }
});

// Edge CRUD operations
graphApiRouter.post('/edges', authenticateToken, async (req, res) => {
  try {
    const newEdge = await storage.createGraphEdge(req.body);
    res.status(201).json(newEdge);
  } catch (error) {
    graphLogger.error('Error creating graph edge:', error);
    res.status(500).json({ error: 'Failed to create graph edge' });
  }
});

graphApiRouter.patch('/edges/:id', authenticateToken, async (req, res) => {
  try {
    const edgeId = parseInt(req.params.id);
    const updatedEdge = await storage.updateGraphEdge(edgeId, req.body);
    
    if (!updatedEdge) {
      return res.status(404).json({ error: 'Edge not found' });
    }
    
    res.json(updatedEdge);
  } catch (error) {
    graphLogger.error('Error updating graph edge:', error);
    res.status(500).json({ error: 'Failed to update graph edge' });
  }
});

graphApiRouter.delete('/edges/:id', authenticateToken, async (req, res) => {
  try {
    const edgeId = parseInt(req.params.id);
    const result = await storage.deleteGraphEdge(edgeId);
    
    if (!result) {
      return res.status(404).json({ error: 'Edge not found' });
    }
    
    res.status(204).end();
  } catch (error) {
    graphLogger.error('Error deleting graph edge:', error);
    res.status(500).json({ error: 'Failed to delete graph edge' });
  }
});

graphLogger.info('Graph API router initialized');