import { Request, Response } from "express";
import * as nlpService from "../services/nlp";
import { processDocument as processDocumentService } from "../services/documentProcessor";
import { storage } from "../storage";

/**
 * Extract entities from provided text
 */
export async function extractEntities(req: Request, res: Response) {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        success: false, 
        message: "Text content is required" 
      });
    }
    
    const entities = await nlpService.extractEntities(text);
    
    res.json({
      success: true,
      entities
    });
  } catch (error: any) {
    console.error("Entity extraction error:", error);
    res.status(500).json({
      success: false,
      message: "Error extracting entities",
      error: error?.message || "Unknown error"
    });
  }
}

/**
 * Summarize a document by ID
 */
export async function summarizeDocument(req: Request, res: Response) {
  try {
    const documentId = parseInt(req.params.documentId);
    
    // Check if document exists
    const document = await storage.getDocument(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }
    
    const summary = await nlpService.summarizeDocument(documentId);
    
    if (!summary) {
      return res.status(400).json({
        success: false,
        message: "Could not summarize document"
      });
    }
    
    // Store the summary as a new document linked to the original
    if (req.query.save === "true") {
      const summaryDoc = await storage.createDocument({
        title: `Summary: ${document.title}`,
        content: `# Summary of ${document.title}\n\n${summary.summary}\n\n## Key Topics\n\n- ${summary.keyTopics.join('\n- ')}\n\n## Sentiment\n\n${summary.sentiment.label} (${summary.sentiment.score.toFixed(2)})`,
        fileType: "summary",
        projectId: document.projectId,
        createdBy: req.body.userId || 1,
        updatedBy: req.body.userId || 1
      });
      
      // Create relationship between the summary and original document
      await storage.createRelationship({
        sourceType: "document",
        sourceId: summaryDoc.id,
        targetType: "document",
        targetId: documentId,
        strength: 10,
        description: "summarizes"
      });
      
      // Record activity
      await storage.createActivity({
        type: "ai",
        description: `Generated summary for document: ${document.title}`,
        userId: req.body.userId || 1,
        projectId: document.projectId,
        entityType: "document",
        entityId: documentId
      });
      
      return res.json({
        success: true,
        summary,
        summaryDocument: summaryDoc
      });
    }
    
    res.json({
      success: true,
      summary
    });
  } catch (error: any) {
    console.error("Document summarization error:", error);
    res.status(500).json({
      success: false,
      message: "Error summarizing document",
      error: error?.message || "Unknown error"
    });
  }
}

/**
 * Generate a context graph for a project
 */
export async function generateContextGraph(req: Request, res: Response) {
  try {
    const projectId = parseInt(req.params.projectId);
    
    // Check if project exists
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }
    
    const graph = await nlpService.generateContextGraph(projectId);
    
    if (!graph) {
      return res.status(400).json({
        success: false,
        message: "Could not generate context graph"
      });
    }
    
    // Record activity
    await storage.createActivity({
      type: "ai",
      description: "Generated context graph for project",
      userId: req.body.userId || 1,
      projectId,
      entityType: "project",
      entityId: projectId
    });
    
    res.json({
      success: true,
      graph
    });
  } catch (error: any) {
    console.error("Context graph generation error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating context graph",
      error: error?.message || "Unknown error"
    });
  }
}

/**
 * Perform semantic search across project documents
 */
export async function semanticSearch(req: Request, res: Response) {
  try {
    const projectId = parseInt(req.params.projectId);
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }
    
    // Check if project exists
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }
    
    const results = await nlpService.semanticSearch(projectId, query);
    
    // Record activity
    await storage.createActivity({
      type: "search",
      description: `Performed semantic search: "${query}"`,
      userId: req.body.userId || 1,
      projectId,
      entityType: "project",
      entityId: projectId
    });
    
    res.json({
      success: true,
      results
    });
  } catch (error: any) {
    console.error("Semantic search error:", error);
    res.status(500).json({
      success: false,
      message: "Error performing semantic search",
      error: error?.message || "Unknown error"
    });
  }
}

/**
 * Process a document to extract entities and analyze content
 */
export async function processDocument(req: Request, res: Response) {
  try {
    const documentId = parseInt(req.params.documentId);
    const userId = req.body.userId || 1;
    
    // Process document using the enhanced document processor service
    const processingResult = await processDocumentService(documentId, userId);
    
    if (!processingResult.success) {
      return res.status(400).json({
        success: false,
        message: processingResult.message || "Could not process document"
      });
    }
    
    // Return the processing result
    res.json(processingResult);
  } catch (error: any) {
    console.error("Document processing error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing document",
      error: error?.message || "Unknown error"
    });
  }
}