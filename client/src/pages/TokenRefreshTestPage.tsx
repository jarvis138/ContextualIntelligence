import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function TokenRefreshTestPage() {
  const { user, refreshToken, loginMutation } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(null);
  
  // Store refresh token when logging in for testing purposes
  useEffect(() => {
    if (loginMutation.data?.refreshToken) {
      setRefreshTokenValue(loginMutation.data.refreshToken);
    }
  }, [loginMutation.data]);

  const handleTestRefresh = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    
    try {
      if (!refreshTokenValue) {
        throw new Error("No refresh token available. Please login first to get a refresh token.");
      }
      // Use the actual refresh token from the login response
      const response = await refreshToken(refreshTokenValue);
      setResult(JSON.stringify(response, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Token Refresh Test</CardTitle>
          <CardDescription>
            Test the token refresh mechanism. Note that this uses a mock refresh token for demonstration purposes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-md">
              <h3 className="font-medium mb-2">Current User:</h3>
              <pre className="text-sm overflow-auto p-2 bg-background rounded">
                {user ? JSON.stringify(user, null, 2) : 'Not logged in'}
              </pre>
            </div>
            
            {result && (
              <div className="p-4 bg-muted/50 rounded-md">
                <h3 className="font-medium mb-2">Refresh Result:</h3>
                <pre className="text-sm overflow-auto p-2 bg-background rounded text-green-600">
                  {result}
                </pre>
              </div>
            )}
            
            {error && (
              <div className="p-4 bg-destructive/10 rounded-md">
                <h3 className="font-medium mb-2 text-destructive">Error:</h3>
                <pre className="text-sm overflow-auto p-2 bg-background rounded text-destructive">
                  {error}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleTestRefresh} 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Refresh Token'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}