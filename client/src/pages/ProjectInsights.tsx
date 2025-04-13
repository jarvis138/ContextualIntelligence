import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertCircle, Search, FileText, Network } from "lucide-react";
import ContextGraph from "@/components/nlp/ContextGraph";
import DocumentSummary, { DocumentSummaryData } from "@/components/nlp/DocumentSummary";
import { Input } from "@/components/ui/input";
import { queryClient } from "@/lib/queryClient";
import * as nlpService from "@/lib/nlpService";

interface ProjectType {
  id: number;
  name: string;
  description: string;
  status: string;
  progress: number;
}

interface DocumentType {
  id: number;
  title: string;
  content: string | null;
  fileType: string;
  projectId: number;
  createdBy: number;
  updatedBy: number;
  updatedAt: string;
}

const ProjectInsights = () => {
  const params = useParams();
  const projectId = params.projectId || "";
  const id = parseInt(projectId);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  
  // Fetch project data
  const { data: project, isLoading: isLoadingProject } = useQuery<ProjectType>({
    queryKey: ['/api/projects', id],
    enabled: !isNaN(id)
  });
  
  // Fetch documents for the project
  const { data: documents, isLoading: isLoadingDocuments } = useQuery<DocumentType[]>({
    queryKey: ['/api/projects', id, 'documents'],
    enabled: !isNaN(id)
  });
  
  // Fetch context graph data
  const { 
    data: graphData,
    isLoading: isLoadingGraph,
    error: graphError
  } = useQuery<nlpService.GraphData>({
    queryKey: ['/api/projects', id, 'context-graph'],
    queryFn: async () => {
      if (isNaN(id)) throw new Error("Invalid project ID");
      const result = await nlpService.generateContextGraph(id);
      if (!result) throw new Error("Failed to generate context graph");
      return result;
    },
    enabled: !isNaN(id)
  });
  
  // Fetch document summary
  const {
    data: documentSummary,
    isLoading: isLoadingSummary,
    error: summaryError
  } = useQuery<DocumentSummaryData>({
    queryKey: ['/api/documents', selectedDocumentId, 'summary'],
    queryFn: async () => {
      if (!selectedDocumentId) throw new Error("No document selected");
      const result = await nlpService.summarizeDocument(selectedDocumentId);
      if (!result) throw new Error("Failed to generate document summary");
      return result;
    },
    enabled: selectedDocumentId !== null
  });
  
  // Semantic search
  const {
    data: searchResults,
    isLoading: isSearching,
    error: searchError
  } = useQuery<nlpService.SearchResult[]>({
    queryKey: ['/api/projects', id, 'search', searchQuery],
    queryFn: async () => {
      if (isNaN(id) || !searchQuery.trim()) return [];
      return nlpService.semanticSearch(id, searchQuery);
    },
    enabled: !isNaN(id) && searchQuery.trim().length > 0
  });
  
  // Mutations
  const regenerateGraphMutation = useMutation({
    mutationFn: async () => {
      if (isNaN(id)) throw new Error("Invalid project ID");
      return nlpService.generateContextGraph(id);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/projects', id, 'context-graph'], data);
    }
  });
  
  const generateSummaryMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return nlpService.summarizeDocument(documentId);
    },
    onSuccess: (data, documentId) => {
      queryClient.setQueryData(['/api/documents', documentId, 'summary'], data);
    }
  });
  
  // Helper function to get document title by ID
  const getDocumentTitle = (documentId: number) => {
    if (!documents) return `Document #${documentId}`;
    const document = documents.find(doc => doc.id === documentId);
    return document ? document.title : `Document #${documentId}`;
  };
  
  // Loading state
  if (isLoadingProject) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Error state if project not found
  if (!project) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Project not found. Please check the URL and try again.
          </AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/projects">Back to Projects</Link>
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">{project.description}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/projects/${id}`}>Back to Project</Link>
        </Button>
      </div>
      
      <Tabs defaultValue="graph">
        <TabsList className="mb-4">
          <TabsTrigger value="graph">
            <Network className="h-4 w-4 mr-2" />
            Context Graph
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Document Analysis
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="h-4 w-4 mr-2" />
            Semantic Search
          </TabsTrigger>
        </TabsList>
        
        {/* Context Graph Tab */}
        <TabsContent value="graph" className="space-y-4">
          <ContextGraph
            projectId={id}
            data={graphData}
            isLoading={isLoadingGraph || regenerateGraphMutation.isPending}
            onRefresh={() => regenerateGraphMutation.mutate()}
          />
          
          {graphError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {typeof graphError === 'string'
                  ? graphError
                  : (graphError as Error)?.message || 'Failed to load context graph'}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
        
        {/* Document Analysis Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Document List */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Project Documents</CardTitle>
                <CardDescription>
                  Select a document to analyze
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingDocuments ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : !documents?.length ? (
                  <p className="text-center text-muted-foreground py-8">
                    No documents found
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documents.map(document => (
                      <Button
                        key={document.id}
                        variant={selectedDocumentId === document.id ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setSelectedDocumentId(document.id)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {document.title}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Document Summary */}
            <div className="md:col-span-2">
              {selectedDocumentId ? (
                <DocumentSummary
                  documentId={selectedDocumentId}
                  documentTitle={getDocumentTitle(selectedDocumentId)}
                  data={documentSummary}
                  isLoading={isLoadingSummary || generateSummaryMutation.isPending}
                  error={summaryError ? 
                    (typeof summaryError === 'string'
                      ? summaryError
                      : (summaryError as Error)?.message || 'Failed to load document summary')
                    : undefined
                  }
                  onGenerate={() => generateSummaryMutation.mutate(selectedDocumentId)}
                />
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">
                      Select a document from the list to analyze it
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
        
        {/* Semantic Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Semantic Search</CardTitle>
              <CardDescription>
                Search across project documents using natural language
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2 mb-6">
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button disabled={isSearching}>
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Search
                </Button>
              </div>
              
              {searchError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    {typeof searchError === 'string'
                      ? searchError
                      : (searchError as Error)?.message || 'Search failed'}
                  </AlertDescription>
                </Alert>
              )}
              
              {searchQuery && !isSearching && (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {searchResults?.length 
                      ? `Found ${searchResults.length} results for "${searchQuery}"`
                      : `No results found for "${searchQuery}"`}
                  </p>
                  
                  <div className="space-y-4">
                    {searchResults?.map((result, index) => (
                      <div key={index}>
                        <h3 className="font-medium mb-1">
                          <Button
                            variant="link"
                            className="p-0 h-auto"
                            onClick={() => setSelectedDocumentId(result.documentId)}
                          >
                            {result.title}
                          </Button>
                          <span className="text-xs text-muted-foreground ml-2">
                            Relevance: {Math.round(result.relevance * 100)}%
                          </span>
                        </h3>
                        <p className="text-sm">{result.snippet}</p>
                        {index < searchResults.length - 1 && <Separator className="mt-4" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectInsights;