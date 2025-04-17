import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  Filter, 
  Loader2, 
  Plus, 
  RefreshCw, 
  SearchIcon, 
  ShieldCheck, 
  Sliders, 
  Sparkles, 
  Trash2
} from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";

interface ModelDefinition {
  id: string;
  provider: string;
  version: string;
  capabilities: string[];
  status: string;
  approvedBy?: string;
  approvalDate?: string;
  restrictions?: {
    allowedTenants?: number[];
    allowedUserRoles?: string[];
    maxTokens?: number;
    requiredFilters?: string[];
  };
  complianceInfo?: {
    dataResidency?: string[];
    certifications?: string[];
    piiHandling?: boolean;
    retentionPolicy?: string;
  };
  performanceMetrics?: {
    latencyMs?: number;
    tokensPerSecond?: number;
    costPerToken?: number;
  };
}

interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  scope: 'global' | 'tenant' | 'user';
  tenantId?: number;
  userId?: number;
  filters: string[];
  thresholds: Record<string, number>;
  actions: {
    blockContent: boolean;
    maskContent: boolean;
    logViolation: boolean;
    notifyAdmin: boolean;
    requireApproval: boolean;
  };
  overrideRoles?: string[];
}

interface ValidationResult {
  valid: boolean;
  requestId: string;
  timestamp: string;
  violations: {
    filter: string;
    severity: number;
    threshold: number;
    location: 'prompt' | 'completion';
    offsetStart?: number;
    offsetEnd?: number;
    maskedContent?: string;
  }[];
  overallRiskLevel: string;
  modelId: string;
  action: 'allowed' | 'modified' | 'blocked' | 'flagged_for_review';
}

const ModelListView = () => {
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterProvider, setFilterProvider] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddModelOpen, setIsAddModelOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelDefinition | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch models
  const { 
    data: models = [], 
    isLoading, 
    isError, 
    refetch 
  } = useQuery<ModelDefinition[]>({
    queryKey: ['/api/model-registry/models'],
  });

  // Model deletion mutation
  const deleteModelMutation = useMutation({
    mutationFn: (modelId: string) => 
      apiRequest(`/api/model-registry/models/${modelId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/model-registry/models'] });
      toast({
        title: "Model deleted",
        description: "The model has been successfully deleted from the registry",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting model",
        description: "There was an error deleting the model. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter models based on search and filters
  const filteredModels = models.filter(model => {
    const matchesSearch = searchQuery ? 
      model.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      model.provider.toLowerCase().includes(searchQuery.toLowerCase()) : 
      true;
      
    const matchesStatus = filterStatus ? model.status === filterStatus : true;
    const matchesProvider = filterProvider ? model.provider === filterProvider : true;
    
    return matchesSearch && matchesStatus && matchesProvider;
  });

  // Get unique providers for filter
  const providers = [...new Set(models.map(model => model.provider))];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'pending_approval':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'restricted':
        return <Badge className="bg-red-500">Restricted</Badge>;
      case 'deprecated':
        return <Badge className="bg-gray-500">Deprecated</Badge>;
      case 'testing':
        return <Badge className="bg-blue-500">Testing</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleDeleteModel = (modelId: string) => {
    if (confirm("Are you sure you want to delete this model? This action cannot be undone.")) {
      deleteModelMutation.mutate(modelId);
    }
  };

  const viewModelDetails = (model: ModelDefinition) => {
    setSelectedModel(model);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-2">Loading model registry...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-10">
        <p className="text-red-500 mb-2">Failed to load model registry data</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="relative w-full md:w-72">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search models..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending_approval">Pending Approval</SelectItem>
              <SelectItem value="restricted">Restricted</SelectItem>
              <SelectItem value="deprecated">Deprecated</SelectItem>
              <SelectItem value="testing">Testing</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterProvider} onValueChange={setFilterProvider}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Providers</SelectItem>
              {providers.map(provider => (
                <SelectItem key={provider} value={provider}>{provider}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            className="gap-1" 
            onClick={() => {
              setSearchQuery("");
              setFilterStatus("");
              setFilterProvider("");
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </Button>
          
          <Button onClick={() => setIsAddModelOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Model
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Model Registry</CardTitle>
          <CardDescription>
            Enterprise governance of AI models and their usage policies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Capabilities</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    {searchQuery || filterStatus || filterProvider ? (
                      <div>
                        <p className="text-muted-foreground">No models match your filters</p>
                        <Button 
                          variant="ghost" 
                          className="mt-2" 
                          onClick={() => {
                            setSearchQuery("");
                            setFilterStatus("");
                            setFilterProvider("");
                          }}
                        >
                          Clear filters
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-muted-foreground mb-2">No models have been registered yet</p>
                        <Button onClick={() => setIsAddModelOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Model
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredModels.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell>{model.id}</TableCell>
                    <TableCell>{model.provider}</TableCell>
                    <TableCell>{model.version}</TableCell>
                    <TableCell>
                      {model.capabilities.map((capability) => (
                        <Badge key={capability} variant="outline" className="mr-1">
                          {capability}
                        </Badge>
                      ))}
                    </TableCell>
                    <TableCell>{getStatusBadge(model.status)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 px-2"
                          onClick={() => viewModelDetails(model)}
                        >
                          Details
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 px-2 text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteModel(model.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Model Details Sheet */}
      {selectedModel && (
        <Sheet open={!!selectedModel} onOpenChange={() => setSelectedModel(null)}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Model: {selectedModel.id}</SheetTitle>
              <SheetDescription>
                Detailed information about the registered model
              </SheetDescription>
            </SheetHeader>
            <div className="py-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-2">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Provider</Label>
                    <p className="text-sm">{selectedModel.provider}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Version</Label>
                    <p className="text-sm">{selectedModel.version}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <div>{getStatusBadge(selectedModel.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Approved By</Label>
                    <p className="text-sm">{selectedModel.approvedBy || "Not approved yet"}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Capabilities</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedModel.capabilities.map((capability) => (
                    <Badge key={capability} variant="secondary">
                      {capability}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedModel.restrictions && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Usage Restrictions</h3>
                  <div className="space-y-2">
                    {selectedModel.restrictions.allowedTenants && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Allowed Tenants</Label>
                        <p className="text-sm">
                          {selectedModel.restrictions.allowedTenants.length > 0 
                            ? selectedModel.restrictions.allowedTenants.join(", ") 
                            : "All tenants"}
                        </p>
                      </div>
                    )}
                    {selectedModel.restrictions.allowedUserRoles && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Allowed User Roles</Label>
                        <p className="text-sm">
                          {selectedModel.restrictions.allowedUserRoles.join(", ")}
                        </p>
                      </div>
                    )}
                    {selectedModel.restrictions.maxTokens && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Max Tokens</Label>
                        <p className="text-sm">{selectedModel.restrictions.maxTokens}</p>
                      </div>
                    )}
                    {selectedModel.restrictions.requiredFilters && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Required Content Filters</Label>
                        <div className="flex flex-wrap gap-1">
                          {selectedModel.restrictions.requiredFilters.map(filter => (
                            <Badge key={filter} variant="outline" className="text-xs">
                              {filter}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedModel.complianceInfo && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Compliance Information</h3>
                  <div className="space-y-2">
                    {selectedModel.complianceInfo.dataResidency && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Data Residency</Label>
                        <p className="text-sm">{selectedModel.complianceInfo.dataResidency.join(", ")}</p>
                      </div>
                    )}
                    {selectedModel.complianceInfo.certifications && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Certifications</Label>
                        <p className="text-sm">{selectedModel.complianceInfo.certifications.join(", ")}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-muted-foreground text-xs">PII Handling</Label>
                      <p className="text-sm">
                        {selectedModel.complianceInfo.piiHandling ? "Supported" : "Not supported"}
                      </p>
                    </div>
                    {selectedModel.complianceInfo.retentionPolicy && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Retention Policy</Label>
                        <p className="text-sm">{selectedModel.complianceInfo.retentionPolicy}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedModel.performanceMetrics && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Performance Metrics</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedModel.performanceMetrics.latencyMs !== undefined && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Avg. Latency</Label>
                        <p className="text-sm">{selectedModel.performanceMetrics.latencyMs} ms</p>
                      </div>
                    )}
                    {selectedModel.performanceMetrics.tokensPerSecond !== undefined && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Tokens/Second</Label>
                        <p className="text-sm">{selectedModel.performanceMetrics.tokensPerSecond}</p>
                      </div>
                    )}
                    {selectedModel.performanceMetrics.costPerToken !== undefined && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Cost/1K Tokens</Label>
                        <p className="text-sm">${selectedModel.performanceMetrics.costPerToken.toFixed(5)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <SheetFooter>
              <SheetClose asChild>
                <Button variant="outline">Close</Button>
              </SheetClose>
              {selectedModel.status === 'pending_approval' && (
                <Button className="bg-green-600 hover:bg-green-700">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Approve Model
                </Button>
              )}
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {/* Add Model Dialog */}
      <Dialog open={isAddModelOpen} onOpenChange={setIsAddModelOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Model</DialogTitle>
            <DialogDescription>
              Register a new AI model in the governance system
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="model-id" className="text-right">
                Model ID
              </Label>
              <Input
                id="model-id"
                placeholder="gpt-4"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="provider" className="text-right">
                Provider
              </Label>
              <Select>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="huggingface">Hugging Face</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="version" className="text-right">
                Version
              </Label>
              <Input
                id="version"
                placeholder="1.0"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Capabilities
              </Label>
              <div className="col-span-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="cursor-pointer">text_generation</Badge>
                <Badge variant="outline" className="cursor-pointer">chat</Badge>
                <Badge variant="outline" className="cursor-pointer">embeddings</Badge>
                <Badge variant="outline" className="cursor-pointer">image_generation</Badge>
                <Badge variant="outline" className="cursor-pointer">text_classification</Badge>
                <Badge variant="outline" className="cursor-pointer">text_moderation</Badge>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="restricted">Restricted</SelectItem>
                  <SelectItem value="testing">Testing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Add Model</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const GovernancePoliciesView = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch policies
  const { 
    data: policies = [], 
    isLoading, 
    isError,
    refetch
  } = useQuery<GovernancePolicy[]>({
    queryKey: ['/api/model-registry/policies'],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-2">Loading governance policies...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-10">
        <p className="text-red-500 mb-2">Failed to load governance policy data</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const getScopeBadge = (scope: string) => {
    switch (scope) {
      case 'global':
        return <Badge className="bg-purple-500">Global</Badge>;
      case 'tenant':
        return <Badge className="bg-blue-500">Tenant</Badge>;
      case 'user':
        return <Badge className="bg-green-500">User</Badge>;
      default:
        return <Badge>{scope}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Governance Policies</CardTitle>
            <CardDescription>
              Content filtering and moderation policies for AI model usage
            </CardDescription>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Policy
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Filters</TableHead>
              <TableHead>Actions</TableHead>
              <TableHead className="text-right">Controls</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <div>
                    <p className="text-muted-foreground mb-2">No governance policies have been defined yet</p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Policy
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              policies.map((policy) => (
                <TableRow key={policy.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{policy.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{policy.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>{getScopeBadge(policy.scope)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {policy.filters.map(filter => (
                        <Badge key={filter} variant="outline" className="text-xs">
                          {filter}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-xs">
                      {policy.actions.blockContent && <div className="flex items-center"><ShieldCheck className="h-3 w-3 mr-1 text-red-500" /> Block</div>}
                      {policy.actions.maskContent && <div className="flex items-center"><Filter className="h-3 w-3 mr-1 text-orange-500" /> Mask</div>}
                      {policy.actions.logViolation && <div className="flex items-center"><Sparkles className="h-3 w-3 mr-1 text-blue-500" /> Log</div>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 px-2"
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 px-2 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const ValidationHistoryView = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch validation history
  const { 
    data: validationHistory = { items: [] as ValidationResult[], totalItems: 0 }, 
    isLoading, 
    isError,
    refetch
  } = useQuery<{items: ValidationResult[], totalItems: number}>({
    queryKey: ['/api/model-registry/validations/history'],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-2">Loading validation history...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-10">
        <p className="text-red-500 mb-2">Failed to load validation history data</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'allowed':
        return <Badge className="bg-green-500">Allowed</Badge>;
      case 'modified':
        return <Badge className="bg-yellow-500">Modified</Badge>;
      case 'blocked':
        return <Badge className="bg-red-500">Blocked</Badge>;
      case 'flagged_for_review':
        return <Badge className="bg-orange-500">Flagged</Badge>;
      default:
        return <Badge>{action}</Badge>;
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'safe':
        return <Badge className="bg-green-500">Safe</Badge>;
      case 'low':
        return <Badge className="bg-blue-500">Low</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">High</Badge>;
      case 'critical':
        return <Badge className="bg-red-500">Critical</Badge>;
      default:
        return <Badge>{risk}</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Content Validation History</CardTitle>
            <CardDescription>
              History of AI content validation checks and policy enforcements
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Select>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Models</SelectItem>
                <SelectItem value="gpt-4">GPT-4</SelectItem>
                <SelectItem value="claude">Claude</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Request ID</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Risk Level</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Violations</TableHead>
              <TableHead className="text-right">Controls</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validationHistory.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <div>
                    <p className="text-muted-foreground mb-2">No validation history yet</p>
                    <p className="text-xs text-muted-foreground">Validation records will appear here when models are used with content filtering</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              validationHistory.items.map((result) => (
                <TableRow key={result.requestId}>
                  <TableCell className="whitespace-nowrap">
                    {formatTimestamp(result.timestamp)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {result.requestId.substring(0, 8)}...
                  </TableCell>
                  <TableCell>{result.modelId}</TableCell>
                  <TableCell>{getRiskBadge(result.overallRiskLevel)}</TableCell>
                  <TableCell>{getActionBadge(result.action)}</TableCell>
                  <TableCell>
                    {result.violations.length === 0 ? (
                      <span className="text-xs text-muted-foreground">None</span>
                    ) : (
                      <Badge>{result.violations.length}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2"
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="border-t px-6 py-3">
        <div className="flex items-center justify-between w-full">
          <p className="text-xs text-muted-foreground">
            Showing {validationHistory.items.length} of {validationHistory.totalItems} entries
          </p>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <Button variant="outline" size="sm" disabled>Next</Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

const ModelRegistryPanel = () => {
  const [activeTab, setActiveTab] = useState("models");
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Model Registry & Governance</CardTitle>
          <CardDescription>
            Manage enterprise AI model governance, compliance, and content policies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="models" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                <span>Models</span>
              </TabsTrigger>
              <TabsTrigger value="policies" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span>Policies</span>
              </TabsTrigger>
              <TabsTrigger value="validation" className="flex items-center gap-2">
                <Sliders className="h-4 w-4" />
                <span>Validation History</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="models">
              <ModelListView />
            </TabsContent>
            
            <TabsContent value="policies">
              <GovernancePoliciesView />
            </TabsContent>
            
            <TabsContent value="validation">
              <ValidationHistoryView />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModelRegistryPanel;