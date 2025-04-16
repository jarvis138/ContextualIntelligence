import { useLocation } from "wouter";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteComponentProps } from "wouter";

type PlaceholderPageProps = {
  pageName?: string;
};

// Handle both wouter RouteComponentProps and custom props
export default function PlaceholderPage(props: RouteComponentProps | PlaceholderPageProps) {
  const [location] = useLocation();
  const pageName = 'pageName' in props ? props.pageName : undefined;
  const pageTitle = pageName || location.substring(1).charAt(0).toUpperCase() + location.substring(2);
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">{pageTitle}</h1>
      
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Page Under Development</AlertTitle>
        <AlertDescription>
          This page is currently under development as part of Phase 2 implementation.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Feature Implementation Status</CardTitle>
            <CardDescription>Current status of this feature's implementation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Planning</span>
                  <span className="text-green-600 font-medium">Complete</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: '100%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Design</span>
                  <span className="text-green-600 font-medium">Complete</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: '100%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Development</span>
                  <span className="text-amber-600 font-medium">In Progress</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded overflow-hidden">
                  <div className="bg-amber-500 h-full" style={{ width: '35%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Testing</span>
                  <span className="text-gray-600 font-medium">Not Started</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: '0%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Deployment</span>
                  <span className="text-gray-600 font-medium">Not Started</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: '0%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Estimated Timeline</CardTitle>
            <CardDescription>Expected completion dates</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex justify-between items-center">
                <span className="text-sm">Initial Release</span>
                <span className="text-sm font-medium">June 2025</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-sm">Beta Testing</span>
                <span className="text-sm font-medium">July 2025</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-sm">Full Deployment</span>
                <span className="text-sm font-medium">August 2025</span>
              </li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Planned Features</CardTitle>
            <CardDescription>Key features for this section</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start">
                <div className="mr-2 mt-0.5 h-2 w-2 rounded-full bg-primary"></div>
                <span className="text-sm">Comprehensive data visualization</span>
              </li>
              <li className="flex items-start">
                <div className="mr-2 mt-0.5 h-2 w-2 rounded-full bg-primary"></div>
                <span className="text-sm">Advanced filtering and search</span>
              </li>
              <li className="flex items-start">
                <div className="mr-2 mt-0.5 h-2 w-2 rounded-full bg-primary"></div>
                <span className="text-sm">Real-time updates and notifications</span>
              </li>
              <li className="flex items-start">
                <div className="mr-2 mt-0.5 h-2 w-2 rounded-full bg-primary"></div>
                <span className="text-sm">Exportable reports and analytics</span>
              </li>
              <li className="flex items-start">
                <div className="mr-2 mt-0.5 h-2 w-2 rounded-full bg-primary"></div>
                <span className="text-sm">Team collaboration tools</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}