import OpenAI from "openai";

// Initialize the OpenAI client with API key from environment variables
if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is not set");
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

// Create OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Summarize a document or text content
 */
export async function summarizeText(text: string, maxLength: number = 300): Promise<string> {
  try {
    const prompt = `Summarize the following text in a concise way, highlighting the key points. 
    Keep the summary under ${maxLength} characters.
    
    Text to summarize:
    ${text}`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3, // Lower temperature for more focused summaries
    });

    return response.choices[0].message.content || "Unable to generate summary";
  } catch (error: any) {
    console.error("Error summarizing text:", error?.message || error);
    throw error;
  }
}

/**
 * Analyze sentiment of a given text
 */
export async function analyzeSentiment(text: string): Promise<{
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  analysis: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are a sentiment analysis expert. Analyze the sentiment of the provided text and return a JSON object with the sentiment (positive, negative, or neutral), a numerical score between -1 (very negative) and 1 (very positive), and a brief analysis explaining why."
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      sentiment: result.sentiment || 'neutral',
      score: result.score || 0,
      analysis: result.analysis || "No analysis provided"
    };
  } catch (error: any) {
    console.error("Error analyzing sentiment:", error?.message || error);
    throw error;
  }
}

/**
 * Extract key entities from text
 */
export async function extractEntities(text: string): Promise<{
  entities: Array<{ name: string; type: string; confidence: number }>;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are an entity extraction expert. Identify all important entities mentioned in the text and return them as a JSON object with an 'entities' array. Each entity should have a name, type (person, organization, project, technology, date, etc.), and a confidence score between 0 and 1."
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      entities: result.entities || []
    };
  } catch (error: any) {
    console.error("Error extracting entities:", error?.message || error);
    throw error;
  }
}

/**
 * Generate insights from project data
 */
export async function generateProjectInsights(
  projectData: any, 
  tasksData: any[], 
  documentsData: any[], 
  activitiesData: any[]
): Promise<Array<{ 
  type: 'warning' | 'success' | 'info'; 
  content: string;
  confidence: number; 
  source?: string;
}>> {
  try {
    // Format the data to send to the API
    const dataForAnalysis = {
      project: projectData,
      tasks: tasksData,
      documents: documentsData,
      activities: activitiesData
    };

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a project intelligence expert. Analyze the provided project data and generate actionable insights.
          Return a JSON array of insights, where each insight has:
          - type: 'warning', 'success', or 'info'
          - content: a clear and specific insight message (maximum 100 characters)
          - confidence: a number between 0 and 1 indicating your confidence in this insight
          - source: (optional) the source of this insight (e.g., 'task data', 'activity trends', etc.)
          
          Focus on:
          1. Potential risks or issues (warnings)
          2. Achievements or positive trends (success)
          3. Neutral but useful observations (info)
          
          Generate 3-5 insights based on the data. Be specific and actionable.`
        },
        {
          role: "user",
          content: JSON.stringify(dataForAnalysis)
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return result.insights || [];
  } catch (error: any) {
    console.error("Error generating project insights:", error?.message || error);
    throw error;
  }
}

/**
 * Categorize and tag document content
 */
export async function categorizeContent(
  content: string
): Promise<{
  tags: string[];
  categories: string[];
  priority: 'low' | 'medium' | 'high';
  relevance: number;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a content categorization expert. Analyze the provided content and:
          1. Extract 3-7 relevant tags
          2. Assign 1-3 broader categories
          3. Determine a priority level (low, medium, high)
          4. Assign a relevance score from 0 to 1
          
          Return the results as a JSON object with 'tags', 'categories', 'priority', and 'relevance' fields.`
        },
        {
          role: "user",
          content: content
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      tags: result.tags || [],
      categories: result.categories || [],
      priority: result.priority || 'medium',
      relevance: result.relevance || 0.5
    };
  } catch (error: any) {
    console.error("Error categorizing content:", error?.message || error);
    throw error;
  }
}

/**
 * Extract relationships between entities
 */
export async function mapRelationships(
  entities: Array<{ name: string; type: string }>,
  context: string
): Promise<Array<{
  source: string;
  target: string;
  relationship: string;
  strength: number;
}>> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a relationship mapping expert. Analyze the provided entities and context to identify relationships between entities.
          Return a JSON array of relationships, where each relationship has:
          - source: name of the source entity
          - target: name of the target entity
          - relationship: description of the relationship (e.g., 'reports to', 'depends on', 'collaborates with')
          - strength: a number between 0 and 1 indicating the strength of the relationship
          
          Only identify relationships that are evident from the context provided.`
        },
        {
          role: "user",
          content: JSON.stringify({
            entities: entities,
            context: context
          })
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return result.relationships || [];
  } catch (error: any) {
    console.error("Error mapping relationships:", error?.message || error);
    throw error;
  }
}

/**
 * Extract key information from a file or document
 */
export async function extractDocumentInfo(
  text: string,
  documentType: string
): Promise<{
  summary: string;
  keyPoints: string[];
  metadata: Record<string, any>;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a document analysis expert. Extract key information from the provided ${documentType} document.
          Return a JSON object with:
          - summary: a concise summary of the document (max 200 characters)
          - keyPoints: an array of 3-5 important points from the document
          - metadata: additional metadata extracted from the document (e.g., dates, names, versions, etc.)
          
          Focus on extracting the most important and actionable information.`
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      summary: result.summary || "No summary available",
      keyPoints: result.keyPoints || [],
      metadata: result.metadata || {}
    };
  } catch (error: any) {
    console.error("Error extracting document info:", error?.message || error);
    throw error;
  }
}

/**
 * Perform contextual search on project data
 */
export async function contextualSearch(
  query: string,
  context: {
    documents: Array<{ id: number; title: string; content: string }>;
    tasks: Array<{ id: number; title: string; description: string }>;
    activities: Array<{ id: number; description: string }>;
  }
): Promise<{
  results: Array<{
    type: 'document' | 'task' | 'activity';
    id: number;
    title?: string;
    description?: string;
    content?: string;
    score: number;
  }>;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a contextual search expert. Find relevant items from the provided context based on the search query.
          Return a JSON object with a 'results' array of matched items, where each item has:
          - type: the type of item ('document', 'task', or 'activity')
          - id: the numeric ID of the item
          - title, description, or content (depending on the type)
          - score: a relevance score between 0 and 1
          
          Sort results by relevance score in descending order.
          Limit results to the 5 most relevant items.
          Only include items with a score of 0.5 or higher.`
        },
        {
          role: "user",
          content: JSON.stringify({
            query: query,
            context: context
          })
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      results: result.results || []
    };
  } catch (error: any) {
    console.error("Error performing contextual search:", error?.message || error);
    throw error;
  }
}