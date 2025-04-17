/**
 * Authentication Audit Logger
 * 
 * Specialized security audit logging for authentication processes including OAuth 2.0
 * with PKCE, SAML, and other enterprise authentication workflows.
 */

import { AuditService, AuditCategory, AuditSeverity, AuditActions } from '../services/auditService';
import { Request } from 'express';
import { getTenantId } from './requestUtils';

/**
 * Authentication audit event types
 */
export enum AuthAuditType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  REGISTER = 'register',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
  MFA_SETUP = 'mfa_setup',
  MFA_VERIFY = 'mfa_verify',
  TOKEN_REFRESH = 'token_refresh',
  TOKEN_REVOKE = 'token_revoke',
  SSO_LOGIN = 'sso_login',
  OAUTH_START = 'oauth_start',
  OAUTH_CALLBACK = 'oauth_callback',
  OAUTH_TOKEN_EXCHANGE = 'oauth_token_exchange',
  OAUTH_TOKEN_REFRESH = 'oauth_token_refresh',
  OAUTH_TOKEN_REVOKE = 'oauth_token_revoke',
  PKCE_CODE_VERIFY = 'pkce_code_verify',
  SAML_REQUEST = 'saml_request',
  SAML_RESPONSE = 'saml_response',
  PERMISSION_CHECK = 'permission_check',
  API_KEY_USE = 'api_key_use',
  SESSION_EXPIRE = 'session_expire',
  SESSION_EXTEND = 'session_extend',
  ACCOUNT_LOCK = 'account_lock',
  ACCOUNT_UNLOCK = 'account_unlock',
  PASSWORD_POLICY_FAIL = 'password_policy_fail',
  AUTH_RATE_LIMIT = 'auth_rate_limit'
}

/**
 * Interface for OAuth authentication event details
 */
export interface OAuthAuditInfo {
  provider: string;
  userId?: number;
  username?: string;
  providerUserId?: string;
  scopeRequested?: string;
  state?: string;
  redirectUri?: string;
  isPkceFlow?: boolean;
}

/**
 * Interface for SAML authentication event details
 */
export interface SamlAuditInfo {
  provider: string;
  userId?: number;
  username?: string;
  providerEntityId?: string;
  nameIdFormat?: string;
  relayState?: string;
}

/**
 * Interface for token event details
 */
export interface TokenAuditInfo {
  userId: number;
  tokenType: 'access' | 'refresh' | 'id';
  tokenId?: string;
  expiresAt?: Date;
  revoked?: boolean;
  source?: 'oauth' | 'saml' | 'direct' | 'mfa';
}

/**
 * Options for authentication audit events
 */
export interface AuthAuditOptions {
  success?: boolean;
  severity?: AuditSeverity;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  tenantId?: number;
  metadata?: Record<string, any>;
  request?: Request;
}

/**
 * Centralized authentication audit logger for enterprise security
 */
export class AuthAuditLogger {
  /**
   * Log a standard authentication event
   */
  static async logAuthEvent(
    eventType: AuthAuditType,
    userId: number,
    description: string,
    options: AuthAuditOptions = {}
  ) {
    let action: string;
    switch(eventType) {
      case AuthAuditType.LOGIN:
        action = options.success ? AuditActions.AUTH.LOGIN_SUCCESS : AuditActions.AUTH.LOGIN_FAILURE;
        break;
      case AuthAuditType.LOGOUT:
        action = AuditActions.AUTH.LOGOUT;
        break;
      case AuthAuditType.TOKEN_REFRESH:
        action = AuditActions.AUTH.TOKEN_REFRESH;
        break;
      case AuthAuditType.TOKEN_REVOKE:
        action = 'auth.token.revoke';
        break;
      case AuthAuditType.PASSWORD_CHANGE:
        action = AuditActions.AUTH.PASSWORD_CHANGE;
        break;
      case AuthAuditType.PASSWORD_RESET:
        action = AuditActions.AUTH.PASSWORD_RESET;
        break;
      case AuthAuditType.MFA_SETUP:
        action = AuditActions.AUTH.MFA_SETUP;
        break;
      case AuthAuditType.MFA_VERIFY:
        action = AuditActions.AUTH.MFA_VERIFY;
        break;
      case AuthAuditType.REGISTER:
        action = AuditActions.AUTH.REGISTER;
        break;
      case AuthAuditType.SSO_LOGIN:
        action = AuditActions.AUTH.SSO_AUTHENTICATE;
        break;
      default:
        action = `auth.${eventType}`;
    }

    // Determine severity based on success/failure and event type
    let severity = options.severity || AuditSeverity.INFO;
    
    // Failed auth attempts are always at least WARNING level
    if (options.success === false) {
      severity = AuditSeverity.WARNING;
    }
    
    // Critical security events
    if (
      eventType === AuthAuditType.ACCOUNT_LOCK || 
      eventType === AuthAuditType.AUTH_RATE_LIMIT ||
      eventType === AuthAuditType.PASSWORD_POLICY_FAIL
    ) {
      severity = AuditSeverity.WARNING;
    }

    // Default metadata
    const metadata: Record<string, any> = {
      eventType,
      ...options.metadata
    };
    
    // Add reason if available
    if (options.reason) {
      metadata.reason = options.reason;
    }

    // Determine tenant ID
    let tenantId = options.tenantId;
    if (!tenantId && options.request) {
      tenantId = getTenantId(options.request);
    }

    // Create audit entry
    if (options.request) {
      await AuditService.logFromRequest(options.request, {
        userId,
        tenantId,
        action,
        category: AuditCategory.AUTH,
        severity,
        resourceType: 'authentication',
        description,
        success: options.success !== undefined ? options.success : true,
        metadata,
      });
    } else {
      await AuditService.log({
        userId,
        tenantId,
        action,
        category: AuditCategory.AUTH,
        severity,
        resourceType: 'authentication',
        description,
        success: options.success !== undefined ? options.success : true,
        metadata,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        sessionId: options.sessionId,
      });
    }
  }

  /**
   * Log an OAuth-specific authentication event
   */
  static async logOAuthEvent(
    eventType: AuthAuditType,
    oauthInfo: OAuthAuditInfo,
    description: string,
    options: AuthAuditOptions = {}
  ) {
    let action: string;
    
    // Determine the action based on event type
    switch(eventType) {
      case AuthAuditType.OAUTH_START:
        action = 'auth.oauth.start';
        break;
      case AuthAuditType.OAUTH_CALLBACK:
        action = 'auth.oauth.callback';
        break;
      case AuthAuditType.OAUTH_TOKEN_EXCHANGE:
        action = 'auth.oauth.token.exchange';
        break;
      case AuthAuditType.OAUTH_TOKEN_REFRESH:
        action = 'auth.oauth.token.refresh';
        break;
      case AuthAuditType.OAUTH_TOKEN_REVOKE:
        action = 'auth.oauth.token.revoke';
        break;
      case AuthAuditType.PKCE_CODE_VERIFY:
        action = 'auth.oauth.pkce.verify';
        break;
      default:
        action = AuditActions.AUTH.OAUTH_AUTHENTICATE;
    }

    // Prepare OAuth-specific metadata
    const metadata: Record<string, any> = {
      provider: oauthInfo.provider,
      eventType,
      ...options.metadata
    };
    
    // Only include safe OAuth information in metadata
    if (oauthInfo.providerUserId) {
      metadata.providerUserId = oauthInfo.providerUserId;
    }
    
    if (oauthInfo.isPkceFlow) {
      metadata.pkceFlow = true;
    }
    
    if (oauthInfo.scopeRequested) {
      metadata.scopeRequested = oauthInfo.scopeRequested;
    }
    
    // Note: We avoid logging state and redirect URI in most cases
    // as they might contain sensitive info. In audit systems, we 
    // generally log that they were used, not their values.
    if (oauthInfo.state) {
      metadata.stateProvided = true;
    }
    
    if (oauthInfo.redirectUri) {
      metadata.redirectUriProvided = true;
    }
    
    // Add reason if available
    if (options.reason) {
      metadata.reason = options.reason;
    }

    // Determine tenant ID
    let tenantId = options.tenantId;
    if (!tenantId && options.request) {
      tenantId = getTenantId(options.request);
    }

    // Create audit entry
    if (options.request) {
      await AuditService.logFromRequest(options.request, {
        userId: oauthInfo.userId || 0,
        tenantId,
        action,
        category: AuditCategory.AUTH,
        severity: options.severity || AuditSeverity.INFO,
        resourceType: 'oauth',
        description,
        success: options.success !== undefined ? options.success : true,
        metadata,
      });
    } else {
      await AuditService.log({
        userId: oauthInfo.userId || 0,
        tenantId,
        action,
        category: AuditCategory.AUTH,
        severity: options.severity || AuditSeverity.INFO,
        resourceType: 'oauth',
        description,
        success: options.success !== undefined ? options.success : true,
        metadata,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        sessionId: options.sessionId,
      });
    }
  }

  /**
   * Log a token-related event
   */
  static async logTokenEvent(
    eventType: AuthAuditType,
    tokenInfo: TokenAuditInfo,
    description: string,
    options: AuthAuditOptions = {}
  ) {
    let action: string;
    
    switch(eventType) {
      case AuthAuditType.TOKEN_REFRESH:
        action = AuditActions.AUTH.TOKEN_REFRESH;
        break;
      case AuthAuditType.TOKEN_REVOKE:
        action = 'auth.token.revoke';
        break;
      case AuthAuditType.OAUTH_TOKEN_REFRESH:
        action = 'auth.oauth.token.refresh';
        break;
      case AuthAuditType.OAUTH_TOKEN_REVOKE:
        action = 'auth.oauth.token.revoke';
        break;
      default:
        action = `auth.token.${eventType}`;
    }

    // Prepare token-specific metadata
    const metadata: Record<string, any> = {
      tokenType: tokenInfo.tokenType,
      source: tokenInfo.source || 'direct',
      eventType,
      ...options.metadata
    };
    
    // Only include non-sensitive token information
    if (tokenInfo.tokenId) {
      metadata.tokenId = tokenInfo.tokenId;
    }
    
    if (tokenInfo.expiresAt) {
      metadata.expiresAt = tokenInfo.expiresAt;
    }
    
    if (tokenInfo.revoked !== undefined) {
      metadata.revoked = tokenInfo.revoked;
    }

    // Add reason if available
    if (options.reason) {
      metadata.reason = options.reason;
    }

    // Determine tenant ID
    let tenantId = options.tenantId;
    if (!tenantId && options.request) {
      tenantId = getTenantId(options.request);
    }

    // Create audit entry
    if (options.request) {
      await AuditService.logFromRequest(options.request, {
        userId: tokenInfo.userId,
        tenantId,
        action,
        category: AuditCategory.AUTH,
        severity: options.severity || AuditSeverity.INFO,
        resourceType: 'token',
        description,
        success: options.success !== undefined ? options.success : true,
        metadata,
      });
    } else {
      await AuditService.log({
        userId: tokenInfo.userId,
        tenantId,
        action,
        category: AuditCategory.AUTH,
        severity: options.severity || AuditSeverity.INFO,
        resourceType: 'token',
        description,
        success: options.success !== undefined ? options.success : true,
        metadata,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        sessionId: options.sessionId,
      });
    }
  }

  /**
   * Log a SAML-specific authentication event
   */
  static async logSamlEvent(
    eventType: AuthAuditType,
    samlInfo: SamlAuditInfo,
    description: string,
    options: AuthAuditOptions = {}
  ) {
    const action = AuditActions.AUTH.SAML_AUTHENTICATE;

    // Prepare SAML-specific metadata
    const metadata: Record<string, any> = {
      provider: samlInfo.provider,
      eventType,
      ...options.metadata
    };
    
    // Only include safe SAML information
    if (samlInfo.providerEntityId) {
      metadata.providerEntityId = samlInfo.providerEntityId;
    }
    
    if (samlInfo.nameIdFormat) {
      metadata.nameIdFormat = samlInfo.nameIdFormat;
    }
    
    // Note: relayState might contain sensitive info, so we just note that it was used
    if (samlInfo.relayState) {
      metadata.relayStateProvided = true;
    }

    // Add reason if available
    if (options.reason) {
      metadata.reason = options.reason;
    }

    // Determine tenant ID
    let tenantId = options.tenantId;
    if (!tenantId && options.request) {
      tenantId = getTenantId(options.request);
    }

    // Create audit entry
    if (options.request) {
      await AuditService.logFromRequest(options.request, {
        userId: samlInfo.userId || 0,
        tenantId,
        action,
        category: AuditCategory.AUTH,
        severity: options.severity || AuditSeverity.INFO,
        resourceType: 'saml',
        description,
        success: options.success !== undefined ? options.success : true,
        metadata,
      });
    } else {
      await AuditService.log({
        userId: samlInfo.userId || 0,
        tenantId,
        action,
        category: AuditCategory.AUTH,
        severity: options.severity || AuditSeverity.INFO,
        resourceType: 'saml',
        description,
        success: options.success !== undefined ? options.success : true,
        metadata,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        sessionId: options.sessionId,
      });
    }
  }
}