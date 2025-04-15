import { useState } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

// Create a type that omits the onError prop from ButtonProps to avoid conflicts
type ButtonPropsWithoutOnError = Omit<ButtonProps, 'onError'>;

interface OAuthButtonProps extends ButtonPropsWithoutOnError {
  providerId: string;
  providerName: string;
  icon?: React.ReactNode;
  onSuccess?: (authUrl: string) => void;
  onError?: (error: string) => void;
}

/**
 * Button component that initiates OAuth flow with PKCE for a specific provider
 */
export function OAuthButton({
  providerId,
  providerName,
  icon,
  onSuccess,
  onError,
  children,
  ...props
}: OAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Handle OAuth initiation
  const handleClick = async () => {
    setIsLoading(true);

    try {
      // Request authorization URL from backend
      const response = await apiRequest('GET', `/api/auth/${providerId}/authorize`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to initiate ${providerName} OAuth flow`);
      }

      const { authorizationUrl } = await response.json();
      
      // Call success callback or redirect to authorization URL
      if (onSuccess) {
        onSuccess(authorizationUrl);
      } else {
        // Redirect to the authorization URL
        window.location.href = authorizationUrl;
      }
    } catch (error) {
      console.error(`OAuth error with ${providerName}:`, error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : `Failed to connect to ${providerName}`;
      
      toast({
        variant: 'destructive',
        title: `${providerName} Connection Error`,
        description: errorMessage,
      });
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={isLoading} {...props}>
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        icon && <span className="mr-2">{icon}</span>
      )}
      {children || `Connect with ${providerName}`}
    </Button>
  );
}