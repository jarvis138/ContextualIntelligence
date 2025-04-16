import React from 'react';

interface TourStep {
  selector?: string;
  content: React.ReactNode;
  action?: () => void;
  position?: 'top' | 'right' | 'bottom' | 'left' | 'center';
}

interface TourConfig {
  [key: string]: TourStep[];
}

// Welcome Tour - First time user experience
export const welcomeTour: TourStep[] = [
  {
    selector: 'body',
    content: 'Welcome to CPI Hub! This quick tour will help you get started with the main features of the platform.',
    position: 'center',
  },
  {
    selector: '[data-tour="sidebar"]',
    content: 'This is the main navigation sidebar. You can access all the key areas of CPI Hub from here.',
    position: 'right',
  },
  {
    selector: '[data-tour="dashboard"]',
    content: 'The Dashboard gives you an overview of your projects, recent activities, and important metrics.',
    position: 'right',
  },
  {
    selector: '[data-tour="projects"]',
    content: 'Manage your projects here. You can create new projects, assign team members, and track progress.',
    position: 'right',
  },
  {
    selector: '[data-tour="documents"]',
    content: 'Access all your project documents, files, and other resources in one central location.',
    position: 'right',
  },
  {
    selector: '[data-tour="teams"]',
    content: 'Manage your teams, invite members, and assign roles and permissions.',
    position: 'right',
  },
  {
    selector: '[data-tour="analytics"]',
    content: 'Get valuable insights into your projects with advanced analytics and reporting.',
    position: 'right',
  },
  {
    selector: '[data-tour="search"]',
    content: 'Use the powerful search feature to quickly find projects, documents, and team members.',
    position: 'right',
  },
  {
    selector: '[data-tour="settings"]',
    content: 'Configure your workspace settings, notifications, and account preferences.',
    position: 'right',
  },
  {
    selector: '[data-tour="user-menu"]',
    content: 'Access your profile, account settings, and notifications from here.',
    position: 'bottom',
  },
  {
    selector: 'body',
    content: "You're all set! Explore the platform and discover how CPI Hub can help you manage your projects more effectively. You can access this tour again from the Help menu.",
    position: 'center',
  },
];

// Connector Tour - Guide for setting up integrations
export const connectorTour: TourStep[] = [
  {
    selector: '[data-tour="connectors-page"]',
    content: 'Welcome to the Connectors page! This is where you can integrate CPI Hub with external services.',
    position: 'top',
  },
  {
    selector: '[data-tour="add-connector"]',
    content: 'Click here to add a new connector. You can connect to services like Slack, Google Drive, Gmail, and Microsoft 365.',
    position: 'bottom',
  },
  {
    selector: '[data-tour="connector-list"]',
    content: 'Your connected services will appear in this list. You can manage and monitor them from here.',
    position: 'top',
  },
  {
    selector: '[data-tour="data-feeds"]',
    content: 'This section shows all the data that has been imported from your connected services.',
    position: 'top',
  },
  {
    selector: '[data-tour="connector-jobs"]',
    content: 'You can schedule and manage automated data import jobs to keep your information up to date.',
    position: 'top',
  },
  {
    selector: 'body',
    content: 'Now you know how to add and manage connectors! Start by connecting your most frequently used services.',
    position: 'center',
  },
];

// Analytics Tour - Guide for analytics features
export const analyticsTour: TourStep[] = [
  {
    selector: '[data-tour="analytics-page"]',
    content: 'Welcome to the Analytics dashboard! Here you can view insights about your projects and activities.',
    position: 'top',
  },
  {
    selector: '[data-tour="metrics-overview"]',
    content: 'These cards show key performance metrics for your projects and team activities.',
    position: 'bottom',
  },
  {
    selector: '[data-tour="trend-charts"]',
    content: 'These charts visualize trends over time, helping you identify patterns and make data-driven decisions.',
    position: 'top',
  },
  {
    selector: '[data-tour="reports-section"]',
    content: 'Generate custom reports based on various dimensions like projects, teams, and time periods.',
    position: 'top',
  },
  {
    selector: '[data-tour="alerts-section"]',
    content: 'Set up alerts to get notified when certain metrics reach specified thresholds.',
    position: 'top',
  },
  {
    selector: 'body',
    content: 'Now you know how to use the analytics features! Use these insights to optimize your project management.',
    position: 'center',
  },
];

// Document Tour - Guide for document management
export const documentTour: TourStep[] = [
  {
    selector: '[data-tour="documents-page"]',
    content: 'Welcome to the Documents page! Here you can manage all your project documents and files.',
    position: 'top',
  },
  {
    selector: '[data-tour="document-upload"]',
    content: 'Click here to upload new documents. We support various file formats including PDFs, Office documents, and images.',
    position: 'bottom',
  },
  {
    selector: '[data-tour="document-list"]',
    content: 'Your documents are listed here. You can sort, filter, and search through them.',
    position: 'top',
  },
  {
    selector: '[data-tour="document-folders"]',
    content: 'Organize your documents in folders to keep everything structured and easy to find.',
    position: 'right',
  },
  {
    selector: '[data-tour="document-sharing"]',
    content: 'Share documents with team members and set permissions for viewing and editing.',
    position: 'left',
  },
  {
    selector: 'body',
    content: 'Now you know how to manage your documents! Start by uploading important files for your projects.',
    position: 'center',
  },
];

// Combine all tours
const tourConfig: TourConfig = {
  welcome: welcomeTour,
  connectors: connectorTour,
  analytics: analyticsTour,
  documents: documentTour,
};

export default tourConfig;