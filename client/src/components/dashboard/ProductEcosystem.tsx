import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Activity, Search, Command, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Product card interfaces
interface ProductFeature {
  text: string;
}

interface ProductUseCase {
  text: string;
}

interface ProductCardProps {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  features: ProductFeature[];
  useCases: ProductUseCase[];
  ctaText?: string;
  ctaLink?: string;
  primaryColor?: string;
  isAIPowered?: boolean;
}

const ProductCard = ({
  title, 
  subtitle,
  description,
  icon,
  features,
  useCases,
  ctaText = "Learn More",
  ctaLink = "#",
  primaryColor = "bg-primary/10",
  isAIPowered = true
}: ProductCardProps) => {
  return (
    <Card className="overflow-hidden h-full flex flex-col transition-all duration-300 hover:shadow-md">
      <CardHeader className={cn("pb-2", primaryColor)}>
        <div className="flex justify-between items-start">
          <div className="p-2 rounded-full bg-white/90 shadow-sm">
            {icon}
          </div>
          {isAIPowered && (
            <Badge variant="secondary" className="bg-primary/20 hover:bg-primary/30">
              AI Powered
            </Badge>
          )}
        </div>
        <CardTitle className="mt-2 text-xl">{title}</CardTitle>
        <CardDescription className="font-medium italic">"{subtitle}"</CardDescription>
      </CardHeader>
      <CardContent className="py-4 flex-1">
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2">Key Features:</h4>
          <ul className="space-y-1">
            {features.slice(0, 3).map((feature, index) => (
              <li key={index} className="text-sm flex items-start">
                <span className="text-primary mr-2 mt-1">✨</span>
                <span>{feature.text}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h4 className="text-sm font-semibold mb-2">Use Cases:</h4>
          <ul className="space-y-1">
            {useCases.slice(0, 2).map((useCase, index) => (
              <li key={index} className="text-sm flex items-start">
                <span className="text-primary mr-2 mt-1">✅</span>
                <span>{useCase.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter className="pt-2 pb-4">
        <Button variant="outline" className="w-full" asChild>
          <a href={ctaLink}>{ctaText}</a>
        </Button>
      </CardFooter>
    </Card>
  );
};

export function ProductEcosystem() {
  const products = [
    {
      title: "Nuvexa AI",
      subtitle: "The Intelligence Engine Behind Every Project",
      description: "Your central cognitive layer. Nuvexa AI powers real-time understanding of project status, blockers, priorities, and people dynamics — across all tools.",
      icon: <Brain className="h-6 w-6 text-primary" />,
      features: [
        { text: "Natural Language Understanding across Slack, Docs, Emails" },
        { text: "Contextual Summarization of team updates & documents" },
        { text: "Sentiment and intent analysis from conversations" },
        { text: "Predictive task prioritization and next-step suggestions" },
        { text: "AI memory of decisions, context threads, and rationale" }
      ],
      useCases: [
        { text: "Ask: \"What's blocking the design sprint?\"" },
        { text: "Auto-generate project briefs or summaries" },
        { text: "Understand team sentiment without 1:1s" }
      ],
      primaryColor: "bg-primary/10",
      isAIPowered: true
    },
    {
      title: "Nuvexa Pulse",
      subtitle: "Know the Health of Every Project, Instantly",
      description: "Pulse gives real-time emotional, operational, and status-based health checks for teams and initiatives.",
      icon: <Activity className="h-6 w-6 text-rose-500" />,
      features: [
        { text: "Team mood & engagement monitoring" },
        { text: "Blocker detection and escalation alerts" },
        { text: "Confidence tracking (per project/task)" },
        { text: "Burnout and workload imbalance indicators" },
        { text: "Automated Pulse Reports sent to leads" }
      ],
      useCases: [
        { text: "Visualize: Are we on track emotionally + operationally?" },
        { text: "Spot early friction or silos" },
        { text: "Drive healthy velocity with human alignment" }
      ],
      primaryColor: "bg-rose-500/10", 
      isAIPowered: true
    },
    {
      title: "Nuvexa Lens",
      subtitle: "Project Intelligence in a Single View",
      description: "A dynamic dashboard for PMs, leads, and execs. See progress, blockers, decisions, conversations — all stitched together.",
      icon: <Search className="h-6 w-6 text-amber-500" />,
      features: [
        { text: "Contextual timelines with AI-stitched updates" },
        { text: "Threaded views of docs, tasks, and chats per objective" },
        { text: "Search by topic, decision, or team member" },
        { text: "Customizable \"focus modes\" (e.g., only blockers, only design)" }
      ],
      useCases: [
        { text: "Zoom into a project phase and see what changed and why" },
        { text: "Follow project evolution without attending 10 meetings" },
        { text: "Create AI-driven reports for leadership in seconds" }
      ],
      primaryColor: "bg-amber-500/10",
      isAIPowered: true
    },
    {
      title: "Nuvexa Hub",
      subtitle: "Your Command Center for Contextual Work",
      description: "The heart of the ecosystem. Nuvexa Hub brings all your tools, data, workflows, and teams into a context-aware command center.",
      icon: <Command className="h-6 w-6 text-indigo-500" />,
      features: [
        { text: "Unified interface for project, task, and team management" },
        { text: "Role-based views and permissions" },
        { text: "Contextual feeds from integrations (Slack, GitHub, Trello, Docs)" },
        { text: "One-click deep linking to source tools" }
      ],
      useCases: [
        { text: "Replace fragmented PM dashboards" },
        { text: "Align teams from one context-aware interface" },
        { text: "Connect tools without losing meaning" }
      ],
      primaryColor: "bg-indigo-500/10",
      isAIPowered: true
    },
    {
      title: "Nuvexa Sync",
      subtitle: "Effortless Integration, Total Harmony",
      description: "Sync connects your existing tools — and brings their data into Nuvexa's intelligence fabric.",
      icon: <RefreshCw className="h-6 w-6 text-emerald-500" />,
      features: [
        { text: "Native integrations (Slack, GitHub, Google Docs, Jira, Notion)" },
        { text: "OAuth-based secure connection flows" },
        { text: "AI-context extraction from each tool" },
        { text: "Integration status and sync error monitoring" },
        { text: "Admin dashboard for managing access and flow logic" }
      ],
      useCases: [
        { text: "Auto-sync updates across tools with context preserved" },
        { text: "Build no-code workflows triggered by conversations" },
        { text: "Keep data clean, connected, and enriched in real-time" }
      ],
      primaryColor: "bg-emerald-500/10",
      isAIPowered: false
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">The Nuvexa Ecosystem</h2>
        <p className="text-muted-foreground">
          Five integrated products that work together to provide complete project intelligence.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product, index) => (
          <ProductCard key={index} {...product} />
        ))}
      </div>
    </div>
  );
}