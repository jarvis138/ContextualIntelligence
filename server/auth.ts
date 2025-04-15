import { Request, Response, NextFunction, Express } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import passport from 'passport';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import connectPg from 'connect-pg-simple';
import { Strategy as LocalStrategy } from 'passport-local';
import { User, InsertUser } from '@shared/schema';
import { storage } from './storage';
import { configureOAuthStrategies } from './services/oauth';
import { pool } from './db';
import { refreshAccessToken } from './services/tokenService';
import { randomBytes } from 'crypto';

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-development-only';
const JWT_EXPIRES_IN = '24h';
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-session-secret-for-development-only';

// User interfaces
export interface AuthUser {
  id: number;
  username: string;
  role: string;
  authMethod?: string;
}

// JWT token generation
export const generateToken = (user: AuthUser, type: 'access' | 'refresh' = 'access'): string => {
  const expiresIn = type === 'access' ? JWT_EXPIRES_IN : '7d'; // Access token: 24h, Refresh token: 7 days
  
  return jwt.sign(
    { 
      id: user.id,
      username: user.username,
      role: user.role,
      type // Include token type in payload
    }, 
    JWT_SECRET, 
    { expiresIn }
  );
};

// Password hashing
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Password comparison
export const comparePasswords = async (password: string, hashedPassword: string | null): Promise<boolean> => {
  if (!hashedPassword) return false;
  return bcrypt.compare(password, hashedPassword);
};

// Authentication middleware
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  // Get token from authorization header or cookie
  const authHeader = req.headers['authorization'];
  const tokenFromHeader = authHeader && authHeader.split(' ')[1];
  const tokenFromCookie = req.cookies?.token;
  const token = tokenFromHeader || tokenFromCookie;
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    
    // Attach the user to the request object
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Role-based authorization middleware
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
    next();
  };
};

// Authentication service
export const authService = {
  // User registration
  async register(userData: InsertUser): Promise<{ user: User; token: string }> {
    // Check if user already exists
    const existingUser = await storage.getUserByUsername(userData.username);
    if (existingUser) {
      throw new Error('Username already exists');
    }
    
    // Hash the password
    const hashedPassword = await hashPassword(userData.password);
    
    // Create the user with hashed password
    const user = await storage.createUser({
      ...userData,
      password: hashedPassword,
    });
    
    // Generate JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });
    
    return { user, token };
  },
  
  // User login
  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    // Find user by username
    const user = await storage.getUserByUsername(username);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    // Verify password
    const isPasswordValid = await comparePasswords(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }
    
    // Generate JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });
    
    return { user, token };
  }
};

// Extend Express Request interface to include user
declare global {
  namespace Express {
    // Extend the User interface for Passport
    interface User {
      id: number;
      username: string;
      role: string;
      authMethod?: string;
      [key: string]: any;
    }
    // Extend the Request interface
    interface Request {
      user?: Express.User | AuthUser;
    }
  }
}

/**
 * Setup authentication middleware and routes
 * @param app Express application
 */
export function setupAuth(app: Express) {
  // Setup session management with PostgreSQL store
  const PostgresSessionStore = connectPg(session);
  const sessionStore = new PostgresSessionStore({
    pool,
    tableName: 'user_sessions', // This will be created automatically
    createTableIfMissing: true
  });

  // Configure middleware
  app.use(cookieParser());
  app.use(session({
    store: sessionStore,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport serialization/deserialization
  passport.serializeUser((user: Express.User, done) => {
    const typedUser = user as User;
    done(null, typedUser.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Configure OAuth Strategies
  configureOAuthStrategies(passport);

  // Local Strategy
  passport.use(new LocalStrategy(
    {
      usernameField: 'username',
      passwordField: 'password'
    }, 
    async (username: string, password: string, done: any) => {
      try {
        // Find user by username
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: 'Invalid credentials' });
        }
        
        // Verify password
        const isPasswordValid = await comparePasswords(password, user.password || '');
        if (!isPasswordValid) {
          return done(null, false, { message: 'Invalid credentials' });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  // Setup authentication routes
  setupAuthRoutes(app);
}

/**
 * Setup authentication routes
 * @param app Express application
 */
function setupAuthRoutes(app: Express) {
  // Local authentication routes
  app.post('/auth/login', passport.authenticate('local'), (req, res) => {
    const user = req.user as User;
    const authUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      authMethod: user.authMethod
    };
    
    // Generate access token
    const accessToken = generateToken(authUser);
    
    // Generate refresh token
    const refreshToken = generateToken(authUser, 'refresh');
    
    // Store refresh token in database
    const tokenId = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    storage.storeRefreshToken(user.id, tokenId, refreshToken, expiresAt);
    
    // Set token as cookie
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 1000 // 1 hour
    });
    
    // Return both tokens to client
    res.json({ user, token: accessToken, refreshToken });
  });
  
  app.post('/auth/register', async (req, res) => {
    try {
      const result = await authService.register(req.body);
      
      // Log in the new user
      req.login(result.user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Error logging in after registration', error: err.message });
        }
        
        res.cookie('token', result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        
        res.status(201).json(result);
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.get('/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Error logging out', error: err.message });
      }
      
      res.clearCookie('token');
      res.json({ message: 'Logged out successfully' });
    });
  });
  
  // Get current user endpoint
  app.get('/auth/me', (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    res.json(req.user);
  });
  
  // Google OAuth routes
  app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
  }));
  
  app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }), 
    (req, res) => {
      const user = req.user as User;
      const token = generateToken({
        id: user.id,
        username: user.username,
        role: user.role,
        authMethod: user.authMethod
      });
      
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      res.redirect('/');
    }
  );
  
  // Microsoft OAuth routes
  app.get('/auth/microsoft', passport.authenticate('microsoft'));
  
  app.get('/auth/microsoft/callback', 
    passport.authenticate('microsoft', { failureRedirect: '/login' }), 
    (req, res) => {
      const user = req.user as User;
      const token = generateToken({
        id: user.id,
        username: user.username,
        role: user.role,
        authMethod: user.authMethod
      });
      
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      res.redirect('/');
    }
  );
  
  // Slack OAuth routes
  app.get('/auth/slack', passport.authenticate('slack'));
  
  app.get('/auth/slack/callback', 
    passport.authenticate('slack', { failureRedirect: '/login' }), 
    (req, res) => {
      const user = req.user as User;
      const token = generateToken({
        id: user.id,
        username: user.username,
        role: user.role,
        authMethod: user.authMethod
      });
      
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      res.redirect('/');
    }
  );
  
  // User profile route
  app.get('/auth/profile', authenticateToken, (req, res) => {
    res.json({ user: req.user });
  });
  
  // Token refresh endpoint
  app.post('/auth/refresh-token', async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
      }
      
      // Use the token service to refresh the token
      const { accessToken, user } = await refreshAccessToken(refreshToken);
      
      // Set the new access token as a cookie
      res.cookie('token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 1000 // 1 hour
      });
      
      res.json({ accessToken, user });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
  });
  
  // Available OAuth providers route
  app.get('/auth/providers', (req, res) => {
    const providers = {
      google: !!process.env.GOOGLE_CLIENT_ID,
      microsoft: !!process.env.MICROSOFT_CLIENT_ID,
      slack: !!process.env.SLACK_CLIENT_ID,
      local: true
    };
    
    res.json({ providers });
  });
}