/**
 * Model Governance Service
 * 
 * This service provides enterprise-grade governance capabilities for AI models,
 * supporting compliance, explainability, and ethical AI usage requirements.
 * 
 * Features:
 * - Model usage approval workflows
 * - Prompt and completion logging
 * - Content filtering and policy enforcement
 * - Explainability reports
 * - Bias detection and mitigation
 * - Usage tracking and reporting
 */

import { featureFlagService } from '../feature-flag';
import { FeatureFlags } from '../../../shared/feature-flags';
import { auditLogger } from '../../utils/auditLogger';
import { auditTrailService } from '../security/auditTrailService';
import { enterpriseEncryptionService } from '../security/encryptionService';
import { tenantIsolationService } from '../security/tenantIsolationService';
import crypto from 'crypto';

// Model registry types
export type ModelProvider = 'openai' | 'anthropic' | 'internal' | 'huggingface' | 'custom';

export type ModelCapability = 
  | 'text_generation'
  | 'chat'
  | 'embeddings'
  | 'image_generation'
  | 'text_classification'
  | 'text_moderation'
  | 'summarization'
  | 'entity_extraction';

export type ModelStatus = 
  | 'approved'
  | 'pending_approval'
  | 'restricted'
  | 'deprecated'
  | 'testing';

export type ContentRiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

export type ContentFilter =
  | 'profanity'
  | 'hate_speech'
  | 'sexual_content'
  | 'violence'
  | 'self_harm'
  | 'pii'
  | 'copyright'
  | 'financial_info'
  | 'health_info';

// Model definition
export interface ModelDefinition {
  id: string;
  provider: ModelProvider;
  version: string;
  capabilities: ModelCapability[];
  status: ModelStatus;
  approvedBy?: string;
  approvalDate?: Date;
  restrictions?: {
    allowedTenants?: number[];
    allowedUserRoles?: string[];
    maxTokens?: number;
    requiredFilters?: ContentFilter[];
  };
  complianceInfo?: {
    dataResidency?: string[];
    certifications?: string[];
    piiHandling?: boolean;
    retentionPolicy?: string;
  };
  performanceMetrics?: {
    latencyMs?: number;
    tokensPerSecond?: number;
    costPerToken?: number;
  };
}

// Governance policies
export interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  scope: 'global' | 'tenant' | 'user';
  tenantId?: number;
  userId?: number;
  filters: ContentFilter[];
  thresholds: {
    [key in ContentFilter]?: number;
  };
  actions: {
    blockContent: boolean;
    maskContent: boolean;
    logViolation: boolean;
    notifyAdmin: boolean;
    requireApproval: boolean;
  };
  overrideRoles?: string[];
}

// Request validation results
export interface ValidationResult {
  valid: boolean;
  requestId: string;
  timestamp: Date;
  violations: {
    filter: ContentFilter;
    severity: number;
    threshold: number;
    location: 'prompt' | 'completion';
    offsetStart?: number;
    offsetEnd?: number;
    maskedContent?: string;
  }[];
  overallRiskLevel: ContentRiskLevel;
  modelId: string;
  action: 'allowed' | 'modified' | 'blocked' | 'flagged_for_review';
  metadata: {
    usageContext?: string;
    validatedBy: string;
    policyId: string;
  };
}

export class ModelGovernanceService {
  private registeredModels: Map<string, ModelDefinition> = new Map();
  private governancePolicies: Map<string, GovernancePolicy> = new Map();
  private pendingApprovals: Map<string, { request: any; tenantId: number; userId: number }> = new Map();
  
  constructor() {
    // Initialize with default governance policies
    this.initializeDefaultPolicies();
    console.log('Model Governance Service initialized');
  }
  
  /**
   * Initialize default governance policies
   */
  private initializeDefaultPolicies(): void {
    // Create a default global policy
    const defaultPolicy: GovernancePolicy = {
      id: crypto.randomUUID(),
      name: 'Default Global Policy',
      description: 'Default content filtering policy for all AI interactions',
      scope: 'global',
      filters: ['profanity', 'hate_speech', 'sexual_content', 'violence', 'self_harm', 'pii'],
      thresholds: {
        profanity: 0.7,
        hate_speech: 0.5,
        sexual_content: 0.6,
        violence: 0.7,
        self_harm: 0.4,
        pii: 0.6
      },
      actions: {
        blockContent: true,
        maskContent: true,
        logViolation: true,
        notifyAdmin: true,
        requireApproval: false
      },
      overrideRoles: ['admin', 'compliance_officer']
    };
    
    this.governancePolicies.set(defaultPolicy.id, defaultPolicy);
    
    // Log the initialization
    auditLogger.log({
      action: 'default_governance_policy_created',
      actor: 'system',
      target: `policy:${defaultPolicy.id}`,
      targetType: 'governance_policy',
      details: {
        policyName: defaultPolicy.name,
        filters: defaultPolicy.filters,
        actions: defaultPolicy.actions
      }
    });
  }
  
  /**
   * Register a new model in the governance registry
   */
  public registerModel(model: ModelDefinition): string {
    // Check if the model already exists
    if (this.registeredModels.has(model.id)) {
      throw new Error(`Model with ID ${model.id} already exists`);
    }
    
    // Set defaults if not provided
    if (!model.status) {
      model.status = 'pending_approval';
    }
    
    // Store the model
    this.registeredModels.set(model.id, { ...model });
    
    // Log the registration
    auditLogger.log({
      action: 'model_registered',
      actor: 'system',
      target: `model:${model.id}`,
      targetType: 'ai_model',
      details: {
        provider: model.provider,
        version: model.version,
        capabilities: model.capabilities,
        status: model.status
      }
    });
    
    return model.id;
  }
  
  /**
   * Update an existing model in the registry
   */
  public updateModel(modelId: string, updates: Partial<ModelDefinition>): ModelDefinition {
    // Check if the model exists
    if (!this.registeredModels.has(modelId)) {
      throw new Error(`Model with ID ${modelId} not found`);
    }
    
    // Get current model definition
    const currentModel = this.registeredModels.get(modelId)!;
    
    // Check if updating status from pending to approved
    if (
      currentModel.status === 'pending_approval' && 
      updates.status === 'approved' &&
      (!updates.approvedBy || !updates.approvalDate)
    ) {
      throw new Error('Approval requires approvedBy and approvalDate fields');
    }
    
    // Apply updates
    const updatedModel = { ...currentModel, ...updates };
    
    // Store updated model
    this.registeredModels.set(modelId, updatedModel);
    
    // Log the update
    auditLogger.log({
      action: 'model_updated',
      actor: 'system',
      target: `model:${modelId}`,
      targetType: 'ai_model',
      details: {
        updatedFields: Object.keys(updates),
        newStatus: updates.status
      }
    });
    
    return { ...updatedModel };
  }
  
  /**
   * Get a registered model by ID
   */
  public getModel(modelId: string): ModelDefinition | null {
    return this.registeredModels.get(modelId) || null;
  }
  
  /**
   * List all registered models, optionally filtered by status and capability
   */
  public listModels(
    options?: {
      status?: ModelStatus;
      capability?: ModelCapability;
      provider?: ModelProvider;
    }
  ): ModelDefinition[] {
    let models = Array.from(this.registeredModels.values());
    
    // Apply filters
    if (options) {
      if (options.status) {
        models = models.filter(m => m.status === options.status);
      }
      
      if (options.capability) {
        models = models.filter(m => m.capabilities.includes(options.capability!));
      }
      
      if (options.provider) {
        models = models.filter(m => m.provider === options.provider);
      }
    }
    
    return models;
  }
  
  /**
   * Create a new governance policy
   */
  public createPolicy(policy: Omit<GovernancePolicy, 'id'>): GovernancePolicy {
    // Generate an ID for the policy
    const id = crypto.randomUUID();
    const newPolicy: GovernancePolicy = {
      ...policy,
      id
    };
    
    // Store the policy
    this.governancePolicies.set(id, newPolicy);
    
    // Log the creation
    auditLogger.log({
      action: 'governance_policy_created',
      actor: 'system',
      target: `policy:${id}`,
      targetType: 'governance_policy',
      tenant: policy.tenantId?.toString(),
      details: {
        policyName: policy.name,
        scope: policy.scope,
        filters: policy.filters
      }
    });
    
    return { ...newPolicy };
  }
  
  /**
   * Update an existing governance policy
   */
  public updatePolicy(policyId: string, updates: Partial<GovernancePolicy>): GovernancePolicy {
    // Check if the policy exists
    if (!this.governancePolicies.has(policyId)) {
      throw new Error(`Policy with ID ${policyId} not found`);
    }
    
    // Get current policy
    const currentPolicy = this.governancePolicies.get(policyId)!;
    
    // Apply updates (don't allow changing the ID)
    const { id, ...updatableFields } = updates;
    const updatedPolicy = { ...currentPolicy, ...updatableFields };
    
    // Store updated policy
    this.governancePolicies.set(policyId, updatedPolicy);
    
    // Log the update
    auditLogger.log({
      action: 'governance_policy_updated',
      actor: 'system',
      target: `policy:${policyId}`,
      targetType: 'governance_policy',
      tenant: updatedPolicy.tenantId?.toString(),
      details: {
        policyName: updatedPolicy.name,
        updatedFields: Object.keys(updatableFields)
      }
    });
    
    return { ...updatedPolicy };
  }
  
  /**
   * Get a governance policy by ID
   */
  public getPolicy(policyId: string): GovernancePolicy | null {
    return this.governancePolicies.get(policyId) || null;
  }
  
  /**
   * List all governance policies, optionally filtered by scope and tenant
   */
  public listPolicies(
    options?: {
      scope?: 'global' | 'tenant' | 'user';
      tenantId?: number;
      userId?: number;
    }
  ): GovernancePolicy[] {
    let policies = Array.from(this.governancePolicies.values());
    
    // Apply filters
    if (options) {
      if (options.scope) {
        policies = policies.filter(p => p.scope === options.scope);
      }
      
      if (options.tenantId !== undefined) {
        policies = policies.filter(p => 
          p.scope === 'global' || 
          (p.scope === 'tenant' && p.tenantId === options.tenantId)
        );
      }
      
      if (options.userId !== undefined) {
        policies = policies.filter(p => 
          p.scope === 'global' || 
          (p.scope === 'user' && p.userId === options.userId)
        );
      }
    }
    
    return policies;
  }
  
  /**
   * Get the applicable policy for a request
   */
  private getApplicablePolicy(tenantId: number, userId: number): GovernancePolicy {
    let applicablePolicies: GovernancePolicy[] = [];
    
    // Get user-specific policies
    const userPolicies = this.listPolicies({
      scope: 'user',
      userId
    });
    
    if (userPolicies.length > 0) {
      applicablePolicies = applicablePolicies.concat(userPolicies);
    }
    
    // Get tenant-specific policies
    const tenantPolicies = this.listPolicies({
      scope: 'tenant',
      tenantId
    });
    
    if (tenantPolicies.length > 0) {
      applicablePolicies = applicablePolicies.concat(tenantPolicies);
    }
    
    // Get global policies
    const globalPolicies = this.listPolicies({
      scope: 'global'
    });
    
    if (globalPolicies.length > 0) {
      applicablePolicies = applicablePolicies.concat(globalPolicies);
    }
    
    // If no applicable policies found, use the default
    if (applicablePolicies.length === 0) {
      // This should never happen as we initialize with a default policy
      // But just in case, create a basic one
      const defaultPolicy: GovernancePolicy = {
        id: 'default',
        name: 'Default Fallback Policy',
        description: 'Basic content filtering for all AI interactions',
        scope: 'global',
        filters: ['hate_speech', 'sexual_content', 'violence'],
        thresholds: {
          hate_speech: 0.7,
          sexual_content: 0.7,
          violence: 0.7
        },
        actions: {
          blockContent: true,
          maskContent: true,
          logViolation: true,
          notifyAdmin: false,
          requireApproval: false
        }
      };
      
      return defaultPolicy;
    }
    
    // Get the highest priority policy (user > tenant > global)
    const policy = applicablePolicies.reduce((prev, current) => {
      const prevPriority = prev.scope === 'user' ? 3 : prev.scope === 'tenant' ? 2 : 1;
      const currentPriority = current.scope === 'user' ? 3 : current.scope === 'tenant' ? 2 : 1;
      
      return currentPriority > prevPriority ? current : prev;
    });
    
    return policy;
  }
  
  /**
   * Validate if a model can be used by a specific tenant/user
   */
  public canUseModel(
    modelId: string,
    tenantId: number,
    userId: number,
    userRoles: string[] = []
  ): { allowed: boolean; reason?: string } {
    // Check if model governance is enabled
    if (!this.isModelGovernanceEnabled()) {
      return { allowed: true };
    }
    
    // Check if the model exists
    if (!this.registeredModels.has(modelId)) {
      return { allowed: false, reason: 'Model not registered in governance system' };
    }
    
    const model = this.registeredModels.get(modelId)!;
    
    // Check model status
    if (model.status !== 'approved') {
      if (model.status === 'pending_approval') {
        return { allowed: false, reason: 'Model pending approval' };
      } else if (model.status === 'deprecated') {
        return { allowed: false, reason: 'Model has been deprecated' };
      } else if (model.status === 'restricted') {
        // For restricted models, check if the tenant/user has specific permissions
        if (
          model.restrictions?.allowedTenants &&
          !model.restrictions.allowedTenants.includes(tenantId)
        ) {
          return { allowed: false, reason: 'Tenant not authorized for restricted model' };
        }
        
        if (
          model.restrictions?.allowedUserRoles &&
          !model.restrictions.allowedUserRoles.some(role => userRoles.includes(role))
        ) {
          return { allowed: false, reason: 'User role not authorized for restricted model' };
        }
      }
    }
    
    // Log the access check
    auditLogger.log({
      action: 'model_access_checked',
      actor: userId.toString(),
      target: `model:${modelId}`,
      targetType: 'ai_model',
      tenant: tenantId.toString(),
      details: {
        modelStatus: model.status,
        userRoles
      }
    });
    
    return { allowed: true };
  }
  
  /**
   * Validate a prompt against governance policies
   */
  public validatePrompt(
    prompt: string,
    modelId: string,
    tenantId: number,
    userId: number,
    userRoles: string[] = [],
    context?: string
  ): ValidationResult {
    // If model governance is disabled, return a valid result
    if (!this.isModelGovernanceEnabled()) {
      return this.createValidationResult(true, modelId, 'safe');
    }
    
    // Get the applicable policy
    const policy = this.getApplicablePolicy(tenantId, userId);
    
    // Check if the user has a role that can override policies
    const canOverride = 
      policy.overrideRoles && 
      policy.overrideRoles.some(role => userRoles.includes(role));
    
    if (canOverride) {
      // Still log the validation but allow it
      const result = this.createValidationResult(true, modelId, 'safe');
      result.metadata.policyId = policy.id;
      
      // Log that this was override
      auditLogger.log({
        action: 'governance_policy_override',
        actor: userId.toString(),
        target: `model:${modelId}`,
        targetType: 'ai_model',
        tenant: tenantId.toString(),
        details: {
          policyId: policy.id,
          overrideRole: userRoles.find(role => policy.overrideRoles!.includes(role))
        }
      });
      
      return result;
    }
    
    // In a real implementation, this would call a content moderation API
    // For now, we'll simulate some basic filtering
    const violations: ValidationResult['violations'] = [];
    
    // Simulate content detection for each filter in the policy
    for (const filter of policy.filters) {
      // Get threshold for this filter
      const threshold = policy.thresholds[filter] || 0.7;
      
      // Check if the prompt contains keywords related to this filter
      const severity = this.simulateContentDetection(prompt, filter);
      
      // If severity exceeds threshold, add a violation
      if (severity > threshold) {
        violations.push({
          filter,
          severity,
          threshold,
          location: 'prompt'
        });
      }
    }
    
    // Determine overall risk level based on violations
    let overallRiskLevel: ContentRiskLevel = 'safe';
    let action: ValidationResult['action'] = 'allowed';
    
    if (violations.length > 0) {
      // Sort violations by severity (highest first)
      violations.sort((a, b) => b.severity - a.severity);
      
      const highestSeverity = violations[0].severity;
      
      if (highestSeverity > 0.9) {
        overallRiskLevel = 'critical';
      } else if (highestSeverity > 0.8) {
        overallRiskLevel = 'high';
      } else if (highestSeverity > 0.7) {
        overallRiskLevel = 'medium';
      } else if (highestSeverity > 0.6) {
        overallRiskLevel = 'low';
      }
      
      // Determine action based on policy
      if (policy.actions.blockContent && (overallRiskLevel === 'critical' || overallRiskLevel === 'high')) {
        action = 'blocked';
      } else if (policy.actions.maskContent && overallRiskLevel !== 'safe') {
        action = 'modified';
        
        // Simulate content masking (in a real implementation, this would
        // actually mask the problematic parts of the content)
        for (const violation of violations) {
          violation.maskedContent = '[CONTENT FILTERED]';
        }
      } else if (policy.actions.requireApproval && overallRiskLevel !== 'safe') {
        action = 'flagged_for_review';
      }
    }
    
    // Create validation result
    const result: ValidationResult = {
      valid: action === 'allowed' || action === 'modified',
      requestId: crypto.randomUUID(),
      timestamp: new Date(),
      violations,
      overallRiskLevel,
      modelId,
      action,
      metadata: {
        usageContext: context,
        validatedBy: 'governance-service',
        policyId: policy.id
      }
    };
    
    // Log the validation result
    this.logValidationResult(result, tenantId, userId);
    
    // For flagged content, add to pending approvals
    if (action === 'flagged_for_review') {
      this.pendingApprovals.set(result.requestId, {
        request: { prompt, modelId, context },
        tenantId,
        userId
      });
    }
    
    return result;
  }
  
  /**
   * Validate a model completion against governance policies
   */
  public validateCompletion(
    completion: string,
    modelId: string,
    tenantId: number,
    userId: number,
    userRoles: string[] = [],
    context?: string
  ): ValidationResult {
    // The implementation is very similar to validatePrompt
    // In a real system, there might be different validation logic for completions
    
    // If model governance is disabled, return a valid result
    if (!this.isModelGovernanceEnabled()) {
      return this.createValidationResult(true, modelId, 'safe');
    }
    
    // Get the applicable policy
    const policy = this.getApplicablePolicy(tenantId, userId);
    
    // Check if the user has a role that can override policies
    const canOverride = 
      policy.overrideRoles && 
      policy.overrideRoles.some(role => userRoles.includes(role));
    
    if (canOverride) {
      // Still log the validation but allow it
      const result = this.createValidationResult(true, modelId, 'safe');
      result.metadata.policyId = policy.id;
      
      return result;
    }
    
    // Simulate content detection
    const violations: ValidationResult['violations'] = [];
    
    for (const filter of policy.filters) {
      const threshold = policy.thresholds[filter] || 0.7;
      const severity = this.simulateContentDetection(completion, filter);
      
      if (severity > threshold) {
        violations.push({
          filter,
          severity,
          threshold,
          location: 'completion'
        });
      }
    }
    
    // Determine overall risk level and action
    let overallRiskLevel: ContentRiskLevel = 'safe';
    let action: ValidationResult['action'] = 'allowed';
    
    if (violations.length > 0) {
      violations.sort((a, b) => b.severity - a.severity);
      const highestSeverity = violations[0].severity;
      
      if (highestSeverity > 0.9) {
        overallRiskLevel = 'critical';
      } else if (highestSeverity > 0.8) {
        overallRiskLevel = 'high';
      } else if (highestSeverity > 0.7) {
        overallRiskLevel = 'medium';
      } else if (highestSeverity > 0.6) {
        overallRiskLevel = 'low';
      }
      
      if (policy.actions.blockContent && (overallRiskLevel === 'critical' || overallRiskLevel === 'high')) {
        action = 'blocked';
      } else if (policy.actions.maskContent && overallRiskLevel !== 'safe') {
        action = 'modified';
        
        for (const violation of violations) {
          violation.maskedContent = '[CONTENT FILTERED]';
        }
      }
    }
    
    // Completions don't get flagged for review (they're already generated)
    
    // Create validation result
    const result: ValidationResult = {
      valid: action === 'allowed' || action === 'modified',
      requestId: crypto.randomUUID(),
      timestamp: new Date(),
      violations,
      overallRiskLevel,
      modelId,
      action,
      metadata: {
        usageContext: context,
        validatedBy: 'governance-service',
        policyId: policy.id
      }
    };
    
    // Log the validation result
    this.logValidationResult(result, tenantId, userId);
    
    return result;
  }
  
  /**
   * Create a validation result
   */
  private createValidationResult(
    valid: boolean, 
    modelId: string,
    riskLevel: ContentRiskLevel
  ): ValidationResult {
    return {
      valid,
      requestId: crypto.randomUUID(),
      timestamp: new Date(),
      violations: [],
      overallRiskLevel: riskLevel,
      modelId,
      action: valid ? 'allowed' : 'blocked',
      metadata: {
        validatedBy: 'governance-service',
        policyId: 'default'
      }
    };
  }
  
  /**
   * Log a validation result
   */
  private logValidationResult(
    result: ValidationResult,
    tenantId: number,
    userId: number
  ): void {
    // Log to audit trail
    auditTrailService.recordEvent({
      eventType: 'ai_request',
      userId,
      tenantId,
      actionName: result.action === 'allowed' ? 'content_allowed' : 
                  result.action === 'modified' ? 'content_modified' :
                  result.action === 'blocked' ? 'content_blocked' :
                  'content_flagged',
      resourceType: 'ai_model',
      resourceId: result.modelId,
      success: result.valid,
      details: {
        requestId: result.requestId,
        validationTimestamp: result.timestamp,
        overallRiskLevel: result.overallRiskLevel,
        violationCount: result.violations.length,
        violations: result.violations,
        policyId: result.metadata.policyId
      }
    });
  }
  
  /**
   * Simulate content detection for different filters
   * In a real implementation, this would call a content moderation API
   */
  private simulateContentDetection(content: string, filter: ContentFilter): number {
    // Very simple keyword-based simulation
    // In a real implementation, this would use ML models for content detection
    
    // Convert to lowercase for case-insensitive matching
    const lowerContent = content.toLowerCase();
    
    // Define keywords for each filter
    const filterKeywords: Record<ContentFilter, string[]> = {
      profanity: ['damn', 'hell', 'shit', 'fuck'],
      hate_speech: ['hate', 'racist', 'bigot', 'discrimination'],
      sexual_content: ['sex', 'explicit', 'nude', 'pornography'],
      violence: ['kill', 'murder', 'blood', 'dead', 'violent'],
      self_harm: ['suicide', 'self-harm', 'hurt myself', 'end my life'],
      pii: ['ssn', 'social security', 'credit card', 'passport', 'address'],
      copyright: ['copyrighted', 'intellectual property', 'license', 'patent'],
      financial_info: ['bank account', 'routing number', 'investment', 'cryptocurrency'],
      health_info: ['medical record', 'diagnosis', 'health condition', 'patient']
    };
    
    // Check for keywords
    const keywords = filterKeywords[filter];
    let matchCount = 0;
    
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword)) {
        matchCount++;
      }
    }
    
    // Calculate severity (0-1)
    // More matches = higher severity
    const severityBase = matchCount / keywords.length;
    
    // Add some randomness to simulate ML model variance
    // But ensure the same content always gets the same score
    const contentHash = crypto
      .createHash('md5')
      .update(content + filter)
      .digest('hex');
    
    // Use the hash to generate a consistent random factor
    const hashNum = parseInt(contentHash.slice(0, 8), 16);
    const randomFactor = (hashNum % 100) / 500; // Random value between -0.1 and 0.1
    
    // Calculate final severity (clamped between 0 and 1)
    let severity = Math.max(0, Math.min(1, severityBase + randomFactor));
    
    return severity;
  }
  
  /**
   * Check if a content flagged for review has been approved
   */
  public checkApprovalStatus(requestId: string): 
    { status: 'pending' | 'approved' | 'rejected'; approvedBy?: string } {
    // Check if the request exists
    if (!this.pendingApprovals.has(requestId)) {
      return { status: 'rejected' };
    }
    
    // In a real implementation, this would check a database
    // For now, we'll just assume it's still pending
    return { status: 'pending' };
  }
  
  /**
   * Approve or reject a flagged content request
   */
  public resolveContentApproval(
    requestId: string,
    approved: boolean,
    resolvedBy: string,
    notes?: string
  ): boolean {
    // Check if the request exists
    if (!this.pendingApprovals.has(requestId)) {
      return false;
    }
    
    // Get the original request
    const pendingRequest = this.pendingApprovals.get(requestId)!;
    
    // Log the resolution
    auditTrailService.recordEvent({
      eventType: 'admin_action',
      userId: 0, // System user ID
      tenantId: pendingRequest.tenantId,
      actionName: approved ? 'content_approved' : 'content_rejected',
      resourceType: 'ai_request',
      resourceId: requestId,
      success: true,
      details: {
        resolvedBy,
        notes,
        originalRequest: pendingRequest.request
      }
    });
    
    // Remove from pending approvals
    this.pendingApprovals.delete(requestId);
    
    return true;
  }
  
  /**
   * Check if model governance features are enabled
   */
  private isModelGovernanceEnabled(): boolean {
    return featureFlagService.isEnabled(FeatureFlags.MODEL_GOVERNANCE);
  }
  
  /**
   * Generate an explainability report for a model prediction
   * This is a stub - in a real implementation, this would provide detailed insights
   */
  public generateExplainabilityReport(
    modelId: string,
    prompt: string,
    completion: string,
    requestId?: string,
    explanation?: string
  ): Record<string, any> {
    // Check if model governance features are enabled
    if (!this.isModelGovernanceEnabled()) {
      return { 
        modelId,
        requestId: requestId || crypto.randomUUID(),
        explanation: "Explainability features not enabled",
        generated: new Date()
      };
    }
    
    // Get the model definition if available
    const model = this.registeredModels.get(modelId);
    const modelProvider = model?.provider || 'unknown';
    const modelCapabilities = model?.capabilities || [];
    
    // In a real implementation, this would analyze the model's decision-making
    // For now, we'll return a simulated report
    return {
      requestId: requestId || crypto.randomUUID(),
      modelId,
      modelProvider,
      modelCapabilities,
      generated: new Date(),
      promptTokens: Math.ceil(prompt.length / 4),
      completionTokens: Math.ceil(completion.length / 4),
      totalTokens: Math.ceil(prompt.length / 4) + Math.ceil(completion.length / 4),
      explanation: explanation || "Automated explainability report",
      contentAnalysis: {
        topicProbabilities: {
          "information": 0.75,
          "question": 0.15,
          "instruction": 0.10
        },
        sentimentScore: 0.2, // -1 to 1 scale
        objectivity: 0.8,  // 0 to 1 scale
        complexity: 0.5   // 0 to 1 scale
      },
      biasIndicators: {
        gender: 0.05,
        political: 0.02,
        cultural: 0.03
      },
      confidenceScore: 0.87
    };
  }
  
  /**
   * Get validation history
   * This is an enterprise feature for compliance and audit purposes
   */
  public getValidationHistory(options: { 
    modelId?: string;
    userId?: number;
    tenantId?: number;
    fromDate?: string;
    toDate?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }): { items: any[]; total: number } {
    // Check if model governance is enabled
    if (!this.isModelGovernanceEnabled()) {
      return { items: [], total: 0 };
    }
    
    // In a real implementation, this would query a database for validation history
    // For demo purposes, we'll generate a mock history
    
    const mockHistory = [];
    const total = 125; // Simulate a larger dataset
    
    // Generate mock records based on options
    const limit = options.limit || 10;
    const offset = options.offset || 0;
    
    for (let i = 0; i < limit; i++) {
      if (i + offset >= total) break;
      
      const record = {
        id: crypto.randomUUID(),
        timestamp: new Date(Date.now() - (i + offset) * 60000),
        modelId: options.modelId || "gpt-4o",
        userId: options.userId || Math.floor(Math.random() * 10) + 1,
        tenantId: options.tenantId || Math.floor(Math.random() * 5) + 1,
        promptSnippet: "This is a partial view of the prompt content...",
        action: (options.action || ["allowed", "modified", "blocked"][Math.floor(Math.random() * 3)]),
        riskLevel: ["safe", "low", "medium", "high"][Math.floor(Math.random() * 4)],
        policyId: crypto.randomUUID(),
        violationCount: Math.floor(Math.random() * 3)
      };
      
      mockHistory.push(record);
    }
    
    return {
      items: mockHistory,
      total
    };
  }
  
  /**
   * Get model usage analytics
   * Enterprise feature for usage tracking and billing
   */
  public getModelUsageAnalytics(options: {
    modelId?: string;
    tenantId?: number;
    timeframe?: string;
    fromDate?: string;
    toDate?: string;
  }): Record<string, any> {
    // Check if model governance is enabled
    if (!this.isModelGovernanceEnabled()) {
      return { 
        usage: [],
        summary: {
          totalRequests: 0,
          totalTokens: 0
        }
      };
    }
    
    // In a real implementation, this would query a database for model usage
    // For demo purposes, we'll generate synthetic analytics
    
    // Generate timeframes based on the requested period
    const timeframe = options.timeframe || 'month';
    const now = new Date();
    const dataPoints = [];
    
    let interval;
    let format;
    let points;
    
    switch(timeframe) {
      case 'day':
        interval = 60 * 60 * 1000; // hourly
        points = 24;
        format = 'hour';
        break;
      case 'week':
        interval = 24 * 60 * 60 * 1000; // daily
        points = 7;
        format = 'day';
        break;
      case 'year':
        interval = 30 * 24 * 60 * 60 * 1000; // monthly
        points = 12;
        format = 'month';
        break;
      case 'month':
      default:
        interval = 24 * 60 * 60 * 1000; // daily
        points = 30;
        format = 'day';
    }
    
    let totalRequests = 0;
    let totalTokens = 0;
    
    // Generate data points
    for (let i = 0; i < points; i++) {
      const timestamp = new Date(now.getTime() - (points - i - 1) * interval);
      
      // Generate synthetic data with some variability
      const baseValue = 50 + Math.random() * 100;
      const requests = Math.floor(baseValue);
      const tokens = requests * (250 + Math.floor(Math.random() * 250));
      
      totalRequests += requests;
      totalTokens += tokens;
      
      dataPoints.push({
        timestamp,
        requests,
        tokens,
        cost: (tokens / 1000) * 0.002 // Synthetic cost calculation
      });
    }
    
    // Generate model breakdown if no specific model requested
    const modelBreakdown = [];
    if (!options.modelId) {
      const models = Array.from(this.registeredModels.values());
      models.slice(0, Math.min(5, models.length)).forEach(model => {
        const modelRequests = Math.floor(totalRequests * Math.random() * 0.5);
        const modelTokens = modelRequests * (250 + Math.floor(Math.random() * 250));
        
        modelBreakdown.push({
          modelId: model.id,
          requests: modelRequests,
          tokens: modelTokens,
          cost: (modelTokens / 1000) * 0.002
        });
      });
    }
    
    return {
      timeframe,
      format,
      usage: dataPoints,
      models: modelBreakdown,
      summary: {
        totalRequests,
        totalTokens,
        estimatedCost: (totalTokens / 1000) * 0.002
      }
    };
  }
  
  /**
   * Initialize default models in the registry
   * Enterprise feature for pre-populating the model registry
   */
  public initializeDefaultModels(): ModelDefinition[] {
    // Check if model governance is enabled
    if (!this.isModelGovernanceEnabled()) {
      return [];
    }
    
    // Define default models to register
    const defaultModels: ModelDefinition[] = [
      {
        id: 'gpt-4o',
        provider: 'openai',
        version: '2024-05-13',
        capabilities: ['text_generation', 'chat'],
        status: 'approved',
        approvedBy: 'system',
        approvalDate: new Date(),
        performanceMetrics: {
          latencyMs: 250,
          tokensPerSecond: 80,
          costPerToken: 0.00002
        }
      },
      {
        id: 'gpt-4o-mini',
        provider: 'openai',
        version: '2024-05-13',
        capabilities: ['text_generation', 'chat'],
        status: 'approved',
        approvedBy: 'system',
        approvalDate: new Date(),
        performanceMetrics: {
          latencyMs: 150,
          tokensPerSecond: 120,
          costPerToken: 0.00001
        }
      },
      {
        id: 'text-embedding-3-large',
        provider: 'openai',
        version: '2024-05-13',
        capabilities: ['embeddings'],
        status: 'approved',
        approvedBy: 'system',
        approvalDate: new Date(),
        performanceMetrics: {
          latencyMs: 100,
          tokensPerSecond: 200,
          costPerToken: 0.000001
        }
      },
      {
        id: 'text-embedding-3-small',
        provider: 'openai',
        version: '2024-05-13',
        capabilities: ['embeddings'],
        status: 'approved',
        approvedBy: 'system',
        approvalDate: new Date(),
        performanceMetrics: {
          latencyMs: 50,
          tokensPerSecond: 250,
          costPerToken: 0.0000005
        }
      },
      {
        id: 'claude-3-opus',
        provider: 'anthropic',
        version: '2024-04-01',
        capabilities: ['text_generation', 'chat'],
        status: 'pending_approval',
        performanceMetrics: {
          latencyMs: 300,
          tokensPerSecond: 60,
          costPerToken: 0.00003
        }
      }
    ];
    
    // Register each model if it doesn't already exist
    const registeredModels: ModelDefinition[] = [];
    for (const model of defaultModels) {
      if (!this.registeredModels.has(model.id)) {
        this.registerModel(model);
        registeredModels.push(model);
      }
    }
    
    return registeredModels;
  }
  
  /**
   * Create a validation result with standard fields
   */
  private createValidationResult(
    valid: boolean, 
    modelId: string,
    riskLevel: ContentRiskLevel
  ): ValidationResult {
    return {
      valid,
      requestId: crypto.randomUUID(),
      timestamp: new Date(),
      violations: [],
      overallRiskLevel: riskLevel,
      modelId,
      action: valid ? 'allowed' : 'blocked',
      metadata: {
        validatedBy: 'governance-service',
        policyId: 'default'
      }
    };
  }
}

// Create and export a singleton instance
export const modelGovernanceService = new ModelGovernanceService();