import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface FeatureStatus {
  name: string;
  status: 'complete' | 'in-progress' | 'planned';
  progress: number;
}

export function SearchImplementationCard() {
  const features: FeatureStatus[] = [
    {
      name: 'Cross-Platform Query Engine',
      status: 'complete',
      progress: 100
    },
    {
      name: 'Tenant Isolation & Data Security',
      status: 'complete',
      progress: 100
    },
    {
      name: 'AI-Enhanced Result Ranking',
      status: 'complete',
      progress: 100
    },
    {
      name: 'Multi-Index Search Architecture',
      status: 'complete',
      progress: 100
    },
    {
      name: 'Real-Time Knowledge Graph',
      status: 'complete',
      progress: 100
    }
  ];

  return (
    <Card className="border rounded-md">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-xl font-semibold">Enterprise-Grade Search Implementation</CardTitle>
        <p className="text-sm text-muted-foreground">Features aligned with the Technical Product Requirements</p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-4">
          {features.map((feature) => (
            <div key={feature.name} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{feature.name}</span>
                <span className="text-xs text-cyan-600 font-medium">
                  Complete
                </span>
              </div>
              <Progress value={feature.progress} className="h-2 bg-background" indicatorClassName="bg-cyan-500" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}