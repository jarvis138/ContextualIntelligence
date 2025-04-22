import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { logger } from '../utils/logger';
import { indexDocument } from './elasticsearch';
import { publishMessage } from './message-queue';
import { getDocument, updateDocument } from '../repositories/document.repository';
import { config } from '../config';

const readFile = promisify(fs.readFile);

// Process document
export const processDocument = async (data: { 
  documentId: number | string;
  tenantId: number | string;
}) => {
  try {
    const { documentId, tenantId } = data;
    
    // Get document from database
    const document = await getDocument(documentId, tenantId);
    
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }
    
    // Get file path
    let filePath: string;
    
    if (config.storage.type === 's3') {
      // For S3, we would download the file to a temporary location
      // This is a placeholder for the actual implementation
      filePath = await downloadFromS3(document.storagePath);
    } else {
      // For local storage
      filePath = path.join(config.storage.local.path, document.storagePath);
    }
    
    // Extract text based on file type
    let extractedText = '';
    
    switch (document.fileType.toLowerCase()) {
      case 'pdf':
        extractedText = await extractTextFromPdf(filePath);
        break;
      case 'txt':
      case 'csv':
      case 'json':
        extractedText = await extractTextFromTextFile(filePath);
        break;
      case 'jpg':
      case 'jpeg':
      case 'png':
        extractedText = await extractTextFromImage(filePath);
        break;
      default:
        logger.warn(`Unsupported file type for text extraction: ${document.fileType}`);
        extractedText = `File type ${document.fileType} not supported for text extraction`;
    }
    
    // Update document with extracted text
    const updatedDocument = await updateDocument(documentId, tenantId, {
      content: extractedText,
      processingStatus: 'completed',
      processingCompletedAt: new Date()
    });
    
    // Index document in Elasticsearch
    await indexDocument({
      ...updatedDocument,
      content: extractedText
    });
    
    // Publish document processed event
    await publishMessage('document.event.processed', {
      documentId,
      tenantId,
      status: 'completed'
    });
    
    // Clean up temporary file if using S3
    if (config.storage.type === 's3') {
      await cleanupTempFile(filePath);
    }
    
    logger.info(`Document processed successfully: ${documentId}`);
  } catch (error) {
    logger.error(`Error processing document: ${data.documentId}`, { error });
    
    // Update document with error status
    await updateDocument(data.documentId, data.tenantId, {
      processingStatus: 'error',
      processingError: (error as Error).message
    });
    
    // Publish document processing error event
    await publishMessage('document.event.processing_error', {
      documentId: data.documentId,
      tenantId: data.tenantId,
      error: (error as Error).message
    });
    
    throw error;
  }
};

// Extract text from PDF
const extractTextFromPdf = async (filePath: string): Promise<string> => {
  try {
    const dataBuffer = await readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    logger.error(`Error extracting text from PDF: ${filePath}`, { error });
    throw error;
  }
};

// Extract text from text file
const extractTextFromTextFile = async (filePath: string): Promise<string> => {
  try {
    const data = await readFile(filePath, 'utf8');
    return data;
  } catch (error) {
    logger.error(`Error extracting text from file: ${filePath}`, { error });
    throw error;
  }
};

// Extract text from image using OCR
const extractTextFromImage = async (filePath: string): Promise<string> => {
  try {
    const worker = await createWorker();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    
    const { data: { text } } = await worker.recognize(filePath);
    
    await worker.terminate();
    
    return text;
  } catch (error) {
    logger.error(`Error extracting text from image: ${filePath}`, { error });
    throw error;
  }
};

// Download file from S3 (placeholder)
const downloadFromS3 = async (storagePath: string): Promise<string> => {
  // This would be implemented with AWS SDK
  // For now, it's just a placeholder
  logger.info(`Downloading file from S3: ${storagePath}`);
  
  // Return a temporary file path
  return `/tmp/${path.basename(storagePath)}`;
};

// Clean up temporary file
const cleanupTempFile = async (filePath: string): Promise<void> => {
  try {
    await promisify(fs.unlink)(filePath);
    logger.debug(`Temporary file deleted: ${filePath}`);
  } catch (error) {
    logger.error(`Error deleting temporary file: ${filePath}`, { error });
  }
};import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { logger } from '../utils/logger';
import { indexDocument } from './elasticsearch';
import { publishMessage } from './message-queue';
import { getDocument, updateDocument } from '../repositories/document.repository';
import { config } from '../config';

const readFile = promisify(fs.readFile);

// Process document
export const processDocument = async (data: { 
  documentId: number | string;
  tenantId: number | string;
}) => {
  try {
    const { documentId, tenantId } = data;
    
    // Get document from database
    const document = await getDocument(documentId, tenantId);
    
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }
    
    // Get file path
    let filePath: string;
    
    if (config.storage.type === 's3') {
      // For S3, we would download the file to a temporary location
      // This is a placeholder for the actual implementation
      filePath = await downloadFromS3(document.storagePath);
    } else {
      // For local storage
      filePath = path.join(config.storage.local.path, document.storagePath);
    }
    
    // Extract text based on file type
    let extractedText = '';
    
    switch (document.fileType.toLowerCase()) {
      case 'pdf':
        extractedText = await extractTextFromPdf(filePath);
        break;
      case 'txt':
      case 'csv':
      case 'json':
        extractedText = await extractTextFromTextFile(filePath);
        break;
      case 'jpg':
      case 'jpeg':
      case 'png':
        extractedText = await extractTextFromImage(filePath);
        break;
      default:
        logger.warn(`Unsupported file type for text extraction: ${document.fileType}`);
        extractedText = `File type ${document.fileType} not supported for text extraction`;
    }
    
    // Update document with extracted text
    const updatedDocument = await updateDocument(documentId, tenantId, {
      content: extractedText,
      processingStatus: 'completed',
      processingCompletedAt: new Date()
    });
    
    // Index document in Elasticsearch
    await indexDocument({
      ...updatedDocument,
      content: extractedText
    });
    
    // Publish document processed event
    await publishMessage('document.event.processed', {
      documentId,
      tenantId,
      status: 'completed'
    });
    
    // Clean up temporary file if using S3
    if (config.storage.type === 's3') {
      await cleanupTempFile(filePath);
    }
    
    logger.info(`Document processed successfully: ${documentId}`);
  } catch (error) {
    logger.error(`Error processing document: ${data.documentId}`, { error });
    
    // Update document with error status
    await updateDocument(data.documentId, data.tenantId, {
      processingStatus: 'error',
      processingError: (error as Error).message
    });
    
    // Publish document processing error event
    await publishMessage('document.event.processing_error', {
      documentId: data.documentId,
      tenantId: data.tenantId,
      error: (error as Error).message
    });
    
    throw error;
  }
};

// Extract text from PDF
const extractTextFromPdf = async (filePath: string): Promise<string> => {
  try {
    const dataBuffer = await readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    logger.error(`Error extracting text from PDF: ${filePath}`, { error });
    throw error;
  }
};

// Extract text from text file
const extractTextFromTextFile = async (filePath: string): Promise<string> => {
  try {
    const data = await readFile(filePath, 'utf8');
    return data;
  } catch (error) {
    logger.error(`Error extracting text from file: ${filePath}`, { error });
    throw error;
  }
};

// Extract text from image using OCR
const extractTextFromImage = async (filePath: string): Promise<string> => {
  try {
    const worker = await createWorker();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    
    const { data: { text } } = await worker.recognize(filePath);
    
    await worker.terminate();
    
    return text;
  } catch (error) {
    logger.error(`Error extracting text from image: ${filePath}`, { error });
    throw error;
  }
};

// Download file from S3 (placeholder)
const downloadFromS3 = async (storagePath: string): Promise<string> => {
  // This would be implemented with AWS SDK
  // For now, it's just a placeholder
  logger.info(`Downloading file from S3: ${storagePath}`);
  
  // Return a temporary file path
  return `/tmp/${path.basename(storagePath)}`;
};

// Clean up temporary file
const cleanupTempFile = async (filePath: string): Promise<void> => {
  try {
    await promisify(fs.unlink)(filePath);
    logger.debug(`Temporary file deleted: ${filePath}`);
  } catch (error) {
    logger.error(`Error deleting temporary file: ${filePath}`, { error });
  }
};