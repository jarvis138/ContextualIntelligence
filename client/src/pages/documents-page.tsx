import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  Upload, 
  FolderUp, 
  Download, 
  Share,
  Trash2, 
  Search,
  Plus,
  FileText,
  File,
  MoreHorizontal
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DocumentsPage() {
  const { toast } = useToast();
  const [activeDocument, setActiveDocument] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [batchProcessDialogOpen, setBatchProcessDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Document data structure
  const documents = {
    infrastructure: [
      {
        id: "iac",
        title: "Infrastructure as Code",
        description: "Infrastructure as Code documentation for the CPI Hub",
        content: `
# Infrastructure as Code Documentation

## Overview

This document describes the Infrastructure as Code (IaC) approach for the CPI Hub project. The infrastructure is defined using Terraform and is designed to be deployed on AWS.

## Architecture

The CPI Hub infrastructure consists of the following components:

- **VPC**: A Virtual Private Cloud that isolates the CPI Hub resources.
  - Public subnets for load balancers and NAT gateways
  - Private subnets for application servers, databases, and other private resources
  - Internet gateways for public access
  - NAT gateways for outbound access from private subnets

- **Application Servers**: EC2 instances in an Auto Scaling Group running the CPI Hub application.
  - Deployed in private subnets for security
  - Access to databases, Elasticsearch, and external services
  - Managed by an Application Load Balancer

- **Database**: An Amazon RDS PostgreSQL instance for persistent data storage.
  - Deployed in private subnets for security
  - Encrypted storage and automated backups
  - Enhanced monitoring enabled

- **Elasticsearch**: Amazon Elasticsearch Service for search functionality.
  - Deployed in private subnets for security
  - Node-to-node encryption and encryption at rest
  - Custom domain for enhanced security

- **Load Balancer**: An Application Load Balancer for routing traffic to application servers.
  - Deployed in public subnets
  - SSL/TLS termination
  - HTTP to HTTPS redirection

- **Storage**: Amazon S3 buckets for file storage and backups.
  - Versioning enabled
  - Server-side encryption
  - Lifecycle policies for cost optimization

- **Monitoring**: CloudWatch alarms and dashboards for monitoring.
  - Custom metrics from the CPI Hub application
  - Automated alerts for critical issues
  - Integration with observability framework

- **Security**: Security groups, IAM roles, and policies for secure access.
  - Principle of least privilege
  - Network isolation
  - Encryption in transit and at rest
        `
      }
    ],
    governance: [
      {
        id: "data-governance",
        title: "Data Governance Principles",
        description: "Core principles for data governance in the CPI Hub",
        content: `
# Data Governance Principles

## Introduction

This document outlines the data governance principles for the CPI Hub platform. These principles guide how data is collected, stored, processed, and shared throughout the system. Our goal is to ensure data is managed securely, ethically, and in compliance with relevant regulations while maximizing its value to stakeholders.

## Core Principles

### 1. Data Ownership and Accountability

- **Clear Ownership**: Every data asset has a clearly defined owner responsible for its accuracy, quality, and appropriate use.
- **Accountability Framework**: Stakeholders are accountable for their data-related actions according to defined roles and responsibilities.
- **Data Stewardship**: Data stewards are appointed to oversee data quality, metadata management, and policy compliance.

### 2. Data Classification and Handling

- **Classification Framework**: All data is classified according to sensitivity, criticality, and regulatory requirements:
  - **Level 1 (Public)**: Information that can be freely disclosed.
  - **Level 2 (Internal)**: Information for internal use that would not cause material harm if disclosed.
  - **Level 3 (Confidential)**: Sensitive information that requires protection and could cause harm if disclosed.
  - **Level 4 (Restricted)**: Highly sensitive information subject to regulatory requirements or that could cause significant harm if disclosed.

- **Handling Guidelines**: Each classification level has specific handling, storage, transmission, and disposal requirements.

### 3. Data Quality and Integrity

- **Quality Standards**: All data must meet defined quality standards for accuracy, completeness, consistency, timeliness, and relevancy.
- **Data Validation**: Automated and manual validation processes ensure data meets quality standards at all stages of its lifecycle.
- **Quality Monitoring**: Continuous monitoring processes track and measure data quality.
- **Remediation Processes**: Clear procedures for addressing data quality issues when identified.
        `
      }
    ],
    knowledge: [
      {
        id: "knowledge-transfer",
        title: "Knowledge Transfer Plan",
        description: "Plan for knowledge transfer and continuity",
        content: `
# Knowledge Transfer Plan

## Introduction

This document outlines the knowledge transfer strategy for the CPI Hub project. Effective knowledge transfer is critical to maintaining operational continuity, facilitating onboarding, and ensuring long-term project success. This plan defines the methodologies, tools, and processes to capture, document, and transfer knowledge across team members and stakeholders.

## Objectives

1. Ensure comprehensive documentation of system architecture, code, processes, and decisions
2. Facilitate smooth onboarding of new team members
3. Minimize reliance on individual team members (reduce "key person risk")
4. Enable effective cross-training between team members
5. Create a sustainable framework for ongoing knowledge sharing
6. Preserve institutional knowledge and context for future reference

## Knowledge Categories

The knowledge transfer plan addresses several key categories of information:

### 1. Technical Knowledge

- **System Architecture**: Overall system design, component interactions, and data flows
- **Code Base**: Documentation of code structure, patterns, and critical implementations
- **Technical Decisions**: Record of key technical decisions and their rationales
- **Development Environment**: Setup, configuration, and maintenance procedures
- **Infrastructure**: Cloud resources, networking, security, and deployment details
- **Performance Considerations**: Known bottlenecks, optimization strategies, and benchmarks
- **Security Measures**: Security controls, protocols, and best practices
        `
      }
    ],
    team: [
      {
        id: "team-structure",
        title: "Cross-Functional Team Structure",
        description: "Organization and structure of cross-functional teams",
        content: `
# Cross-Functional Team Structure

## Introduction

This document outlines the cross-functional team structure for the CPI Hub project. The organization is designed to promote collaboration, efficiency, and innovation while delivering high-quality software that meets stakeholder needs. By bringing together diverse skill sets and perspectives, we aim to create a cohesive team environment that can tackle complex challenges across the entire project lifecycle.

## Organizational Principles

The CPI Hub team structure is built on the following principles:

1. **Product-Centric Approach**: Teams are organized around product capabilities rather than technical functions.
2. **End-to-End Ownership**: Teams are responsible for their features from conception to production.
3. **Cross-Functional Composition**: Each team includes diverse skills needed to deliver complete solutions.
4. **Autonomous Decision-Making**: Teams have authority to make decisions within their domain.
5. **Collaborative Problem-Solving**: Open communication across teams to share knowledge and solve complex problems.
6. **Continuous Improvement**: Regular retrospectives and adaptation of team structure and processes.
7. **Customer Centricity**: Direct engagement with users to understand needs and get feedback.

## Team Structure Overview

The CPI Hub project is organized into the following team types:

### Core Product Teams

Product-focused teams that own specific functional domains of the CPI Hub platform.

### Platform Teams

Infrastructure and platform teams that provide shared services and tooling.

### Support Teams

Specialized teams that provide expertise and support across product teams.

### Leadership Team

Strategic direction and organizational coordination.
        `
      }
    ]
  };

  // Category names for easy reference
  const categories = [
    { id: "infrastructure", name: "Infrastructure", description: "Infrastructure documentation and technical architecture" },
    { id: "governance", name: "Governance", description: "Data governance and compliance documentation" },
    { id: "knowledge", name: "Knowledge Transfer", description: "Knowledge transfer and documentation guidelines" },
    { id: "team", name: "Team Structure", description: "Cross-functional team organization and responsibilities" }
  ];

  // Document list component for each category
  const DocumentList = ({ categoryId }: { categoryId: string }) => {
    const docs = documents[categoryId as keyof typeof documents] || [];
    
    return (
      <div className="space-y-4">
        {docs.map(doc => (
          <Card 
            key={doc.id} 
            className={`cursor-pointer hover:bg-accent/50 transition-colors ${activeDocument === doc.id ? 'border-primary' : ''}`}
            onClick={() => setActiveDocument(doc.id)}
          >
            <CardHeader className="p-4">
              <CardTitle className="text-md mb-1">{doc.title}</CardTitle>
              <CardDescription className="text-xs">{doc.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  };

  // Function to find the active document
  const findActiveDocument = () => {
    if (!activeDocument) return null;
    
    for (const category in documents) {
      const doc = (documents as any)[category].find((d: any) => d.id === activeDocument);
      if (doc) return doc;
    }
    
    return null;
  };
  
  const activeDoc = findActiveDocument();
  
  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  // Handle document upload
  const handleUpload = () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive"
      });
      return;
    }
    
    // Start uploading process
    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          
          // Complete the upload
          toast({
            title: "Upload successful",
            description: `${selectedFile.name} has been uploaded successfully.`
          });
          
          // Reset state
          setSelectedFile(null);
          setUploadDialogOpen(false);
          return 0;
        }
        return prev + 10;
      });
    }, 500);
  };
  
  // Handle document download
  const handleDownload = () => {
    if (!activeDoc) return;
    
    toast({
      title: "Download started",
      description: `${activeDoc.title} is being downloaded.`
    });
  };
  
  // Handle document sharing
  const handleShare = () => {
    if (!activeDoc) return;
    
    setShareDialogOpen(true);
  };
  
  // Handle document deletion
  const handleDelete = () => {
    if (!activeDoc) return;
    
    toast({
      title: "Document deleted",
      description: `${activeDoc.title} has been moved to trash.`,
      variant: "destructive"
    });
  };
  
  // Handle batch processing
  const handleBatchProcess = () => {
    setBatchProcessDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Documentation Center</h1>
          <p className="text-muted-foreground mt-1">
            Access technical documentation, governance guidelines, and team resources.
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleBatchProcess}>
            <FolderUp className="mr-2 h-4 w-4" />
            Batch Process
          </Button>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </div>
      </div>
      
      {activeDoc && (
        <div className="mb-6 flex justify-end space-x-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <Tabs defaultValue="infrastructure" className="w-full">
            <TabsList className="w-full grid grid-cols-2 md:grid-cols-1 mb-4">
              {categories.map(category => (
                <TabsTrigger key={category.id} value={category.id} className="justify-start text-left">
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {categories.map(category => (
              <TabsContent key={category.id} value={category.id} className="mt-0">
                <DocumentList categoryId={category.id} />
              </TabsContent>
            ))}
          </Tabs>
        </div>
        
        <div className="md:col-span-3">
          {activeDoc ? (
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle>{activeDoc.title}</CardTitle>
                <CardDescription>{activeDoc.description}</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                <ScrollArea className="h-[calc(100vh-300px)]">
                  <div className="prose dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm" style={{ fontFamily: 'inherit' }}>
                      {activeDoc.content}
                    </pre>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="pt-6 text-center">
                <div className="text-4xl font-light text-muted-foreground mb-3">📚</div>
                <h3 className="text-xl font-medium mb-2">Select a document</h3>
                <p className="text-muted-foreground max-w-md">
                  Choose a document from the left sidebar to view its contents here.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Upload Document Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a new document to the documentation center.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="document-type">Document Type</Label>
              <Select defaultValue="infrastructure">
                <SelectTrigger id="document-type">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="title">Document Title</Label>
              <Input id="title" placeholder="Enter document title" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" placeholder="Enter a short description" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="file">Select File</Label>
              <div className="grid w-full items-center gap-1.5">
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
                {selectedFile && (
                  <p className="text-xs text-muted-foreground">
                    Selected file: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                  </p>
                )}
              </div>
            </div>
            
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedFile(null);
                setUploadDialogOpen(false);
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Batch Process Dialog */}
      <Dialog open={batchProcessDialogOpen} onOpenChange={setBatchProcessDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Batch Process Documents</DialogTitle>
            <DialogDescription>
              Upload and process multiple documents at once.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="batch-type">Process Type</Label>
              <Select defaultValue="upload">
                <SelectTrigger id="batch-type">
                  <SelectValue placeholder="Select process type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upload">Batch Upload</SelectItem>
                  <SelectItem value="extract">Information Extraction</SelectItem>
                  <SelectItem value="convert">Format Conversion</SelectItem>
                  <SelectItem value="analyze">Text Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="target-category">Target Category</Label>
              <Select defaultValue="infrastructure">
                <SelectTrigger id="target-category">
                  <SelectValue placeholder="Select target category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="batch-files">Select Files</Label>
              <Input
                id="batch-files"
                type="file"
                multiple
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground mt-1">
                You can select multiple files to process together.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Processing Options</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="extract-metadata" className="rounded" />
                  <label htmlFor="extract-metadata" className="text-sm">Extract Metadata</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="auto-tag" className="rounded" />
                  <label htmlFor="auto-tag" className="text-sm">Auto-Tag</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="analyze-text" className="rounded" />
                  <label htmlFor="analyze-text" className="text-sm">Analyze Text</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="ocr-scan" className="rounded" />
                  <label htmlFor="ocr-scan" className="text-sm">OCR Scan</label>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchProcessDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({
                title: "Batch process started",
                description: "Your documents are being processed. You will be notified when complete."
              });
              setBatchProcessDialogOpen(false);
            }}>
              Start Processing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Share Document Dialog */}
      {activeDoc && (
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Share Document</DialogTitle>
              <DialogDescription>
                Share "{activeDoc.title}" with team members or external collaborators.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>People with access</Label>
                <div className="space-y-3">
                  {[
                    { name: 'Sarah Chen', email: 'sarah.c@example.com', role: 'Editor' },
                    { name: 'Mark Johnson', email: 'mark.j@example.com', role: 'Viewer' },
                  ].map((person, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-primary/10 mr-3 flex items-center justify-center text-xs font-medium">
                          {person.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{person.name}</div>
                          <div className="text-xs text-muted-foreground">{person.email}</div>
                        </div>
                      </div>
                      <Select defaultValue={person.role.toLowerCase()}>
                        <SelectTrigger className="w-[100px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Add people</Label>
                <div className="flex space-x-2">
                  <Input placeholder="Add email or name" className="flex-1" />
                  <Select defaultValue="viewer">
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Share link</Label>
                <div className="flex space-x-2">
                  <Input 
                    value={`https://cpihub.com/documents/${activeDoc.id}`} 
                    readOnly 
                    className="flex-1" 
                  />
                  <Button variant="outline" size="sm" onClick={() => {
                    toast({
                      title: "Link copied",
                      description: "Document link has been copied to clipboard"
                    });
                  }}>
                    Copy
                  </Button>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <input type="checkbox" id="anyone-with-link" className="rounded" />
                  <label htmlFor="anyone-with-link" className="text-sm">Anyone with the link can view</label>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                toast({
                  title: "Sharing settings updated",
                  description: "Your document sharing preferences have been saved."
                });
                setShareDialogOpen(false);
              }}>
                Save Settings
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}