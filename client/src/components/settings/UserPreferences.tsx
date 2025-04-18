import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatedList } from "@/components/ui/animated-list";

import { usePreferences } from '@/context/PreferencesContext';
import { 
  ThemeMode, 
  AccentColor, 
  BorderRadius, 
  ViewMode,
  UserPreferences as UserPreferencesType 
} from '@/lib/user-preferences';
import { AnimationSpeed } from '@/lib/animations';

import { 
  Moon, 
  Sun, 
  Monitor, 
  LayoutGrid, 
  LayoutList, 
  Table2, 
  Eye, 
  EyeOff,
  PanelLeft,
  RefreshCw
} from 'lucide-react';

interface IPreferenceSection {
  title: string;
  description: string;
  children: React.ReactNode;
}

const PreferenceSection: React.FC<IPreferenceSection> = ({ 
  title, 
  description, 
  children 
}) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      {children}
    </CardContent>
  </Card>
);

const UserPreferences: React.FC = () => {
  const { preferences, setPreference, resetPreferences } = usePreferences();

  // Theme Mode preferences
  const handleThemeModeChange = (mode: ThemeMode) => {
    setPreference('theme', 'mode', mode);
  };

  // Accent Color preferences
  const handleAccentColorChange = (color: AccentColor) => {
    setPreference('theme', 'accentColor', color);
  };

  // Border Radius preferences
  const handleBorderRadiusChange = (radius: BorderRadius) => {
    setPreference('theme', 'borderRadius', radius);
  };

  // Animation Speed preferences
  const handleAnimationSpeedChange = (speed: AnimationSpeed) => {
    setPreference('theme', 'animations', speed);
  };

  // Reduced Motion preferences
  const handleReducedMotionChange = (checked: boolean) => {
    setPreference('theme', 'reduceMotion', checked);
  };

  // High Contrast preferences
  const handleHighContrastChange = (checked: boolean) => {
    setPreference('theme', 'contrastMode', checked);
  };

  // Layout: Sidebar preferences
  const handleSidebarChange = (collapsed: boolean) => {
    setPreference('layout', 'sidebarCollapsed', collapsed);
  };

  // Layout: Density preferences
  const handleDensityChange = (dense: boolean) => {
    setPreference('layout', 'denseMode', dense);
  };

  // Layout: Default View preferences
  const handleDefaultViewChange = (view: ViewMode) => {
    setPreference('layout', 'defaultView', view);
  };

  // Layout: Document Preview preferences
  const handlePreviewChange = (show: boolean) => {
    setPreference('layout', 'showDocumentPreview', show);
  };

  // AI preferences
  const handleAiSuggestionsChange = (enabled: boolean) => {
    setPreference('ai', 'aiSuggestions', enabled);
  };

  const handlePersonalizationChange = (enabled: boolean) => {
    setPreference('ai', 'personalization', enabled);
  };

  const handleUsageDataChange = (enabled: boolean) => {
    setPreference('ai', 'collectUsageData', enabled);
  };

  return (
    <Tabs defaultValue="theme" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="theme">Theme</TabsTrigger>
        <TabsTrigger value="layout">Layout</TabsTrigger>
        <TabsTrigger value="ai">AI Features</TabsTrigger>
      </TabsList>

      <TabsContent value="theme" className="space-y-4">
        <PreferenceSection
          title="Theme Mode"
          description="Choose your preferred color scheme"
        >
          <RadioGroup
            value={preferences.theme.mode}
            onValueChange={(value) => handleThemeModeChange(value as ThemeMode)}
            className="flex flex-col md:flex-row gap-4"
          >
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="light" id="theme-light" className="mt-1" />
              <div className="grid gap-1.5">
                <Label htmlFor="theme-light" className="font-medium flex items-center">
                  <Sun className="h-4 w-4 mr-2" />
                  Light
                </Label>
                <p className="text-sm text-muted-foreground">
                  Light mode for bright environments
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="dark" id="theme-dark" className="mt-1" />
              <div className="grid gap-1.5">
                <Label htmlFor="theme-dark" className="font-medium flex items-center">
                  <Moon className="h-4 w-4 mr-2" />
                  Dark
                </Label>
                <p className="text-sm text-muted-foreground">
                  Dark mode for low-light environments
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="system" id="theme-system" className="mt-1" />
              <div className="grid gap-1.5">
                <Label htmlFor="theme-system" className="font-medium flex items-center">
                  <Monitor className="h-4 w-4 mr-2" />
                  System
                </Label>
                <p className="text-sm text-muted-foreground">
                  Follow your system preferences
                </p>
              </div>
            </div>
          </RadioGroup>
        </PreferenceSection>

        <PreferenceSection
          title="Accent Color"
          description="Choose the primary color for buttons, links, and accents"
        >
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {(
              [
                { name: "blue", color: "#0B4C79" },
                { name: "violet", color: "#7c3aed" },
                { name: "green", color: "#10b981" },
                { name: "orange", color: "#f97316" },
                { name: "red", color: "#ef4444" },
                { name: "neutral", color: "#CED7DD" },
              ] as const
            ).map(({ name, color }) => (
              <div key={name} className="text-center">
                <button
                  type="button"
                  onClick={() => handleAccentColorChange(name)}
                  className={`h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-2 transition-all ${
                    preferences.theme.accentColor === name
                      ? "ring-2 ring-offset-2 ring-foreground"
                      : ""
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {preferences.theme.accentColor === name && (
                    <span className="text-white">✓</span>
                  )}
                </button>
                <span className="text-sm capitalize">{name}</span>
              </div>
            ))}
          </div>
        </PreferenceSection>

        <PreferenceSection
          title="Border Radius"
          description="Adjust the roundness of corners throughout the interface"
        >
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Label>Corner Roundness</Label>
              <div className="text-sm text-muted-foreground capitalize">
                {preferences.theme.borderRadius}
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {(["none", "small", "medium", "large", "full"] as const).map(
                (radius) => (
                  <button
                    key={radius}
                    type="button"
                    onClick={() => handleBorderRadiusChange(radius)}
                    className={`h-16 border transition-colors ${
                      preferences.theme.borderRadius === radius
                        ? "border-2 border-primary"
                        : "border-border"
                    }`}
                    style={{
                      borderRadius:
                        radius === "none"
                          ? "0"
                          : radius === "small"
                          ? "0.25rem"
                          : radius === "medium"
                          ? "0.5rem"
                          : radius === "large"
                          ? "0.75rem"
                          : "9999px",
                    }}
                  ></button>
                )
              )}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>No corners</span>
              <span>Fully rounded</span>
            </div>
          </div>
        </PreferenceSection>

        <PreferenceSection
          title="Animations"
          description="Control the speed and behavior of animations"
        >
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Label>Animation Speed</Label>
              <div className="text-sm text-muted-foreground capitalize">
                {preferences.theme.animations}
              </div>
            </div>
            <RadioGroup
              value={preferences.theme.animations}
              onValueChange={(value) => handleAnimationSpeedChange(value as AnimationSpeed)}
              className="flex flex-col gap-4"
            >
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="none" id="animation-none" className="mt-1" />
                <div className="grid gap-1.5">
                  <Label htmlFor="animation-none" className="font-medium">
                    None
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Disable all animations
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="slow" id="animation-slow" className="mt-1" />
                <div className="grid gap-1.5">
                  <Label htmlFor="animation-slow" className="font-medium">
                    Slow
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Slower, more gentle animations
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="medium" id="animation-medium" className="mt-1" />
                <div className="grid gap-1.5">
                  <Label htmlFor="animation-medium" className="font-medium">
                    Medium
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Standard animation speed (default)
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="fast" id="animation-fast" className="mt-1" />
                <div className="grid gap-1.5">
                  <Label htmlFor="animation-fast" className="font-medium">
                    Fast
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Quick, snappy animations
                  </p>
                </div>
              </div>
            </RadioGroup>

            <div className="flex items-center justify-between pt-4">
              <div className="space-y-0.5">
                <Label htmlFor="reduced-motion">Reduced Motion</Label>
                <p className="text-sm text-muted-foreground">
                  Minimize animations for improved accessibility
                </p>
              </div>
              <Switch
                id="reduced-motion"
                checked={preferences.theme.reduceMotion}
                onCheckedChange={handleReducedMotionChange}
              />
            </div>
          </div>
        </PreferenceSection>

        <PreferenceSection
          title="Accessibility"
          description="Additional settings to improve accessibility"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="high-contrast">High Contrast Mode</Label>
              <p className="text-sm text-muted-foreground">
                Increase contrast for better readability
              </p>
            </div>
            <Switch
              id="high-contrast"
              checked={preferences.theme.contrastMode}
              onCheckedChange={handleHighContrastChange}
            />
          </div>
        </PreferenceSection>
      </TabsContent>

      <TabsContent value="layout" className="space-y-4">
        <PreferenceSection
          title="Sidebar"
          description="Configure sidebar visibility and behavior"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sidebar-collapsed">Collapsed Sidebar</Label>
              <p className="text-sm text-muted-foreground">
                Use a compact sidebar with icons only
              </p>
            </div>
            <Switch
              id="sidebar-collapsed"
              checked={preferences.layout.sidebarCollapsed}
              onCheckedChange={handleSidebarChange}
            />
          </div>
        </PreferenceSection>

        <PreferenceSection
          title="Layout Density"
          description="Control the compactness of the interface"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dense-mode">Dense Mode</Label>
              <p className="text-sm text-muted-foreground">
                Reduce spacing to fit more content on screen
              </p>
            </div>
            <Switch
              id="dense-mode"
              checked={preferences.layout.denseMode}
              onCheckedChange={handleDensityChange}
            />
          </div>
        </PreferenceSection>

        <PreferenceSection
          title="Default View"
          description="Set your preferred content view mode"
        >
          <RadioGroup
            value={preferences.layout.defaultView}
            onValueChange={(value) => handleDefaultViewChange(value as ViewMode)}
            className="flex flex-col sm:flex-row gap-4"
          >
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="grid" id="view-grid" className="mt-1" />
              <div className="grid gap-1.5">
                <Label htmlFor="view-grid" className="font-medium flex items-center">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Grid
                </Label>
                <p className="text-sm text-muted-foreground">
                  Card-based grid layout
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="list" id="view-list" className="mt-1" />
              <div className="grid gap-1.5">
                <Label htmlFor="view-list" className="font-medium flex items-center">
                  <LayoutList className="h-4 w-4 mr-2" />
                  List
                </Label>
                <p className="text-sm text-muted-foreground">
                  Compact list view
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="table" id="view-table" className="mt-1" />
              <div className="grid gap-1.5">
                <Label htmlFor="view-table" className="font-medium flex items-center">
                  <Table2 className="h-4 w-4 mr-2" />
                  Table
                </Label>
                <p className="text-sm text-muted-foreground">
                  Detailed tabular view
                </p>
              </div>
            </div>
          </RadioGroup>
        </PreferenceSection>

        <PreferenceSection
          title="Document Preview"
          description="Configure document preview behavior"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-preview">Document Previews</Label>
              <p className="text-sm text-muted-foreground">
                Show document previews when hovering over items
              </p>
            </div>
            <Switch
              id="show-preview"
              checked={preferences.layout.showDocumentPreview}
              onCheckedChange={handlePreviewChange}
            />
          </div>
        </PreferenceSection>
      </TabsContent>

      <TabsContent value="ai" className="space-y-4">
        <PreferenceSection
          title="AI Features"
          description="Configure AI-assisted features and suggestions"
        >
          <AnimatedList className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ai-suggestions">AI Suggestions</Label>
                <p className="text-sm text-muted-foreground">
                  Receive AI-powered suggestions and insights
                </p>
              </div>
              <Switch
                id="ai-suggestions"
                checked={preferences.ai.aiSuggestions}
                onCheckedChange={handleAiSuggestionsChange}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="personalization">Personalization</Label>
                <p className="text-sm text-muted-foreground">
                  Allow AI to personalize your experience based on usage
                </p>
              </div>
              <Switch
                id="personalization"
                checked={preferences.ai.personalization}
                onCheckedChange={handlePersonalizationChange}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="usage-data">Usage Data Collection</Label>
                <p className="text-sm text-muted-foreground">
                  Share anonymous usage data to improve AI capabilities
                </p>
              </div>
              <Switch
                id="usage-data"
                checked={preferences.ai.collectUsageData}
                onCheckedChange={handleUsageDataChange}
              />
            </div>
          </AnimatedList>
        </PreferenceSection>
      </TabsContent>

      <Button 
        variant="outline" 
        onClick={resetPreferences}
        className="mt-6 flex items-center"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Reset to Defaults
      </Button>
    </Tabs>
  );
};

export default UserPreferences;