import { SQSEvent, SQSHandler, SQSRecord } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { Readable } from 'stream';
import * as pdf from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import { createHash } from 'crypto';
import { logger } from '../utils/logger';

// Initialize clients
const s3Client = new S3Client({ region: process.env.REGION });
const sqsClient = new SQSClient({ region: process.env.REGION });

interface DocumentProcessingEvent {
  documentId: string;
  bucketName: string;
  objectKey: string;
  tenantId: number;
  userId: number;
  mimeType: string;
  fileName: string;
  metadata?: Record<string, any>;
}

/**
 * Process documents from S3 and extract text content
 */
export const handler: SQSHandler = async (event: SQSEvent) => {
  logger.info('Processing document batch', { recordCount: event.Records.length });
  
  const processingResults = await Promise.allSettled(
    event.Records.map(processRecord)
  );
  
  // Log results
  const succeeded = processingResults.filter(r => r.status === 'fulfilled').length;
  const failed = processingResults.filter(r => r.status === 'rejected').length;
  
  logger.info('Document processing completed', { succeeded, failed });
  
  // If any processing failed, throw error to keep messages in queue
  if (failed > 0) {
    throw new Error(`Failed to process ${failed} documents`);
  }
};

/**
 * Process a single SQS record
 */
async function processRecord(record: SQSRecord): Promise<void> {
  try {
    // Parse the message
    const message = JSON.parse(record.body) as DocumentProcessingEvent;
    logger.info('Processing document', { documentId: message.documentId });
    
    // Get the document from S3
    const s3Response = await s3Client.send(new GetObjectCommand({
      Bucket: message.bucketName,
      Key: message.objectKey
    }));
    
    // Convert stream to buffer
    const documentBuffer = await streamToBuffer(s3Response.Body as Readable);
    
    // Extract text based on mime type
    let extractedText = '';
    let pageCount = 0;
    
    switch (message.mimeType) {
      case 'application/pdf':
        const pdfData = await pdf(documentBuffer);
        extractedText = pdfData.text;
        pageCount = pdfData.numpages;
        break;
        
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        const wordData = await mammoth.extractRawText({ buffer: documentBuffer });
        extractedText = wordData.value;
        break;
        
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'application/vnd.ms-excel':
        const workbook = xlsx.read(documentBuffer);
        extractedText = workbook.SheetNames
          .map(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            return xlsx.utils.sheet_to_txt(sheet);
          })
          .join('\n\n');
        break;
        
      case 'text/plain':
        extractedText = documentBuffer.toString('utf-8');
        break;
        
      default:
        logger.warn('Unsupported document type', { 
          documentId: message.documentId, 
          mimeType: message.mimeType 
        });
        extractedText = 'Unsupported document type';
    }
    
    // Calculate content hash for deduplication
    const contentHash = createHash('sha256')
      .update(extractedText)
      .digest('hex');
    
    // Send to indexing queue
    await sqsClient.send(new SendMessageCommand({
      QueueUrl: process.env.OUTPUT_QUEUE_URL,
      MessageBody: JSON.stringify({
        ...message,
        extractedText,
        contentHash,
        pageCount,
        processingTimestamp: new Date().toISOString()
      })
    }));
    
    logger.info('Document processed successfully', { 
      documentId: message.documentId,
      textLength: extractedText.length,
      contentHash: contentHash.substring(0, 8) // Log just the first 8 chars
    });
  } catch (error) {
    logger.error('Error processing document', { 
      error: (error as Error).message,
      record: record.messageId
    });
    throw error;
  }
}

/**
 * Convert a readable stream to a buffer
 */
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}