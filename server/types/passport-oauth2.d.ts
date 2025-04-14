declare module 'passport-google-oauth20' {
  import { Request } from 'express';
  import OAuth2Strategy from 'passport-oauth2';
  
  interface Profile extends Express.User {
    id: string;
    displayName: string;
    name?: {
      familyName: string;
      givenName: string;
    };
    emails?: Array<{ value: string; verified?: boolean }>;
    photos?: Array<{ value: string }>;
    provider: string;
    _json: any;
    _raw: string;
  }
  
  interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string | string[];
    userProfileURL?: string;
    passReqToCallback?: boolean;
  }
  
  type VerifyCallback = (
    accessToken: string, 
    refreshToken: string, 
    profile: Profile, 
    done: (error: any, user?: any, info?: any) => void
  ) => void;
  
  type VerifyFunctionWithRequest = (
    req: Request, 
    accessToken: string, 
    refreshToken: string, 
    profile: Profile, 
    done: (error: any, user?: any, info?: any) => void
  ) => void;
  
  class Strategy extends OAuth2Strategy {
    constructor(
      options: StrategyOptions,
      verify: VerifyCallback | VerifyFunctionWithRequest
    );
    name: string;
  }
}

declare module 'passport-microsoft' {
  import { Request } from 'express';
  import OAuth2Strategy from 'passport-oauth2';
  
  interface Profile extends Express.User {
    id: string;
    displayName: string;
    emails?: Array<{ value: string }>;
    photos?: Array<{ value: string }>;
    provider: string;
    _json: any;
    _raw: string;
  }
  
  interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string | string[];
    tenant?: string;
    authorizationURL?: string;
    tokenURL?: string;
    passReqToCallback?: boolean;
  }
  
  type VerifyCallback = (
    accessToken: string, 
    refreshToken: string, 
    profile: Profile, 
    done: (error: any, user?: any, info?: any) => void
  ) => void;
  
  type VerifyFunctionWithRequest = (
    req: Request, 
    accessToken: string, 
    refreshToken: string, 
    profile: Profile, 
    done: (error: any, user?: any, info?: any) => void
  ) => void;
  
  class Strategy extends OAuth2Strategy {
    constructor(
      options: StrategyOptions,
      verify: VerifyCallback | VerifyFunctionWithRequest
    );
    name: string;
  }
}

declare module 'passport-slack-oauth2' {
  import { Request } from 'express';
  import OAuth2Strategy from 'passport-oauth2';
  
  interface Profile extends Express.User {
    id: string;
    displayName?: string;
    user: {
      id: string;
      name?: string;
      real_name?: string;
      email?: string;
      image_192?: string;
    };
    team: {
      id: string;
      name: string;
    };
    provider: string;
    _json: any;
    _raw: string;
  }
  
  interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string | string[];
    skipUserProfile?: boolean;
    passReqToCallback?: boolean;
  }
  
  type VerifyCallback = (
    accessToken: string, 
    refreshToken: string, 
    profile: Profile, 
    done: (error: any, user?: any, info?: any) => void
  ) => void;
  
  type VerifyFunctionWithRequest = (
    req: Request, 
    accessToken: string, 
    refreshToken: string, 
    profile: Profile, 
    done: (error: any, user?: any, info?: any) => void
  ) => void;
  
  class Strategy extends OAuth2Strategy {
    constructor(
      options: StrategyOptions,
      verify: VerifyCallback | VerifyFunctionWithRequest
    );
    name: string;
  }
}