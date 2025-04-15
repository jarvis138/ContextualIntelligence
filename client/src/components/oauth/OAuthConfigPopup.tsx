import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';

interface OAuthProviderProps {
  id: string;
  name: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
}

interface OAuthConfigPopupProps {
  isOpen: boolean;
  provider: OAuthProviderProps;
  onClose: () => void;
  onSave: (provider: OAuthProviderProps) => void;
}

export function OAuthConfigPopup({ isOpen, provider, onClose, onSave }: OAuthConfigPopupProps) {
  const [config, setConfig] = useState<OAuthProviderProps>(provider);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate client ID and secret are not empty
      if (!config.clientId.trim()) {
        throw new Error(`${provider.name} Client ID is required`);
      }

      if (!config.clientSecret.trim()) {
        throw new Error(`${provider.name} Client Secret is required`);
      }

      // Call the onSave function passed from parent
      await onSave(config);
      
      toast({
        title: 'Configuration saved',
        description: `${provider.name} OAuth configuration has been updated successfully.`,
      });
      
      onClose();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to save configuration',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure {provider.name} OAuth</DialogTitle>
          <DialogDescription>
            Enter your {provider.name} OAuth credentials to enable authentication and integration.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="clientId">Client ID</Label>
            <Input
              id="clientId"
              name="clientId"
              value={config.clientId}
              onChange={handleChange}
              placeholder={`Enter ${provider.name} Client ID`}
              required
            />
            <p className="text-xs text-muted-foreground">
              The client ID from your {provider.name} developer console
            </p>
          </div>
          
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="clientSecret">Client Secret</Label>
            <Input
              id="clientSecret"
              name="clientSecret"
              type="password"
              value={config.clientSecret}
              onChange={handleChange}
              placeholder={`Enter ${provider.name} Client Secret`}
              required
            />
            <p className="text-xs text-muted-foreground">
              The client secret from your {provider.name} developer console
            </p>
          </div>
          
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="scope">Scopes (Optional)</Label>
            <Input
              id="scope"
              name="scope"
              value={config.scope}
              onChange={handleChange}
              placeholder="e.g., profile email"
            />
            <p className="text-xs text-muted-foreground">
              Space-separated list of permission scopes
            </p>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-md flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">Redirect URI</h4>
              <p className="text-xs text-blue-700 mt-1">
                Set your OAuth redirect URI to: <code className="bg-blue-100 px-1 py-0.5 rounded">{window.location.origin}/auth/{provider.id}/callback</code>
              </p>
            </div>
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Configuration'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}