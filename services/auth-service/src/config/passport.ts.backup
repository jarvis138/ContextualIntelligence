import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import { Strategy as SlackStrategy } from 'passport-slack-oauth2';
import type { Strategy as PassportStrategy } from 'passport';
import { Strategy as SamlStrategy } from 'passport-saml';
import bcrypt from 'bcrypt';
import { config } from './index';
import { logger } from '../utils/logger';
import { db, users, oauthProfiles } from '../db';
import { eq, and } from 'drizzle-orm';

// Configure passport strategies
export const configurePassport = () => {
  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
        columns: {
          passwordHash: false
        }
      });
      
      done(null, user);
    } catch (error) {
      logger.error('Error deserializing user', { error, userId: id });
      done(error, null);
    }
  });

  // Local strategy (username/password)
  passport.use(new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        // Find user by email
        const user = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase())
        });

        // User not found
        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // User is inactive
        if (!user.isActive) {
          return done(null, false, { message: 'Account is inactive' });
        }

        // Check password
        if (!user.passwordHash) {
          return done(null, false, { message: 'Invalid login method' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Update last login timestamp
        await db.update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, user.id));

        // Return user without password hash
        const { passwordHash, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword);
      } catch (error) {
        logger.error('Error in local strategy', { error, email });
        return done(error);
      }
    }
  ));

  // Google OAuth strategy
  if (config.oauth.google.clientId && config.oauth.google.clientSecret) {
    passport.use(new GoogleStrategy(
      {
        clientID: config.oauth.google.clientId,
        clientSecret: config.oauth.google.clientSecret,
        callbackURL: config.oauth.google.callbackUrl,
        scope: ['profile', 'email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          await handleOAuthLogin('google', profile, accessToken, refreshToken, done);
        } catch (error) {
          logger.error('Error in Google strategy', { error, profileId: profile.id });
          return done(error);
        }
      }
    ) as unknown as PassportStrategy);
  }

  // Microsoft OAuth strategy
  if (config.oauth.microsoft.clientId && config.oauth.microsoft.clientSecret) {
    passport.use(new MicrosoftStrategy(
      {
        clientID: config.oauth.microsoft.clientId,
        clientSecret: config.oauth.microsoft.clientSecret,
        callbackURL: config.oauth.microsoft.callbackUrl,
        scope: ['user.read']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          await handleOAuthLogin('microsoft', profile, accessToken, refreshToken, done);
        } catch (error) {
          logger.error('Error in Microsoft strategy', { error, profileId: profile.id });
          return done(error);
        }
      }
    ) as unknown as PassportStrategy);
  }

  // Slack OAuth strategy
  if (config.oauth.slack.clientId && config.oauth.slack.clientSecret) {
    passport.use(new SlackStrategy(
      {
        clientID: config.oauth.slack.clientId,
        clientSecret: config.oauth.slack.clientSecret,
        callbackURL: config.oauth.slack.callbackUrl,
        skipUserProfile: false,
        scope: ['identity.basic', 'identity.email', 'identity.avatar']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          await handleOAuthLogin('slack', profile, accessToken, refreshToken, done);
        } catch (error) {
          logger.error('Error in Slack strategy', { error, profileId: profile.id });
          return done(error);
        }
      }
    ) as unknown as PassportStrategy);
  }

  // SAML strategy for enterprise SSO
  if (config.saml.enabled && config.saml.entryPoint && config.saml.issuer) {
    passport.use(new SamlStrategy(
      {
        entryPoint: config.saml.entryPoint,
        issuer: config.saml.issuer,
        callbackUrl: config.saml.callbackUrl,
        cert: config.saml.cert,
        identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        validateInResponseTo: true,
        disableRequestedAuthnContext: true
      },
      async (profile, done) => {
        try {
          // Extract user information from SAML profile
          const email = profile.email || profile.nameID;
          const firstName = profile.firstName || profile.givenName || '';
          const lastName = profile.lastName || profile.surname || '';
          
          if (!email) {
            return done(new Error('No email found in SAML response'));
          }

          // Find user by email
          let user = await db.query.users.findFirst({
            where: eq(users.email, email.toLowerCase())
          });

          // If user doesn't exist, create a new one
          if (!user) {
            const [newUser] = await db.insert(users)
              .values({
                email: email.toLowerCase(),
                firstName,
                lastName,
                isEmailVerified: true, // Auto-verify email for SSO users
                lastLoginAt: new Date(),
                tenantId: 1, // Default tenant ID, should be determined based on domain or other attributes
                role: 'user' // Default role, can be overridden based on SAML attributes
              })
              .returning();
            
            user = newUser;
            logger.info('Created new user via SAML', { userId: user.id, email });
          } else {
            // Update user information and last login
            await db.update(users)
              .set({
                firstName: firstName || user.firstName,
                lastName: lastName || user.lastName,
                isEmailVerified: true,
                lastLoginAt: new Date()
              })
              .where(eq(users.id, user.id));
            
            logger.info('User logged in via SAML', { userId: user.id, email });
          }

          // Return user without password hash
          const { passwordHash, ...userWithoutPassword } = user;
          return done(null, userWithoutPassword);
        } catch (error) {
          logger.error('Error in SAML strategy', { error, profile });
          return done(error);
        }
      }
    ) as unknown as PassportStrategy);
  }
};

// Helper function to handle OAuth login
const handleOAuthLogin = async (
  provider: string,
  profile: any,
  accessToken: string,
  refreshToken: string,
  done: (error: any, user?: any, info?: any) => void
) => {
  try {
    // Extract profile information
    const providerId = profile.id;
    const email = profile.emails?.[0]?.value || 
                 profile.email || 
                 profile._json?.email || 
                 `${providerId}@${provider}.user`;
    
    const firstName = profile.name?.givenName || 
                     profile.given_name || 
                     profile.displayName?.split(' ')[0] || 
                     '';
    
    const lastName = profile.name?.familyName || 
                    profile.family_name || 
                    (profile.displayName?.split(' ').length > 1 
                      ? profile.displayName.split(' ').slice(1).join(' ') 
                      : '') || 
                    '';

    // Find existing OAuth profile
    const oauthProfile = await db.query.oauthProfiles.findFirst({
      where: and(
        eq(oauthProfiles.provider, provider),
        eq(oauthProfiles.providerId, providerId)
      ),
      with: {
        user: true
      }
    });

    // If OAuth profile exists, update tokens and return user
    if (oauthProfile) {
      // Update tokens
      await db.update(oauthProfiles)
        .set({
          accessToken,
          refreshToken,
          tokenExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
          profile: profile._json || profile,
          updatedAt: new Date()
        })
        .where(eq(oauthProfiles.id, oauthProfile.id));

      // Update user's last login
      await db.update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, oauthProfile.user.id));

      logger.info('User logged in via OAuth', { 
        userId: oauthProfile.user.id, 
        provider, 
        providerId 
      });

      // Return user without password hash
      const { passwordHash, ...userWithoutPassword } = oauthProfile.user;
      return done(null, userWithoutPassword);
    }

    // Find user by email
    let user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase())
    });

    // If user doesn't exist, create a new one
    if (!user) {
      const [newUser] = await db.insert(users)
        .values({
          email: email.toLowerCase(),
          firstName,
          lastName,
          isEmailVerified: true, // Auto-verify email for OAuth users
          lastLoginAt: new Date(),
          tenantId: 1, // Default tenant ID, should be determined based on domain or other attributes
          role: 'user' // Default role
        })
        .returning();
      
      user = newUser;
      logger.info('Created new user via OAuth', { userId: user.id, provider, email });
    }

    // Create OAuth profile
    await db.insert(oauthProfiles)
      .values({
        userId: user.id,
        provider,
        providerId,
        accessToken,
        refreshToken,
        tokenExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        profile: profile._json || profile
      });

    logger.info('Created OAuth profile for user', { 
      userId: user.id, 
      provider, 
      providerId 
    });

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;
    return done(null, userWithoutPassword);
  } catch (error) {
    logger.error('Error handling OAuth login', { error, provider, profileId: profile.id });
    return done(error);
  }
};