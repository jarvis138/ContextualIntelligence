import { useEffect, useState } from 'react';
import { useLocation, useRoute, Link } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

/**
 * Component to handle OAuth callback and code exchange
 */
export function OAuthCallback() {
  const [, params] = useRoute('/auth/:provider/callback');
  const providerId = params?.provider;
  
  const [location, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const { toast } = useToast();
  const { loginMutation } = useAuth();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Get URL query parameters
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      // Handle OAuth errors returned in the URL
      if (error) {
        setStatus('error');
        setErrorMessage(
          errorDescription || 
          `Authentication failed: ${error}`
        );
        return;
      }

      // Validate required parameters
      if (!code || !state) {
        setStatus('error');
        setErrorMessage('Missing required OAuth parameters (code or state)');
        return;
      }

      try {
        // Exchange the authorization code for tokens
        const response = await apiRequest('POST', `/api/auth/${providerId}/callback`, {
          code,
          state
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to exchange authorization code for tokens');
        }

        const result = await response.json();

        // Handle successful authentication
        setStatus('success');
        
        // Use login mutation to update auth state if the user was authenticated
        if (result.user) {
          await loginMutation.mutateAsync(result.user);
        }
        
        toast({
          title: 'Authentication Successful',
          description: `Successfully authenticated with ${providerId}`,
        });

        // Redirect after a short delay to show success message
        setTimeout(() => {
          setLocation('/');
        }, 2000);
      } catch (error) {
        console.error('OAuth callback error:', error);
        
        setStatus('error');
        setErrorMessage(
          error instanceof Error 
            ? error.message 
            : 'Failed to complete authentication'
        );
        
        toast({
          variant: 'destructive',
          title: 'Authentication Failed',
          description: error instanceof Error ? error.message : 'An unknown error occurred',
        });
      }
    };

    handleOAuthCallback();
  }, [providerId, setLocation, toast, loginMutation]);

  // Format provider name for display
  const formatProviderName = (provider: string) => {
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">
            {status === 'loading' && 'Completing Authentication...'}
            {status === 'success' && 'Authentication Successful'}
            {status === 'error' && 'Authentication Failed'}
          </CardTitle>
          <CardDescription>
            {providerId && `${formatProviderName(providerId)} OAuth Authentication`}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-center text-gray-600">
                Completing the authentication process with {providerId}...
              </p>
            </div>
          )}
          
          {status === 'success' && (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <AlertTitle className="text-green-800">Authentication Successful</AlertTitle>
              <AlertDescription className="text-green-700">
                You have successfully authenticated with {providerId}.
                Redirecting to dashboard...
              </AlertDescription>
            </Alert>
          )}
          
          {status === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>Authentication Error</AlertTitle>
              <AlertDescription>
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center">
          {status === 'error' && (
            <div className="flex flex-col space-y-3 w-full">
              <Button asChild variant="default">
                <Link href="/auth">
                  Try Again
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Return to Home
                </Link>
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}