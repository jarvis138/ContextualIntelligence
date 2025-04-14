import { entityTypeEnum } from "@shared/schema";

/**
 * Email Header type
 * Contains parsed email headers as key-value pairs
 */
export interface EmailHeader {
  [key: string]: string;
}

/**
 * Email Attachment type
 * Represents a file attachment in an email
 */
export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  content: Buffer;
  contentId: string | null;
}

/**
 * Email Thread Information
 * Tracks parent-child relationships between emails in a thread
 */
export interface EmailThread {
  messageId: string;
  parentMessageId: string | null;
  references: string[];
  isPartOfThread: boolean;
}

/**
 * Email Thread Relationship
 * Defines relationships between emails in the same thread
 */
export interface EmailThreadRelationship {
  sourceType: typeof entityTypeEnum.enumValues[number];
  sourceId: number;
  targetType: typeof entityTypeEnum.enumValues[number];
  targetId: number;
  strength: number;
  description: string;
  metadata: {
    relationship: string;
    [key: string]: any;
  };
}

/**
 * Normalized Email Address
 * Represents a parsed and normalized email address
 */
export interface NormalizedEmailAddress {
  name: string | null;
  email: string;
  original: string;
}

/**
 * Email Processing Options
 * Configuration options for the email processor
 */
export interface EmailProcessingOptions {
  extractAttachments: boolean;
  saveAttachmentsAsDocuments: boolean;
  preserveFormatting: boolean;
  decodeEncodedContent: boolean;
  handleThreads: boolean;
}

/**
 * Email Message Content
 * Contains the extracted text and html content of the email
 */
export interface EmailMessageContent {
  textContent: string | null;
  htmlContent: string | null;
  extractedAttachments: number;
}

/**
 * Email Entity
 * Represents an entity extracted from an email
 */
export interface EmailEntity {
  type: string;
  value: string;
  confidence: number;
  metadata?: any;
}