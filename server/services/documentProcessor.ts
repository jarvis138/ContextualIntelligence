import { storage } from '../storage';
import { extractEntities, analyzeTextContent } from './nlp';
import { Document, InsertTask, InsertRelationship } from '../../shared/schema';
import { InsertActivity } from '../../shared/schema';

/**
 * Interface for document processing result
 */
export interface ProcessDocumentResult {
  success: boolean;
  message?: string;
  summary?: {
    entities: any[];
    tasks: any[];
    relationships: any[];
  };
}

/**
 * Process a document to extract insights, create tasks, and build relationships
 * @param documentId ID of the document to process
 * @param userId ID of the user initiating the processing
 */
export async function processDocument(documentId: number, userId: number): Promise<ProcessDocumentResult> {
  try {
    // Get document
    const document = await storage.getDocument(documentId);
    
    if (!document) {
      return {
        success: false,
        message: "Document not found"
      };
    }
    
    if (!document.content) {
      return {
        success: false,
        message: "Document has no content to process"
      };
    }
    
    // Extract entities and analyze content
    const analysis = await analyzeTextContent(document.content);
    
    // Process results
    const createdTasks: any[] = [];
    const createdRelationships: any[] = [];
    
    // Filter for high confidence entities
    const highConfidenceEntities = analysis.entities.filter(e => e.confidence > 0.7);
    
    // Create tasks from action items or task entities
    const taskEntities = highConfidenceEntities.filter(
      e => e.type === 'task' || e.type === 'action_item'
    );
    
    for (const entity of taskEntities) {
      try {
        const task: InsertTask = {
          title: entity.name,
          description: `Extracted from document "${document.title}"`,
          status: "pending",
          projectId: document.projectId,
          assigneeId: null,
          priority: "medium",
          dueDate: null
        };
        
        const createdTask = await storage.createTask(task);
        
        if (createdTask) {
          createdTasks.push(createdTask);
          
          // Create relationship between document and task
          const relationship: InsertRelationship = {
            sourceType: "document",
            sourceId: documentId,
            targetType: "task",
            targetId: createdTask.id,
            projectId: document.projectId,
            description: "extracted_from",
            strength: 8
          };
          
          const createdRelationship = await storage.createRelationship(relationship);
          if (createdRelationship) {
            createdRelationships.push(createdRelationship);
          }
          
          // Record activity
          const activity: InsertActivity = {
            type: "ai",
            description: `Created task "${createdTask.title}" from document`,
            userId,
            projectId: document.projectId,
            entityType: "task",
            entityId: createdTask.id
          };
          
          await storage.createActivity(activity);
        }
      } catch (error) {
        console.error("Error creating task from entity:", error);
        // Continue processing other entities
      }
    }
    
    // Create relationships with other entities, like people, projects, technologies
    const personEntities = highConfidenceEntities.filter(e => e.type === 'person');
    const organizationEntities = highConfidenceEntities.filter(e => e.type === 'organization');
    const technologyEntities = highConfidenceEntities.filter(e => e.type === 'technology');
    
    // Find relevant entities in other documents to create cross-document relationships
    const projectDocuments = await storage.getDocuments(document.projectId);
    const otherDocuments = projectDocuments.filter(doc => doc.id !== documentId);
    
    for (const otherDoc of otherDocuments) {
      if (!otherDoc.content) continue;
      
      // Check if other document has been analyzed
      try {
        const otherEntities = await extractEntities(otherDoc.content);
        
        // Find common entities to create relationships
        const commonPersons = personEntities.filter(entity1 => 
          otherEntities.some(entity2 => 
            entity2.type === 'person' && 
            entity2.name.toLowerCase() === entity1.name.toLowerCase() &&
            entity2.confidence > 0.7
          )
        );
        
        const commonOrgs = organizationEntities.filter(entity1 => 
          otherEntities.some(entity2 => 
            entity2.type === 'organization' && 
            entity2.name.toLowerCase() === entity1.name.toLowerCase() &&
            entity2.confidence > 0.7
          )
        );
        
        const commonTechs = technologyEntities.filter(entity1 => 
          otherEntities.some(entity2 => 
            entity2.type === 'technology' && 
            entity2.name.toLowerCase() === entity1.name.toLowerCase() &&
            entity2.confidence > 0.7
          )
        );
        
        const allCommonEntities = [...commonPersons, ...commonOrgs, ...commonTechs];
        
        if (allCommonEntities.length > 0) {
          // Create document-to-document relationship
          const relationship: InsertRelationship = {
            sourceType: "document",
            sourceId: documentId,
            targetType: "document",
            targetId: otherDoc.id,
            projectId: document.projectId,
            description: "related_by_entities",
            strength: Math.min(10, allCommonEntities.length * 2)
          };
          
          const createdRelationship = await storage.createRelationship(relationship);
          if (createdRelationship) {
            createdRelationships.push(createdRelationship);
          }
        }
      } catch (error) {
        console.error("Error processing other document:", error);
        // Continue processing
      }
    }
    
    // Record activity for document processing
    const activity: InsertActivity = {
      type: "ai",
      description: `Processed document "${document.title}"`,
      userId,
      projectId: document.projectId,
      entityType: "document",
      entityId: documentId
    };
    
    await storage.createActivity(activity);
    
    return {
      success: true,
      summary: {
        entities: highConfidenceEntities,
        tasks: createdTasks,
        relationships: createdRelationships
      }
    };
  } catch (error: any) {
    console.error("Document processing error:", error);
    return {
      success: false,
      message: error?.message || "An error occurred while processing the document"
    };
  }
}