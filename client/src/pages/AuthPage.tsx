import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
  GithubIcon,
  MailIcon,
  LockIcon,
  UserIcon,
  AlertTriangleIcon,
  LoaderIcon
} from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { BsGithub, BsMicrosoft, BsSlack } from 'react-icons/bs';

// Authentication providers 
const providers = [
  {
    id: 'google',
    name: 'Google',
    icon: FcGoogle,
    color: 'hover:bg-gray-100'
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    icon: BsMicrosoft,
    color: 'hover:bg-gray-100'
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: BsSlack,
    color: 'hover:bg-gray-100'
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: BsGithub,
    color: 'hover:bg-gray-100'
  }
];

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  // Form states
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });
  
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Use the auth hook for authentication state
  const { user, isLoading: isUserLoading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation('/');
    }
  }, [user, setLocation]);

  // Get available auth providers
  const { data: providersData } = useQuery({
    queryKey: ['/auth/providers'],
    queryFn: async () => {
      try {
        const res = await fetch('/auth/providers');
        if (!res.ok) throw new Error('Failed to fetch auth providers');
        return await res.json();
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to fetch authentication providers',
          variant: 'destructive'
        });
        return { providers: { local: true } };
      }
    }
  });

  // Handle login form changes
  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle register form changes
  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegisterForm(prev => ({ ...prev, [name]: value }));
  };

  // Get mutations from useAuth
  const { loginMutation, registerMutation } = useAuth();

  // Handle login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await loginMutation.mutateAsync(loginForm);
      
      // Login successful - the hook will handle the user state update
      toast({
        title: 'Success',
        description: 'Login successful. Redirecting...',
      });
      
      // No need for setTimeout, the ProtectedRoute component will handle redirection
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      toast({
        title: 'Login failed',
        description: err instanceof Error ? err.message : 'Invalid credentials',
        variant: 'destructive'
      });
    }
  };

  // Handle registration submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // Prepare user data without confirmPassword
      const userData = {
        username: registerForm.username,
        email: registerForm.email,
        password: registerForm.password
      };
      
      // Use the registerMutation from useAuth
      await registerMutation.mutateAsync(userData);

      // Registration successful
      toast({
        title: 'Success',
        description: 'Account created successfully. You can now log in.',
      });
      
      // Move to login tab and prefill login form with registration credentials
      setActiveTab('login');
      setLoginForm({
        username: registerForm.username,
        password: registerForm.password
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      toast({
        title: 'Registration failed',
        description: err instanceof Error ? err.message : 'Unable to create account',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // OAuth login handler
  const handleOAuthLogin = (providerId: string) => {
    window.location.href = `/auth/${providerId}`;
  };

  // Loading state
  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoaderIcon className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Side - Auth Forms */}
      <div className="flex flex-1 flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-10">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Welcome to CPI Hub
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your central intelligence platform for project management
            </p>
          </div>

          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Sign in to your account</CardTitle>
                  <CardDescription>
                    Enter your credentials to access your dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {error && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTriangleIcon className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="username"
                          name="username"
                          type="text"
                          required
                          className="pl-10"
                          placeholder="your_username"
                          value={loginForm.username}
                          onChange={handleLoginChange}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="password">Password</Label>
                        <Link href="/reset-password" className="text-xs text-primary hover:underline">
                          Forgot password?
                        </Link>
                      </div>
                      <div className="relative">
                        <LockIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          required
                          className="pl-10"
                          placeholder="••••••••"
                          value={loginForm.password}
                          onChange={handleLoginChange}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? <LoaderIcon className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Sign in
                    </Button>
                  </form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <div className="relative flex items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="mx-4 flex-shrink text-xs text-gray-400">OR CONTINUE WITH</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {providers.map(provider => {
                      const Icon = provider.icon;
                      return (
                        <Button
                          key={provider.id}
                          variant="outline"
                          className="flex items-center justify-center gap-2"
                          onClick={() => handleOAuthLogin(provider.id)}
                          disabled={!providersData?.providers?.[provider.id]}
                        >
                          <Icon className="h-4 w-4" />
                          {provider.name}
                        </Button>
                      );
                    })}
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>
                    Fill in your details to get started with CPI Hub
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {error && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTriangleIcon className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-username">Username</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="register-username"
                          name="username"
                          type="text"
                          required
                          className="pl-10"
                          placeholder="Choose a username"
                          value={registerForm.username}
                          onChange={handleRegisterChange}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <div className="relative">
                        <MailIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="register-email"
                          name="email"
                          type="email"
                          required
                          className="pl-10"
                          placeholder="your.email@example.com"
                          value={registerForm.email}
                          onChange={handleRegisterChange}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <div className="relative">
                        <LockIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="register-password"
                          name="password"
                          type="password"
                          required
                          className="pl-10"
                          placeholder="Create a strong password"
                          value={registerForm.password}
                          onChange={handleRegisterChange}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <LockIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="register-confirm-password"
                          name="confirmPassword"
                          type="password"
                          required
                          className="pl-10"
                          placeholder="Confirm your password"
                          value={registerForm.confirmPassword}
                          onChange={handleRegisterChange}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? <LoaderIcon className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Create Account
                    </Button>
                  </form>
                </CardContent>
                <CardFooter className="flex flex-col">
                  <p className="text-xs text-gray-500 text-center">
                    By signing up, you agree to our{' '}
                    <Link href="/terms" className="text-primary hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right Side - Hero Section */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-blue-600 to-indigo-700">
          <div className="flex h-full flex-col items-center justify-center p-12 text-white">
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight">
              Contextual Project Intelligence Hub
            </h1>
            <p className="mb-8 text-xl max-w-2xl text-center">
              Transform your project data into actionable intelligence with AI-driven insights, 
              comprehensive analytics, and unified project information.
            </p>

            <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto w-full">
              <div className="rounded-lg bg-white/10 p-6 backdrop-blur-md">
                <h3 className="mb-2 text-lg font-medium">Advanced Analytics</h3>
                <p className="text-sm text-white/80">
                  Gain deeper project insights through intelligent data analysis and visualization.
                </p>
              </div>

              <div className="rounded-lg bg-white/10 p-6 backdrop-blur-md">
                <h3 className="mb-2 text-lg font-medium">AI-Powered Insights</h3>
                <p className="text-sm text-white/80">
                  Leverage natural language processing to extract valuable information from all your project assets.
                </p>
              </div>

              <div className="rounded-lg bg-white/10 p-6 backdrop-blur-md">
                <h3 className="mb-2 text-lg font-medium">Central Repository</h3>
                <p className="text-sm text-white/80">
                  Keep all project documentation, communications, and data in one searchable location.
                </p>
              </div>

              <div className="rounded-lg bg-white/10 p-6 backdrop-blur-md">
                <h3 className="mb-2 text-lg font-medium">Seamless Integration</h3>
                <p className="text-sm text-white/80">
                  Connect with your favorite tools to create a unified project intelligence ecosystem.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}