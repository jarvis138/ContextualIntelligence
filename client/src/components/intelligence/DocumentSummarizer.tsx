import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, FileText, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SummaryResult {
  summary: string;
  keyPoints: string[];
  entities: {
    name: string;
    type: string;
  }[];
}

interface DocumentSummarizerProps {
  title?: string;
  description?: string;
  onSummaryComplete?: (result: SummaryResult) => void;
  documentId?: string;
  initialText?: string;
}

export function DocumentSummarizer({
  title = "Document Summarization",
  description = "Upload a document or enter text to generate a concise summary",
  onSummaryComplete,
  documentId,
  initialText = "",
}: DocumentSummarizerProps) {
  const [text, setText] = useState(initialText);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Check file size (limit to 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
        e.target.value = '';
        return;
      }
      
      // Check file type
      const validTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF, TXT, or DOCX file",
          variant: "destructive",
        });
        e.target.value = '';
        return;
      }
      
      setFile(selectedFile);
      setText('');
    }
  };

  const summarizeMutation = useMutation({
    mutationFn: async (payload: { text?: string; file?: File; documentId?: string }) => {
      let formData = new FormData();
      
      if (payload.text) {
        formData.append('text', payload.text);
      }
      
      if (payload.file) {
        formData.append('file', payload.file);
      }
      
      if (payload.documentId) {
        formData.append('documentId', payload.documentId);
      }
      
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        throw new Error("Failed to summarize document");
      }
      
      return await res.json() as SummaryResult;
    },
    onSuccess: (data) => {
      setResult(data);
      if (onSummaryComplete) {
        onSummaryComplete(data);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSummarize = () => {
    if (!text && !file && !documentId) {
      toast({
        title: "No content",
        description: "Please enter text, upload a file, or provide a document ID",
        variant: "destructive",
      });
      return;
    }
    
    summarizeMutation.mutate({
      text: text || undefined,
      file: file || undefined,
      documentId,
    });
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const renderSummaryResult = () => {
    if (!result) return null;
    
    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Summary</h4>
          <p className="text-sm">{result.summary}</p>
        </div>
        
        {result.keyPoints.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Key Points</h4>
            <ul className="list-disc pl-5 space-y-1">
              {result.keyPoints.map((point, i) => (
                <li key={i} className="text-sm">{point}</li>
              ))}
            </ul>
          </div>
        )}
        
        {result.entities.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Entities Identified</h4>
            <div className="flex flex-wrap gap-2">
              {result.entities.map((entity, i) => (
                <span 
                  key={i} 
                  className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary"
                >
                  {entity.name} ({entity.type})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!documentId && (
          <>
            <div className="space-y-2">
              <Textarea
                placeholder="Enter text to summarize..."
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="min-h-[100px]"
                disabled={summarizeMutation.isPending || !!file}
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Or</span>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.txt,.docx"
                    disabled={summarizeMutation.isPending}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUploadClick}
                    disabled={summarizeMutation.isPending}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              </div>
            </div>
            
            {file && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertTitle>Document selected</AlertTitle>
                <AlertDescription>
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
        
        {documentId && (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertTitle>Using document from system</AlertTitle>
            <AlertDescription>
              Document ID: {documentId}
            </AlertDescription>
          </Alert>
        )}
        
        {summarizeMutation.isPending && (
          <div className="flex flex-col items-center justify-center py-4">
            <Spinner size="lg" className="mb-2" />
            <p className="text-sm text-muted-foreground">Generating summary...</p>
          </div>
        )}
        
        {summarizeMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to generate summary. Please try again.
            </AlertDescription>
          </Alert>
        )}
        
        {result && (
          <div className="border rounded-md p-4 bg-background">
            {renderSummaryResult()}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSummarize} 
          disabled={summarizeMutation.isPending || (!text && !file && !documentId)}
          className="w-full"
        >
          Generate Summary
        </Button>
      </CardFooter>
    </Card>
  );
}