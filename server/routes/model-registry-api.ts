/**
 * Model Registry API
 * 
 * Enterprise-grade model governance and registry API for the CPI Hub.
 * Provides endpoints for managing AI models, governance policies,
 * and enforcing enterprise compliance requirements.
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, authorizeRoles } from '../auth';
import { logger } from '../services/observability';
import { modelGovernanceService } from '../services/governance/modelGovernance';
import { featureFlagService } from '../services/feature-flag';
import { FeatureFlags } from '../../shared/feature-flags';

const router = Router();
const modelLogger = logger.createChildLogger({ component: 'ModelRegistryAPI' });

// Check if model governance is enabled via feature flag
const isModelGovernanceEnabled = () => {
  return featureFlagService.isEnabled(FeatureFlags.MODEL_GOVERNANCE);
};

// Middleware to ensure model governance is enabled
const requireModelGovernance = (req: any, res: any, next: any) => {
  if (!isModelGovernanceEnabled()) {
    return res.status(403).json({
      error: 'Model governance is not enabled for this tenant',
      featureFlag: FeatureFlags.MODEL_GOVERNANCE
    });
  }
  next();
};

// Get all registered models
router.get('/models', authenticateToken, requireModelGovernance, async (req, res) => {
  try {
    const querySchema = z.object({
      status: z.string().optional(),
      capability: z.string().optional(),
      provider: z.string().optional()
    });
    
    const query = querySchema.parse(req.query);
    
    const models = modelGovernanceService.listModels({
      status: query.status as any,
      capability: query.capability as any,
      provider: query.provider as any
    });
    
    modelLogger.info('Models listed', {
      userId: req.user?.id,
      filters: query,
      count: models.length
    });
    
    res.json({ models });
  } catch (error: any) {
    modelLogger.error('Error listing models', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

// Get a single model by ID
router.get('/models/:id', authenticateToken, requireModelGovernance, async (req, res) => {
  try {
    const { id } = req.params;
    
    const model = modelGovernanceService.getModel(id);
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    modelLogger.info('Model retrieved', {
      userId: req.user?.id,
      modelId: id
    });
    
    res.json({ model });
  } catch (error: any) {
    modelLogger.error('Error retrieving model', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

// Register a new model
router.post('/models', authenticateToken, authorizeRoles('admin', 'compliance_officer'), requireModelGovernance, async (req, res) => {
  try {
    const modelSchema = z.object({
      id: z.string(),
      provider: z.string(),
      version: z.string(),
      capabilities: z.array(z.string()),
      status: z.string().optional(),
      restrictions: z.object({
        allowedTenants: z.array(z.number()).optional(),
        allowedUserRoles: z.array(z.string()).optional(),
        maxTokens: z.number().optional(),
        requiredFilters: z.array(z.string()).optional()
      }).optional(),
      complianceInfo: z.object({
        dataResidency: z.array(z.string()).optional(),
        certifications: z.array(z.string()).optional(),
        piiHandling: z.boolean().optional(),
        retentionPolicy: z.string().optional()
      }).optional(),
      performanceMetrics: z.object({
        latencyMs: z.number().optional(),
        tokensPerSecond: z.number().optional(),
        costPerToken: z.number().optional()
      }).optional()
    });
    
    const modelData = modelSchema.parse(req.body);
    
    // If status is set to approved, require approver information
    if (modelData.status === 'approved') {
      const approvedBy = req.user?.username || req.user?.id?.toString();
      modelData.approvedBy = approvedBy;
      modelData.approvalDate = new Date();
    }
    
    const modelId = modelGovernanceService.registerModel(modelData as any);
    
    modelLogger.info('Model registered', {
      userId: req.user?.id,
      modelId,
      provider: modelData.provider
    });
    
    res.status(201).json({ 
      success: true,
      modelId,
      message: 'Model registered successfully'
    });
  } catch (error: any) {
    modelLogger.error('Error registering model', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

// Update an existing model
router.patch('/models/:id', authenticateToken, authorizeRoles('admin', 'compliance_officer'), requireModelGovernance, async (req, res) => {
  try {
    const { id } = req.params;
    
    const updateSchema = z.object({
      version: z.string().optional(),
      capabilities: z.array(z.string()).optional(),
      status: z.string().optional(),
      restrictions: z.object({
        allowedTenants: z.array(z.number()).optional(),
        allowedUserRoles: z.array(z.string()).optional(),
        maxTokens: z.number().optional(),
        requiredFilters: z.array(z.string()).optional()
      }).optional(),
      complianceInfo: z.object({
        dataResidency: z.array(z.string()).optional(),
        certifications: z.array(z.string()).optional(),
        piiHandling: z.boolean().optional(),
        retentionPolicy: z.string().optional()
      }).optional(),
      performanceMetrics: z.object({
        latencyMs: z.number().optional(),
        tokensPerSecond: z.number().optional(),
        costPerToken: z.number().optional()
      }).optional()
    });
    
    const updates = updateSchema.parse(req.body);
    
    // If status is changing to approved, require approver information
    if (updates.status === 'approved') {
      updates.approvedBy = req.user?.username || req.user?.id?.toString();
      updates.approvalDate = new Date();
    }
    
    const updatedModel = modelGovernanceService.updateModel(id, updates as any);
    
    modelLogger.info('Model updated', {
      userId: req.user?.id,
      modelId: id,
      updates: Object.keys(updates)
    });
    
    res.json({ 
      success: true,
      model: updatedModel,
      message: 'Model updated successfully'
    });
  } catch (error: any) {
    modelLogger.error('Error updating model', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

// Get governance policies
router.get('/policies', authenticateToken, requireModelGovernance, async (req, res) => {
  try {
    const querySchema = z.object({
      scope: z.string().optional(),
      tenantId: z.coerce.number().optional(),
      userId: z.coerce.number().optional()
    });
    
    const query = querySchema.parse(req.query);
    
    const policies = modelGovernanceService.listPolicies({
      scope: query.scope as any,
      tenantId: query.tenantId,
      userId: query.userId
    });
    
    modelLogger.info('Policies listed', {
      userId: req.user?.id,
      filters: query,
      count: policies.length
    });
    
    res.json({ policies });
  } catch (error: any) {
    modelLogger.error('Error listing policies', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

// Get a single policy by ID
router.get('/policies/:id', authenticateToken, requireModelGovernance, async (req, res) => {
  try {
    const { id } = req.params;
    
    const policy = modelGovernanceService.getPolicy(id);
    
    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    
    modelLogger.info('Policy retrieved', {
      userId: req.user?.id,
      policyId: id
    });
    
    res.json({ policy });
  } catch (error: any) {
    modelLogger.error('Error retrieving policy', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

// Create a new governance policy
router.post('/policies', authenticateToken, authorizeRoles('admin', 'compliance_officer'), requireModelGovernance, async (req, res) => {
  try {
    const policySchema = z.object({
      name: z.string(),
      description: z.string(),
      scope: z.enum(['global', 'tenant', 'user']),
      tenantId: z.number().optional(),
      userId: z.number().optional(),
      filters: z.array(z.string()),
      thresholds: z.record(z.string(), z.number()),
      actions: z.object({
        blockContent: z.boolean(),
        maskContent: z.boolean(),
        logViolation: z.boolean(),
        notifyAdmin: z.boolean(),
        requireApproval: z.boolean()
      }),
      overrideRoles: z.array(z.string()).optional()
    });
    
    const policyData = policySchema.parse(req.body);
    
    // Validate that tenant/user IDs are included when needed
    if (policyData.scope === 'tenant' && !policyData.tenantId) {
      return res.status(400).json({ error: 'tenantId is required for tenant-scoped policies' });
    }
    
    if (policyData.scope === 'user' && !policyData.userId) {
      return res.status(400).json({ error: 'userId is required for user-scoped policies' });
    }
    
    const newPolicy = modelGovernanceService.createPolicy(policyData);
    
    modelLogger.info('Policy created', {
      userId: req.user?.id,
      policyId: newPolicy.id,
      scope: policyData.scope
    });
    
    res.status(201).json({ 
      success: true,
      policy: newPolicy,
      message: 'Policy created successfully'
    });
  } catch (error: any) {
    modelLogger.error('Error creating policy', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

// Update an existing policy
router.patch('/policies/:id', authenticateToken, authorizeRoles('admin', 'compliance_officer'), requireModelGovernance, async (req, res) => {
  try {
    const { id } = req.params;
    
    const updateSchema = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      filters: z.array(z.string()).optional(),
      thresholds: z.record(z.string(), z.number()).optional(),
      actions: z.object({
        blockContent: z.boolean(),
        maskContent: z.boolean(),
        logViolation: z.boolean(),
        notifyAdmin: z.boolean(),
        requireApproval: z.boolean()
      }).optional(),
      overrideRoles: z.array(z.string()).optional()
    });
    
    const updates = updateSchema.parse(req.body);
    
    const updatedPolicy = modelGovernanceService.updatePolicy(id, updates);
    
    modelLogger.info('Policy updated', {
      userId: req.user?.id,
      policyId: id,
      updates: Object.keys(updates)
    });
    
    res.json({ 
      success: true,
      policy: updatedPolicy,
      message: 'Policy updated successfully'
    });
  } catch (error: any) {
    modelLogger.error('Error updating policy', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

// Validate prompt against governance policies
router.post('/validate', authenticateToken, requireModelGovernance, async (req, res) => {
  try {
    const validationSchema = z.object({
      prompt: z.string(),
      modelId: z.string(),
      tenantId: z.number().optional(),
      userRoles: z.array(z.string()).optional(),
      context: z.string().optional()
    });
    
    const validationRequest = validationSchema.parse(req.body);
    
    // Use the user's tenant ID if not specified
    const tenantId = validationRequest.tenantId || (req.user as any)?.tenantId || 1;
    
    // Use the user's role if not specified
    const userRoles = validationRequest.userRoles || [(req.user as any)?.role || 'user'];
    
    // Check if user can use the requested model
    const modelAccess = modelGovernanceService.canUseModel(
      validationRequest.modelId,
      tenantId,
      req.user?.id as number,
      userRoles
    );
    
    if (!modelAccess.allowed) {
      return res.status(403).json({
        error: 'Model access denied',
        reason: modelAccess.reason
      });
    }
    
    // Validate the prompt
    const validationResult = modelGovernanceService.validatePrompt(
      validationRequest.prompt,
      validationRequest.modelId,
      tenantId,
      req.user?.id as number,
      userRoles,
      validationRequest.context
    );
    
    modelLogger.info('Prompt validated', {
      userId: req.user?.id,
      modelId: validationRequest.modelId,
      valid: validationResult.valid,
      action: validationResult.action
    });
    
    res.json({
      result: validationResult
    });
  } catch (error: any) {
    modelLogger.error('Error validating prompt', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

// Get validation history
router.get('/validation-history', authenticateToken, authorizeRoles('admin', 'compliance_officer'), requireModelGovernance, async (req, res) => {
  try {
    const querySchema = z.object({
      modelId: z.string().optional(),
      userId: z.coerce.number().optional(),
      tenantId: z.coerce.number().optional(),
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
      action: z.string().optional(),
      limit: z.coerce.number().optional().default(100),
      offset: z.coerce.number().optional().default(0)
    });
    
    const query = querySchema.parse(req.query);
    
    // This is a stub - in a real implementation, this would use a
    // more sophisticated method to retrieve validation history
    const history = modelGovernanceService.getValidationHistory(query);
    
    modelLogger.info('Validation history retrieved', {
      userId: req.user?.id,
      filters: query,
      count: history.items.length
    });
    
    res.json({
      history
    });
  } catch (error: any) {
    modelLogger.error('Error retrieving validation history', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

// Get model usage analytics
router.get('/analytics/usage', authenticateToken, authorizeRoles('admin', 'compliance_officer'), requireModelGovernance, async (req, res) => {
  try {
    const querySchema = z.object({
      modelId: z.string().optional(),
      tenantId: z.coerce.number().optional(),
      timeframe: z.enum(['day', 'week', 'month', 'year']).default('month'),
      fromDate: z.string().optional(),
      toDate: z.string().optional()
    });
    
    const query = querySchema.parse(req.query);
    
    // This is a stub - in a real implementation, this would use a
    // more sophisticated method to retrieve usage analytics
    const analytics = modelGovernanceService.getModelUsageAnalytics(query);
    
    modelLogger.info('Model usage analytics retrieved', {
      userId: req.user?.id,
      filters: query
    });
    
    res.json({
      analytics
    });
  } catch (error: any) {
    modelLogger.error('Error retrieving model usage analytics', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

// Generate explainability report
router.post('/explainability', authenticateToken, requireModelGovernance, async (req, res) => {
  try {
    const reportSchema = z.object({
      modelId: z.string(),
      prompt: z.string(),
      completion: z.string(),
      requestId: z.string().optional(),
      explanation: z.string().optional()
    });
    
    const reportRequest = reportSchema.parse(req.body);
    
    const report = modelGovernanceService.generateExplainabilityReport(
      reportRequest.modelId,
      reportRequest.prompt,
      reportRequest.completion,
      reportRequest.requestId,
      reportRequest.explanation
    );
    
    modelLogger.info('Explainability report generated', {
      userId: req.user?.id,
      modelId: reportRequest.modelId,
      requestId: reportRequest.requestId || report.requestId
    });
    
    res.json({
      report
    });
  } catch (error: any) {
    modelLogger.error('Error generating explainability report', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

// Initialize default models
router.post('/initialize-default-models', authenticateToken, authorizeRoles('admin'), requireModelGovernance, async (req, res) => {
  try {
    // Initialize default models in the registry
    const defaultModels = modelGovernanceService.initializeDefaultModels();
    
    modelLogger.info('Default models initialized', {
      userId: req.user?.id,
      count: defaultModels.length
    });
    
    res.json({
      success: true,
      count: defaultModels.length,
      models: defaultModels
    });
  } catch (error: any) {
    modelLogger.error('Error initializing default models', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

modelLogger.info('Model Registry API routes initialized');

export default router;