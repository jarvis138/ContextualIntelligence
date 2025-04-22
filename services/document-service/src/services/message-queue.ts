import amqplib, { Channel, Connection } from 'amqplib';
import { config } from '../config';
import { logger } from '../utils/logger';
import { processDocument } from './document-processor';

// Connection and channel variables
let connection: Connection;
let channel: Channel;

// Setup message queue
export const setupMessageQueue = async () => {
  try {
    logger.info('Setting up message queue');
    
    // Connect to RabbitMQ
    connection = await amqplib.connect(config.messageQueue.url);
    channel = await connection.createChannel();
    
    // Setup exchange
    await channel.assertExchange(config.messageQueue.exchange, 'topic', { durable: true });
    
    // Setup queues
    await channel.assertQueue(config.messageQueue.queues.documentProcessing, { durable: true });
    await channel.assertQueue(config.messageQueue.queues.documentIndexing, { durable: true });
    await channel.assertQueue(config.messageQueue.queues.documentEvents, { durable: true });
    
    // Bind queues to exchange
    await channel.bindQueue(
      config.messageQueue.queues.documentProcessing,
      config.messageQueue.exchange,
      'document.process'
    );
    
    await channel.bindQueue(
      config.messageQueue.queues.documentIndexing,
      config.messageQueue.exchange,
      'document.index'
    );
    
    await channel.bindQueue(
      config.messageQueue.queues.documentEvents,
      config.messageQueue.exchange,
      'document.event.#'
    );
    
    // Set prefetch to 1 to ensure fair distribution of work
    await channel.prefetch(1);
    
    // Setup consumers
    await setupConsumers();
    
    logger.info('Message queue setup completed');
  } catch (error) {
    logger.error('Failed to setup message queue', { error });
    throw error;
  }
};

// Setup message consumers
const setupConsumers = async () => {
  // Document processing consumer
  channel.consume(config.messageQueue.queues.documentProcessing, async (msg) => {
    if (!msg) return;
    
    try {
      const content = JSON.parse(msg.content.toString());
      logger.info(`Processing document: ${content.documentId}`);
      
      // Process document
      await processDocument(content);
      
      // Acknowledge message
      channel.ack(msg);
    } catch (error) {
      logger.error('Error processing document', { error });
      
      // Reject message and requeue if it's not a parsing error
      const requeue = !(error instanceof SyntaxError);
      channel.nack(msg, false, requeue);
    }
  });
  
  // Document indexing consumer
  channel.consume(config.messageQueue.queues.documentIndexing, async (msg) => {
    if (!msg) return;
    
    try {
      const content = JSON.parse(msg.content.toString());
      logger.info(`Indexing document: ${content.documentId}`);
      
      // Index document (implementation in elasticsearch.ts)
      // This would be implemented to fetch the document and index it
      
      // Acknowledge message
      channel.ack(msg);
    } catch (error) {
      logger.error('Error indexing document', { error });
      
      // Reject message and requeue if it's not a parsing error
      const requeue = !(error instanceof SyntaxError);
      channel.nack(msg, false, requeue);
    }
  });
};

// Publish message to queue
export const publishMessage = async (routingKey: string, message: any) => {
  try {
    if (!channel) {
      throw new Error('Message queue not initialized');
    }
    
    const success = channel.publish(
      config.messageQueue.exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
    
    if (!success) {
      throw new Error('Failed to publish message');
    }
    
    logger.debug(`Published message to ${routingKey}`, { message });
  } catch (error) {
    logger.error(`Error publishing message to ${routingKey}`, { error, message });
    throw error;
  }
};

// Close connection
export const closeMessageQueue = async () => {
  try {
    if (channel) {
      await channel.close();
    }
    
    if (connection) {
      await connection.close();
    }
    
    logger.info('Message queue connection closed');
  } catch (error) {
    logger.error('Error closing message queue connection', { error });
  }
};import amqplib, { Channel, Connection } from 'amqplib';
import { config } from '../config';
import { logger } from '../utils/logger';
import { processDocument } from './document-processor';

// Connection and channel variables
let connection: Connection;
let channel: Channel;

// Setup message queue
export const setupMessageQueue = async () => {
  try {
    logger.info('Setting up message queue');
    
    // Connect to RabbitMQ
    connection = await amqplib.connect(config.messageQueue.url);
    channel = await connection.createChannel();
    
    // Setup exchange
    await channel.assertExchange(config.messageQueue.exchange, 'topic', { durable: true });
    
    // Setup queues
    await channel.assertQueue(config.messageQueue.queues.documentProcessing, { durable: true });
    await channel.assertQueue(config.messageQueue.queues.documentIndexing, { durable: true });
    await channel.assertQueue(config.messageQueue.queues.documentEvents, { durable: true });
    
    // Bind queues to exchange
    await channel.bindQueue(
      config.messageQueue.queues.documentProcessing,
      config.messageQueue.exchange,
      'document.process'
    );
    
    await channel.bindQueue(
      config.messageQueue.queues.documentIndexing,
      config.messageQueue.exchange,
      'document.index'
    );
    
    await channel.bindQueue(
      config.messageQueue.queues.documentEvents,
      config.messageQueue.exchange,
      'document.event.#'
    );
    
    // Set prefetch to 1 to ensure fair distribution of work
    await channel.prefetch(1);
    
    // Setup consumers
    await setupConsumers();
    
    logger.info('Message queue setup completed');
  } catch (error) {
    logger.error('Failed to setup message queue', { error });
    throw error;
  }
};

// Setup message consumers
const setupConsumers = async () => {
  // Document processing consumer
  channel.consume(config.messageQueue.queues.documentProcessing, async (msg) => {
    if (!msg) return;
    
    try {
      const content = JSON.parse(msg.content.toString());
      logger.info(`Processing document: ${content.documentId}`);
      
      // Process document
      await processDocument(content);
      
      // Acknowledge message
      channel.ack(msg);
    } catch (error) {
      logger.error('Error processing document', { error });
      
      // Reject message and requeue if it's not a parsing error
      const requeue = !(error instanceof SyntaxError);
      channel.nack(msg, false, requeue);
    }
  });
  
  // Document indexing consumer
  channel.consume(config.messageQueue.queues.documentIndexing, async (msg) => {
    if (!msg) return;
    
    try {
      const content = JSON.parse(msg.content.toString());
      logger.info(`Indexing document: ${content.documentId}`);
      
      // Index document (implementation in elasticsearch.ts)
      // This would be implemented to fetch the document and index it
      
      // Acknowledge message
      channel.ack(msg);
    } catch (error) {
      logger.error('Error indexing document', { error });
      
      // Reject message and requeue if it's not a parsing error
      const requeue = !(error instanceof SyntaxError);
      channel.nack(msg, false, requeue);
    }
  });
};

// Publish message to queue
export const publishMessage = async (routingKey: string, message: any) => {
  try {
    if (!channel) {
      throw new Error('Message queue not initialized');
    }
    
    const success = channel.publish(
      config.messageQueue.exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
    
    if (!success) {
      throw new Error('Failed to publish message');
    }
    
    logger.debug(`Published message to ${routingKey}`, { message });
  } catch (error) {
    logger.error(`Error publishing message to ${routingKey}`, { error, message });
    throw error;
  }
};

// Close connection
export const closeMessageQueue = async () => {
  try {
    if (channel) {
      await channel.close();
    }
    
    if (connection) {
      await connection.close();
    }
    
    logger.info('Message queue connection closed');
  } catch (error) {
    logger.error('Error closing message queue connection', { error });
  }
};