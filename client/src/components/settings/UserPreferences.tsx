import React, { useState } from "react";
import { motion } from "framer-motion";
import { usePreferences } from "@/context/PreferencesContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { AnimatedButton } from "@/components/ui/animated-button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccentColor, AnimationSpeed, BorderRadius, ThemeMode } from "@/lib/user-preferences";
import { containerVariants, listItemVariants } from "@/lib/animations";
import { AlertTriangle, Monitor, CheckCircle, Undo2 } from "lucide-react";

const UserPreferences: React.FC = () => {
  const { preferences, updatePreferences, resetPreferences } = usePreferences();
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Handle form reset
  const handleReset = () => {
    if (confirmReset) {
      resetPreferences();
      setHasChanges(false);
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
    }
  };

  return (
    <motion.div 
      className="w-full max-w-5xl"
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold">User Preferences</h2>
          <p className="text-muted-foreground mt-1">
            Customize your experience with Novexa
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <div className="text-sm text-amber-600 dark:text-amber-400 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" />
              <span>Unsaved changes</span>
            </div>
          )}
          <AnimatedButton
            variant="outline"
            onClick={handleReset}
            className={confirmReset ? "bg-destructive text-destructive-foreground" : ""}
          >
            <Undo2 className="h-4 w-4 mr-2" />
            {confirmReset ? "Confirm Reset" : "Reset All"}
          </AnimatedButton>
        </div>
      </div>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="ai">AI Features</TabsTrigger>
        </TabsList>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            <motion.div variants={listItemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Theme</CardTitle>
                  <CardDescription>Customize the look and feel of the application</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Mode</Label>
                    <RadioGroup 
                      defaultValue={preferences.ui.theme.mode}
                      onValueChange={(value: ThemeMode) => {
                        updatePreferences({ 
                          ui: { 
                            theme: { 
                              ...preferences.ui.theme, 
                              mode: value 
                            } 
                          } 
                        });
                        setHasChanges(true);
                      }}
                      className="flex space-x-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="light" id="light" />
                        <Label htmlFor="light">Light</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="dark" id="dark" />
                        <Label htmlFor="dark">Dark</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="system" id="system" />
                        <Label htmlFor="system" className="flex items-center">
                          <Monitor className="h-4 w-4 mr-1" />
                          System
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <div className="grid grid-cols-6 gap-2">
                      {["blue", "violet", "green", "orange", "red", "neutral"].map((color) => (
                        <button
                          key={color}
                          onClick={() => {
                            updatePreferences({
                              ui: {
                                theme: {
                                  ...preferences.ui.theme,
                                  accentColor: color as AccentColor,
                                },
                              },
                            });
                            setHasChanges(true);
                          }}
                          className={`w-full aspect-square rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                            preferences.ui.theme.accentColor === color
                              ? "ring-2 ring-ring ring-offset-2"
                              : ""
                          }`}
                          style={{
                            backgroundColor: `var(--color-${color}-500)`,
                          }}
                          aria-label={`${color} theme`}
                        >
                          {preferences.ui.theme.accentColor === color && (
                            <CheckCircle className="h-4 w-4 text-white mx-auto" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Border Radius</Label>
                    <Select 
                      defaultValue={preferences.ui.theme.borderRadius}
                      onValueChange={(value: BorderRadius) => {
                        updatePreferences({ 
                          ui: { 
                            theme: { 
                              ...preferences.ui.theme, 
                              borderRadius: value 
                            } 
                          } 
                        });
                        setHasChanges(true);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select border radius" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                        <SelectItem value="full">Full (Rounded)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Animation Speed</Label>
                    <Select 
                      defaultValue={preferences.ui.theme.animations}
                      onValueChange={(value: AnimationSpeed) => {
                        updatePreferences({ 
                          ui: { 
                            theme: { 
                              ...preferences.ui.theme, 
                              animations: value 
                            } 
                          } 
                        });
                        setHasChanges(true);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select animation speed" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="slow">Slow</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="fast">Fast</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={listItemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Layout Preferences</CardTitle>
                  <CardDescription>Configure how the interface is displayed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sidebar Collapsed</Label>
                      <p className="text-sm text-muted-foreground">
                        Start with the sidebar collapsed
                      </p>
                    </div>
                    <Switch
                      checked={preferences.ui.layout.sidebarCollapsed}
                      onCheckedChange={(checked) => {
                        updatePreferences({
                          ui: {
                            layout: {
                              ...preferences.ui.layout,
                              sidebarCollapsed: checked,
                            },
                          },
                        });
                        setHasChanges(true);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Dense Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Compact view with less padding
                      </p>
                    </div>
                    <Switch
                      checked={preferences.ui.layout.denseMode}
                      onCheckedChange={(checked) => {
                        updatePreferences({
                          ui: {
                            layout: {
                              ...preferences.ui.layout,
                              denseMode: checked,
                            },
                          },
                        });
                        setHasChanges(true);
                      }}
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label>Default View Type</Label>
                    <RadioGroup 
                      defaultValue={preferences.ui.layout.defaultView}
                      onValueChange={(value) => {
                        updatePreferences({ 
                          ui: { 
                            layout: { 
                              ...preferences.ui.layout, 
                              defaultView: value as "grid" | "list" | "table"
                            } 
                          } 
                        });
                        setHasChanges(true);
                      }}
                      className="flex flex-col gap-2 pt-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="grid" id="grid" />
                        <Label htmlFor="grid">Grid</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="list" id="list" />
                        <Label htmlFor="list">List</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="table" id="table" />
                        <Label htmlFor="table">Table</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-0.5">
                      <Label>Document Preview</Label>
                      <p className="text-sm text-muted-foreground">
                        Show document previews in listings
                      </p>
                    </div>
                    <Switch
                      checked={preferences.ui.layout.showDocumentPreview}
                      onCheckedChange={(checked) => {
                        updatePreferences({
                          ui: {
                            layout: {
                              ...preferences.ui.layout,
                              showDocumentPreview: checked,
                            },
                          },
                        });
                        setHasChanges(true);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <div className="grid gap-6 grid-cols-1">
            <motion.div variants={listItemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Configure how you receive notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Email Notifications */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium">Email Notifications</h3>
                          <p className="text-sm text-muted-foreground">
                            Configure email notification settings
                          </p>
                        </div>
                        <Switch
                          checked={preferences.notifications.email.enabled}
                          onCheckedChange={(checked) => {
                            updatePreferences({
                              notifications: {
                                ...preferences.notifications,
                                email: {
                                  ...preferences.notifications.email,
                                  enabled: checked,
                                },
                              },
                            });
                            setHasChanges(true);
                          }}
                        />
                      </div>

                      <div className={`space-y-3 ${!preferences.notifications.email.enabled && "opacity-50"}`}>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="email-digest">Daily digest</Label>
                          <Switch
                            id="email-digest"
                            disabled={!preferences.notifications.email.enabled}
                            checked={preferences.notifications.email.dailyDigest}
                            onCheckedChange={(checked) => {
                              updatePreferences({
                                notifications: {
                                  ...preferences.notifications,
                                  email: {
                                    ...preferences.notifications.email,
                                    dailyDigest: checked,
                                  },
                                },
                              });
                              setHasChanges(true);
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="email-mentions">Mentions</Label>
                          <Switch
                            id="email-mentions"
                            disabled={!preferences.notifications.email.enabled}
                            checked={preferences.notifications.email.mentions}
                            onCheckedChange={(checked) => {
                              updatePreferences({
                                notifications: {
                                  ...preferences.notifications,
                                  email: {
                                    ...preferences.notifications.email,
                                    mentions: checked,
                                  },
                                },
                              });
                              setHasChanges(true);
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="email-docs">Document updates</Label>
                          <Switch
                            id="email-docs"
                            disabled={!preferences.notifications.email.enabled}
                            checked={preferences.notifications.email.documentUpdates}
                            onCheckedChange={(checked) => {
                              updatePreferences({
                                notifications: {
                                  ...preferences.notifications,
                                  email: {
                                    ...preferences.notifications.email,
                                    documentUpdates: checked,
                                  },
                                },
                              });
                              setHasChanges(true);
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="email-projects">Project updates</Label>
                          <Switch
                            id="email-projects"
                            disabled={!preferences.notifications.email.enabled}
                            checked={preferences.notifications.email.projectUpdates}
                            onCheckedChange={(checked) => {
                              updatePreferences({
                                notifications: {
                                  ...preferences.notifications,
                                  email: {
                                    ...preferences.notifications.email,
                                    projectUpdates: checked,
                                  },
                                },
                              });
                              setHasChanges(true);
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="email-tasks">Task assignments</Label>
                          <Switch
                            id="email-tasks"
                            disabled={!preferences.notifications.email.enabled}
                            checked={preferences.notifications.email.taskAssignments}
                            onCheckedChange={(checked) => {
                              updatePreferences({
                                notifications: {
                                  ...preferences.notifications,
                                  email: {
                                    ...preferences.notifications.email,
                                    taskAssignments: checked,
                                  },
                                },
                              });
                              setHasChanges(true);
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* In-App Notifications */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium">In-App Notifications</h3>
                          <p className="text-sm text-muted-foreground">
                            Configure in-app notification settings
                          </p>
                        </div>
                        <Switch
                          checked={preferences.notifications.inApp.enabled}
                          onCheckedChange={(checked) => {
                            updatePreferences({
                              notifications: {
                                ...preferences.notifications,
                                inApp: {
                                  ...preferences.notifications.inApp,
                                  enabled: checked,
                                },
                              },
                            });
                            setHasChanges(true);
                          }}
                        />
                      </div>

                      <div className={`space-y-3 ${!preferences.notifications.inApp.enabled && "opacity-50"}`}>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="inapp-sound">Sound notifications</Label>
                          <Switch
                            id="inapp-sound"
                            disabled={!preferences.notifications.inApp.enabled}
                            checked={preferences.notifications.inApp.sound}
                            onCheckedChange={(checked) => {
                              updatePreferences({
                                notifications: {
                                  ...preferences.notifications,
                                  inApp: {
                                    ...preferences.notifications.inApp,
                                    sound: checked,
                                  },
                                },
                              });
                              setHasChanges(true);
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="inapp-mentions">Mentions</Label>
                          <Switch
                            id="inapp-mentions"
                            disabled={!preferences.notifications.inApp.enabled}
                            checked={preferences.notifications.inApp.mentions}
                            onCheckedChange={(checked) => {
                              updatePreferences({
                                notifications: {
                                  ...preferences.notifications,
                                  inApp: {
                                    ...preferences.notifications.inApp,
                                    mentions: checked,
                                  },
                                },
                              });
                              setHasChanges(true);
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="inapp-docs">Document updates</Label>
                          <Switch
                            id="inapp-docs"
                            disabled={!preferences.notifications.inApp.enabled}
                            checked={preferences.notifications.inApp.documentUpdates}
                            onCheckedChange={(checked) => {
                              updatePreferences({
                                notifications: {
                                  ...preferences.notifications,
                                  inApp: {
                                    ...preferences.notifications.inApp,
                                    documentUpdates: checked,
                                  },
                                },
                              });
                              setHasChanges(true);
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="inapp-tasks">Task assignments</Label>
                          <Switch
                            id="inapp-tasks"
                            disabled={!preferences.notifications.inApp.enabled}
                            checked={preferences.notifications.inApp.taskAssignments}
                            onCheckedChange={(checked) => {
                              updatePreferences({
                                notifications: {
                                  ...preferences.notifications,
                                  inApp: {
                                    ...preferences.notifications.inApp,
                                    taskAssignments: checked,
                                  },
                                },
                              });
                              setHasChanges(true);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Desktop Notifications */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium">Desktop Notifications</h3>
                          <p className="text-sm text-muted-foreground">
                            Configure browser notifications
                          </p>
                        </div>
                        <Switch
                          checked={preferences.notifications.desktop.enabled}
                          onCheckedChange={(checked) => {
                            // Request permissions if enabling
                            if (checked && "Notification" in window) {
                              Notification.requestPermission();
                            }
                            
                            updatePreferences({
                              notifications: {
                                ...preferences.notifications,
                                desktop: {
                                  ...preferences.notifications.desktop,
                                  enabled: checked,
                                },
                              },
                            });
                            setHasChanges(true);
                          }}
                        />
                      </div>

                      <div className={`space-y-3 ${!preferences.notifications.desktop.enabled && "opacity-50"}`}>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="desktop-mentions">Mentions</Label>
                          <Switch
                            id="desktop-mentions"
                            disabled={!preferences.notifications.desktop.enabled}
                            checked={preferences.notifications.desktop.mentions}
                            onCheckedChange={(checked) => {
                              updatePreferences({
                                notifications: {
                                  ...preferences.notifications,
                                  desktop: {
                                    ...preferences.notifications.desktop,
                                    mentions: checked,
                                  },
                                },
                              });
                              setHasChanges(true);
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="desktop-docs">Document updates</Label>
                          <Switch
                            id="desktop-docs"
                            disabled={!preferences.notifications.desktop.enabled}
                            checked={preferences.notifications.desktop.documentUpdates}
                            onCheckedChange={(checked) => {
                              updatePreferences({
                                notifications: {
                                  ...preferences.notifications,
                                  desktop: {
                                    ...preferences.notifications.desktop,
                                    documentUpdates: checked,
                                  },
                                },
                              });
                              setHasChanges(true);
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="desktop-tasks">Task assignments</Label>
                          <Switch
                            id="desktop-tasks"
                            disabled={!preferences.notifications.desktop.enabled}
                            checked={preferences.notifications.desktop.taskAssignments}
                            onCheckedChange={(checked) => {
                              updatePreferences({
                                notifications: {
                                  ...preferences.notifications,
                                  desktop: {
                                    ...preferences.notifications.desktop,
                                    taskAssignments: checked,
                                  },
                                },
                              });
                              setHasChanges(true);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        {/* Accessibility Tab */}
        <TabsContent value="accessibility">
          <div className="grid gap-6 grid-cols-1">
            <motion.div variants={listItemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Accessibility Settings</CardTitle>
                  <CardDescription>Customize accessibility features</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Screen Reader Support</Label>
                      <p className="text-sm text-muted-foreground">
                        Optimize interface for screen readers
                      </p>
                    </div>
                    <Switch
                      checked={preferences.accessibility.screenReader}
                      onCheckedChange={(checked) => {
                        updatePreferences({
                          accessibility: {
                            ...preferences.accessibility,
                            screenReader: checked,
                          },
                        });
                        setHasChanges(true);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>High Contrast Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Increase contrast for better visibility
                      </p>
                    </div>
                    <Switch
                      checked={preferences.accessibility.highContrast}
                      onCheckedChange={(checked) => {
                        updatePreferences({
                          accessibility: {
                            ...preferences.accessibility,
                            highContrast: checked,
                          },
                          ui: {
                            ...preferences.ui,
                            theme: {
                              ...preferences.ui.theme,
                              contrastMode: checked,
                            }
                          }
                        });
                        setHasChanges(true);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Large Text</Label>
                      <p className="text-sm text-muted-foreground">
                        Increase font size for better readability
                      </p>
                    </div>
                    <Switch
                      checked={preferences.accessibility.largeText}
                      onCheckedChange={(checked) => {
                        updatePreferences({
                          accessibility: {
                            ...preferences.accessibility,
                            largeText: checked,
                          },
                        });
                        setHasChanges(true);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Reduced Motion</Label>
                      <p className="text-sm text-muted-foreground">
                        Minimize animations and motion effects
                      </p>
                    </div>
                    <Switch
                      checked={preferences.accessibility.reducedMotion}
                      onCheckedChange={(checked) => {
                        updatePreferences({
                          accessibility: {
                            ...preferences.accessibility,
                            reducedMotion: checked,
                          },
                          ui: {
                            ...preferences.ui,
                            theme: {
                              ...preferences.ui.theme,
                              reduceMotion: checked,
                            }
                          }
                        });
                        setHasChanges(true);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy">
          <div className="grid gap-6 grid-cols-1">
            <motion.div variants={listItemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                  <CardDescription>Control how your data is used</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Share Usage Data</Label>
                      <p className="text-sm text-muted-foreground">
                        Help improve the platform by sharing anonymous usage data
                      </p>
                    </div>
                    <Switch
                      checked={preferences.privacy.shareUsageData}
                      onCheckedChange={(checked) => {
                        updatePreferences({
                          privacy: {
                            ...preferences.privacy,
                            shareUsageData: checked,
                          },
                        });
                        setHasChanges(true);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Document Indexing</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow AI to index and analyze your documents for better search results
                      </p>
                    </div>
                    <Switch
                      checked={preferences.privacy.documentIndexing}
                      onCheckedChange={(checked) => {
                        updatePreferences({
                          privacy: {
                            ...preferences.privacy,
                            documentIndexing: checked,
                          },
                        });
                        setHasChanges(true);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        {/* AI Features Tab */}
        <TabsContent value="ai">
          <div className="grid gap-6 grid-cols-1">
            <motion.div variants={listItemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>AI Feature Settings</CardTitle>
                  <CardDescription>Configure AI-powered assistance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-Suggestions</Label>
                      <p className="text-sm text-muted-foreground">
                        Show AI-powered suggestions based on context
                      </p>
                    </div>
                    <Switch
                      checked={preferences.ui.ai.autoSuggestions}
                      onCheckedChange={(checked) => {
                        updatePreferences({
                          ui: {
                            ...preferences.ui,
                            ai: {
                              ...preferences.ui.ai,
                              autoSuggestions: checked,
                            },
                          },
                        });
                        setHasChanges(true);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show AI Confidence</Label>
                      <p className="text-sm text-muted-foreground">
                        Display confidence levels for AI predictions
                      </p>
                    </div>
                    <Switch
                      checked={preferences.ui.ai.showConfidence}
                      onCheckedChange={(checked) => {
                        updatePreferences({
                          ui: {
                            ...preferences.ui,
                            ai: {
                              ...preferences.ui.ai,
                              showConfidence: checked,
                            },
                          },
                        });
                        setHasChanges(true);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-Create Tasks</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically create tasks from document analysis
                      </p>
                    </div>
                    <Switch
                      checked={preferences.ui.ai.autoCreateTasks}
                      onCheckedChange={(checked) => {
                        updatePreferences({
                          ui: {
                            ...preferences.ui,
                            ai: {
                              ...preferences.ui.ai,
                              autoCreateTasks: checked,
                            },
                          },
                        });
                        setHasChanges(true);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default UserPreferences;