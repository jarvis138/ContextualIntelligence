import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DocumentsPage() {
  const [activeDocument, setActiveDocument] = useState<string | null>(null);
  
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
              <CardTitle className="text-md">{doc.title}</CardTitle>
              <CardDescription>{doc.description}</CardDescription>
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

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Documentation Center</h1>
      <p className="text-muted-foreground mb-6">
        Access technical documentation, governance guidelines, and team resources.
      </p>
      
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
    </div>
  );
}