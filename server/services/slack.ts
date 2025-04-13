import { ChatPostMessageArguments, WebClient } from "@slack/web-api";
import { storage } from "../storage";
import type { User, Integration, Project } from "@shared/schema";

/**
 * Creates a Slack WebClient instance from a user's stored integration
 */
export async function createSlackClient(userId: number): Promise<WebClient | null> {
  try {
    // Find the Slack integration for this user
    const integrations = await storage.getIntegrations(userId);
    const slackIntegration = integrations.find(
      (integration) => integration.type === "slack" && integration.active
    );

    if (!slackIntegration || !slackIntegration.config) {
      return null;
    }

    // Extract the token from the config
    const config = slackIntegration.config as { token: string };
    if (!config.token) {
      return null;
    }

    // Create a Slack client with the token
    return new WebClient(config.token);
  } catch (error: unknown) {
    console.error("Error creating Slack client:", error);
    return null;
  }
}

/**
 * Fetches messages from a Slack channel
 */
export async function getSlackMessages(
  userId: number,
  channelId: string,
  limit = 50
): Promise<any[] | null> {
  try {
    const client = await createSlackClient(userId);
    if (!client) {
      return null;
    }

    const response = await client.conversations.history({
      channel: channelId,
      limit,
    });

    if (!response.ok || !response.messages) {
      console.error("Error fetching Slack messages:", response.error);
      return null;
    }

    return response.messages;
  } catch (error: unknown) {
    console.error("Error fetching Slack messages:", error);
    return null;
  }
}

/**
 * Verifies if the Slack token is valid
 */
export async function verifySlackToken(token: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = new WebClient(token);
    const response = await client.auth.test();
    
    if (!response.ok) {
      return { ok: false, error: response.error || "Invalid token" };
    }
    
    return { ok: true };
  } catch (error: unknown) {
    console.error("Error verifying Slack token:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: errorMessage };
  }
}

/**
 * Gets a list of channels available for the token
 */
export async function getSlackChannels(token: string): Promise<any[] | null> {
  try {
    const client = new WebClient(token);
    const response = await client.conversations.list({
      types: "public_channel,private_channel",
      exclude_archived: true,
    });
    
    if (!response.ok || !response.channels) {
      console.error("Error fetching Slack channels:", response.error);
      return null;
    }
    
    return response.channels;
  } catch (error: unknown) {
    console.error("Error fetching Slack channels:", error);
    return null;
  }
}

/**
 * Tests a Slack integration with the given token and channel
 */
export async function testSlackIntegration(token: string, channelId: string): Promise<boolean> {
  try {
    const client = new WebClient(token);
    
    // Test the token validity
    const authTest = await client.auth.test();
    if (!authTest.ok) {
      console.error("Slack auth test failed:", authTest.error);
      return false;
    }
    
    // Test posting a message to the channel
    const message = await client.chat.postMessage({
      channel: channelId,
      text: "🔎 CPI Hub: Testing connection to Slack. If you're seeing this message, the integration is working correctly!",
    });
    
    if (!message.ok) {
      console.error("Slack message test failed:", message.error);
      return false;
    }
    
    return true;
  } catch (error: unknown) {
    console.error("Error testing Slack integration:", error);
    return false;
  }
}

/**
 * Sends a project update to a Slack channel
 */
export async function sendProjectUpdate(
  projectId: number,
  projectName: string,
  message: string,
  channelId: string,
  token: string
): Promise<string | undefined> {
  try {
    const client = new WebClient(token);
    
    const response = await client.chat.postMessage({
      channel: channelId,
      text: `*Project Update: ${projectName}*\n\n${message}`,
      mrkdwn: true,
      unfurl_links: false,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `Project Update: ${projectName}`,
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: message
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `*From:* CPI Hub • *Project ID:* ${projectId} • *Date:* ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    });
    
    if (!response.ok) {
      console.error("Error sending project update to Slack:", response.error);
      return undefined;
    }
    
    return response.ts;
  } catch (error: unknown) {
    console.error("Error sending project update to Slack:", error);
    return undefined;
  }
}

/**
 * Sends a project insight to a Slack channel
 */
export async function sendProjectInsight(
  projectId: number,
  projectName: string,
  insightType: string,
  content: string,
  confidence: number,
  channelId: string,
  token: string
): Promise<string | undefined> {
  try {
    const client = new WebClient(token);
    
    // Determine emoji based on insight type
    let emoji = "🔎";
    if (insightType === "warning") emoji = "⚠️";
    else if (insightType === "alert") emoji = "🚨";
    else if (insightType === "info") emoji = "ℹ️";
    else if (insightType === "success") emoji = "✅";
    
    const response = await client.chat.postMessage({
      channel: channelId,
      text: `${emoji} *Insight: ${projectName}*\n\n${content}`,
      mrkdwn: true,
      unfurl_links: false,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${emoji} Insight: ${projectName}`,
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: content
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `*Type:* ${insightType} • *Confidence:* ${confidence}% • *Project ID:* ${projectId} • *Date:* ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    });
    
    if (!response.ok) {
      console.error("Error sending project insight to Slack:", response.error);
      return undefined;
    }
    
    return response.ts;
  } catch (error: unknown) {
    console.error("Error sending project insight to Slack:", error);
    return undefined;
  }
}

/**
 * Interface for Slack message metadata
 */
export interface SlackMessageMetadata {
  messageId: string;
  userId: string;
  username: string;
  timestamp: Date;
  channelId: string;
  hasAttachments: boolean;
  hasFiles: boolean;
  hasLinks: boolean;
  hasMentions: boolean;
  reactionCount: number;
  replyCount: number;
  threadTS?: string;
}

/**
 * Interface for extracted entity from Slack message
 */
export interface ExtractedEntity {
  type: 'task' | 'deadline' | 'decision' | 'question' | 'action_item' | 'blocker' | 'resource';
  content: string;
  confidence: number;
  metadata: Record<string, any>;
}

/**
 * Normalized content from Slack messages
 */
export interface NormalizedContent {
  title: string;
  content: string;
  summary?: string;
  keywords: string[];
  entities: ExtractedEntity[];
  sentiment: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
  };
  messageMetadata: SlackMessageMetadata;
}

/**
 * Extract metadata from a Slack message
 */
function extractMessageMetadata(message: any, channelId: string): SlackMessageMetadata {
  return {
    messageId: message.ts,
    userId: message.user || 'unknown',
    username: message.username || 'unknown',
    timestamp: new Date(Number(message.ts) * 1000),
    channelId,
    hasAttachments: Array.isArray(message.attachments) && message.attachments.length > 0,
    hasFiles: Array.isArray(message.files) && message.files.length > 0,
    hasLinks: message.text?.includes('http') || false,
    hasMentions: message.text?.includes('<@') || false,
    reactionCount: message.reactions?.reduce((sum: number, reaction: any) => sum + (reaction.count || 0), 0) || 0,
    replyCount: message.reply_count || 0,
    threadTS: message.thread_ts
  };
}

/**
 * Extracts entities like tasks, deadlines, and decisions from message text
 */
function extractEntities(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  
  // Regular expressions for basic entity detection
  const patterns = [
    { 
      type: 'task' as const, 
      regex: /(?:todo|task|to-do|to do|action item)[\s:]+([^\n.]+)/gi,
      confidenceBase: 0.8
    },
    { 
      type: 'deadline' as const, 
      regex: /(?:due|deadline|by|complete by|finish by)[\s:]+(\w+\s+\d{1,2}(?:st|nd|rd|th)?|tomorrow|today|yesterday|next week|next month|in \d+ days?)/gi,
      confidenceBase: 0.75
    },
    { 
      type: 'decision' as const, 
      regex: /(?:decided|decision|agreed|agreement|conclusion|resolved)[\s:]+([^\n.]+)/gi,
      confidenceBase: 0.7
    },
    { 
      type: 'question' as const, 
      regex: /([^\n.]+\?)/g,
      confidenceBase: 0.6
    },
    { 
      type: 'action_item' as const, 
      regex: /(?:action item|next steps?|follow[ -]up)[\s:]+([^\n.]+)/gi,
      confidenceBase: 0.8
    },
    { 
      type: 'blocker' as const, 
      regex: /(?:blocker|blocking|blocked by|issue|problem|concern)[\s:]+([^\n.]+)/gi,
      confidenceBase: 0.7
    },
    { 
      type: 'resource' as const, 
      regex: /(https?:\/\/[^\s]+)/g,
      confidenceBase: 0.9
    }
  ];
  
  // Apply each pattern
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      const content = match[1] || match[0];
      
      // Calculate confidence based on various factors
      let confidence = pattern.confidenceBase;
      
      // Adjust confidence based on content length and quality
      confidence *= Math.min(1, content.length / 10); // Longer content is more likely to be significant
      
      entities.push({
        type: pattern.type,
        content: content.trim(),
        confidence: Math.round(confidence * 100) / 100,
        metadata: { 
          matchIndex: match.index,
          fullMatch: match[0] 
        }
      });
    }
  });
  
  return entities;
}

/**
 * Analyzes the sentiment of a message
 */
function analyzeSentiment(text: string): { score: number, label: 'positive' | 'negative' | 'neutral' } {
  // Basic sentiment analysis using keyword matching
  // In a real implementation, this would use a proper NLP library or API
  
  const positiveWords = [
    'good', 'great', 'excellent', 'amazing', 'awesome', 'happy', 'pleased',
    'success', 'successful', 'completed', 'completed', 'resolved', 'fixed',
    'thank', 'thanks', 'appreciate', 'well done', 'progress', '👍', '👏', '😄'
  ];
  
  const negativeWords = [
    'bad', 'terrible', 'awful', 'poor', 'issue', 'problem', 'error', 'fail',
    'failed', 'bug', 'difficult', 'wrong', 'broken', 'not working', 'cannot',
    'can\'t', 'worried', 'concerned', 'disappointed', '👎', '😞', '😠'
  ];
  
  let positiveScore = 0;
  let negativeScore = 0;
  
  const textLower = text.toLowerCase();
  
  // Count positive and negative word occurrences
  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b|${word}`, 'gi');
    const matches = textLower.match(regex);
    if (matches) {
      positiveScore += matches.length;
    }
  });
  
  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b|${word}`, 'gi');
    const matches = textLower.match(regex);
    if (matches) {
      negativeScore += matches.length;
    }
  });
  
  // Calculate final score (-1 to 1)
  const totalScore = positiveScore - negativeScore;
  const normalizedScore = Math.max(-1, Math.min(1, totalScore / Math.max(1, text.length / 50)));
  
  // Determine sentiment label
  let label: 'positive' | 'negative' | 'neutral';
  if (normalizedScore > 0.15) {
    label = 'positive';
  } else if (normalizedScore < -0.15) {
    label = 'negative';
  } else {
    label = 'neutral';
  }
  
  return {
    score: normalizedScore,
    label
  };
}

/**
 * Extracts keywords from a message
 */
function extractKeywords(text: string): string[] {
  // Skip very short texts
  if (text.length < 10) {
    return [];
  }
  
  // Split text into words
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .split(/\s+/) // Split on whitespace
    .filter(word => word.length > 3); // Only words of reasonable length
  
  // Remove common stop words
  const stopWords = new Set([
    'the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this', 'but',
    'his', 'from', 'they', 'she', 'will', 'would', 'there', 'their', 'what',
    'about', 'which', 'when', 'make', 'like', 'time', 'just', 'know', 'take',
    'them', 'some', 'than', 'more', 'other', 'into', 'could', 'only'
  ]);
  
  const filteredWords = words.filter(word => !stopWords.has(word));
  
  // Count word frequency
  const wordFrequency: Record<string, number> = {};
  for (const word of filteredWords) {
    wordFrequency[word] = (wordFrequency[word] || 0) + 1;
  }
  
  // Sort by frequency
  return Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10) // Take top 10
    .map(entry => entry[0]);
}

/**
 * Normalizes a Slack message into structured content
 */
function normalizeMessage(message: any, channelId: string): NormalizedContent {
  // Extract message text (handle potential undefined)
  const text = message.text || '';
  
  // Generate title from first line or first X characters
  const firstLine = text.split('\n')[0] || '';
  const title = firstLine.length > 10 
    ? firstLine.substring(0, 50) + (firstLine.length > 50 ? '...' : '') 
    : `Message from ${new Date(Number(message.ts) * 1000).toLocaleString()}`;
  
  // Extract entities
  const entities = extractEntities(text);
  
  // Analyze sentiment
  const sentiment = analyzeSentiment(text);
  
  // Extract keywords
  const keywords = extractKeywords(text);
  
  // Extract metadata
  const messageMetadata = extractMessageMetadata(message, channelId);
  
  // Create summary if message is long
  let summary: string | undefined;
  if (text.length > 200) {
    // Simple summary: first sentence or first few words
    const firstSentence = text.split(/[.!?](\s|$)/)[0] || '';
    summary = firstSentence.length > 20 
      ? firstSentence + '...'
      : text.substring(0, 100) + (text.length > 100 ? '...' : '');
  }
  
  return {
    title,
    content: text,
    summary,
    keywords,
    entities,
    sentiment,
    messageMetadata
  };
}

/**
 * Creates a document from a normalized Slack message
 */
async function createDocumentFromNormalizedMessage(
  normalizedContent: NormalizedContent,
  projectId: number,
  userId: number
): Promise<number> {
  const { title, content, summary, keywords, entities, sentiment } = normalizedContent;
  
  // Create enhanced content with metadata
  const enhancedContent = `
# ${title}

${summary ? `## Summary\n${summary}\n\n` : ''}

## Content
${content}

${entities.length > 0 ? `
## Extracted Information
${entities.map(entity => `- **${entity.type}**: ${entity.content} (confidence: ${entity.confidence})`).join('\n')}
` : ''}

${keywords.length > 0 ? `
## Keywords
${keywords.join(', ')}
` : ''}

## Metadata
- Source: Slack
- Channel: ${normalizedContent.messageMetadata.channelId}
- Sentiment: ${sentiment.label} (${sentiment.score.toFixed(2)})
- Timestamp: ${normalizedContent.messageMetadata.timestamp.toLocaleString()}
- Message ID: ${normalizedContent.messageMetadata.messageId}
`;

  // Create document in storage
  const document = await storage.createDocument({
    title,
    content: enhancedContent,
    fileType: "slack_extract",
    projectId,
    createdBy: userId,
    updatedBy: userId
  });
  
  return document.id;
}

/**
 * Creates tasks from entities extracted from Slack messages
 */
async function createTasksFromEntities(
  normalizedContent: NormalizedContent,
  projectId: number,
  userId: number
): Promise<number[]> {
  const taskIds: number[] = [];
  const taskEntities = normalizedContent.entities.filter(entity => 
    (entity.type === 'task' || entity.type === 'action_item') && entity.confidence > 0.7
  );
  
  for (const taskEntity of taskEntities) {
    try {
      // Determine deadline if available
      let dueDate: Date | undefined;
      const deadlineEntity = normalizedContent.entities.find(e => e.type === 'deadline');
      if (deadlineEntity) {
        // Very basic deadline parsing - in a real implementation, use a date parsing library
        const deadlineText = deadlineEntity.content.toLowerCase();
        
        if (deadlineText.includes('tomorrow')) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          dueDate = tomorrow;
        } else if (deadlineText.includes('next week')) {
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          dueDate = nextWeek;
        } else if (deadlineText.includes('next month')) {
          const nextMonth = new Date();
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          dueDate = nextMonth;
        }
      }
      
      // Create the task
      const task = await storage.createTask({
        title: taskEntity.content,
        description: `Task extracted from Slack message: "${normalizedContent.content.substring(0, 100)}..."`,
        status: "pending",
        projectId,
        assigneeId: userId, // Default assignment to the user who extracted the data
        dueDate
      });
      
      taskIds.push(task.id);
      
      // Create a relationship between the task and the message
      await storage.createRelationship({
        sourceType: "task",
        sourceId: task.id,
        targetType: "slack_message",
        targetId: parseInt(normalizedContent.messageMetadata.messageId),
        strength: Math.round(taskEntity.confidence * 10),
        description: "Task extracted from Slack message"
      });
    } catch (error) {
      console.error("Error creating task from entity:", error);
    }
  }
  
  return taskIds;
}

/**
 * Extracts and processes messages from Slack for a project
 */
export async function extractProjectDataFromSlack(
  userId: number,
  projectId: number,
  channelId: string
): Promise<{ success: boolean; count?: number; error?: string; entities?: number; tasks?: number; documents?: number }> {
  try {
    const messages = await getSlackMessages(userId, channelId);
    if (!messages) {
      return { success: false, error: "Could not fetch Slack messages" };
    }

    // Statistics
    let processedCount = 0;
    let extractedEntityCount = 0;
    let createdTaskCount = 0;
    let createdDocumentCount = 0;
    
    // Process each message
    for (const message of messages) {
      if (!message.text || message.text.trim().length === 0) {
        continue; // Skip empty messages
      }
      
      // Step 1: Normalize message content
      const normalizedContent = normalizeMessage(message, channelId);
      extractedEntityCount += normalizedContent.entities.length;
      
      // Step 2: Create an activity for each significant message
      await storage.createActivity({
        type: "slack_message",
        description: `Slack message: ${normalizedContent.title}`,
        userId,
        projectId,
        entityType: "slack_message",
        entityId: parseInt(normalizedContent.messageMetadata.messageId),
        timestamp: normalizedContent.messageMetadata.timestamp
      });
      
      // Step 3: For messages with significant content, create documents
      if (message.text.length > 150 || normalizedContent.entities.length > 0) {
        const documentId = await createDocumentFromNormalizedMessage(normalizedContent, projectId, userId);
        createdDocumentCount++;
        
        // Create a relationship between the document and the message
        await storage.createRelationship({
          sourceType: "document",
          sourceId: documentId,
          targetType: "slack_message",
          targetId: parseInt(normalizedContent.messageMetadata.messageId),
          strength: 10,
          description: "Document created from Slack message"
        });
      }
      
      // Step 4: Extract tasks and action items
      const taskIds = await createTasksFromEntities(normalizedContent, projectId, userId);
      createdTaskCount += taskIds.length;
      
      processedCount++;
    }
    
    return { 
      success: true, 
      count: processedCount,
      entities: extractedEntityCount,
      tasks: createdTaskCount,
      documents: createdDocumentCount
    };
  } catch (error: unknown) {
    console.error("Error extracting project data from Slack:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}