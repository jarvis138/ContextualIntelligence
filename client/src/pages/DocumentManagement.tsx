import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileIcon, 
  PlusIcon, 
  UploadIcon, 
  FolderIcon, 
  ChevronRightIcon,
  DotsVerticalIcon,
  EyeIcon,
  PenIcon,
  TrashIcon,
  DownloadIcon,
  SearchIcon,
  FileTextIcon,
  Loader2Icon,
  HelpCircleIcon,
  ClockIcon,
  ExternalLinkIcon,
  HistoryIcon,
  ReplaceIcon,
  ArrowLeftIcon
} from 'lucide-react';

// Document type definitions
interface DocumentVersion {
  id: number;
  versionId: string;
  createdAt: string;
  createdBy: {
    id: number;
    name: string;
    avatar?: string;
  };
  fileSize: number;
  changes?: string;
}

interface Document {
  id: number;
  title: string;
  description: string | null;
  fileType: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: number;
    name: string;
    avatar?: string;
  };
  updatedBy: {
    id: number;
    name: string;
    avatar?: string;
  };
  fileSize: number;
  thumbnailPath: string | null;
  previewPath: string | null;
  status: 'active' | 'archived' | 'draft';
  tags: string[];
  projectId: number;
  accessLevel: 'public' | 'private' | 'shared' | 'restricted';
  versions: DocumentVersion[];
  source: 'upload' | 'google_drive' | 'sharepoint' | 'email' | 'generated';
}

interface Folder {
  id: number;
  name: string;
  path: string;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
  documentCount: number;
  childFolderCount: number;
}

interface Project {
  id: number;
  name: string;
  description: string | null;
}

// Sample data for the document management interface
const sampleProjects: Project[] = [
  { id: 1, name: 'Web Application Redesign', description: 'Redesign of the main web application' },
  { id: 2, name: 'Mobile App Development', description: 'New mobile application for customers' },
  { id: 3, name: 'Marketing Campaign', description: 'Q3 Marketing Campaign' },
];

const sampleFolders: Folder[] = [
  { 
    id: 1, 
    name: 'Project Documents', 
    path: '/Project Documents', 
    parentId: null, 
    createdAt: '2023-01-15T09:00:00Z', 
    updatedAt: '2023-05-20T14:30:00Z',
    documentCount: 5,
    childFolderCount: 2
  },
  { 
    id: 2, 
    name: 'Requirements', 
    path: '/Project Documents/Requirements', 
    parentId: 1, 
    createdAt: '2023-01-15T09:30:00Z', 
    updatedAt: '2023-05-10T11:15:00Z',
    documentCount: 3,
    childFolderCount: 0
  },
  { 
    id: 3, 
    name: 'Design', 
    path: '/Project Documents/Design', 
    parentId: 1, 
    createdAt: '2023-01-15T10:00:00Z', 
    updatedAt: '2023-05-15T16:45:00Z',
    documentCount: 2,
    childFolderCount: 0
  },
  { 
    id: 4, 
    name: 'Marketing Materials', 
    path: '/Marketing Materials', 
    parentId: null, 
    createdAt: '2023-02-10T13:20:00Z', 
    updatedAt: '2023-05-18T09:10:00Z',
    documentCount: 4,
    childFolderCount: 1
  },
  { 
    id: 5, 
    name: 'Presentations', 
    path: '/Marketing Materials/Presentations', 
    parentId: 4, 
    createdAt: '2023-02-12T15:40:00Z', 
    updatedAt: '2023-05-12T10:30:00Z',
    documentCount: 2,
    childFolderCount: 0
  },
];

const sampleDocuments: Document[] = [
  {
    id: 1,
    title: 'Project Requirements Document',
    description: 'Detailed requirements for the web application redesign project',
    fileType: 'pdf',
    createdAt: '2023-01-20T10:15:00Z',
    updatedAt: '2023-05-18T14:30:00Z',
    createdBy: {
      id: 1,
      name: 'Alex Morgan',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
    },
    updatedBy: {
      id: 2,
      name: 'Sam Taylor',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
    },
    fileSize: 2548000,
    thumbnailPath: null,
    previewPath: null,
    status: 'active',
    tags: ['requirements', 'specification', 'design'],
    projectId: 1,
    accessLevel: 'shared',
    versions: [
      {
        id: 1,
        versionId: 'v1',
        createdAt: '2023-01-20T10:15:00Z',
        createdBy: {
          id: 1,
          name: 'Alex Morgan'
        },
        fileSize: 2345000,
        changes: 'Initial version'
      },
      {
        id: 2,
        versionId: 'v2',
        createdAt: '2023-03-15T11:30:00Z',
        createdBy: {
          id: 2,
          name: 'Sam Taylor'
        },
        fileSize: 2468000,
        changes: 'Added user authentication requirements'
      },
      {
        id: 3,
        versionId: 'v3',
        createdAt: '2023-05-18T14:30:00Z',
        createdBy: {
          id: 2,
          name: 'Sam Taylor'
        },
        fileSize: 2548000,
        changes: 'Updated dashboard requirements'
      }
    ],
    source: 'upload'
  },
  {
    id: 2,
    title: 'UI Design Mockups',
    description: 'Figma mockups for the web application redesign',
    fileType: 'figma',
    createdAt: '2023-02-05T09:45:00Z',
    updatedAt: '2023-04-22T16:20:00Z',
    createdBy: {
      id: 3,
      name: 'Jordan Lee',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
    },
    updatedBy: {
      id: 3,
      name: 'Jordan Lee',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
    },
    fileSize: 5782000,
    thumbnailPath: 'thumbnails/ui-mockups.png',
    previewPath: 'previews/ui-mockups.png',
    status: 'active',
    tags: ['design', 'ui', 'mockup'],
    projectId: 1,
    accessLevel: 'public',
    versions: [
      {
        id: 1,
        versionId: 'v1',
        createdAt: '2023-02-05T09:45:00Z',
        createdBy: {
          id: 3,
          name: 'Jordan Lee'
        },
        fileSize: 4982000,
        changes: 'Initial mockups'
      },
      {
        id: 2,
        versionId: 'v2',
        createdAt: '2023-04-22T16:20:00Z',
        createdBy: {
          id: 3,
          name: 'Jordan Lee'
        },
        fileSize: 5782000,
        changes: 'Added dark mode designs'
      }
    ],
    source: 'upload'
  },
  {
    id: 3,
    title: 'Project Timeline',
    description: 'Project timeline and milestones',
    fileType: 'xlsx',
    createdAt: '2023-01-25T13:20:00Z',
    updatedAt: '2023-05-10T09:35:00Z',
    createdBy: {
      id: 1,
      name: 'Alex Morgan',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
    },
    updatedBy: {
      id: 1,
      name: 'Alex Morgan',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
    },
    fileSize: 1245000,
    thumbnailPath: null,
    previewPath: null,
    status: 'active',
    tags: ['timeline', 'planning', 'milestones'],
    projectId: 1,
    accessLevel: 'shared',
    versions: [
      {
        id: 1,
        versionId: 'v1',
        createdAt: '2023-01-25T13:20:00Z',
        createdBy: {
          id: 1,
          name: 'Alex Morgan'
        },
        fileSize: 1150000,
        changes: 'Initial timeline'
      },
      {
        id: 2,
        versionId: 'v2',
        createdAt: '2023-03-18T10:15:00Z',
        createdBy: {
          id: 1,
          name: 'Alex Morgan'
        },
        fileSize: 1198000,
        changes: 'Updated timeline with new milestones'
      },
      {
        id: 3,
        versionId: 'v3',
        createdAt: '2023-05-10T09:35:00Z',
        createdBy: {
          id: 1,
          name: 'Alex Morgan'
        },
        fileSize: 1245000,
        changes: 'Added Q3 milestones'
      }
    ],
    source: 'upload'
  },
  {
    id: 4,
    title: 'Marketing Strategy',
    description: 'Q3 Marketing Campaign Strategy Document',
    fileType: 'docx',
    createdAt: '2023-03-12T11:25:00Z',
    updatedAt: '2023-05-08T15:10:00Z',
    createdBy: {
      id: 4,
      name: 'Taylor Smith',
      avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
    },
    updatedBy: {
      id: 4,
      name: 'Taylor Smith',
      avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
    },
    fileSize: 1782000,
    thumbnailPath: null,
    previewPath: null,
    status: 'active',
    tags: ['marketing', 'strategy', 'campaign'],
    projectId: 3,
    accessLevel: 'restricted',
    versions: [
      {
        id: 1,
        versionId: 'v1',
        createdAt: '2023-03-12T11:25:00Z',
        createdBy: {
          id: 4,
          name: 'Taylor Smith'
        },
        fileSize: 1650000,
        changes: 'Initial strategy document'
      },
      {
        id: 2,
        versionId: 'v2',
        createdAt: '2023-05-08T15:10:00Z',
        createdBy: {
          id: 4,
          name: 'Taylor Smith'
        },
        fileSize: 1782000,
        changes: 'Updated social media strategy'
      }
    ],
    source: 'upload'
  },
  {
    id: 5,
    title: 'Q3 Campaign Presentation',
    description: 'Presentation for the Q3 marketing campaign kickoff',
    fileType: 'pptx',
    createdAt: '2023-04-15T14:30:00Z',
    updatedAt: '2023-05-05T11:45:00Z',
    createdBy: {
      id: 4,
      name: 'Taylor Smith',
      avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
    },
    updatedBy: {
      id: 1,
      name: 'Alex Morgan',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
    },
    fileSize: 4520000,
    thumbnailPath: 'thumbnails/q3-presentation.png',
    previewPath: 'previews/q3-presentation.png',
    status: 'active',
    tags: ['presentation', 'marketing', 'campaign'],
    projectId: 3,
    accessLevel: 'shared',
    versions: [
      {
        id: 1,
        versionId: 'v1',
        createdAt: '2023-04-15T14:30:00Z',
        createdBy: {
          id: 4,
          name: 'Taylor Smith'
        },
        fileSize: 4250000,
        changes: 'Initial presentation'
      },
      {
        id: 2,
        versionId: 'v2',
        createdAt: '2023-05-05T11:45:00Z',
        createdBy: {
          id: 1,
          name: 'Alex Morgan'
        },
        fileSize: 4520000,
        changes: 'Added executive summary slides'
      }
    ],
    source: 'upload'
  }
];

// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  else return (bytes / 1073741824).toFixed(1) + ' GB';
}

function getFileIcon(fileType: string): React.ReactNode {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return <i className="ri-file-pdf-line text-red-500"></i>;
    case 'docx':
    case 'doc':
      return <i className="ri-file-word-line text-blue-500"></i>;
    case 'xlsx':
    case 'xls':
      return <i className="ri-file-excel-line text-green-500"></i>;
    case 'pptx':
    case 'ppt':
      return <i className="ri-file-ppt-line text-orange-500"></i>;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'svg':
      return <i className="ri-image-line text-purple-500"></i>;
    case 'figma':
      return <i className="ri-figma-line text-pink-500"></i>;
    default:
      return <FileIcon className="text-gray-500" />;
  }
}

function getAccessBadge(accessLevel: Document['accessLevel']): React.ReactNode {
  switch (accessLevel) {
    case 'public':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Public</Badge>;
    case 'private':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Private</Badge>;
    case 'shared':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Shared</Badge>;
    case 'restricted':
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Restricted</Badge>;
    default:
      return null;
  }
}

export default function DocumentManagement() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [currentTab, setCurrentTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentProject, setCurrentProject] = useState<number | null>(null);
  const [navigationPath, setNavigationPath] = useState<{id: number, name: string}[]>([]);
  const [currentFolder, setCurrentFolder] = useState<number | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState<boolean>(false);
  const [showVersionDialog, setShowVersionDialog] = useState<boolean>(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [showNewFolderDialog, setShowNewFolderDialog] = useState<boolean>(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [fileMetadata, setFileMetadata] = useState({
    title: '',
    description: '',
    projectId: '',
    accessLevel: 'shared'
  });
  
  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: { file: File, metadata: typeof fileMetadata }) => {
      // Simulate file upload with progress
      setIsUploading(true);
      
      // Mock progress updates
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setUploadProgress(i);
      }
      
      // Simulate API response
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsUploading(false);
      
      return {
        success: true,
        documentId: Math.floor(Math.random() * 1000) + 10
      };
    },
    onSuccess: (data) => {
      toast({
        title: 'File uploaded successfully',
        description: `File has been uploaded and processing has begun.`,
      });
      
      setShowUploadDialog(false);
      setFileToUpload(null);
      setFileMetadata({
        title: '',
        description: '',
        projectId: '',
        accessLevel: 'shared'
      });
      setUploadProgress(0);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error) => {
      toast({
        title: 'Upload failed',
        description: `There was an error uploading your file. Please try again.`,
        variant: 'destructive'
      });
      setIsUploading(false);
      setUploadProgress(0);
    }
  });
  
  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (folderName: string) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock response
      return {
        id: Math.floor(Math.random() * 1000) + 100,
        name: folderName,
        path: navigationPath.length > 0 
          ? `${navigationPath.map(p => p.name).join('/')}/${folderName}`
          : `/${folderName}`,
        parentId: currentFolder,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        documentCount: 0,
        childFolderCount: 0
      };
    },
    onSuccess: (data) => {
      toast({
        title: 'Folder created',
        description: `Folder "${data.name}" has been created.`,
      });
      
      setShowNewFolderDialog(false);
      setNewFolderName('');
      
      // Invalidate folders query
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create folder',
        description: `There was an error creating the folder. Please try again.`,
        variant: 'destructive'
      });
    }
  });
  
  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Document deleted',
        description: `The document has been moved to trash.`,
      });
      
      // Invalidate documents query
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete document',
        description: `There was an error deleting the document. Please try again.`,
        variant: 'destructive'
      });
    }
  });
  
  // Get documents query
  const { data: documents, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ['documents', currentFolder, currentProject, searchQuery, currentTab],
    queryFn: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Filter documents based on current state
      let filteredDocs = [...sampleDocuments];
      
      // Filter by project
      if (currentProject !== null) {
        filteredDocs = filteredDocs.filter(doc => doc.projectId === currentProject);
      }
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredDocs = filteredDocs.filter(doc => 
          doc.title.toLowerCase().includes(query) || 
          (doc.description && doc.description.toLowerCase().includes(query)) ||
          doc.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }
      
      // Filter by tab
      if (currentTab === 'recent') {
        filteredDocs = filteredDocs.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ).slice(0, 5);
      } else if (currentTab === 'shared') {
        filteredDocs = filteredDocs.filter(doc => 
          doc.accessLevel === 'shared' || doc.accessLevel === 'public'
        );
      }
      
      return filteredDocs;
    },
    staleTime: 60000, // 1 minute
  });
  
  // Get folders query
  const { data: folders, isLoading: isLoadingFolders } = useQuery({
    queryKey: ['folders', currentFolder],
    queryFn: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Filter folders based on current folder
      return sampleFolders.filter(folder => folder.parentId === currentFolder);
    },
    staleTime: 60000, // 1 minute
  });
  
  // Get projects query
  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return sampleProjects;
    },
    staleTime: 300000, // 5 minutes
  });
  
  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setFileToUpload(file);
      
      // Auto-fill title with cleaned up filename
      const fileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setFileMetadata({
        ...fileMetadata,
        title: fileName
      });
    }
  };
  
  // Handle upload form submission
  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fileToUpload) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload.',
        variant: 'destructive'
      });
      return;
    }
    
    uploadMutation.mutate({
      file: fileToUpload,
      metadata: fileMetadata
    });
  };
  
  // Handle folder creation
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newFolderName.trim()) {
      toast({
        title: 'Invalid folder name',
        description: 'Please enter a valid folder name.',
        variant: 'destructive'
      });
      return;
    }
    
    createFolderMutation.mutate(newFolderName.trim());
  };
  
  // Navigate to folder
  const navigateToFolder = (folder: Folder) => {
    setCurrentFolder(folder.id);
    
    // Update navigation path
    const pathSegments = folder.path.split('/').filter(Boolean);
    const newPath = pathSegments.map((name, index) => {
      const matchingFolder = sampleFolders.find(f => 
        f.name === name && 
        (index === 0 ? f.parentId === null : true)
      );
      return {
        id: matchingFolder ? matchingFolder.id : -1,
        name
      };
    });
    
    setNavigationPath(newPath);
  };
  
  // Navigate to parent folder
  const navigateToParentFolder = () => {
    if (navigationPath.length === 0) {
      // Already at root
      setCurrentFolder(null);
      return;
    }
    
    // Get parent folder
    const newPath = [...navigationPath];
    newPath.pop();
    
    if (newPath.length === 0) {
      // Go to root
      setCurrentFolder(null);
    } else {
      // Go to parent folder
      const parentFolder = newPath[newPath.length - 1];
      setCurrentFolder(parentFolder.id);
    }
    
    setNavigationPath(newPath);
  };
  
  // Navigate to specific path segment
  const navigateToPathSegment = (index: number) => {
    if (index === -1) {
      // Navigate to root
      setCurrentFolder(null);
      setNavigationPath([]);
      return;
    }
    
    const newPath = navigationPath.slice(0, index + 1);
    setNavigationPath(newPath);
    
    // Set current folder to the last folder in the path
    const lastFolder = newPath[newPath.length - 1];
    setCurrentFolder(lastFolder.id);
  };
  
  // Handle document deletion
  const handleDeleteDocument = (document: Document) => {
    if (confirm(`Are you sure you want to delete "${document.title}"? This action cannot be undone.`)) {
      deleteDocumentMutation.mutate(document.id);
    }
  };
  
  // View document versions
  const handleViewVersions = (document: Document) => {
    setSelectedDocument(document);
    setShowVersionDialog(true);
  };
  
  // Navigate to document details
  const handleViewDocument = (document: Document) => {
    // In a real app, this would navigate to a document viewer or editor
    toast({
      title: 'Document opened',
      description: `Opening "${document.title}"`,
    });
    
    // Simulate navigation
    // setLocation(`/documents/${document.id}`);
  };
  
  // View document history
  const handleViewHistory = (document: Document) => {
    toast({
      title: 'Document history',
      description: `Viewing history for "${document.title}"`,
    });
  };
  
  // Download document
  const handleDownloadDocument = (document: Document) => {
    toast({
      title: 'Download started',
      description: `Downloading "${document.title}"`,
    });
  };
  
  // Share document
  const handleShareDocument = (document: Document) => {
    toast({
      title: 'Share document',
      description: `Sharing options for "${document.title}"`,
    });
  };
  
  // Handle search
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Search is already reactive due to state changes, but we can show a toast
    if (searchQuery) {
      toast({
        title: 'Search results',
        description: `Showing results for "${searchQuery}"`,
      });
    }
  };
  
  // Filter documents by file type
  const filteredDocuments = documents || [];
  
  // Default user for demo
  const user = {
    id: 1,
    username: 'alexmorgan',
    fullName: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    role: 'Project Manager'
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <TopBar 
          project={{
            id: 0,
            name: 'Document Management',
            description: 'Upload, organize, and manage project documents',
            status: 'active',
            progress: 100
          }}
          teamMembers={[user]}
        />
        
        <div className="container mx-auto py-8 px-4 md:px-6">
          <div className="flex flex-col space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold">Document Management</h1>
                <p className="text-muted-foreground">Upload, organize and share documents</p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => setShowNewFolderDialog(true)}
                >
                  <FolderIcon className="h-4 w-4" />
                  New Folder
                </Button>
                
                <Button 
                  className="gap-2"
                  onClick={() => setShowUploadDialog(true)}
                >
                  <UploadIcon className="h-4 w-4" />
                  Upload
                </Button>
              </div>
            </div>
            
            {/* Tabs & Search Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <Tabs 
                defaultValue="all" 
                value={currentTab}
                onValueChange={setCurrentTab}
                className="w-full md:w-auto"
              >
                <TabsList>
                  <TabsTrigger value="all">All Documents</TabsTrigger>
                  <TabsTrigger value="recent">Recent</TabsTrigger>
                  <TabsTrigger value="shared">Shared</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                <form onSubmit={handleSearch} className="relative w-full md:w-auto">
                  <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="search"
                    placeholder="Search documents..."
                    className="pl-9 w-full md:w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </form>
                
                <Select
                  value={currentProject !== null ? currentProject.toString() : ''}
                  onValueChange={(value) => setCurrentProject(value ? parseInt(value) : null)}
                >
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Projects</SelectItem>
                    {projects?.map(project => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Folder Navigation */}
            {currentTab === 'all' && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2"
                  onClick={() => navigateToPathSegment(-1)}
                >
                  <FolderIcon className="h-4 w-4 mr-1" />
                  Root
                </Button>
                
                {navigationPath.map((segment, index) => (
                  <React.Fragment key={segment.id}>
                    <ChevronRightIcon className="h-4 w-4" />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2"
                      onClick={() => navigateToPathSegment(index)}
                    >
                      {segment.name}
                    </Button>
                  </React.Fragment>
                ))}
              </div>
            )}
            
            {/* Document Table */}
            <Card>
              <CardContent className="p-0">
                {isLoadingDocuments || isLoadingFolders ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2Icon className="h-10 w-10 animate-spin text-primary/50" />
                  </div>
                ) : (
                  <>
                    {currentTab === 'all' && folders && folders.length > 0 && (
                      <div className="border-b">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[400px]">Name</TableHead>
                              <TableHead>Items</TableHead>
                              <TableHead>Last Modified</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {currentFolder !== null && (
                              <TableRow className="hover:bg-gray-50/50">
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2 flex items-center gap-2"
                                      onClick={navigateToParentFolder}
                                    >
                                      <ArrowLeftIcon className="h-4 w-4" />
                                      <span>..</span>
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-right"></TableCell>
                              </TableRow>
                            )}
                            
                            {folders.map((folder) => (
                              <TableRow key={folder.id} className="hover:bg-gray-50/50">
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <FolderIcon className="h-5 w-5 text-blue-500" />
                                    <Button 
                                      variant="link"
                                      className="p-0 h-auto"
                                      onClick={() => navigateToFolder(folder)}
                                    >
                                      {folder.name}
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {folder.documentCount} document{folder.documentCount !== 1 ? 's' : ''}, {folder.childFolderCount} folder{folder.childFolderCount !== 1 ? 's' : ''}
                                </TableCell>
                                <TableCell>
                                  {new Date(folder.updatedAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <DotsVerticalIcon className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => navigateToFolder(folder)}>
                                        <FolderIcon className="h-4 w-4 mr-2" />
                                        Open
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => setShowUploadDialog(true)}>
                                        <UploadIcon className="h-4 w-4 mr-2" />
                                        Upload to folder
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-red-600">
                                        <TrashIcon className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[400px]">Document</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Updated</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDocuments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <FileTextIcon className="h-10 w-10 text-gray-300" />
                                <p className="text-muted-foreground">No documents found</p>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="mt-2"
                                  onClick={() => setShowUploadDialog(true)}
                                >
                                  Upload a document
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredDocuments.map((document) => {
                            // Find project name
                            const project = projects?.find(p => p.id === document.projectId);
                            
                            return (
                              <TableRow key={document.id} className="hover:bg-gray-50/50">
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <div className="text-lg">
                                      {getFileIcon(document.fileType)}
                                    </div>
                                    <div>
                                      <Button 
                                        variant="link"
                                        className="p-0 h-auto text-left justify-start font-medium"
                                        onClick={() => handleViewDocument(document)}
                                      >
                                        {document.title}
                                      </Button>
                                      {document.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                          {document.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="uppercase">
                                    {document.fileType}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {project?.name || '-'}
                                </TableCell>
                                <TableCell>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger className="cursor-help flex items-center">
                                        <time dateTime={document.updatedAt} className="text-muted-foreground text-sm">
                                          {new Date(document.updatedAt).toLocaleDateString()}
                                        </time>
                                        <span className="text-xs text-muted-foreground ml-1">
                                          by {document.updatedBy.name.split(' ')[0]}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Last updated on {new Date(document.updatedAt).toLocaleString()}</p>
                                        <p>by {document.updatedBy.name}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell>
                                  {formatFileSize(document.fileSize)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <DotsVerticalIcon className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleViewDocument(document)}>
                                        <EyeIcon className="h-4 w-4 mr-2" />
                                        View
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleDownloadDocument(document)}>
                                        <DownloadIcon className="h-4 w-4 mr-2" />
                                        Download
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleViewVersions(document)}>
                                        <HistoryIcon className="h-4 w-4 mr-2" />
                                        Versions
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleShareDocument(document)}>
                                        <ExternalLinkIcon className="h-4 w-4 mr-2" />
                                        Share
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem>
                                        <PenIcon className="h-4 w-4 mr-2" />
                                        Edit Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>
                                        <ReplaceIcon className="h-4 w-4 mr-2" />
                                        Replace File
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        className="text-red-600"
                                        onClick={() => handleDeleteDocument(document)}
                                      >
                                        <TrashIcon className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>
                Upload a new document to the system
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleUpload}>
              <div className="space-y-4 py-4">
                {!fileToUpload ? (
                  <div 
                    className="border-2 border-dashed rounded-md py-10 text-center cursor-pointer hover:bg-gray-50/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadIcon className="h-10 w-10 mx-auto text-muted-foreground/60" />
                    <p className="mt-2 text-sm font-medium">
                      Click to select or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Support for PDF, Word, Excel, PowerPoint, and images
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                    />
                  </div>
                ) : (
                  <div className="p-4 border rounded-md">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {getFileIcon(fileToUpload.name.split('.').pop() || '')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{fileToUpload.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(fileToUpload.size)}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        type="button" 
                        className="h-8 w-8"
                        onClick={() => {
                          setFileToUpload(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {isUploading && (
                      <div className="mt-2">
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-right mt-1 text-muted-foreground">
                          {uploadProgress}%
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="title">Document Title</Label>
                  <Input
                    id="title"
                    value={fileMetadata.title}
                    onChange={(e) => setFileMetadata({...fileMetadata, title: e.target.value})}
                    placeholder="Enter document title"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={fileMetadata.description}
                    onChange={(e) => setFileMetadata({...fileMetadata, description: e.target.value})}
                    placeholder="Enter description"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <Select
                      value={fileMetadata.projectId}
                      onValueChange={(value) => setFileMetadata({...fileMetadata, projectId: value})}
                    >
                      <SelectTrigger id="project" className="w-full">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects?.map(project => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="access">Access Level</Label>
                    <Select
                      value={fileMetadata.accessLevel}
                      onValueChange={(value: any) => setFileMetadata({...fileMetadata, accessLevel: value})}
                    >
                      <SelectTrigger id="access" className="w-full">
                        <SelectValue placeholder="Select access level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="shared">Shared</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="restricted">Restricted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="flex space-x-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploading}
                  onClick={() => setShowUploadDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!fileToUpload || isUploading}
                  className="gap-2"
                >
                  {isUploading && <Loader2Icon className="h-4 w-4 animate-spin" />}
                  Upload Document
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* New Folder Dialog */}
        <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
              <DialogDescription>
                Create a new folder to organize your documents
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateFolder}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="folderName">Folder Name</Label>
                  <Input
                    id="folderName"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Enter folder name"
                    required
                  />
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FolderIcon className="h-4 w-4" />
                  <span>
                    Location: {navigationPath.length === 0 ? 'Root' : navigationPath.map(p => p.name).join(' / ')}
                  </span>
                </div>
              </div>
              
              <DialogFooter className="flex space-x-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={createFolderMutation.isPending}
                  onClick={() => setShowNewFolderDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!newFolderName.trim() || createFolderMutation.isPending}
                  className="gap-2"
                >
                  {createFolderMutation.isPending && <Loader2Icon className="h-4 w-4 animate-spin" />}
                  Create Folder
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Document Versions Dialog */}
        <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
          {selectedDocument && (
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Document Versions</DialogTitle>
                <DialogDescription>
                  View and manage versions of "{selectedDocument.title}"
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Version</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Changes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedDocument.versions.sort((a, b) => 
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      ).map((version) => (
                        <TableRow key={version.id}>
                          <TableCell className="font-medium">
                            {version.versionId}
                            {version.id === selectedDocument.versions.length && (
                              <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-100">
                                Latest
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(version.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{version.createdBy.name}</TableCell>
                          <TableCell>{formatFileSize(version.fileSize)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {version.changes || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <DownloadIcon className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  onClick={() => setShowVersionDialog(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </main>
    </div>
  );
}