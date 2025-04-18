import { StepType } from 'reactour';

interface TourConfig {
  [key: string]: StepType[];
}

// Welcome Tour - First time user experience
export const welcomeTour: StepType[] = [
  {
    selector: 'body',
    content: 'Welcome to Novexa! This quick tour will help you get started with the main features of the platform.',
    position: 'center',
  },
  {
    selector: '[data-tour="sidebar"]',
    content: 'This is the main navigation sidebar. You can access all the key areas of Novexa from here.',
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
    content: "You're all set! Explore the platform and discover how Novexa can help you manage your projects more effectively. You can access this tour again from the Help menu.",
    position: 'center',
  },
];

// Connector Tour - Guide for setting up integrations
export const connectorTour: StepType[] = [
  {
    selector: '[data-tour="connectors-page"]',
    content: 'Welcome to the Connectors page! This is where you can integrate Novexa with external services.',
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
export const analyticsTour: StepType[] = [
  {
    selector: '[data-tour="analytics-page"]',
    content: 'Welcome to the Analytics dashboard! Here you can view insights about your projects and activities.',
    position: 'top',
  },
  {
    selector: '[data-tour="time-range-selector"]',
    content: 'Select different time periods to analyze your data across various timeframes.',
    position: 'bottom',
  },
  {
    selector: '[data-tour="refresh-analytics"]',
    content: 'Click here to refresh the analytics data and get the latest insights.',
    position: 'bottom',
  },
  {
    selector: '[data-tour="analytics-tabs"]',
    content: 'Navigate between different views using these tabs to explore various aspects of your analytics.',
    position: 'top',
  },
  {
    selector: '[data-tour="analytics-overview"]',
    content: 'The Overview tab provides a summary of key metrics and activities.',
    position: 'top',
  },
  {
    selector: '[data-tour="analytics-kpi-cards"]',
    content: 'These cards show key performance indicators for your projects, documents, users, and completion rate.',
    position: 'bottom',
  },
  {
    selector: '[data-tour="analytics-charts"]',
    content: 'These charts visualize project progress and team performance over time.',
    position: 'top',
  },
  {
    selector: '[data-tour="project-progress-chart"]',
    content: 'Track the progress of your projects with this detailed timeline view.',
    position: 'bottom',
  },
  {
    selector: '[data-tour="team-progress-chart"]',
    content: 'Monitor how your teams are performing and identify top contributors.',
    position: 'bottom',
  },
  {
    selector: '[data-tour="analytics-anomalies"]',
    content: 'Switch to the Anomaly Detection tab to identify unusual patterns that may require attention.',
    position: 'top',
  },
  {
    selector: '[data-tour="analytics-predictions"]',
    content: 'The Predictive Insights tab shows AI-powered forecasts based on your project data.',
    position: 'top',
  },
  {
    selector: '[data-tour="predictions-card"]',
    content: 'Review predictions about project completion, resource utilization, and budget projections.',
    position: 'top',
  },
  {
    selector: '[data-tour="prediction-item"]',
    content: 'Each prediction provides actionable insights to help you make informed decisions.',
    position: 'bottom',
  },
  {
    selector: 'body',
    content: 'Now you know how to use the analytics features! Use these insights to optimize your project management.',
    position: 'center',
  },
];

// Document Tour - Guide for document management
export const documentTour: StepType[] = [
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