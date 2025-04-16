import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Bell, 
  BellOff, 
  Mail, 
  MessageSquare, 
  Save, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  AlertTriangle,
  BarChart3, 
  Plus, 
  Trash2 
} from 'lucide-react';

interface AlertConfigurationProps {
  projectId?: number;
  teamId?: number;
}

export function AlertConfiguration({ projectId, teamId }: AlertConfigurationProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('threshold');
  const [thresholdAlerts, setThresholdAlerts] = useState([
    { 
      id: 1, 
      metric: 'completion-rate', 
      operator: 'less-than', 
      value: 70, 
      enabled: true,
      severity: 'medium',
      notifyEmail: true,
      notifySms: false
    },
    { 
      id: 2, 
      metric: 'document-processing', 
      operator: 'greater-than', 
      value: 100, 
      enabled: true,
      severity: 'low',
      notifyEmail: true,
      notifySms: false
    }
  ]);
  const [anomalyAlerts, setAnomalyAlerts] = useState([
    {
      id: 1,
      type: 'access-pattern',
      sensitivity: 'medium',
      enabled: true,
      notifyEmail: true,
      notifySms: false
    },
    {
      id: 2,
      type: 'user-activity',
      sensitivity: 'high',
      enabled: true,
      notifyEmail: true,
      notifySms: true
    }
  ]);
  
  // State for new alert form
  const [newThresholdMetric, setNewThresholdMetric] = useState('');
  const [newThresholdOperator, setNewThresholdOperator] = useState('');
  const [newThresholdValue, setNewThresholdValue] = useState('');
  const [newThresholdSeverity, setNewThresholdSeverity] = useState('');
  
  const [newAnomalyType, setNewAnomalyType] = useState('');
  const [newAnomalySensitivity, setNewAnomalySensitivity] = useState('');
  
  const [notificationEmail, setNotificationEmail] = useState('team@example.com');
  const [notificationPhone, setNotificationPhone] = useState('+1234567890');
  const [notificationSlack, setNotificationSlack] = useState('#alerts');

  const handleSaveConfiguration = () => {
    toast({
      title: "Alert configuration saved",
      description: "Your alert settings have been updated successfully."
    });
  };

  const handleAddThresholdAlert = () => {
    if (!newThresholdMetric || !newThresholdOperator || !newThresholdValue) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields for the threshold alert.",
        variant: "destructive"
      });
      return;
    }
    
    setThresholdAlerts([
      ...thresholdAlerts,
      {
        id: thresholdAlerts.length + 1,
        metric: newThresholdMetric,
        operator: newThresholdOperator,
        value: parseInt(newThresholdValue),
        enabled: true,
        severity: newThresholdSeverity || 'medium',
        notifyEmail: true,
        notifySms: false
      }
    ]);
    
    // Reset form
    setNewThresholdMetric('');
    setNewThresholdOperator('');
    setNewThresholdValue('');
    setNewThresholdSeverity('');
    
    toast({
      title: "Threshold alert added",
      description: "Your new threshold alert has been created."
    });
  };

  const handleAddAnomalyAlert = () => {
    if (!newAnomalyType || !newAnomalySensitivity) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields for the anomaly alert.",
        variant: "destructive"
      });
      return;
    }
    
    setAnomalyAlerts([
      ...anomalyAlerts,
      {
        id: anomalyAlerts.length + 1,
        type: newAnomalyType,
        sensitivity: newAnomalySensitivity,
        enabled: true,
        notifyEmail: true,
        notifySms: false
      }
    ]);
    
    // Reset form
    setNewAnomalyType('');
    setNewAnomalySensitivity('');
    
    toast({
      title: "Anomaly alert added",
      description: "Your new anomaly detection alert has been created."
    });
  };

  const handleRemoveThresholdAlert = (id: number) => {
    setThresholdAlerts(thresholdAlerts.filter(alert => alert.id !== id));
    
    toast({
      title: "Alert removed",
      description: "The threshold alert has been removed."
    });
  };

  const handleRemoveAnomalyAlert = (id: number) => {
    setAnomalyAlerts(anomalyAlerts.filter(alert => alert.id !== id));
    
    toast({
      title: "Alert removed",
      description: "The anomaly alert has been removed."
    });
  };

  const handleToggleThresholdAlert = (id: number) => {
    setThresholdAlerts(thresholdAlerts.map(alert => 
      alert.id === id ? { ...alert, enabled: !alert.enabled } : alert
    ));
  };

  const handleToggleAnomalyAlert = (id: number) => {
    setAnomalyAlerts(anomalyAlerts.map(alert => 
      alert.id === id ? { ...alert, enabled: !alert.enabled } : alert
    ));
  };

  // Get human-readable version of metric names and operators
  const getMetricName = (metricId: string) => {
    switch(metricId) {
      case 'completion-rate': return 'Project Completion Rate';
      case 'document-processing': return 'Document Processing Volume';
      case 'api-calls': return 'API Call Count';
      case 'active-users': return 'Active Users';
      case 'response-time': return 'System Response Time';
      default: return metricId;
    }
  };

  const getOperatorSymbol = (operatorId: string) => {
    switch(operatorId) {
      case 'less-than': return '<';
      case 'greater-than': return '>';
      case 'equal-to': return '=';
      case 'not-equal': return '≠';
      default: return operatorId;
    }
  };

  const getAnomalyTypeName = (typeId: string) => {
    switch(typeId) {
      case 'access-pattern': return 'Unusual Access Patterns';
      case 'user-activity': return 'User Activity Spikes';
      case 'system-performance': return 'System Performance Degradation';
      case 'data-quality': return 'Data Quality Issues';
      case 'security': return 'Security Anomalies';
      default: return typeId;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Alert Configuration</CardTitle>
        <CardDescription>
          Configure and manage threshold and anomaly detection alerts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="threshold">
              <BarChart3 className="h-4 w-4 mr-2" />
              Threshold Alerts
            </TabsTrigger>
            <TabsTrigger value="anomaly">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Anomaly Detection
            </TabsTrigger>
            <TabsTrigger value="notification">
              <Bell className="h-4 w-4 mr-2" />
              Notification Settings
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="threshold" className="space-y-4">
            <div className="space-y-4">
              {thresholdAlerts.map(alert => (
                <div key={alert.id} className="flex items-start justify-between p-4 border rounded-md">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <Switch 
                        checked={alert.enabled} 
                        onCheckedChange={() => handleToggleThresholdAlert(alert.id)} 
                        className="mr-2" 
                      />
                      <h3 className="font-medium">
                        {getMetricName(alert.metric)} {getOperatorSymbol(alert.operator)} {alert.value}
                      </h3>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground flex items-center space-x-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        alert.severity === 'high' ? 'bg-red-100 text-red-800' : 
                        alert.severity === 'medium' ? 'bg-amber-100 text-amber-800' : 
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)} Priority
                      </span>
                      <span>{alert.notifyEmail ? 'Email' : ''} {alert.notifyEmail && alert.notifySms ? '+' : ''} {alert.notifySms ? 'SMS' : ''}</span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleRemoveThresholdAlert(alert.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="border rounded-md p-4 space-y-4">
              <h3 className="font-medium">Add New Threshold Alert</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="metric">Metric</Label>
                  <Select value={newThresholdMetric} onValueChange={setNewThresholdMetric}>
                    <SelectTrigger id="metric">
                      <SelectValue placeholder="Select metric" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completion-rate">Project Completion Rate</SelectItem>
                      <SelectItem value="document-processing">Document Processing Volume</SelectItem>
                      <SelectItem value="api-calls">API Call Count</SelectItem>
                      <SelectItem value="active-users">Active Users</SelectItem>
                      <SelectItem value="response-time">System Response Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="operator">Operator</Label>
                  <Select value={newThresholdOperator} onValueChange={setNewThresholdOperator}>
                    <SelectTrigger id="operator">
                      <SelectValue placeholder="Select operator" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="less-than">Less Than (&lt;)</SelectItem>
                      <SelectItem value="greater-than">Greater Than (&gt;)</SelectItem>
                      <SelectItem value="equal-to">Equal To (=)</SelectItem>
                      <SelectItem value="not-equal">Not Equal (≠)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="value">Value</Label>
                  <Input 
                    id="value" 
                    type="number" 
                    placeholder="Threshold value" 
                    value={newThresholdValue}
                    onChange={(e) => setNewThresholdValue(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="severity">Priority Level</Label>
                  <Select value={newThresholdSeverity} onValueChange={setNewThresholdSeverity}>
                    <SelectTrigger id="severity">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="low">Low Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button onClick={handleAddThresholdAlert}>
                <Plus className="h-4 w-4 mr-2" />
                Add Threshold Alert
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="anomaly" className="space-y-4">
            <div className="space-y-4">
              {anomalyAlerts.map(alert => (
                <div key={alert.id} className="flex items-start justify-between p-4 border rounded-md">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <Switch 
                        checked={alert.enabled} 
                        onCheckedChange={() => handleToggleAnomalyAlert(alert.id)} 
                        className="mr-2" 
                      />
                      <h3 className="font-medium">
                        {getAnomalyTypeName(alert.type)}
                      </h3>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground flex items-center space-x-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        alert.sensitivity === 'high' ? 'bg-red-100 text-red-800' : 
                        alert.sensitivity === 'medium' ? 'bg-amber-100 text-amber-800' : 
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {alert.sensitivity.charAt(0).toUpperCase() + alert.sensitivity.slice(1)} Sensitivity
                      </span>
                      <span>{alert.notifyEmail ? 'Email' : ''} {alert.notifyEmail && alert.notifySms ? '+' : ''} {alert.notifySms ? 'SMS' : ''}</span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleRemoveAnomalyAlert(alert.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="border rounded-md p-4 space-y-4">
              <h3 className="font-medium">Add New Anomaly Detection</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="anomaly-type">Anomaly Type</Label>
                  <Select value={newAnomalyType} onValueChange={setNewAnomalyType}>
                    <SelectTrigger id="anomaly-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="access-pattern">Unusual Access Patterns</SelectItem>
                      <SelectItem value="user-activity">User Activity Spikes</SelectItem>
                      <SelectItem value="system-performance">System Performance Degradation</SelectItem>
                      <SelectItem value="data-quality">Data Quality Issues</SelectItem>
                      <SelectItem value="security">Security Anomalies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sensitivity">Sensitivity</Label>
                  <Select value={newAnomalySensitivity} onValueChange={setNewAnomalySensitivity}>
                    <SelectTrigger id="sensitivity">
                      <SelectValue placeholder="Select sensitivity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High (More Alerts)</SelectItem>
                      <SelectItem value="medium">Medium (Balanced)</SelectItem>
                      <SelectItem value="low">Low (Fewer Alerts)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button onClick={handleAddAnomalyAlert}>
                <Plus className="h-4 w-4 mr-2" />
                Add Anomaly Detection
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="notification" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Notifications</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input 
                      id="email" 
                      placeholder="recipient@example.com" 
                      type="email"
                      value={notificationEmail}
                      onChange={(e) => setNotificationEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Switch checked id="email-enabled" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Separate multiple email addresses with commas
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sms">SMS Notifications</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input 
                      id="sms" 
                      placeholder="+1234567890" 
                      value={notificationPhone}
                      onChange={(e) => setNotificationPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <Switch id="sms-enabled" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use international format with country code
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slack">Slack Channel</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input 
                      id="slack" 
                      placeholder="#alerts" 
                      value={notificationSlack}
                      onChange={(e) => setNotificationSlack(e.target.value)}
                    />
                  </div>
                  <div>
                    <Switch checked id="slack-enabled" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Notifications will be sent to this Slack channel
                </p>
              </div>
              
              <div className="pt-4">
                <h3 className="font-medium mb-2">Alert Digest Frequency</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input type="radio" id="digest-realtime" name="digest" defaultChecked />
                    <Label htmlFor="digest-realtime">Real-time (immediate)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="radio" id="digest-hourly" name="digest" />
                    <Label htmlFor="digest-hourly">Hourly digest</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="radio" id="digest-daily" name="digest" />
                    <Label htmlFor="digest-daily">Daily digest</Label>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSaveConfiguration}>
          <Save className="h-4 w-4 mr-2" />
          Save Configuration
        </Button>
      </CardFooter>
    </Card>
  );
}