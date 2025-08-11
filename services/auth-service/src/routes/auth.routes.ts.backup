import { Router } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/error-handler';
import { db, users, refreshTokens, emailVerificationTokens, passwordResetTokens } from '../db';
import { eq } from 'drizzle-orm';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  tenantId: z.number().optional()
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().uuid()
});

const resetPasswordSchema = z.object({
  token: z.string().uuid(),
  password: z.string().min(8)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8)
});

// Login route
router.post('/login', async (req, res, next) => {
  try {
    // Validate request body
    const { email, password } = loginSchema.parse(req.body);

    // Authenticate using passport
    passport.authenticate('local', { session: false }, async (err, user, info) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return next(new ApiError(401, info?.message || 'Invalid credentials', 'INVALID_CREDENTIALS'));
      }

      // Generate JWT token
      const accessToken = jwt.sign(
        { 
          sub: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId
        },
        config.jwt.secret,
        { 
          expiresIn: config.jwt.accessTokenExpiry,
          audience: config.auth.jwtAudience,
          issuer: config.auth.jwtIssuer
        }
      );

      // Generate refresh token
      const refreshToken = uuidv4();
      const refreshTokenExpiry = new Date();
      refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days

      // Store refresh token in database
      await db.insert(refreshTokens)
        .values({
          userId: user.id,
          token: refreshToken,
          expiresAt: refreshTokenExpiry,
          createdByIp: req.ip
        });

      // Log successful login
      logger.info('User logged in', { userId: user.id, email: user.email });

      // Return tokens and user info
      res.json({
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes in seconds
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId
        }
      });
    })(req, res, next);
  } catch (error) {
    next(error);
  }
});

// Register route
router.post('/register', async (req, res, next) => {
  try {
    // Validate request body
    const { email, password, firstName, lastName, tenantId } = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase())
    });

    if (existingUser) {
      throw new ApiError(409, 'User already exists', 'USER_EXISTS');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

    // Create user
    const [user] = await db.insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        tenantId: tenantId || 1, // Default tenant ID
        role: 'user' // Default role
      })
      .returning();

    // Generate verification token
    const verificationToken = uuidv4();
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 hours

    // Store verification token
    await db.insert(emailVerificationTokens)
      .values({
        userId: user.id,
        token: verificationToken,
        expiresAt: tokenExpiry
      });

    // TODO: Send verification email

    // Log user registration
    logger.info('User registered', { userId: user.id, email });

    // Return success
    res.status(201).json({
      message: 'User registered successfully',
      userId: user.id,
      verificationRequired: true
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token route
router.post('/refresh-token', async (req, res, next) => {
  try {
    // Validate request body
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    // Find refresh token in database
    const token = await db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.token, refreshToken),
      with: {
        user: true
      }
    });

    // Token not found or revoked
    if (!token || token.isRevoked) {
      throw new ApiError(401, 'Invalid refresh token', 'INVALID_TOKEN');
    }

    // Token expired
    if (new Date() > token.expiresAt) {
      // Revoke token
      await db.update(refreshTokens)
        .set({ isRevoked: true })
        .where(eq(refreshTokens.id, token.id));

      throw new ApiError(401, 'Refresh token expired', 'TOKEN_EXPIRED');
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { 
        sub: token.user.id,
        email: token.user.email,
        role: token.user.role,
        tenantId: token.user.tenantId
      },
      config.jwt.secret,
      { 
        expiresIn: config.jwt.accessTokenExpiry,
        audience: config.auth.jwtAudience,
        issuer: config.auth.jwtIssuer
      }
    );

    // Generate new refresh token
    const newRefreshToken = uuidv4();
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days

    // Store new refresh token
    await db.insert(refreshTokens)
      .values({
        userId: token.user.id,
        token: newRefreshToken,
        expiresAt: refreshTokenExpiry,
        createdByIp: req.ip
      });

    // Revoke old refresh token
    await db.update(refreshTokens)
      .set({ 
        isRevoked: true,
        revokedByIp: req.ip,
        replacedByToken: newRefreshToken
      })
      .where(eq(refreshTokens.id, token.id));

    // Log token refresh
    logger.info('Refresh token used', { userId: token.user.id });

    // Return new tokens
    res.json({
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900 // 15 minutes in seconds
    });
  } catch (error) {
    next(error);
  }
});

// Logout route
router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    // Revoke refresh token if provided
    if (refreshToken) {
      await db.update(refreshTokens)
        .set({ 
          isRevoked: true,
          revokedByIp: req.ip
        })
        .where(eq(refreshTokens.token, refreshToken));
    }

    // Clear session if using session-based auth
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          logger.error('Error destroying session', { error: err });
        }
      });
    }

    // Log logout
    if (req.user) {
      logger.info('User logged out', { userId: (req.user as any).id });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// Verify email route
router.get('/verify-email/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    // Find verification token
    const verificationToken = await db.query.emailVerificationTokens.findFirst({
      where: eq(emailVerificationTokens.token, token),
      with: {
        user: true
      }
    });

    // Token not found
    if (!verificationToken) {
      throw new ApiError(400, 'Invalid verification token', 'INVALID_TOKEN');
    }

    // Token expired
    if (new Date() > verificationToken.expiresAt) {
      throw new ApiError(400, 'Verification token expired', 'TOKEN_EXPIRED');
    }

    // Update user
    await db.update(users)
      .set({ isEmailVerified: true })
      .where(eq(users.id, verificationToken.userId));

    // Delete verification token
    await db.delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.id, verificationToken.id));

    // Log email verification
    logger.info('Email verified', { userId: verificationToken.userId });

    // Redirect to frontend
    res.redirect(`${process.env.FRONTEND_URL || 'https://app.contextualintelligence.com'}/login?verified=true`);
  } catch (error) {
    next(error);
  }
});

// Request password reset route
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase())
    });

    // Don't reveal if user exists or not
    if (!user) {
      return res.json({ message: 'If your email is registered, you will receive a password reset link' });
    }

    // Generate reset token
    const resetToken = uuidv4();
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 1); // 1 hour

    // Store reset token
    await db.insert(passwordResetTokens)
      .values({
        userId: user.id,
        token: resetToken,
        expiresAt: tokenExpiry
      });

    // TODO: Send password reset email

    // Log password reset request
    logger.info('Password reset requested', { userId: user.id, email });

    res.json({ message: 'If your email is registered, you will receive a password reset link' });
  } catch (error) {
    next(error);
  }
});

// Reset password route
router.post('/reset-password', async (req, res, next) => {
  try {
    // Validate request body
    const { token, password } = resetPasswordSchema.parse(req.body);

    // Find reset token
    const resetToken = await db.query.passwordResetTokens.findFirst({
      where: eq(passwordResetTokens.token, token),
      with: {
        user: true
      }
    });

    // Token not found
    if (!resetToken) {
      throw new ApiError(400, 'Invalid reset token', 'INVALID_TOKEN');
    }

    // Token expired
    if (new Date() > resetToken.expiresAt) {
      throw new ApiError(400, 'Reset token expired', 'TOKEN_EXPIRED');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

    // Update user password
    await db.update(users)
      .set({ passwordHash })
      .where(eq(users.id, resetToken.userId));

    // Delete reset token
    await db.delete(passwordResetTokens)
      .where(eq(passwordResetTokens.id, resetToken.id));

    // Revoke all refresh tokens for user
    await db.update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.userId, resetToken.userId));

    // Log password reset
    logger.info('Password reset completed', { userId: resetToken.userId });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
});

// Change password route (authenticated)
router.post('/change-password', requirePermission('users:update:self'), async (req, res, next) => {
  try {
    // Validate request body
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const userId = (req.user as any).id;

    // Get user with password hash
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user || !user.passwordHash) {
      throw new ApiError(400, 'Cannot change password for this account type', 'INVALID_ACCOUNT_TYPE');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new ApiError(400, 'Current password is incorrect', 'INVALID_PASSWORD');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, config.security.bcryptRounds);

    // Update user password
    await db.update(users)
      .set({ passwordHash })
      .where(eq(users.id, userId));

    // Log password change
    logger.info('Password changed', { userId });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

// OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user) => {
    if (err || !user) {
      return res.redirect(`${process.env.FRONTEND_URL || 'https://app.contextualintelligence.com'}/login?error=oauth_failed`);
    }

    // Generate JWT token
    const accessToken = jwt.sign(
      { 
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      },
      config.jwt.secret,
      { 
        expiresIn: config.jwt.accessTokenExpiry,
        audience: config.auth.jwtAudience,
        issuer: config.auth.jwtIssuer
      }
    );

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'https://app.contextualintelligence.com'}/oauth-callback?token=${accessToken}`);
  })(req, res, next);
});

router.get('/microsoft', passport.authenticate('microsoft', { prompt: 'select_account' }));
router.get('/microsoft/callback', (req, res, next) => {
  passport.authenticate('microsoft', { session: false }, (err, user) => {
    if (err || !user) {
      return res.redirect(`${process.env.FRONTEND_URL || 'https://app.contextualintelligence.com'}/login?error=oauth_failed`);
    }

    // Generate JWT token
    const accessToken = jwt.sign(
      { 
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      },
      config.jwt.secret,
      { 
        expiresIn: config.jwt.accessTokenExpiry,
        audience: config.auth.jwtAudience,
        issuer: config.auth.jwtIssuer
      }
    );

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'https://app.contextualintelligence.com'}/oauth-callback?token=${accessToken}`);
  })(req, res, next);
});

router.get('/slack', passport.authenticate('slack'));
router.get('/slack/callback', (req, res, next) => {
  passport.authenticate('slack', { session: false }, (err, user) => {
    if (err || !user) {
      return res.redirect(`${process.env.FRONTEND_URL || 'https://app.contextualintelligence.com'}/login?error=oauth_failed`);
    }

    // Generate JWT token
    const accessToken = jwt.sign(
      { 
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      },
      config.jwt.secret,
      { 
        expiresIn: config.jwt.accessTokenExpiry,
        audience: config.auth.jwtAudience,
        issuer: config.auth.jwtIssuer
      }
    );

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'https://app.contextualintelligence.com'}/oauth-callback?token=${accessToken}`);
  })(req, res, next);
});

// SAML routes
router.get('/saml', passport.authenticate('saml'));
router.post('/saml/callback', (req, res, next) => {
  passport.authenticate('saml', { session: false }, (err, user) => {
    if (err || !user) {
      return res.redirect(`${process.env.FRONTEND_URL || 'https://app.contextualintelligence.com'}/login?error=saml_failed`);
    }

    // Generate JWT token
    const accessToken = jwt.sign(
      { 
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      },
      config.jwt.secret,
      { 
        expiresIn: config.jwt.accessTokenExpiry,
        audience: config.auth.jwtAudience,
        issuer: config.auth.jwtIssuer
      }
    );

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'https://app.contextualintelligence.com'}/oauth-callback?token=${accessToken}`);
  })(req, res, next);
});

export { router as authRoutes };