/**
 * Fetcher Configuration Panel
 * 
 * Admin panel for configuring data fetchers and fetch intervals
 */

import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Download, 
  Edit, 
  Pause, 
  Play, 
  Plus, 
  RefreshCw, 
  Settings, 
  Trash2 
} from 'lucide-react';

// Fetcher types (must match server enums)
enum FetchPriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
  IDLE = 4
}

enum FetcherType {
  GOOGLE_DRIVE = 'googledrive',
  EMAIL = 'email'
}

enum EmailProvider {
  GMAIL = 'gmail',
  OUTLOOK = 'outlook'
}

// Interval presets in minutes
const INTERVAL_PRESETS = [
  { label: "1 minute", value: 1 },
  { label: "5 minutes", value: 5 },
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
  { label: "4 hours", value: 240 },
  { label: "8 hours", value: 480 },
  { label: "12 hours", value: 720 },
  { label: "1 day", value: 1440 }
];

// Priority labels for UI
const PRIORITY_LABELS = {
  [FetchPriority.CRITICAL]: { label: "Critical", color: "bg-red-500 text-white" },
  [FetchPriority.HIGH]: { label: "High", color: "bg-orange-500 text-white" },
  [FetchPriority.NORMAL]: { label: "Normal", color: "bg-blue-500 text-white" },
  [FetchPriority.LOW]: { label: "Low", color: "bg-gray-500 text-white" },
  [FetchPriority.IDLE]: { label: "Idle", color: "bg-gray-300 text-gray-800" }
};

// Fetcher configuration interface
interface FetcherConfig {
  id: string;
  userId: number;
  integrationId: number;
  type: FetcherType;
  priority: FetchPriority;
  intervalMinutes: number;
  enabled: boolean;
  lastFetchedAt?: string;
  nextFetchAt?: string;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  // Type-specific configuration
  provider?: EmailProvider;
  folderName?: string;
  query?: string;
  includeBody?: boolean;
  includeAttachments?: boolean;
  folderId?: string; // For Google Drive
  includeTrash?: boolean; // For Google Drive
  includeShared?: boolean; // For Google Drive
}

// Global settings interface
interface FetcherManagerSettings {
  maxConcurrentFetches: number;
  defaultRetryCount: number;
  globalEnabled: boolean;
}

// Stats interface
interface FetcherStats {
  totalFetchers: number;
  enabledFetchers: number;
  activeFetches: number;
  maxConcurrentFetches: number;
  byPriority: {
    [priority: number]: number;
  };
  byType: {
    [type: string]: number;
  };
}

/**
 * Main fetcher configuration panel component
 */
export default function FetcherConfigPanel() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("fetchers");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [currentFetcher, setCurrentFetcher] = useState<FetcherConfig | null>(null);
  const [newFetcher, setNewFetcher] = useState<Partial<FetcherConfig>>({
    type: FetcherType.GOOGLE_DRIVE,
    priority: FetchPriority.NORMAL,
    intervalMinutes: 60,
    enabled: true,
    retryCount: 0,
    maxRetries: 3
  });
  
  // Fetch the list of fetchers
  const { data: fetchers, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/admin/fetchers'],
    queryFn: ({ signal }) => 
      fetch('/api/admin/fetchers', { signal })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch fetchers');
          return res.json();
        })
  });
  
  // Fetch global manager settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['/api/admin/fetchers/settings'],
    queryFn: ({ signal }) =>
      fetch('/api/admin/fetchers/settings', { signal })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch fetcher settings');
          return res.json();
        })
  });
  
  // Fetch stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/admin/fetchers/stats'],
    queryFn: ({ signal }) =>
      fetch('/api/admin/fetchers/stats', { signal })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch fetcher stats');
          return res.json();
        }),
    refetchInterval: 30000 // Refresh every 30 seconds
  });
  
  // Create a new fetcher
  const createFetcherMutation = useMutation({
    mutationFn: async (fetcher: Partial<FetcherConfig>) => {
      const res = await fetch('/api/admin/fetchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fetcher)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create fetcher');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Fetcher created",
        description: "The new fetcher has been created successfully",
      });
      setCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/fetchers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/fetchers/stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create fetcher",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Update an existing fetcher
  const updateFetcherMutation = useMutation({
    mutationFn: async (fetcher: FetcherConfig) => {
      const res = await fetch(`/api/admin/fetchers/${fetcher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fetcher)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update fetcher');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Fetcher updated",
        description: "The fetcher has been updated successfully",
      });
      setEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/fetchers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/fetchers/stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update fetcher",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Delete a fetcher
  const deleteFetcherMutation = useMutation({
    mutationFn: async (fetcherId: string) => {
      const res = await fetch(`/api/admin/fetchers/${fetcherId}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete fetcher');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Fetcher deleted",
        description: "The fetcher has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/fetchers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/fetchers/stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete fetcher",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Update global settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: FetcherManagerSettings) => {
      const res = await fetch('/api/admin/fetchers/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update settings');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Global fetcher settings have been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/fetchers/settings'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Run a fetcher manually
  const runFetcherMutation = useMutation({
    mutationFn: async (fetcherId: string) => {
      const res = await fetch(`/api/admin/fetchers/${fetcherId}/run`, {
        method: 'POST'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to run fetcher');
      }
      
      return res.json();
    },
    onSuccess: (_, fetcherId) => {
      toast({
        title: "Fetcher started",
        description: `Fetcher ${fetcherId} has been started manually`,
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/fetchers'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/fetchers/stats'] });
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to run fetcher",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Toggle fetcher enabled state
  const toggleFetcherMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string, enabled: boolean }) => {
      const res = await fetch(`/api/admin/fetchers/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to toggle fetcher');
      }
      
      return res.json();
    },
    onSuccess: (_, { enabled }) => {
      toast({
        title: enabled ? "Fetcher enabled" : "Fetcher disabled",
        description: enabled 
          ? "The fetcher has been enabled and will run according to schedule" 
          : "The fetcher has been disabled and will not run until re-enabled",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/fetchers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/fetchers/stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to toggle fetcher",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Format a date as a relative time (e.g., "5 minutes ago")
  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return "Never";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} minutes ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} hours ago`;
    return `${Math.floor(diffSeconds / 86400)} days ago`;
  };
  
  // Format a date as a relative future time (e.g., "in 5 minutes")
  const formatRelativeFutureTime = (dateString?: string) => {
    if (!dateString) return "Not scheduled";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);
    
    if (diffSeconds < 0) return "Overdue";
    if (diffSeconds < 60) return `in ${diffSeconds} seconds`;
    if (diffSeconds < 3600) return `in ${Math.floor(diffSeconds / 60)} minutes`;
    if (diffSeconds < 86400) return `in ${Math.floor(diffSeconds / 3600)} hours`;
    return `in ${Math.floor(diffSeconds / 86400)} days`;
  };
  
  // Handle opening the edit modal
  const handleEditFetcher = (fetcher: FetcherConfig) => {
    setCurrentFetcher({ ...fetcher });
    setEditModalOpen(true);
  };
  
  // Handle opening the create modal
  const handleCreateFetcher = () => {
    setNewFetcher({
      type: FetcherType.GOOGLE_DRIVE,
      priority: FetchPriority.NORMAL,
      intervalMinutes: 60,
      enabled: true,
      retryCount: 0,
      maxRetries: 3
    });
    setCreateModalOpen(true);
  };
  
  // Handle deleting a fetcher
  const handleDeleteFetcher = (fetcherId: string) => {
    if (confirm("Are you sure you want to delete this fetcher? This action cannot be undone.")) {
      deleteFetcherMutation.mutate(fetcherId);
    }
  };
  
  // Handle updating global settings
  const handleUpdateSettings = (updatedSettings: Partial<FetcherManagerSettings>) => {
    if (!settings) return;
    
    updateSettingsMutation.mutate({
      ...settings,
      ...updatedSettings
    });
  };
  
  // Render the fetchers tab content
  const renderFetchersTab = () => {
    if (isLoading) {
      return <div className="py-8 text-center">Loading fetchers...</div>;
    }
    
    if (error) {
      return (
        <div className="py-8 text-center text-red-500">
          <AlertCircle className="mx-auto h-8 w-8 mb-2" />
          Error loading fetchers: {(error as Error).message}
        </div>
      );
    }
    
    if (!fetchers || fetchers.length === 0) {
      return (
        <div className="py-8 text-center text-gray-500">
          <p className="mb-4">No fetchers configured yet.</p>
          <Button onClick={handleCreateFetcher}>
            <Plus className="mr-2 h-4 w-4" />
            Create Fetcher
          </Button>
        </div>
      );
    }
    
    return (
      <>
        <div className="flex justify-between mb-4">
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleCreateFetcher}>
            <Plus className="mr-2 h-4 w-4" />
            Create Fetcher
          </Button>
        </div>
        
        <Table>
          <TableCaption>List of configured data fetchers</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Interval</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead>Next Run</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fetchers.map((fetcher: FetcherConfig) => (
              <TableRow key={fetcher.id}>
                <TableCell className="font-medium">
                  {fetcher.type === FetcherType.GOOGLE_DRIVE ? (
                    <span>Google Drive</span>
                  ) : (
                    <span>{fetcher.provider === EmailProvider.GMAIL ? 'Gmail' : 'Outlook'}</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={PRIORITY_LABELS[fetcher.priority].color}>
                    {PRIORITY_LABELS[fetcher.priority].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {fetcher.intervalMinutes < 60 ? 
                    `${fetcher.intervalMinutes} min` : 
                    `${fetcher.intervalMinutes / 60} hr`}
                </TableCell>
                <TableCell>
                  {fetcher.enabled ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                      <Pause className="mr-1 h-3 w-3" />
                      Disabled
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {fetcher.lastFetchedAt ? (
                    <span title={new Date(fetcher.lastFetchedAt).toLocaleString()}>
                      {formatRelativeTime(fetcher.lastFetchedAt)}
                    </span>
                  ) : (
                    <span className="text-gray-500">Never</span>
                  )}
                </TableCell>
                <TableCell>
                  {fetcher.nextFetchAt ? (
                    <span title={new Date(fetcher.nextFetchAt).toLocaleString()}>
                      {formatRelativeFutureTime(fetcher.nextFetchAt)}
                    </span>
                  ) : (
                    <span className="text-gray-500">Not scheduled</span>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    title="Run now"
                    onClick={() => runFetcherMutation.mutate(fetcher.id)}
                    disabled={runFetcherMutation.isPending}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    title={fetcher.enabled ? "Disable" : "Enable"}
                    onClick={() => toggleFetcherMutation.mutate({
                      id: fetcher.id,
                      enabled: !fetcher.enabled
                    })}
                  >
                    {fetcher.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    title="Edit"
                    onClick={() => handleEditFetcher(fetcher)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    title="Delete"
                    onClick={() => handleDeleteFetcher(fetcher.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </>
    );
  };
  
  // Render the settings tab content
  const renderSettingsTab = () => {
    if (isLoadingSettings) {
      return <div className="py-8 text-center">Loading settings...</div>;
    }
    
    if (!settings) {
      return (
        <div className="py-8 text-center text-red-500">
          <AlertCircle className="mx-auto h-8 w-8 mb-2" />
          Error loading settings
        </div>
      );
    }
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Global Fetcher Settings</CardTitle>
          <CardDescription>
            Configure global settings for all fetchers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="maxConcurrentFetches">Maximum Concurrent Fetches</Label>
            <div className="flex items-center gap-2">
              <Input
                id="maxConcurrentFetches"
                type="number"
                min="1"
                max="20"
                value={settings.maxConcurrentFetches}
                onChange={(e) => handleUpdateSettings({ 
                  maxConcurrentFetches: parseInt(e.target.value) 
                })}
                className="w-24"
              />
              <span className="text-sm text-gray-500">
                Maximum number of fetchers that can run at the same time
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="defaultRetryCount">Default Max Retries</Label>
            <div className="flex items-center gap-2">
              <Input
                id="defaultRetryCount"
                type="number"
                min="0"
                max="10"
                value={settings.defaultRetryCount}
                onChange={(e) => handleUpdateSettings({ 
                  defaultRetryCount: parseInt(e.target.value) 
                })}
                className="w-24"
              />
              <span className="text-sm text-gray-500">
                Default number of retry attempts before disabling a fetcher
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="globalEnabled">Global Enable/Disable</Label>
            <div className="flex items-center gap-2">
              <Switch
                id="globalEnabled"
                checked={settings.globalEnabled}
                onCheckedChange={(checked) => handleUpdateSettings({ 
                  globalEnabled: checked 
                })}
              />
              <span className="text-sm text-gray-500">
                {settings.globalEnabled 
                  ? "All fetchers are allowed to run (if individually enabled)" 
                  : "All fetchers are paused globally"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  // Render the stats tab content
  const renderStatsTab = () => {
    if (isLoadingStats) {
      return <div className="py-8 text-center">Loading statistics...</div>;
    }
    
    if (!stats) {
      return (
        <div className="py-8 text-center text-red-500">
          <AlertCircle className="mx-auto h-8 w-8 mb-2" />
          Error loading statistics
        </div>
      );
    }
    
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Total Fetchers:</dt>
                <dd className="font-bold">{stats.totalFetchers}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Enabled Fetchers:</dt>
                <dd className="font-bold">{stats.enabledFetchers}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Active Fetches:</dt>
                <dd className="font-bold">{stats.activeFetches}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Max Concurrent:</dt>
                <dd className="font-bold">{stats.maxConcurrentFetches}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>By Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              {Object.entries(PRIORITY_LABELS).map(([priority, { label }]) => (
                <div key={priority} className="flex justify-between">
                  <dt className="font-medium text-gray-500">{label}:</dt>
                  <dd className="font-bold">{stats.byPriority[priority] || 0}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>By Type</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Google Drive:</dt>
                <dd className="font-bold">{stats.byType.googleDrive || 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Email:</dt>
                <dd className="font-bold">{stats.byType.email || 0}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  // Edit fetcher modal
  const renderEditModal = () => {
    if (!currentFetcher) return null;
    
    return (
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Fetcher</DialogTitle>
            <DialogDescription>
              Update the fetcher configuration
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-priority">Priority</Label>
              <Select
                value={currentFetcher.priority.toString()}
                onValueChange={(value) => setCurrentFetcher({
                  ...currentFetcher,
                  priority: parseInt(value) as FetchPriority
                })}
              >
                <SelectTrigger id="edit-priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([priority, { label }]) => (
                    <SelectItem key={priority} value={priority}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-interval">Interval</Label>
              <Select
                value={currentFetcher.intervalMinutes.toString()}
                onValueChange={(value) => setCurrentFetcher({
                  ...currentFetcher,
                  intervalMinutes: parseInt(value)
                })}
              >
                <SelectTrigger id="edit-interval">
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  {INTERVAL_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value.toString()}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-max-retries">Max Retries</Label>
              <Input
                id="edit-max-retries"
                type="number"
                min="0"
                max="10"
                value={currentFetcher.maxRetries}
                onChange={(e) => setCurrentFetcher({
                  ...currentFetcher,
                  maxRetries: parseInt(e.target.value)
                })}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-enabled"
                checked={currentFetcher.enabled}
                onCheckedChange={(checked) => setCurrentFetcher({
                  ...currentFetcher,
                  enabled: checked
                })}
              />
              <Label htmlFor="edit-enabled">Enabled</Label>
            </div>
            
            {/* Type-specific fields */}
            {currentFetcher.type === FetcherType.GOOGLE_DRIVE && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-folder-id">Folder ID (optional)</Label>
                  <Input
                    id="edit-folder-id"
                    value={currentFetcher.folderId || ''}
                    onChange={(e) => setCurrentFetcher({
                      ...currentFetcher,
                      folderId: e.target.value
                    })}
                    placeholder="Leave empty for root folder"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-include-trash"
                    checked={currentFetcher.includeTrash || false}
                    onCheckedChange={(checked) => setCurrentFetcher({
                      ...currentFetcher,
                      includeTrash: checked
                    })}
                  />
                  <Label htmlFor="edit-include-trash">Include Trash</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-include-shared"
                    checked={currentFetcher.includeShared || false}
                    onCheckedChange={(checked) => setCurrentFetcher({
                      ...currentFetcher,
                      includeShared: checked
                    })}
                  />
                  <Label htmlFor="edit-include-shared">Include Shared Files</Label>
                </div>
              </>
            )}
            
            {currentFetcher.type === FetcherType.EMAIL && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-folder-name">Folder/Label (optional)</Label>
                  <Input
                    id="edit-folder-name"
                    value={currentFetcher.folderName || ''}
                    onChange={(e) => setCurrentFetcher({
                      ...currentFetcher,
                      folderName: e.target.value
                    })}
                    placeholder="e.g., INBOX, Sent, etc."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-query">Search Query (optional)</Label>
                  <Input
                    id="edit-query"
                    value={currentFetcher.query || ''}
                    onChange={(e) => setCurrentFetcher({
                      ...currentFetcher,
                      query: e.target.value
                    })}
                    placeholder="e.g., is:unread, from:example.com"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-include-body"
                    checked={currentFetcher.includeBody || false}
                    onCheckedChange={(checked) => setCurrentFetcher({
                      ...currentFetcher,
                      includeBody: checked
                    })}
                  />
                  <Label htmlFor="edit-include-body">Include Email Body</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-include-attachments"
                    checked={currentFetcher.includeAttachments || false}
                    onCheckedChange={(checked) => setCurrentFetcher({
                      ...currentFetcher,
                      includeAttachments: checked
                    })}
                  />
                  <Label htmlFor="edit-include-attachments">Include Attachments</Label>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => updateFetcherMutation.mutate(currentFetcher)}
              disabled={updateFetcherMutation.isPending}
            >
              {updateFetcherMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  // Create fetcher modal
  const renderCreateModal = () => {
    return (
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Fetcher</DialogTitle>
            <DialogDescription>
              Configure a new data fetcher
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-type">Fetcher Type</Label>
              <Select
                value={newFetcher.type}
                onValueChange={(value) => setNewFetcher({
                  ...newFetcher,
                  type: value as FetcherType,
                  // Reset type-specific fields when type changes
                  provider: value === FetcherType.EMAIL ? EmailProvider.GMAIL : undefined,
                  folderId: undefined,
                  folderName: undefined,
                  query: undefined,
                  includeBody: undefined,
                  includeAttachments: undefined,
                  includeTrash: undefined,
                  includeShared: undefined
                })}
              >
                <SelectTrigger id="create-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FetcherType.GOOGLE_DRIVE}>Google Drive</SelectItem>
                  <SelectItem value={FetcherType.EMAIL}>Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {newFetcher.type === FetcherType.EMAIL && (
              <div className="space-y-2">
                <Label htmlFor="create-provider">Email Provider</Label>
                <Select
                  value={newFetcher.provider || EmailProvider.GMAIL}
                  onValueChange={(value) => setNewFetcher({
                    ...newFetcher,
                    provider: value as EmailProvider
                  })}
                >
                  <SelectTrigger id="create-provider">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EmailProvider.GMAIL}>Gmail</SelectItem>
                    <SelectItem value={EmailProvider.OUTLOOK}>Outlook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="create-priority">Priority</Label>
              <Select
                value={newFetcher.priority?.toString() || FetchPriority.NORMAL.toString()}
                onValueChange={(value) => setNewFetcher({
                  ...newFetcher,
                  priority: parseInt(value) as FetchPriority
                })}
              >
                <SelectTrigger id="create-priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([priority, { label }]) => (
                    <SelectItem key={priority} value={priority}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="create-interval">Interval</Label>
              <Select
                value={newFetcher.intervalMinutes?.toString() || "60"}
                onValueChange={(value) => setNewFetcher({
                  ...newFetcher,
                  intervalMinutes: parseInt(value)
                })}
              >
                <SelectTrigger id="create-interval">
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  {INTERVAL_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value.toString()}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="create-max-retries">Max Retries</Label>
              <Input
                id="create-max-retries"
                type="number"
                min="0"
                max="10"
                value={newFetcher.maxRetries || 3}
                onChange={(e) => setNewFetcher({
                  ...newFetcher,
                  maxRetries: parseInt(e.target.value)
                })}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="create-enabled"
                checked={newFetcher.enabled !== false}
                onCheckedChange={(checked) => setNewFetcher({
                  ...newFetcher,
                  enabled: checked
                })}
              />
              <Label htmlFor="create-enabled">Enabled</Label>
            </div>
            
            {/* Type-specific fields */}
            {newFetcher.type === FetcherType.GOOGLE_DRIVE && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="create-folder-id">Folder ID (optional)</Label>
                  <Input
                    id="create-folder-id"
                    value={newFetcher.folderId || ''}
                    onChange={(e) => setNewFetcher({
                      ...newFetcher,
                      folderId: e.target.value
                    })}
                    placeholder="Leave empty for root folder"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="create-include-trash"
                    checked={newFetcher.includeTrash || false}
                    onCheckedChange={(checked) => setNewFetcher({
                      ...newFetcher,
                      includeTrash: checked
                    })}
                  />
                  <Label htmlFor="create-include-trash">Include Trash</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="create-include-shared"
                    checked={newFetcher.includeShared || false}
                    onCheckedChange={(checked) => setNewFetcher({
                      ...newFetcher,
                      includeShared: checked
                    })}
                  />
                  <Label htmlFor="create-include-shared">Include Shared Files</Label>
                </div>
              </>
            )}
            
            {newFetcher.type === FetcherType.EMAIL && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="create-folder-name">Folder/Label (optional)</Label>
                  <Input
                    id="create-folder-name"
                    value={newFetcher.folderName || ''}
                    onChange={(e) => setNewFetcher({
                      ...newFetcher,
                      folderName: e.target.value
                    })}
                    placeholder="e.g., INBOX, Sent, etc."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="create-query">Search Query (optional)</Label>
                  <Input
                    id="create-query"
                    value={newFetcher.query || ''}
                    onChange={(e) => setNewFetcher({
                      ...newFetcher,
                      query: e.target.value
                    })}
                    placeholder="e.g., is:unread, from:example.com"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="create-include-body"
                    checked={newFetcher.includeBody || false}
                    onCheckedChange={(checked) => setNewFetcher({
                      ...newFetcher,
                      includeBody: checked
                    })}
                  />
                  <Label htmlFor="create-include-body">Include Email Body</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="create-include-attachments"
                    checked={newFetcher.includeAttachments || false}
                    onCheckedChange={(checked) => setNewFetcher({
                      ...newFetcher,
                      includeAttachments: checked
                    })}
                  />
                  <Label htmlFor="create-include-attachments">Include Attachments</Label>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createFetcherMutation.mutate(newFetcher)}
              disabled={createFetcherMutation.isPending}
            >
              {createFetcherMutation.isPending ? "Creating..." : "Create Fetcher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Data Fetcher Administration</h1>
          <p className="text-gray-500">
            Configure and monitor data fetchers for external integrations
          </p>
        </div>
        
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Configuration
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="fetchers">
            <RefreshCw className="mr-2 h-4 w-4" />
            Fetchers
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="stats">
            <Clock className="mr-2 h-4 w-4" />
            Statistics
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="fetchers" className="py-4">
          {renderFetchersTab()}
        </TabsContent>
        
        <TabsContent value="settings" className="py-4">
          {renderSettingsTab()}
        </TabsContent>
        
        <TabsContent value="stats" className="py-4">
          {renderStatsTab()}
        </TabsContent>
      </Tabs>
      
      {renderEditModal()}
      {renderCreateModal()}
    </div>
  );
}