/**
 * Enterprise Authentication Routes
 * 
 * Implements routes for enterprise authentication features:
 * - SAML-based SSO integration
 * - SCIM provisioning
 */

import { Router, Request, Response } from 'express';
import { SamlService } from '../services/samlService';
import ScimService from '../services/scimService';
import { authenticateToken, authorizeRoles } from '../auth';
import { AuditService, AuditCategory, AuditSeverity } from '../services/auditService';

// Create router
const router = Router();

// SAML routes
// -----------

// SAML login initiation
router.get('/auth/saml/login/:providerId', async (req, res, next) => {
  try {
    const providerId = req.params.providerId;
    const tenantId = req.query.tenantId ? parseInt(req.query.tenantId as string) : undefined;
    
    // Get auth middleware
    const authMiddleware = SamlService.getAuthMiddleware(providerId, tenantId);
    
    // Execute middleware chain
    for (const middleware of authMiddleware) {
      await new Promise<void>((resolve, reject) => {
        middleware(req, res, (err: any) => {
          if (err) return reject(err);
          resolve();
        });
      });
    }
  } catch (error) {
    console.error('SAML login initiation error:', error);
    res.redirect(`/login?error=saml_init&message=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`);
  }
});

// SAML assertion consumer service (callback)
router.post('/auth/saml/callback/:providerId', async (req, res, next) => {
  try {
    const providerId = req.params.providerId;
    const tenantId = req.query.tenantId ? parseInt(req.query.tenantId as string) : undefined;
    
    // Get callback middleware
    const callbackMiddleware = SamlService.getCallbackMiddleware(providerId, tenantId);
    
    // Execute middleware chain
    for (const middleware of callbackMiddleware) {
      await new Promise<void>((resolve, reject) => {
        middleware(req, res, (err: any) => {
          if (err) return reject(err);
          resolve();
        });
      });
    }
  } catch (error) {
    console.error('SAML callback error:', error);
    res.redirect(`/login?error=saml_callback&message=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`);
  }
});

// SAML metadata endpoint
router.get('/auth/saml/metadata/:providerId', async (req, res) => {
  try {
    const providerId = req.params.providerId;
    const tenantId = req.query.tenantId ? parseInt(req.query.tenantId as string) : undefined;
    
    // Get metadata
    const metadata = await SamlService.getMetadata(providerId, tenantId);
    
    res.header('Content-Type', 'text/xml').send(metadata);
  } catch (error) {
    console.error('SAML metadata error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate SAML metadata',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Admin routes for SAML configuration
// ----------------------------------

// Get SAML providers
router.get('/admin/auth/saml/providers', 
  authenticateToken, 
  authorizeRoles('admin'), 
  async (req, res) => {
    try {
      const providers = await SamlService.getEnabledProviders();
      
      // Redact sensitive information
      const redactedProviders = providers.map(provider => ({
        ...provider,
        config: {
          ...provider.config,
          privateKey: provider.config.privateKey ? '[REDACTED]' : undefined,
          decryptionPvk: provider.config.decryptionPvk ? '[REDACTED]' : undefined
        }
      }));
      
      res.json({
        success: true,
        providers: redactedProviders
      });
    } catch (error) {
      console.error('Error getting SAML providers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve SAML providers',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
});

// SCIM routes
// -----------

// SCIM service provider configuration
router.get('/scim/v2/ServiceProviderConfig', ScimService.authMiddleware, (req, res) => {
  res.json({
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
    documentationUri: 'https://tools.ietf.org/html/rfc7644',
    patch: {
      supported: false
    },
    bulk: {
      supported: false
    },
    filter: {
      supported: true,
      maxResults: 100
    },
    changePassword: {
      supported: false
    },
    sort: {
      supported: false
    },
    etag: {
      supported: false
    },
    authenticationSchemes: [
      {
        name: 'Bearer Token Authentication',
        description: 'Authentication scheme using a bearer token',
        specUri: 'https://tools.ietf.org/html/rfc6750',
        type: 'oauthbearertoken',
        primary: true
      }
    ]
  });
});

// SCIM resource types
router.get('/scim/v2/ResourceTypes', ScimService.authMiddleware, (req, res) => {
  res.json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: 1,
    Resources: [
      {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
        id: 'User',
        name: 'User',
        endpoint: '/scim/v2/Users',
        description: 'User Account',
        schema: 'urn:ietf:params:scim:schemas:core:2.0:User',
        meta: {
          resourceType: 'ResourceType',
          location: '/scim/v2/ResourceTypes/User'
        }
      }
    ]
  });
});

// SCIM schemas
router.get('/scim/v2/Schemas', ScimService.authMiddleware, (req, res) => {
  // Return standard SCIM user schema
  res.json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: 1,
    Resources: [
      {
        id: 'urn:ietf:params:scim:schemas:core:2.0:User',
        name: 'User',
        description: 'User Account',
        attributes: [
          {
            name: 'userName',
            type: 'string',
            multiValued: false,
            required: true,
            caseExact: false,
            mutability: 'readWrite',
            returned: 'default',
            uniqueness: 'server'
          },
          {
            name: 'name',
            type: 'complex',
            multiValued: false,
            required: false,
            mutability: 'readWrite',
            returned: 'default',
            subAttributes: [
              {
                name: 'formatted',
                type: 'string',
                multiValued: false,
                required: false,
                mutability: 'readWrite',
                returned: 'default'
              },
              {
                name: 'givenName',
                type: 'string',
                multiValued: false,
                required: false,
                mutability: 'readWrite',
                returned: 'default'
              },
              {
                name: 'familyName',
                type: 'string',
                multiValued: false,
                required: false,
                mutability: 'readWrite',
                returned: 'default'
              }
            ]
          },
          {
            name: 'emails',
            type: 'complex',
            multiValued: true,
            required: false,
            mutability: 'readWrite',
            returned: 'default',
            subAttributes: [
              {
                name: 'value',
                type: 'string',
                multiValued: false,
                required: false,
                mutability: 'readWrite',
                returned: 'default'
              },
              {
                name: 'primary',
                type: 'boolean',
                multiValued: false,
                required: false,
                mutability: 'readWrite',
                returned: 'default'
              },
              {
                name: 'type',
                type: 'string',
                multiValued: false,
                required: false,
                mutability: 'readWrite',
                returned: 'default',
                canonicalValues: ['work', 'home', 'other']
              }
            ]
          },
          {
            name: 'active',
            type: 'boolean',
            multiValued: false,
            required: false,
            mutability: 'readWrite',
            returned: 'default'
          },
          {
            name: 'groups',
            type: 'complex',
            multiValued: true,
            required: false,
            mutability: 'readOnly',
            returned: 'default',
            subAttributes: [
              {
                name: 'value',
                type: 'string',
                multiValued: false,
                required: false,
                mutability: 'readOnly',
                returned: 'default'
              },
              {
                name: 'display',
                type: 'string',
                multiValued: false,
                required: false,
                mutability: 'readOnly',
                returned: 'default'
              }
            ]
          }
        ]
      }
    ]
  });
});

// SCIM user operations
router.get('/scim/v2/Users/:id', ScimService.authMiddleware, ScimService.getUser);
router.get('/scim/v2/Users', ScimService.authMiddleware, (req, res) => ScimService.searchUsers(req, res));
router.post('/scim/v2/Users/.search', ScimService.authMiddleware, (req, res) => ScimService.searchUsers(req, res));
router.post('/scim/v2/Users', ScimService.authMiddleware, (req, res) => ScimService.createUser(req, res));
router.put('/scim/v2/Users/:id', ScimService.authMiddleware, (req, res) => ScimService.updateUser(req, res));
router.delete('/scim/v2/Users/:id', ScimService.authMiddleware, (req, res) => ScimService.deleteUser(req, res));

export default router;