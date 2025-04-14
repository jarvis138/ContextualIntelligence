import { ProcessorBase, ProcessingOptions, ProcessingResult, DocumentMetadata } from './ProcessorBase';
import { AuditEventType, logAuditEvent } from '../../utils/auditLogger';
import { formatBytes } from '../../utils/formatHelpers';
import { decodeUnicodeEntities, formatEmailDate } from '../../utils/textProcessing';
import { nanoid } from 'nanoid';
import { EmailAttachment, EmailHeader, EmailThread, EmailThreadRelationship } from './EmailTypes';
import { entityTypeEnum } from '@shared/schema';
import path from 'path';
import fs from 'fs/promises';
import { storage } from '../../storage';

/**
 * Email Processor for handling email files and messages
 * Supports parsing email body, headers, threads, and attachments
 */
export class EmailProcessor extends ProcessorBase {
  private emailContent: string = '';
  private headers: EmailHeader = {};
  private attachments: EmailAttachment[] = [];
  private threadInfo: EmailThread | null = null;
  private fileBuffer: Buffer | null = null;

  constructor(options: ProcessingOptions) {
    super(options);
    this.metadata = {
      ...this.metadata,
      emailSpecific: {
        hasAttachments: false,
        isThread: false,
        threadCount: 0,
        from: '',
        to: [],
        cc: [],
        subject: '',
        sentDate: null,
        importance: 'normal',
      }
    };
  }

  /**
   * Process an email file
   */
  async processFile(): Promise<ProcessingResult> {
    try {
      this.logger.info(`Processing email file: ${this.filePath}`);
      
      // Read the file buffer once and store it
      this.fileBuffer = await fs.readFile(this.filePath);
      const fileSize = this.fileBuffer.length;
      
      // Process the email content
      await this.parseEmailContent(this.fileBuffer);
      
      // Extract and normalize headers
      await this.extractHeaders();
      
      // Process thread information if this is a thread
      await this.processThreadInformation();
      
      // Extract and process attachments
      await this.extractAttachments();
      
      // Extract the main text content from the email body
      const textContent = await this.extractTextContent();
      
      // Update metadata with email-specific information
      this.enrichMetadata(fileSize);
      
      // Log the successful processing
      await logAuditEvent({
        eventType: AuditEventType.DOCUMENT_PROCESSED,
        description: `Successfully processed email: ${this.metadata.emailSpecific.subject}`,
        metadata: {
          processor: 'EmailProcessor',
          fileSize: formatBytes(fileSize),
          hasAttachments: this.metadata.emailSpecific.hasAttachments,
          attachmentCount: this.attachments.length,
        }
      });
      
      return {
        content: textContent,
        metadata: this.metadata,
        entities: await this.extractEntities(textContent),
        relationships: await this.buildRelationships(),
        success: true,
      };
    } catch (error) {
      this.logger.error(`Error processing email file: ${error.message}`, error);
      
      await logAuditEvent({
        eventType: AuditEventType.DOCUMENT_PROCESSING_FAILED,
        description: `Failed to process email file: ${this.filePath}`,
        severity: 'error',
        metadata: {
          processor: 'EmailProcessor',
          error: error.message,
          stack: error.stack,
        }
      });
      
      return {
        content: null,
        metadata: this.metadata,
        entities: [],
        relationships: [],
        success: false,
        error: `Error processing email: ${error.message}`,
      };
    }
  }

  /**
   * Process email content from a buffer
   */
  async processBuffer(buffer: Buffer): Promise<ProcessingResult> {
    try {
      this.logger.info('Processing email from buffer');
      this.fileBuffer = buffer;
      const fileSize = buffer.length;
      
      // Process the email content
      await this.parseEmailContent(buffer);
      
      // Extract and normalize headers
      await this.extractHeaders();
      
      // Process thread information if this is a thread
      await this.processThreadInformation();
      
      // Extract and process attachments
      await this.extractAttachments();
      
      // Extract the main text content from the email body
      const textContent = await this.extractTextContent();
      
      // Update metadata with email-specific information
      this.enrichMetadata(fileSize);
      
      return {
        content: textContent,
        metadata: this.metadata,
        entities: await this.extractEntities(textContent),
        relationships: await this.buildRelationships(),
        success: true,
      };
    } catch (error) {
      this.logger.error(`Error processing email buffer: ${error.message}`, error);
      
      return {
        content: null,
        metadata: this.metadata,
        entities: [],
        relationships: [],
        success: false,
        error: `Error processing email buffer: ${error.message}`,
      };
    }
  }

  /**
   * Parse email content from buffer
   */
  private async parseEmailContent(buffer: Buffer): Promise<void> {
    // Convert buffer to string with proper encoding detection
    this.emailContent = await this.detectAndDecodeContent(buffer);
    
    // Basic validation that this is an email format
    if (!this.isValidEmailFormat(this.emailContent)) {
      throw new Error('Invalid email format');
    }
  }

  /**
   * Detect encoding and decode content properly
   */
  private async detectAndDecodeContent(buffer: Buffer): Promise<string> {
    // This would ideally use a robust encoding detection library
    // For now, we'll handle the most common encodings
    
    // Check for UTF-8 BOM
    if (buffer.length >= 3 && 
        buffer[0] === 0xEF && 
        buffer[1] === 0xBB && 
        buffer[2] === 0xBF) {
      return buffer.toString('utf8', 3);
    }
    
    try {
      // Try UTF-8 first
      const content = buffer.toString('utf8');
      return decodeUnicodeEntities(content);
    } catch (e) {
      // Fallback to ISO-8859-1 (Latin-1) if UTF-8 fails
      return decodeUnicodeEntities(buffer.toString('latin1'));
    }
  }

  /**
   * Check if content appears to be in email format
   */
  private isValidEmailFormat(content: string): boolean {
    // Simple check for common email headers
    return content.includes('From:') && 
           (content.includes('To:') || content.includes('Subject:'));
  }

  /**
   * Extract and normalize email headers
   */
  private async extractHeaders(): Promise<void> {
    // Split content into headers and body sections
    const headerSection = this.emailContent.split(/\r?\n\r?\n/)[0];
    
    if (!headerSection) {
      throw new Error('No valid header section found in email');
    }
    
    // Extract standard headers
    this.headers = this.parseHeadersSection(headerSection);
    
    // Add normalized header data to metadata
    this.metadata.emailSpecific.from = this.normalizeEmailAddress(this.headers['From'] || '');
    this.metadata.emailSpecific.to = this.parseAddressList(this.headers['To'] || '');
    this.metadata.emailSpecific.cc = this.parseAddressList(this.headers['Cc'] || '');
    this.metadata.emailSpecific.subject = decodeUnicodeEntities(this.headers['Subject'] || 'No Subject');
    
    // Handle date with proper normalization
    if (this.headers['Date']) {
      this.metadata.emailSpecific.sentDate = formatEmailDate(this.headers['Date']);
    }
    
    // Handle importance/priority headers
    this.processImportanceHeaders();
  }

  /**
   * Parse headers section into a structured object
   */
  private parseHeadersSection(headerSection: string): EmailHeader {
    const headers: EmailHeader = {};
    const headerLines = headerSection.split(/\r?\n/);
    let currentHeader = '';
    let currentValue = '';
    
    // Process each line, handling folded headers
    for (let i = 0; i < headerLines.length; i++) {
      const line = headerLines[i];
      
      // Check if this is a continuation of the previous header (folded header)
      if (/^\s+/.test(line) && currentHeader) {
        currentValue += ' ' + line.trim();
        continue;
      }
      
      // If we have a header being processed, save it before starting a new one
      if (currentHeader) {
        headers[currentHeader] = currentValue;
        currentHeader = '';
        currentValue = '';
      }
      
      // Parse new header
      const match = line.match(/^([\w-]+):\s*(.*)$/);
      if (match) {
        currentHeader = match[1];
        currentValue = match[2].trim();
      }
    }
    
    // Add the last header if there is one
    if (currentHeader) {
      headers[currentHeader] = currentValue;
    }
    
    return headers;
  }

  /**
   * Process thread information from email headers
   */
  private async processThreadInformation(): Promise<void> {
    // Check for thread-related headers
    const messageId = this.headers['Message-ID'] || this.headers['Message-Id'] || null;
    const references = this.headers['References'] || '';
    const inReplyTo = this.headers['In-Reply-To'] || '';
    
    // Initialize thread info
    this.threadInfo = {
      messageId: messageId ? this.normalizeMessageId(messageId) : nanoid(),
      parentMessageId: null,
      references: [],
      isPartOfThread: false,
    };
    
    // Process parent message ID from In-Reply-To header
    if (inReplyTo) {
      this.threadInfo.parentMessageId = this.normalizeMessageId(inReplyTo);
      this.threadInfo.isPartOfThread = true;
    }
    
    // Process references for thread relationship mapping
    if (references) {
      this.threadInfo.references = references
        .split(/\s+/)
        .map(ref => this.normalizeMessageId(ref))
        .filter(Boolean);
      
      if (this.threadInfo.references.length > 0) {
        this.threadInfo.isPartOfThread = true;
      }
    }
    
    // Update metadata with thread information
    this.metadata.emailSpecific.isThread = this.threadInfo.isPartOfThread;
    this.metadata.emailSpecific.threadCount = this.threadInfo.references.length + 1;
  }

  /**
   * Extract and process email attachments
   */
  private async extractAttachments(): Promise<void> {
    // In a real implementation, this would parse MIME parts
    // For this demonstration, we'll simulate finding attachments
    
    // Example simulated attachment detection logic
    const contentType = this.headers['Content-Type'] || '';
    
    if (contentType.includes('multipart/mixed') || 
        contentType.includes('multipart/related')) {
      
      // Parse boundaries and extract MIME parts
      const boundary = this.extractBoundary(contentType);
      
      if (boundary) {
        this.attachments = await this.parseMIMEParts(boundary);
      }
    }
    
    // Update metadata
    this.metadata.emailSpecific.hasAttachments = this.attachments.length > 0;
  }

  /**
   * Extract boundary from Content-Type header
   */
  private extractBoundary(contentType: string): string | null {
    const match = contentType.match(/boundary="?([^";\r\n]+)"?/i);
    return match ? match[1] : null;
  }

  /**
   * Parse MIME parts using boundary
   */
  private async parseMIMEParts(boundary: string): Promise<EmailAttachment[]> {
    const attachments: EmailAttachment[] = [];
    
    // Split content by boundary
    const parts = this.emailContent.split(new RegExp(`--${boundary}(?:--)?\\s*`));
    
    // Process each part
    for (let part of parts) {
      if (!part.trim()) continue;
      
      // Split part into headers and content
      const [partHeadersText, ...partContentParts] = part.split(/\r?\n\r?\n/);
      const partContent = partContentParts.join('\r\n\r\n');
      
      if (!partHeadersText || !partContent) continue;
      
      // Parse headers for this part
      const partHeaders = this.parseHeadersSection(partHeadersText);
      
      // Check if this part is an attachment
      const contentDisposition = partHeaders['Content-Disposition'] || '';
      const contentType = partHeaders['Content-Type'] || '';
      
      if (contentDisposition.includes('attachment') || 
          contentDisposition.includes('inline') && !contentType.includes('text/plain')) {
        
        // Extract filename
        const filenameMatch = contentDisposition.match(/filename="?([^";\r\n]+)"?/i);
        const filename = filenameMatch ? filenameMatch[1] : 'attachment.dat';
        
        // Extract content encoding
        const contentEncoding = partHeaders['Content-Transfer-Encoding'] || '';
        
        // Create buffer based on encoding
        let buffer: Buffer;
        if (contentEncoding.toLowerCase() === 'base64') {
          // Remove whitespace from base64 string
          const cleanBase64 = partContent.replace(/\s/g, '');
          buffer = Buffer.from(cleanBase64, 'base64');
        } else {
          // Default handling
          buffer = Buffer.from(partContent, 'utf8');
        }
        
        // Add to attachments list
        attachments.push({
          filename,
          contentType,
          size: buffer.length,
          content: buffer,
          contentId: partHeaders['Content-ID'] || null,
        });
      }
    }
    
    return attachments;
  }

  /**
   * Extract text content from email body
   */
  private async extractTextContent(): Promise<string> {
    // Split content into headers and body
    const parts = this.emailContent.split(/\r?\n\r?\n/);
    parts.shift(); // Remove headers
    
    let body = parts.join('\r\n\r\n');
    
    // Handle content types and encodings
    const contentType = this.headers['Content-Type'] || '';
    const contentEncoding = this.headers['Content-Transfer-Encoding'] || '';
    
    // Handle HTML content
    if (contentType.includes('text/html')) {
      // Basic HTML to text conversion (a real implementation would use a proper HTML parser)
      body = body
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ');
    }
    
    // Handle different encodings
    if (contentEncoding.toLowerCase() === 'base64') {
      try {
        // Remove whitespace and decode
        const cleanBase64 = body.replace(/\s/g, '');
        body = Buffer.from(cleanBase64, 'base64').toString('utf8');
      } catch (error) {
        this.logger.warn('Error decoding base64 body', error);
      }
    } else if (contentEncoding.toLowerCase() === 'quoted-printable') {
      // Simple quoted-printable decoder
      body = body
        .replace(/=\r?\n/g, '')
        .replace(/=([0-9A-F]{2})/gi, (_, hex) => 
          String.fromCharCode(parseInt(hex, 16))
        );
    }
    
    // Add formatted header information to the beginning
    const formattedHeaders = this.formatHeadersForContent();
    
    return formattedHeaders + '\n\n' + body;
  }

  /**
   * Format headers for inclusion in content
   */
  private formatHeadersForContent(): string {
    const lines = [];
    
    if (this.headers['From']) {
      lines.push(`From: ${this.headers['From']}`);
    }
    
    if (this.headers['To']) {
      lines.push(`To: ${this.headers['To']}`);
    }
    
    if (this.headers['Cc'] && this.headers['Cc'].trim()) {
      lines.push(`Cc: ${this.headers['Cc']}`);
    }
    
    if (this.headers['Subject']) {
      lines.push(`Subject: ${this.headers['Subject']}`);
    }
    
    if (this.headers['Date']) {
      lines.push(`Date: ${this.headers['Date']}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Build relationships from email data
   */
  private async buildRelationships(): Promise<EmailThreadRelationship[]> {
    const relationships: EmailThreadRelationship[] = [];
    
    // Only create relationships if this is part of a thread
    if (this.threadInfo && this.threadInfo.isPartOfThread) {
      // If we have a parent message ID, create a relationship
      if (this.threadInfo.parentMessageId) {
        relationships.push({
          sourceType: "document", // Using entityTypeEnum value directly
          sourceId: 0, // Will be updated when document is saved
          targetType: "document", // Using entityTypeEnum value directly
          targetId: 0, // Needs to be resolved by looking up the parent message
          strength: 100,
          description: 'Reply to email',
          metadata: {
            relationship: 'email_thread',
            parentMessageId: this.threadInfo.parentMessageId,
            childMessageId: this.threadInfo.messageId,
          }
        });
      }
      
      // Add relationships for all references
      for (const refMessageId of this.threadInfo.references) {
        if (refMessageId !== this.threadInfo.parentMessageId) {
          relationships.push({
            sourceType: "document", // Using entityTypeEnum value directly
            sourceId: 0, // Will be updated when document is saved
            targetType: "document", // Using entityTypeEnum value directly
            targetId: 0, // Needs to be resolved by looking up the referenced message
            strength: 80,
            description: 'Part of email thread',
            metadata: {
              relationship: 'email_thread',
              referencedMessageId: refMessageId,
              currentMessageId: this.threadInfo.messageId,
            }
          });
        }
      }
    }
    
    // Add relationships for attachments if they were saved as separate documents
    for (let i = 0; i < this.attachments.length; i++) {
      relationships.push({
        sourceType: "document", // Using entityTypeEnum value directly
        sourceId: 0, // Will be updated when document is saved
        targetType: "document", // Using entityTypeEnum value directly
        targetId: 0, // Will be updated when attachment is saved
        strength: 100,
        description: `Email attachment: ${this.attachments[i].filename}`,
        metadata: {
          relationship: 'email_attachment',
          attachmentIndex: i,
          filename: this.attachments[i].filename,
        }
      });
    }
    
    return relationships;
  }

  /**
   * Process and save attachments as separate documents
   */
  async saveAttachments(documentId: number, userId: number, projectId: number): Promise<number[]> {
    const attachmentIds: number[] = [];
    
    for (const attachment of this.attachments) {
      try {
        // Determine file type based on file extension
        const fileExt = path.extname(attachment.filename).toLowerCase();
        let fileType = 'unknown';
        
        // Simple file type mapping
        if (['.pdf'].includes(fileExt)) {
          fileType = 'pdf';
        } else if (['.doc', '.docx', '.rtf'].includes(fileExt)) {
          fileType = 'document';
        } else if (['.xls', '.xlsx', '.csv'].includes(fileExt)) {
          fileType = 'spreadsheet';
        } else if (['.ppt', '.pptx'].includes(fileExt)) {
          fileType = 'presentation';
        } else if (['.txt', '.md'].includes(fileExt)) {
          fileType = 'text';
        } else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(fileExt)) {
          fileType = 'image';
        }
        
        // Create a document for the attachment
        const document = await storage.createDocument({
          title: attachment.filename,
          description: `Attachment from email: ${this.metadata.emailSpecific.subject}`,
          projectId,
          content: null, // Content will be processed separately
          fileType,
          createdBy: userId,
          updatedBy: userId,
          fileSize: attachment.size,
          sourceUrl: null,
          thumbnailUrl: null,
          status: 'active',
          processingStatus: 'queued',
          source: 'email_attachment',
          sourceReference: this.threadInfo?.messageId || '',
          lifecycleState: 'active',
          accessLevel: 'internal',
          metadata: {
            parentDocument: documentId,
            contentType: attachment.contentType,
            emailSubject: this.metadata.emailSpecific.subject,
          }
        });
        
        // Store the attachment ID for relationship building
        attachmentIds.push(document.id);
        
        // TODO: Save the attachment file to disk and process it
        // This would typically involve:
        // 1. Saving the attachment.content buffer to a file
        // 2. Using the appropriate processor to process the file
        // 3. Updating the document with the processed content
      } catch (error) {
        this.logger.error(`Error saving attachment ${attachment.filename}:`, error);
      }
    }
    
    return attachmentIds;
  }

  /**
   * Update email metadata with processed information
   */
  private enrichMetadata(fileSize: number): void {
    this.metadata = {
      ...this.metadata,
      fileSize,
      emailSpecific: {
        ...this.metadata.emailSpecific,
        messageId: this.threadInfo?.messageId || '',
        parentMessageId: this.threadInfo?.parentMessageId || null,
        references: this.threadInfo?.references || [],
        hasAttachments: this.attachments.length > 0,
        attachmentCount: this.attachments.length,
        attachmentNames: this.attachments.map(a => a.filename),
      }
    };
  }

  /**
   * Process email importance/priority headers
   */
  private processImportanceHeaders(): void {
    // Check various priority/importance headers
    const importance = this.headers['Importance'] || '';
    const priority = this.headers['X-Priority'] || this.headers['Priority'] || '';
    
    if (importance.toLowerCase() === 'high' || 
        priority.includes('1') || 
        priority.toLowerCase().includes('high')) {
      this.metadata.emailSpecific.importance = 'high';
    } else if (importance.toLowerCase() === 'low' || 
               priority.includes('5') || 
               priority.toLowerCase().includes('low')) {
      this.metadata.emailSpecific.importance = 'low';
    }
  }

  /**
   * Parse email address list into an array of addresses
   */
  private parseAddressList(addressListStr: string): string[] {
    if (!addressListStr.trim()) return [];
    
    // Split by commas, but handle quoted sections containing commas
    const addresses: string[] = [];
    let currentAddress = '';
    let inQuotes = false;
    
    for (let i = 0; i < addressListStr.length; i++) {
      const char = addressListStr[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
        currentAddress += char;
      } else if (char === ',' && !inQuotes) {
        addresses.push(this.normalizeEmailAddress(currentAddress.trim()));
        currentAddress = '';
      } else {
        currentAddress += char;
      }
    }
    
    if (currentAddress.trim()) {
      addresses.push(this.normalizeEmailAddress(currentAddress.trim()));
    }
    
    return addresses.filter(Boolean);
  }

  /**
   * Normalize an email address
   */
  private normalizeEmailAddress(address: string): string {
    return address.trim();
  }

  /**
   * Normalize a message ID
   */
  private normalizeMessageId(messageId: string): string {
    // Remove < and > if present
    return messageId.trim().replace(/^<|>$/g, '');
  }
}