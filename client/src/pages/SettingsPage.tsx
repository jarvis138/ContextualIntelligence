import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import MainLayout from '@/components/layout/MainLayout';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface OAuthProvider {
  id: string;
  name: string;
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  scope?: string;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch saved providers
  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['/api/settings/oauth-providers'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/settings/oauth-providers');
        return await res.json();
      } catch (error) {
        // If there's an error or no saved providers, return default providers
        return getDefaultProviders();
      }
    }
  });
  
  // Form state
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>(
    providers.length > 0 ? providers : getDefaultProviders()
  );
  
  // Update providers when fetched data changes
  useState(() => {
    if (providers.length > 0) {
      setOauthProviders(providers);
    }
  });
  
  // Save OAuth provider settings
  const saveProvidersMutation = useMutation({
    mutationFn: async (providers: OAuthProvider[]) => {
      const res = await apiRequest('POST', '/api/settings/oauth-providers', providers);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "OAuth provider settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/oauth-providers'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving settings",
        description: error.message || "There was an error saving your settings.",
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission
  const handleSaveSettings = () => {
    saveProvidersMutation.mutate(oauthProviders);
  };
  
  // Update provider settings
  const updateProvider = (id: string, data: Partial<OAuthProvider>) => {
    setOauthProviders(prev => 
      prev.map(provider => 
        provider.id === id ? { ...provider, ...data } : provider
      )
    );
  };
  
  // Get default OAuth providers
  function getDefaultProviders(): OAuthProvider[] {
    return [
      {
        id: 'google',
        name: 'Google',
        enabled: false,
        clientId: '',
        clientSecret: '',
        scope: 'profile email'
      },
      {
        id: 'microsoft',
        name: 'Microsoft',
        enabled: false,
        clientId: '',
        clientSecret: '',
        scope: 'user.read mail.read files.read'
      },
      {
        id: 'slack',
        name: 'Slack',
        enabled: false,
        clientId: '',
        clientSecret: '',
        scope: 'channels:read channels:history users:read files:read'
      }
    ];
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Settings</h1>
          <Button 
            onClick={handleSaveSettings} 
            disabled={isLoading || saveProvidersMutation.isPending}
          >
            {saveProvidersMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
        
        <Tabs defaultValue="oauth">
          <TabsList className="mb-6">
            <TabsTrigger value="oauth">OAuth Providers</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          
          <TabsContent value="oauth" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>OAuth Settings</CardTitle>
                <CardDescription>
                  Configure the OAuth providers to enable users to log in using their accounts from these services.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {oauthProviders.map(provider => (
                  <div key={provider.id} className="border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <Switch 
                          id={`enable-${provider.id}`}
                          checked={provider.enabled}
                          onCheckedChange={(checked) => updateProvider(provider.id, { enabled: checked })}
                        />
                        <Label htmlFor={`enable-${provider.id}`} className="text-lg font-medium">
                          {provider.name}
                        </Label>
                      </div>
                      
                      <div>
                        {provider.enabled && (
                          <a 
                            href={`/auth/${provider.id}`} 
                            className="text-sm text-blue-600 hover:text-blue-800"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Test Connection
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor={`${provider.id}-client-id`}>Client ID</Label>
                        <Input 
                          id={`${provider.id}-client-id`}
                          value={provider.clientId}
                          onChange={(e) => updateProvider(provider.id, { clientId: e.target.value })}
                          placeholder={`Enter ${provider.name} Client ID`}
                          disabled={!provider.enabled}
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor={`${provider.id}-client-secret`}>Client Secret</Label>
                        <Input 
                          id={`${provider.id}-client-secret`}
                          type="password"
                          value={provider.clientSecret}
                          onChange={(e) => updateProvider(provider.id, { clientSecret: e.target.value })}
                          placeholder={`Enter ${provider.name} Client Secret`}
                          disabled={!provider.enabled}
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor={`${provider.id}-scope`}>Scope</Label>
                        <Input 
                          id={`${provider.id}-scope`}
                          value={provider.scope}
                          onChange={(e) => updateProvider(provider.id, { scope: e.target.value })}
                          placeholder="Scopes (space separated)"
                          disabled={!provider.enabled}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Callback URLs</CardTitle>
                <CardDescription>
                  Use these callback URLs when configuring your OAuth applications in the provider dashboards.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Google Callback URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={`${window.location.origin}/auth/google/callback`}
                      readOnly
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/auth/google/callback`);
                        toast({ title: "Copied to clipboard" });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label>Microsoft Callback URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={`${window.location.origin}/auth/microsoft/callback`}
                      readOnly
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/auth/microsoft/callback`);
                        toast({ title: "Copied to clipboard" });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label>Slack Callback URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={`${window.location.origin}/auth/slack/callback`}
                      readOnly
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/auth/slack/callback`);
                        toast({ title: "Copied to clipboard" });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure general application settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">General settings will be implemented in future updates.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure notification preferences.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Notification settings will be implemented in future updates.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Configure security settings for your account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Security settings will be implemented in future updates.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}