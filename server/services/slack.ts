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
 * Extracts and processes messages from Slack for a project
 */
export async function extractProjectDataFromSlack(
  userId: number,
  projectId: number,
  channelId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const messages = await getSlackMessages(userId, channelId);
    if (!messages) {
      return { success: false, error: "Could not fetch Slack messages" };
    }

    // Process messages:
    // 1. Extract key information
    // 2. Create activities
    // 3. Create documents for longer messages
    // 4. Create relationship between Slack messages and other project entities
    
    let processedCount = 0;
    
    for (const message of messages) {
      if (message.text && message.text.trim().length > 0) {
        // Create activity for each message
        await storage.createActivity({
          type: "slack_message",
          description: `Slack message: ${message.text.substring(0, 100)}${message.text.length > 100 ? '...' : ''}`,
          userId,
          projectId,
          entityType: "slack_message",
          entityId: null, // We don't store the actual messages in our DB
          timestamp: new Date(Number(message.ts) * 1000), // Convert Slack timestamp to Date
        });
        
        // For longer messages, create documents
        if (message.text.length > 200) {
          await storage.createDocument({
            title: `Slack message at ${new Date(Number(message.ts) * 1000).toLocaleString()}`,
            content: message.text,
            fileType: "text",
            projectId,
            createdBy: userId,
            updatedBy: userId,
          });
        }
        
        processedCount++;
      }
    }
    
    return { success: true, count: processedCount };
  } catch (error: unknown) {
    console.error("Error extracting project data from Slack:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}