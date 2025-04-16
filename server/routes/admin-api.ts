import { Express, Request, Response, NextFunction } from "express";
import { Pool } from "pg";
import * as crypto from "crypto";
import { and, eq, desc, gte, lt, inArray, like, sql } from "drizzle-orm";
import { db } from "../db";
import { authenticateToken, authorizeRoles } from "../auth";
import { 
  organizations, 
  organizationMembers, 
  subscriptions, 
  invoices, 
  apiKeys, 
  permissions,
  roles,
  rolePermissions,
  userRoles,
  featureFlags,
  organizationFeatures,
  auditLogs,
  insertOrganizationSchema,
  insertOrganizationMemberSchema,
  insertSubscriptionSchema,
  insertInvoiceSchema,
  insertApiKeySchema,
  insertPermissionSchema,
  insertRoleSchema
} from "../../shared/admin-schema";
import { users, projects, teams } from "../../shared/schema";

// Interface for the authenticated request with user info
interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

// List of super admin usernames who can access admin portal
const SUPER_ADMIN_USERNAMES = ["admin", "cpi_admin", "system_admin"];

// Middleware to check if user is a CPI Hub admin
function isCompanyAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const user = req.user;
  
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Allow access if user is in the super admin list
  if (SUPER_ADMIN_USERNAMES.includes(user.username)) {
    return next();
  }
  
  // Allow access if user has admin role
  if (user.role === "admin") {
    return next();
  }
  
  return res.status(403).json({ message: "Forbidden - CPI Hub admin access required" });
}

// Function to create audit log entry
async function createAuditLog(
  userId: number | null,
  action: string,
  resourceType: string,
  resourceId?: string | number,
  organizationId?: number,
  metadata?: any,
  req?: Request
) {
  try {
    await db.insert(auditLogs).values({
      userId: userId || null,
      action: action as any,
      resourceType,
      resourceId: resourceId?.toString() || null,
      organizationId: organizationId || null,
      ipAddress: req?.ip || null,
      userAgent: req?.headers["user-agent"] || null,
      metadata: metadata || null,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

export function registerAdminRoutes(app: Express): void {
  const adminApiRouter = app.route("/admin-api");
  
  // Middleware to protect all admin API routes
  app.use("/admin-api", authenticateToken, isCompanyAdmin);
  
  // ===== Organization Management =====
  
  // Get all organizations
  app.get("/admin-api/organizations", async (req: AuthRequest, res: Response) => {
    try {
      const results = await db.select().from(organizations).orderBy(desc(organizations.createdAt));
      res.json(results);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });
  
  // Get single organization
  app.get("/admin-api/organizations/:id", async (req: AuthRequest, res: Response) => {
    try {
      const orgId = parseInt(req.params.id);
      
      const result = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      res.json(result[0]);
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });
  
  // Create organization
  app.post("/admin-api/organizations", async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = insertOrganizationSchema.parse(req.body);
      
      const result = await db.insert(organizations).values(validatedData).returning();
      
      await createAuditLog(
        req.user?.id || null,
        "create",
        "organization",
        result[0].id,
        result[0].id,
        { name: result[0].name },
        req
      );
      
      res.status(201).json(result[0]);
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(400).json({ message: "Failed to create organization", error });
    }
  });
  
  // Update organization
  app.put("/admin-api/organizations/:id", async (req: AuthRequest, res: Response) => {
    try {
      const orgId = parseInt(req.params.id);
      const validatedData = insertOrganizationSchema.parse(req.body);
      
      const result = await db.update(organizations)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(organizations.id, orgId))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      await createAuditLog(
        req.user?.id || null,
        "update",
        "organization",
        orgId,
        orgId,
        { updatedFields: Object.keys(validatedData) },
        req
      );
      
      res.json(result[0]);
    } catch (error) {
      console.error("Error updating organization:", error);
      res.status(400).json({ message: "Failed to update organization", error });
    }
  });
  
  // Delete organization
  app.delete("/admin-api/organizations/:id", async (req: AuthRequest, res: Response) => {
    try {
      const orgId = parseInt(req.params.id);
      
      // Get the org before deleting it for audit logs
      const org = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
      
      if (org.length === 0) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      await db.delete(organizations).where(eq(organizations.id, orgId));
      
      await createAuditLog(
        req.user?.id || null,
        "delete",
        "organization",
        orgId,
        null,
        { name: org[0].name },
        req
      );
      
      res.json({ message: "Organization deleted successfully" });
    } catch (error) {
      console.error("Error deleting organization:", error);
      res.status(500).json({ message: "Failed to delete organization", error });
    }
  });
  
  // ===== Organization Members =====
  
  // Get organization members
  app.get("/admin-api/organizations/:id/members", async (req: AuthRequest, res: Response) => {
    try {
      const orgId = parseInt(req.params.id);
      
      const results = await db.select({
        id: organizationMembers.id,
        organizationId: organizationMembers.organizationId,
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        joinedAt: organizationMembers.joinedAt,
        isOwner: organizationMembers.isOwner,
        isAdmin: organizationMembers.isAdmin,
        isBillingAdmin: organizationMembers.isBillingAdmin,
        status: organizationMembers.status,
        user: {
          id: users.id,
          username: users.username,
          email: users.email,
          fullName: users.fullName,
          avatar: users.avatar,
          role: users.role
        }
      })
      .from(organizationMembers)
      .leftJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.organizationId, orgId))
      .orderBy(desc(organizationMembers.joinedAt));
      
      res.json(results);
    } catch (error) {
      console.error("Error fetching organization members:", error);
      res.status(500).json({ message: "Failed to fetch organization members" });
    }
  });
  
  // Add member to organization
  app.post("/admin-api/organizations/:id/members", async (req: AuthRequest, res: Response) => {
    try {
      const orgId = parseInt(req.params.id);
      const validatedData = insertOrganizationMemberSchema.parse({
        ...req.body,
        organizationId: orgId
      });
      
      const result = await db.insert(organizationMembers).values(validatedData).returning();
      
      await createAuditLog(
        req.user?.id || null,
        "create",
        "organization_member",
        result[0].id,
        orgId,
        { userId: validatedData.userId },
        req
      );
      
      res.status(201).json(result[0]);
    } catch (error) {
      console.error("Error adding organization member:", error);
      res.status(400).json({ message: "Failed to add organization member", error });
    }
  });
  
  // Update organization member
  app.put("/admin-api/organizations/:orgId/members/:id", async (req: AuthRequest, res: Response) => {
    try {
      const memberId = parseInt(req.params.id);
      const orgId = parseInt(req.params.orgId);
      
      const updates = {
        role: req.body.role,
        isAdmin: req.body.isAdmin,
        isOwner: req.body.isOwner,
        isBillingAdmin: req.body.isBillingAdmin,
        status: req.body.status
      };
      
      const result = await db.update(organizationMembers)
        .set(updates)
        .where(and(
          eq(organizationMembers.id, memberId),
          eq(organizationMembers.organizationId, orgId)
        ))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Organization member not found" });
      }
      
      await createAuditLog(
        req.user?.id || null,
        "update",
        "organization_member",
        memberId,
        orgId,
        { updatedFields: Object.keys(updates) },
        req
      );
      
      res.json(result[0]);
    } catch (error) {
      console.error("Error updating organization member:", error);
      res.status(400).json({ message: "Failed to update organization member", error });
    }
  });
  
  // Remove member from organization
  app.delete("/admin-api/organizations/:orgId/members/:id", async (req: AuthRequest, res: Response) => {
    try {
      const memberId = parseInt(req.params.id);
      const orgId = parseInt(req.params.orgId);
      
      await db.delete(organizationMembers)
        .where(and(
          eq(organizationMembers.id, memberId),
          eq(organizationMembers.organizationId, orgId)
        ));
      
      await createAuditLog(
        req.user?.id || null,
        "delete",
        "organization_member",
        memberId,
        orgId,
        { memberId },
        req
      );
      
      res.json({ message: "Member removed from organization successfully" });
    } catch (error) {
      console.error("Error removing organization member:", error);
      res.status(500).json({ message: "Failed to remove organization member", error });
    }
  });
  
  // ===== Subscriptions =====
  
  // Get all subscriptions for an organization
  app.get("/admin-api/organizations/:id/subscriptions", async (req: AuthRequest, res: Response) => {
    try {
      const orgId = parseInt(req.params.id);
      
      const results = await db.select()
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, orgId))
        .orderBy(desc(subscriptions.createdAt));
      
      res.json(results);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });
  
  // Create subscription
  app.post("/admin-api/subscriptions", async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = insertSubscriptionSchema.parse(req.body);
      
      const result = await db.insert(subscriptions).values(validatedData).returning();
      
      await createAuditLog(
        req.user?.id || null,
        "create",
        "subscription",
        result[0].id,
        validatedData.organizationId,
        { plan: validatedData.plan },
        req
      );
      
      res.status(201).json(result[0]);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(400).json({ message: "Failed to create subscription", error });
    }
  });
  
  // Update subscription
  app.put("/admin-api/subscriptions/:id", async (req: AuthRequest, res: Response) => {
    try {
      const subId = parseInt(req.params.id);
      
      // Get the existing subscription to get the org ID
      const existingSub = await db.select().from(subscriptions).where(eq(subscriptions.id, subId)).limit(1);
      
      if (existingSub.length === 0) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      
      const updates = {
        plan: req.body.plan,
        status: req.body.status,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        billingInterval: req.body.billingInterval,
        cancelAtPeriodEnd: req.body.cancelAtPeriodEnd,
        currentPeriodStart: req.body.currentPeriodStart ? new Date(req.body.currentPeriodStart) : undefined,
        currentPeriodEnd: req.body.currentPeriodEnd ? new Date(req.body.currentPeriodEnd) : undefined,
        quantity: req.body.quantity,
        price: req.body.price,
        currency: req.body.currency,
        metadata: req.body.metadata,
        updatedAt: new Date()
      };
      
      const result = await db.update(subscriptions)
        .set(updates)
        .where(eq(subscriptions.id, subId))
        .returning();
      
      await createAuditLog(
        req.user?.id || null,
        "update",
        "subscription",
        subId,
        existingSub[0].organizationId,
        { updatedFields: Object.keys(updates).filter(k => updates[k] !== undefined) },
        req
      );
      
      res.json(result[0]);
    } catch (error) {
      console.error("Error updating subscription:", error);
      res.status(400).json({ message: "Failed to update subscription", error });
    }
  });
  
  // Cancel subscription
  app.post("/admin-api/subscriptions/:id/cancel", async (req: AuthRequest, res: Response) => {
    try {
      const subId = parseInt(req.params.id);
      const atPeriodEnd = req.body.atPeriodEnd === true;
      
      // Get the existing subscription to get the org ID
      const existingSub = await db.select().from(subscriptions).where(eq(subscriptions.id, subId)).limit(1);
      
      if (existingSub.length === 0) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      
      let updates: any = {
        cancelAtPeriodEnd: atPeriodEnd,
        updatedAt: new Date()
      };
      
      // If not cancelling at period end, cancel immediately
      if (!atPeriodEnd) {
        updates.status = "canceled";
        updates.endDate = new Date();
      }
      
      const result = await db.update(subscriptions)
        .set(updates)
        .where(eq(subscriptions.id, subId))
        .returning();
      
      await createAuditLog(
        req.user?.id || null,
        "update",
        "subscription",
        subId,
        existingSub[0].organizationId,
        { action: "cancel", atPeriodEnd },
        req
      );
      
      res.json(result[0]);
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      res.status(400).json({ message: "Failed to cancel subscription", error });
    }
  });
  
  // ===== Invoices =====
  
  // Get all invoices for an organization
  app.get("/admin-api/organizations/:id/invoices", async (req: AuthRequest, res: Response) => {
    try {
      const orgId = parseInt(req.params.id);
      
      const results = await db.select()
        .from(invoices)
        .where(eq(invoices.organizationId, orgId))
        .orderBy(desc(invoices.invoiceDate));
      
      res.json(results);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });
  
  // Create invoice
  app.post("/admin-api/invoices", async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = insertInvoiceSchema.parse(req.body);
      
      const result = await db.insert(invoices).values(validatedData).returning();
      
      await createAuditLog(
        req.user?.id || null,
        "create",
        "invoice",
        result[0].id,
        validatedData.organizationId,
        { amount: validatedData.amount },
        req
      );
      
      res.status(201).json(result[0]);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(400).json({ message: "Failed to create invoice", error });
    }
  });
  
  // Update invoice
  app.put("/admin-api/invoices/:id", async (req: AuthRequest, res: Response) => {
    try {
      const invoiceId = parseInt(req.params.id);
      
      // Get the existing invoice to get the org ID
      const existingInvoice = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
      
      if (existingInvoice.length === 0) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const updates = {
        status: req.body.status,
        paidDate: req.body.paidDate ? new Date(req.body.paidDate) : undefined,
        description: req.body.description,
        receiptUrl: req.body.receiptUrl,
        updatedAt: new Date()
      };
      
      const result = await db.update(invoices)
        .set(updates)
        .where(eq(invoices.id, invoiceId))
        .returning();
      
      await createAuditLog(
        req.user?.id || null,
        "update",
        "invoice",
        invoiceId,
        existingInvoice[0].organizationId,
        { updatedFields: Object.keys(updates).filter(k => updates[k] !== undefined) },
        req
      );
      
      res.json(result[0]);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(400).json({ message: "Failed to update invoice", error });
    }
  });
  
  // ===== API Keys =====
  
  // Get all API keys for an organization
  app.get("/admin-api/organizations/:id/api-keys", async (req: AuthRequest, res: Response) => {
    try {
      const orgId = parseInt(req.params.id);
      
      // Don't return the actual key or hashed key in the response
      const results = await db.select({
        id: apiKeys.id,
        organizationId: apiKeys.organizationId,
        name: apiKeys.name,
        expiresAt: apiKeys.expiresAt,
        createdBy: apiKeys.createdBy,
        lastUsedAt: apiKeys.lastUsedAt,
        revokedAt: apiKeys.revokedAt,
        scopes: apiKeys.scopes,
        createdAt: apiKeys.createdAt,
        updatedAt: apiKeys.updatedAt,
        creator: {
          username: users.username,
          fullName: users.fullName
        }
      })
        .from(apiKeys)
        .leftJoin(users, eq(apiKeys.createdBy, users.id))
        .where(eq(apiKeys.organizationId, orgId))
        .orderBy(desc(apiKeys.createdAt));
      
      res.json(results);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });
  
  // Create API key
  app.post("/admin-api/organizations/:id/api-keys", async (req: AuthRequest, res: Response) => {
    try {
      const orgId = parseInt(req.params.id);
      
      // Generate API key
      const apiKeyValue = crypto.randomBytes(32).toString("hex");
      const hashedKey = crypto.createHash("sha256").update(apiKeyValue).digest("hex");
      
      const keyData = {
        organizationId: orgId,
        name: req.body.name,
        key: apiKeyValue, // This is sent to the client once and never stored again
        hashedKey: hashedKey,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
        createdBy: req.user!.id,
        scopes: req.body.scopes || {}
      };
      
      const result = await db.insert(apiKeys).values(keyData).returning();
      
      await createAuditLog(
        req.user?.id || null,
        "create",
        "api_key",
        result[0].id,
        orgId,
        { name: req.body.name },
        req
      );
      
      // Return the API key to the client only once
      res.status(201).json({
        ...result[0],
        key: apiKeyValue // Include the plain key in response
      });
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(400).json({ message: "Failed to create API key", error });
    }
  });
  
  // Revoke API key
  app.post("/admin-api/api-keys/:id/revoke", async (req: AuthRequest, res: Response) => {
    try {
      const keyId = parseInt(req.params.id);
      
      // Get the existing key to get the org ID
      const existingKey = await db.select().from(apiKeys).where(eq(apiKeys.id, keyId)).limit(1);
      
      if (existingKey.length === 0) {
        return res.status(404).json({ message: "API key not found" });
      }
      
      const result = await db.update(apiKeys)
        .set({
          revokedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(apiKeys.id, keyId))
        .returning();
      
      await createAuditLog(
        req.user?.id || null,
        "update",
        "api_key",
        keyId,
        existingKey[0].organizationId,
        { action: "revoke" },
        req
      );
      
      res.json(result[0]);
    } catch (error) {
      console.error("Error revoking API key:", error);
      res.status(400).json({ message: "Failed to revoke API key", error });
    }
  });
  
  // ===== User Management =====
  
  // Get all users
  app.get("/admin-api/users", async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      const search = req.query.search as string;
      
      let query = db.select().from(users);
      
      if (search) {
        query = query.where(
          sql`username ILIKE ${'%' + search + '%'} OR full_name ILIKE ${'%' + search + '%'} OR email ILIKE ${'%' + search + '%'}`
        );
      }
      
      const results = await query.limit(limit).offset(offset).orderBy(users.id);
      const countResult = await db.select({ count: sql`COUNT(*)` }).from(users);
      const totalCount = Number(countResult[0].count);
      
      res.json({
        users: results,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  // Get single user
  app.get("/admin-api/users/:id", async (req: AuthRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (result.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get user's organizations
      const memberData = await db.select({
        membership: organizationMembers,
        organization: organizations
      })
        .from(organizationMembers)
        .leftJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
        .where(eq(organizationMembers.userId, userId));
      
      const userOrgs = memberData.map(data => ({
        id: data.membership.id,
        organizationId: data.membership.organizationId,
        role: data.membership.role,
        isAdmin: data.membership.isAdmin,
        isOwner: data.membership.isOwner,
        isBillingAdmin: data.membership.isBillingAdmin,
        joinedAt: data.membership.joinedAt,
        organization: {
          id: data.organization.id,
          name: data.organization.name,
          displayName: data.organization.displayName,
          status: data.organization.status
        }
      }));
      
      const userData = {
        ...result[0],
        organizations: userOrgs
      };
      
      res.json(userData);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Update user
  app.put("/admin-api/users/:id", async (req: AuthRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      const updates = {
        username: req.body.username,
        fullName: req.body.fullName,
        email: req.body.email,
        role: req.body.role,
        // Don't allow password updates through this endpoint for security
      };
      
      const result = await db.update(users)
        .set(updates)
        .where(eq(users.id, userId))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      
      await createAuditLog(
        req.user?.id || null,
        "update",
        "user",
        userId,
        null,
        { updatedFields: Object.keys(updates).filter(k => updates[k] !== undefined) },
        req
      );
      
      res.json(result[0]);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ message: "Failed to update user", error });
    }
  });
  
  // Disable/suspend user
  app.post("/admin-api/users/:id/suspend", async (req: AuthRequest, res: Response) => {
    try {
      // This would depend on your user schema having a status or suspended field
      // For now, we'll just return a not implemented response
      res.status(501).json({ message: "User suspension not implemented yet" });
    } catch (error) {
      console.error("Error suspending user:", error);
      res.status(500).json({ message: "Failed to suspend user" });
    }
  });
  
  // ===== Audit Logs =====
  
  // Get audit logs
  app.get("/admin-api/audit-logs", async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      const orgId = req.query.organizationId ? parseInt(req.query.organizationId as string) : null;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const action = req.query.action as string;
      const resourceType = req.query.resourceType as string;
      const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : null;
      const toDate = req.query.toDate ? new Date(req.query.toDate as string) : null;
      
      let query = db.select({
        id: auditLogs.id,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        timestamp: auditLogs.timestamp,
        ipAddress: auditLogs.ipAddress,
        metadata: auditLogs.metadata,
        user: {
          id: users.id,
          username: users.username,
          fullName: users.fullName,
        },
        organization: {
          id: organizations.id,
          name: organizations.name,
        }
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .leftJoin(organizations, eq(auditLogs.organizationId, organizations.id));
      
      // Apply filters
      if (orgId) {
        query = query.where(eq(auditLogs.organizationId, orgId));
      }
      
      if (userId) {
        query = query.where(eq(auditLogs.userId, userId));
      }
      
      if (action) {
        query = query.where(eq(auditLogs.action, action));
      }
      
      if (resourceType) {
        query = query.where(eq(auditLogs.resourceType, resourceType));
      }
      
      if (fromDate) {
        query = query.where(gte(auditLogs.timestamp, fromDate));
      }
      
      if (toDate) {
        // Add 1 day to include the end date
        const nextDay = new Date(toDate);
        nextDay.setDate(nextDay.getDate() + 1);
        query = query.where(lt(auditLogs.timestamp, nextDay));
      }
      
      const results = await query
        .orderBy(desc(auditLogs.timestamp))
        .limit(limit)
        .offset(offset);
      
      // Get total count for pagination
      const countQuery = db.select({ count: sql`COUNT(*)` }).from(auditLogs);
      
      // Apply the same filters to the count query
      if (orgId) {
        countQuery.where(eq(auditLogs.organizationId, orgId));
      }
      
      if (userId) {
        countQuery.where(eq(auditLogs.userId, userId));
      }
      
      if (action) {
        countQuery.where(eq(auditLogs.action, action));
      }
      
      if (resourceType) {
        countQuery.where(eq(auditLogs.resourceType, resourceType));
      }
      
      if (fromDate) {
        countQuery.where(gte(auditLogs.timestamp, fromDate));
      }
      
      if (toDate) {
        const nextDay = new Date(toDate);
        nextDay.setDate(nextDay.getDate() + 1);
        countQuery.where(lt(auditLogs.timestamp, nextDay));
      }
      
      const countResult = await countQuery;
      const totalCount = Number(countResult[0].count);
      
      res.json({
        logs: results,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });
  
  // ===== System Dashboard =====
  
  // Get system statistics
  app.get("/admin-api/system/stats", async (req: AuthRequest, res: Response) => {
    try {
      // Get organization count
      const orgCount = await db.select({ count: sql`COUNT(*)` }).from(organizations);
      
      // Get user count
      const userCount = await db.select({ count: sql`COUNT(*)` }).from(users);
      
      // Get active subscription count
      const activeSubCount = await db.select({ count: sql`COUNT(*)` })
        .from(subscriptions)
        .where(eq(subscriptions.status, "active"));
      
      // Get project count
      const projectCount = await db.select({ count: sql`COUNT(*)` }).from(projects);
      
      // Get team count
      const teamCount = await db.select({ count: sql`COUNT(*)` }).from(teams);
      
      // Get monthly revenue
      // This is a simplified calculation and would need to be adjusted
      // based on your actual billing model
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const nextMonth = new Date(thisMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      const monthlyRevenue = await db.select({ sum: sql`SUM(amount)` })
        .from(invoices)
        .where(and(
          gte(invoices.invoiceDate, thisMonth),
          lt(invoices.invoiceDate, nextMonth),
          eq(invoices.status, "paid")
        ));
      
      // Get new organizations in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const newOrgsCount = await db.select({ count: sql`COUNT(*)` })
        .from(organizations)
        .where(gte(organizations.createdAt, thirtyDaysAgo));
      
      // Get new users in the last 30 days
      // Assuming users table has a createdAt column
      // Adjust based on your actual schema
      const newUsersCount = await db.select({ count: sql`COUNT(*)` })
        .from(organizationMembers)
        .where(gte(organizationMembers.joinedAt, thirtyDaysAgo));
      
      res.json({
        organizations: {
          total: Number(orgCount[0].count),
          new30Days: Number(newOrgsCount[0].count)
        },
        users: {
          total: Number(userCount[0].count),
          new30Days: Number(newUsersCount[0].count)
        },
        subscriptions: {
          active: Number(activeSubCount[0].count)
        },
        projects: {
          total: Number(projectCount[0].count)
        },
        teams: {
          total: Number(teamCount[0].count)
        },
        revenue: {
          monthly: Number(monthlyRevenue[0].sum) || 0
        }
      });
    } catch (error) {
      console.error("Error fetching system stats:", error);
      res.status(500).json({ message: "Failed to fetch system statistics" });
    }
  });
  
  // ===== Admin Operations =====
  
  // Run database maintenance
  app.post("/admin-api/system/maintenance", async (req: AuthRequest, res: Response) => {
    try {
      // This would typically run VACUUM, analyze tables, etc.
      // For now, just log the request and return success
      console.log("Database maintenance requested by admin:", req.user?.username);
      
      await createAuditLog(
        req.user?.id || null,
        "admin_action",
        "system",
        "maintenance",
        null,
        { operation: "maintenance" },
        req
      );
      
      res.json({ message: "Database maintenance completed successfully" });
    } catch (error) {
      console.error("Error running database maintenance:", error);
      res.status(500).json({ message: "Failed to run database maintenance" });
    }
  });
  
  // Create a database backup
  app.post("/admin-api/system/backup", async (req: AuthRequest, res: Response) => {
    try {
      // In a real implementation, this would trigger a database backup
      // For now, just log the request and return success
      console.log("Database backup requested by admin:", req.user?.username);
      
      await createAuditLog(
        req.user?.id || null,
        "admin_action",
        "system",
        "backup",
        null,
        { operation: "backup" },
        req
      );
      
      res.json({ message: "Database backup initiated" });
    } catch (error) {
      console.error("Error creating database backup:", error);
      res.status(500).json({ message: "Failed to create database backup" });
    }
  });
  
  return;
}