import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import DocumentSummary, { DocumentSummaryData } from "@/components/nlp/DocumentSummary";
import {
  FileText,
  ArrowLeft,
  Calendar,
  User,
  Clock,
  Download,
  Sparkles,
  Share2,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCcw
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Default user - would typically come from auth context
const user = {
  id: 1,
  username: "alexmorgan",
  fullName: "Alex Morgan",
  email: "alex.morgan@example.com",
  avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  role: "Project Manager"
};

export default function DocumentDetail() {
  const { documentId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("document");

  // Fetch document details
  const {
    data: document,
    isLoading: isLoadingDocument,
    isError: isDocumentError
  } = useQuery({
    queryKey: [`/api/documents/${documentId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/documents/${documentId}`);
      return await res.json();
    }
  });

  // Fetch document summary
  const {
    data: summary,
    isLoading: isLoadingSummary,
    isError: isSummaryError,
    refetch: refetchSummary
  } = useQuery({
    queryKey: [`/api/documents/${documentId}/summarize`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/documents/${documentId}/summarize`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to generate summary");
      }
      return data.summary as DocumentSummaryData;
    },
    enabled: !!documentId,
    retry: false // Don't retry automatically as this is an expensive operation
  });

  // Process document mutation
  const processDocumentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/documents/${documentId}/process`);
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Document processed successfully",
          description: "Entities extracted and relationships created.",
          variant: "default"
        });
        
        // Refresh document data
        queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}/summarize`] });
      } else {
        toast({
          title: "Processing failed",
          description: data.message || "Failed to process document",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Processing failed",
        description: error.message || "An error occurred while processing the document",
        variant: "destructive"
      });
    }
  });

  // Handle document processing
  const handleProcessDocument = () => {
    processDocumentMutation.mutate();
  };

  // Handle generating summary
  const handleGenerateSummary = () => {
    refetchSummary();
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Format time elapsed
  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return 'recently';
    }
  };

  // Handle actions
  const handleDownload = () => {
    toast({
      title: "Download started",
      description: "Your document is being prepared for download",
    });
  };

  const handleShare = () => {
    toast({
      title: "Share document",
      description: "This would open a sharing dialog",
    });
  };

  const handleDelete = () => {
    toast({
      title: "Delete document",
      description: "This would confirm deletion of the document",
    });
  };

  // Check if document is being processed
  const isProcessing = processDocumentMutation.isPending;

  // Display a loading state while fetching the document
  if (isLoadingDocument) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar user={user} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  // Display error state if document fetch failed
  if (isDocumentError || !document) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar user={user} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="flex flex-col items-center justify-center h-full">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Document Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested document could not be found or you don't have permission to view it.</p>
            <Button onClick={() => setLocation("/documents")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Documents
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6">
          {/* Header with back button and actions */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/documents")}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <h1 className="text-2xl font-bold text-gray-800">{document.title}</h1>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 mr-2" /> Share
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            </div>
          </div>
          
          {/* Metadata row */}
          <div className="flex flex-wrap gap-6 mb-6">
            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="h-4 w-4 mr-2" />
              <span>Created {formatDate(document.createdAt)}</span>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="h-4 w-4 mr-2" />
              <span>Updated {formatTimeAgo(document.updatedAt)}</span>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <User className="h-4 w-4 mr-2" />
              <span>By {document.createdByUser?.fullName || 'Unknown'}</span>
            </div>
            {document.fileType && (
              <div className="flex items-center text-sm">
                <FileText className="h-4 w-4 mr-2 text-blue-500" />
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                  {document.fileType.toUpperCase()}
                </span>
              </div>
            )}
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="document">Document</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="related">Related</TabsTrigger>
            </TabsList>
            
            {/* Document Content Tab */}
            <TabsContent value="document" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Document Content</CardTitle>
                  <CardDescription>
                    Original content of the document
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {document.content ? (
                    <div className="prose max-w-none">
                      {document.content.split('\n').map((paragraph, idx) => (
                        <p key={idx}>{paragraph}</p>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                      <h3 className="text-lg font-medium">No content available</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        This document doesn't have any text content to display.
                      </p>
                    </div>
                  )}
                </CardContent>
                {document.content && (
                  <CardFooter className="border-t bg-muted/50 flex justify-between">
                    <div className="text-sm text-muted-foreground">
                      {document.content.length} characters
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="ghost">
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                      </Button>
                      <Button size="sm" variant="ghost">
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>
            
            {/* Analysis Tab */}
            <TabsContent value="analysis" className="mt-6">
              <div className="grid grid-cols-1 gap-6">
                {/* AI Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Document Analysis Actions</CardTitle>
                    <CardDescription>
                      Use AI to analyze and process this document
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Generate Summary</CardTitle>
                          <CardDescription className="text-xs">
                            Create an AI-powered summary with key topics and entity extraction
                          </CardDescription>
                        </CardHeader>
                        <CardFooter className="pt-2">
                          <Button 
                            size="sm" 
                            onClick={handleGenerateSummary} 
                            disabled={isLoadingSummary || !document.content}
                            className="w-full"
                          >
                            {isLoadingSummary ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Generate Summary
                              </>
                            )}
                          </Button>
                        </CardFooter>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Process Document</CardTitle>
                          <CardDescription className="text-xs">
                            Extract entities, create tasks and relationships
                          </CardDescription>
                        </CardHeader>
                        <CardFooter className="pt-2">
                          <Button 
                            size="sm" 
                            onClick={handleProcessDocument} 
                            disabled={isProcessing || !document.content}
                            className="w-full"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <RefreshCcw className="h-4 w-4 mr-2" />
                                Process Document
                              </>
                            )}
                          </Button>
                        </CardFooter>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Summary Card */}
                <DocumentSummary
                  documentId={parseInt(documentId as string)}
                  documentTitle={document.title}
                  data={summary}
                  isLoading={isLoadingSummary}
                  error={isSummaryError ? "Failed to generate summary" : undefined}
                  onGenerate={handleGenerateSummary}
                />
              </div>
            </TabsContent>
            
            {/* Related Items Tab */}
            <TabsContent value="related" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Related Items</CardTitle>
                  <CardDescription>
                    Items related to this document
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Related Tasks */}
                    <div>
                      <h3 className="text-lg font-medium mb-3">Tasks</h3>
                      <div className="bg-muted/50 text-center py-12 rounded-md">
                        <p className="text-muted-foreground">
                          No related tasks found.
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Process this document to extract tasks automatically.
                        </p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Related Documents */}
                    <div>
                      <h3 className="text-lg font-medium mb-3">Related Documents</h3>
                      <div className="bg-muted/50 text-center py-12 rounded-md">
                        <p className="text-muted-foreground">
                          No related documents found.
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Process this document to identify relationships with other documents.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}