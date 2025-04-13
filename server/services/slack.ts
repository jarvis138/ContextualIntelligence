import { WebClient, ChatPostMessageArguments } from "@slack/web-api";
import { Integration } from "@shared/schema";

// Singleton instance of the Slack client
let slackClient: WebClient | null = null;

/**
 * Initialize the Slack client with a token
 */
export function initializeSlackClient(token: string): WebClient {
  slackClient = new WebClient(token);
  return slackClient;
}

/**
 * Get the Slack client
 */
export function getSlackClient(token?: string): WebClient {
  if (!slackClient && token) {
    return initializeSlackClient(token);
  }
  
  if (!slackClient) {
    throw new Error("Slack client not initialized");
  }
  
  return slackClient;
}

/**
 * Send a message to a Slack channel
 */
export async function sendSlackMessage(
  message: ChatPostMessageArguments,
  token?: string
): Promise<string | undefined> {
  try {
    const client = getSlackClient(token);
    const response = await client.chat.postMessage(message);
    return response.ts;
  } catch (error: any) {
    console.error("Error sending Slack message:", error?.message || "Unknown error");
    throw error;
  }
}

/**
 * Send a project update to Slack
 */
export async function sendProjectUpdate(
  projectId: number,
  projectName: string,
  updateText: string,
  channelId: string,
  token?: string
): Promise<string | undefined> {
  const message = {
    channel: channelId,
    text: `*Project Update: ${projectName}*`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `Project Update: ${projectName}`,
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: updateText
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*Project ID:* ${projectId} | _Posted via CPI Hub_`
          }
        ]
      }
    ]
  };

  return sendSlackMessage(message, token);
}

/**
 * Send a project insight to Slack
 */
export async function sendProjectInsight(
  projectId: number,
  projectName: string,
  insightType: string,
  insightContent: string,
  confidence: number,
  channelId: string,
  token?: string
): Promise<string | undefined> {
  let emoji = "💡";
  if (insightType === "warning") emoji = "⚠️";
  if (insightType === "success") emoji = "✅";
  
  const message = {
    channel: channelId,
    text: `*Insight for ${projectName}*: ${insightContent}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} Project Insight: ${projectName}`,
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: insightContent
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*Confidence:* ${confidence}% | *Type:* ${insightType} | *Project ID:* ${projectId} | _Posted via CPI Hub_`
          }
        ]
      }
    ]
  };

  return sendSlackMessage(message, token);
}

/**
 * Test the Slack integration
 */
export async function testSlackIntegration(
  token: string,
  channelId: string
): Promise<boolean> {
  try {
    const message = {
      channel: channelId,
      text: "🔄 Testing CPI Hub integration with Slack",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "🔄 *Testing CPI Hub integration with Slack*"
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "If you can see this message, the integration is working correctly!"
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: "_This is a test message from CPI Hub_"
            }
          ]
        }
      ]
    };

    await sendSlackMessage(message, token);
    return true;
  } catch (error) {
    console.error("Slack integration test failed:", error);
    return false;
  }
}

/**
 * Get the history of a Slack channel
 */
export async function getSlackChannelHistory(
  channelId: string,
  limit: number = 10,
  token?: string
): Promise<any> {
  try {
    const client = getSlackClient(token);
    const response = await client.conversations.history({
      channel: channelId,
      limit
    });
    return response;
  } catch (error: any) {
    console.error("Error getting Slack channel history:", error?.message || "Unknown error");
    throw error;
  }
}