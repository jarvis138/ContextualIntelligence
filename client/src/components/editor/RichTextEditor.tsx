import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Link, 
  Image as ImageIcon,
  Code, 
  Table, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Heading1, 
  Heading2, 
  Heading3,
  Strikethrough,
  Quote,
  Undo,
  Redo,
  FileText,
  BracesIcon,
  AtSign,
  Paperclip,
  Check,
  X,
  Bot
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSave?: () => void;
  onCancel?: () => void;
  enableAI?: boolean;
  aiProvider?: string;
  onMention?: (query: string) => Promise<{id: string; name: string; avatar?: string}[]>;
  onDocumentReference?: (query: string) => Promise<{id: string; title: string; type: string}[]>;
  readOnly?: boolean;
  minHeight?: string;
  maxHeight?: string;
  autoFocus?: boolean;
  initialFocus?: boolean;
  className?: string;
}

/**
 * Rich Text Editor Component
 * 
 * A full-featured rich text editor with formatting controls, mentions, and document references.
 * Implements the UI/UX PRD specifications.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  onSave,
  onCancel,
  enableAI = false,
  aiProvider = 'OpenAI',
  onMention,
  onDocumentReference,
  readOnly = false,
  minHeight = '150px',
  maxHeight = '500px',
  autoFocus = false,
  initialFocus = false,
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(initialFocus);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState<{id: string; name: string; avatar?: string}[]>([]);
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [documentQuery, setDocumentQuery] = useState('');
  const [documentResults, setDocumentResults] = useState<{id: string; title: string; type: string}[]>([]);
  const [isDocumentOpen, setIsDocumentOpen] = useState(false);
  const [isAIAssistOpen, setIsAIAssistOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);

  // Focus the editor on mount if autoFocus is true
  useEffect(() => {
    if (autoFocus && editorRef.current) {
      editorRef.current.focus();
    }
  }, [autoFocus]);

  // Format text with the given command
  const formatText = (command: string, value?: string) => {
    if (readOnly) return;
    
    document.execCommand(command, false, value);
    updateValue();
    editorRef.current?.focus();
  };

  // Get the currently selected text
  const getSelectedText = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      return selection.toString();
    }
    return '';
  };

  // Update the value when content changes
  const updateValue = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Insert link
  const insertLink = () => {
    const selectedText = getSelectedText();
    setLinkText(selectedText);
    setLinkUrl('https://');
    setIsLinkDialogOpen(true);
  };

  // Apply link
  const applyLink = () => {
    const linkHtml = `<a href="${linkUrl}" target="_blank">${linkText || linkUrl}</a>`;
    document.execCommand('insertHTML', false, linkHtml);
    setIsLinkDialogOpen(false);
    updateValue();
  };

  // Insert image
  const insertImage = () => {
    setImageUrl('');
    setImageAlt('');
    setIsImageDialogOpen(true);
  };

  // Apply image
  const applyImage = () => {
    const imgHtml = `<img src="${imageUrl}" alt="${imageAlt}" style="max-width: 100%;" />`;
    document.execCommand('insertHTML', false, imgHtml);
    setIsImageDialogOpen(false);
    updateValue();
  };

  // Insert table
  const insertTable = () => {
    setTableRows(3);
    setTableCols(3);
    setIsTableDialogOpen(true);
  };

  // Apply table
  const applyTable = () => {
    let tableHtml = '<table style="width:100%; border-collapse: collapse;">';
    
    // Header row
    tableHtml += '<thead><tr>';
    for (let i = 0; i < tableCols; i++) {
      tableHtml += `<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Header ${i+1}</th>`;
    }
    tableHtml += '</tr></thead>';
    
    // Table body
    tableHtml += '<tbody>';
    for (let i = 0; i < tableRows; i++) {
      tableHtml += '<tr>';
      for (let j = 0; j < tableCols; j++) {
        tableHtml += `<td style="border: 1px solid #ddd; padding: 8px;">Cell ${i+1}-${j+1}</td>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody>';
    tableHtml += '</table>';
    
    document.execCommand('insertHTML', false, tableHtml);
    setIsTableDialogOpen(false);
    updateValue();
  };

  // Handle mentions
  const handleMention = async () => {
    if (!onMention) return;
    
    setMentionQuery('');
    setIsMentionOpen(true);
    
    try {
      const results = await onMention('');
      setMentionResults(results);
    } catch (error) {
      console.error('Error fetching mentions:', error);
      setMentionResults([]);
    }
  };

  // Search mentions
  const searchMentions = async (query: string) => {
    if (!onMention) return;
    
    setMentionQuery(query);
    
    try {
      const results = await onMention(query);
      setMentionResults(results);
    } catch (error) {
      console.error('Error searching mentions:', error);
      setMentionResults([]);
    }
  };

  // Insert mention
  const insertMention = (user: {id: string; name: string}) => {
    const mentionHtml = `<span class="mention" data-user-id="${user.id}" contenteditable="false" style="background-color: #e9f2ff; padding: 0.1em 0.3em; border-radius: 0.3em; color: #0066cc; white-space: nowrap;">@${user.name}</span>&nbsp;`;
    document.execCommand('insertHTML', false, mentionHtml);
    setIsMentionOpen(false);
    updateValue();
  };

  // Handle document references
  const handleDocumentRef = async () => {
    if (!onDocumentReference) return;
    
    setDocumentQuery('');
    setIsDocumentOpen(true);
    
    try {
      const results = await onDocumentReference('');
      setDocumentResults(results);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocumentResults([]);
    }
  };

  // Search documents
  const searchDocuments = async (query: string) => {
    if (!onDocumentReference) return;
    
    setDocumentQuery(query);
    
    try {
      const results = await onDocumentReference(query);
      setDocumentResults(results);
    } catch (error) {
      console.error('Error searching documents:', error);
      setDocumentResults([]);
    }
  };

  // Insert document reference
  const insertDocumentRef = (doc: {id: string; title: string; type: string}) => {
    const docHtml = `<span class="document-ref" data-doc-id="${doc.id}" data-doc-type="${doc.type}" contenteditable="false" style="background-color: #f0ebff; padding: 0.1em 0.3em; border-radius: 0.3em; color: #5925dc; white-space: nowrap;">{{${doc.title}}}</span>&nbsp;`;
    document.execCommand('insertHTML', false, docHtml);
    setIsDocumentOpen(false);
    updateValue();
  };

  // Handle AI assist
  const handleAIAssist = () => {
    if (!enableAI) return;
    setAiPrompt('');
    setIsAIAssistOpen(true);
  };

  // Apply AI assist
  const applyAIAssist = async () => {
    if (!enableAI || !aiPrompt) return;
    
    setIsAILoading(true);
    
    try {
      // In a real implementation, this would call an AI service
      // For now, we'll just simulate a response after a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Sample response based on the prompt
      let aiResponse = '';
      if (aiPrompt.toLowerCase().includes('summarize')) {
        aiResponse = '<p>This is a sample AI-generated summary of the content. The system would analyze the existing text and generate a concise summary based on key points.</p>';
      } else if (aiPrompt.toLowerCase().includes('expand')) {
        aiResponse = '<p>This is a sample AI-generated expansion of the content. The system would take the existing text and generate additional details, examples, or supporting points to elaborate on the topic.</p>';
      } else {
        aiResponse = '<p>This is a sample AI response based on your prompt. In a real implementation, this would be generated content from the selected AI provider.</p>';
      }
      
      document.execCommand('insertHTML', false, aiResponse);
      setIsAIAssistOpen(false);
      updateValue();
    } catch (error) {
      console.error('Error with AI assistance:', error);
    } finally {
      setIsAILoading(false);
    }
  };

  return (
    <div className={cn("border rounded-md bg-background", className)}>
      {/* Toolbar */}
      <div className="border-b p-1 flex flex-wrap items-center gap-1">
        <TooltipProvider>
          {/* Text style buttons */}
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => formatText('bold')}
                  disabled={readOnly}
                >
                  <Bold className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bold</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => formatText('italic')}
                  disabled={readOnly}
                >
                  <Italic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Italic</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => formatText('underline')}
                  disabled={readOnly}
                >
                  <Underline className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Underline</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => formatText('strikeThrough')}
                  disabled={readOnly}
                >
                  <Strikethrough className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Strikethrough</TooltipContent>
            </Tooltip>
          </div>
          
          <Separator orientation="vertical" className="h-6 mx-1" />
          
          {/* Heading dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild disabled={readOnly}>
                  <Button variant="ghost" size="sm" className="h-8 text-xs">
                    Heading
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Headings</TooltipContent>
            </Tooltip>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => formatText('formatBlock', 'h1')}>
                <Heading1 className="h-4 w-4 mr-2" />
                Heading 1
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => formatText('formatBlock', 'h2')}>
                <Heading2 className="h-4 w-4 mr-2" />
                Heading 2
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => formatText('formatBlock', 'h3')}>
                <Heading3 className="h-4 w-4 mr-2" />
                Heading 3
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => formatText('formatBlock', 'p')}>
                <FileText className="h-4 w-4 mr-2" />
                Paragraph
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Separator orientation="vertical" className="h-6 mx-1" />
          
          {/* List buttons */}
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => formatText('insertUnorderedList')}
                  disabled={readOnly}
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bullet list</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => formatText('insertOrderedList')}
                  disabled={readOnly}
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Numbered list</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => formatText('formatBlock', 'blockquote')}
                  disabled={readOnly}
                >
                  <Quote className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Quote</TooltipContent>
            </Tooltip>
          </div>
          
          <Separator orientation="vertical" className="h-6 mx-1" />
          
          {/* Alignment buttons */}
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => formatText('justifyLeft')}
                  disabled={readOnly}
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Align left</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => formatText('justifyCenter')}
                  disabled={readOnly}
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Align center</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => formatText('justifyRight')}
                  disabled={readOnly}
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Align right</TooltipContent>
            </Tooltip>
          </div>
          
          <Separator orientation="vertical" className="h-6 mx-1" />
          
          {/* Insert buttons */}
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={insertLink}
                  disabled={readOnly}
                >
                  <Link className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Insert link</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={insertImage}
                  disabled={readOnly}
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Insert image</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={insertTable}
                  disabled={readOnly}
                >
                  <Table className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Insert table</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => formatText('formatBlock', 'pre')}
                  disabled={readOnly}
                >
                  <Code className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Code block</TooltipContent>
            </Tooltip>
          </div>
          
          <Separator orientation="vertical" className="h-6 mx-1" />
          
          {/* Special features */}
          <div className="flex items-center">
            {onMention && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleMention}
                    disabled={readOnly}
                  >
                    <AtSign className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mention a user</TooltipContent>
              </Tooltip>
            )}
            
            {onDocumentReference && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleDocumentRef}
                    disabled={readOnly}
                  >
                    <BracesIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reference a document</TooltipContent>
              </Tooltip>
            )}
            
            {enableAI && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleAIAssist}
                    disabled={readOnly}
                  >
                    <Bot className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>AI assist ({aiProvider})</TooltipContent>
              </Tooltip>
            )}
          </div>
          
          <div className="flex-1"></div>
          
          {/* Undo/Redo buttons */}
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => formatText('undo')}
                  disabled={readOnly}
                >
                  <Undo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => formatText('redo')}
                  disabled={readOnly}
                >
                  <Redo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
      
      {/* Editor area */}
      <div 
        ref={editorRef}
        contentEditable={!readOnly}
        className={cn(
          "p-4 outline-none prose max-w-none focus:ring-0",
          isFocused && "ring-2 ring-primary ring-opacity-20",
          readOnly ? "bg-muted/20 cursor-default" : "cursor-text"
        )}
        style={{ 
          minHeight, 
          maxHeight, 
          overflowY: 'auto' 
        }}
        dangerouslySetInnerHTML={{ __html: value || '' }}
        onInput={updateValue}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
      />
      
      {/* Action buttons (if provided) */}
      {(onSave || onCancel) && (
        <div className="border-t p-2 flex justify-end gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {onSave && (
            <Button onClick={onSave}>
              Save
            </Button>
          )}
        </div>
      )}
      
      {/* Insert Link Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="link-text">Link Text</Label>
              <Input 
                id="link-text" 
                value={linkText} 
                onChange={(e) => setLinkText(e.target.value)} 
                placeholder="Text to display"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-url">Link URL</Label>
              <Input 
                id="link-url" 
                value={linkUrl} 
                onChange={(e) => setLinkUrl(e.target.value)} 
                placeholder="https://example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyLink} disabled={!linkUrl.trim()}>
              Insert Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Insert Image Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="image-url">Image URL</Label>
              <Input 
                id="image-url" 
                value={imageUrl} 
                onChange={(e) => setImageUrl(e.target.value)} 
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image-alt">Alt Text</Label>
              <Input 
                id="image-alt" 
                value={imageAlt} 
                onChange={(e) => setImageAlt(e.target.value)} 
                placeholder="Image description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImageDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyImage} disabled={!imageUrl.trim()}>
              Insert Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Insert Table Dialog */}
      <Dialog open={isTableDialogOpen} onOpenChange={setIsTableDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="table-rows">Rows</Label>
              <Input 
                id="table-rows" 
                type="number" 
                min={1} 
                max={20} 
                value={tableRows} 
                onChange={(e) => setTableRows(parseInt(e.target.value) || 1)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="table-cols">Columns</Label>
              <Input 
                id="table-cols" 
                type="number" 
                min={1} 
                max={10} 
                value={tableCols} 
                onChange={(e) => setTableCols(parseInt(e.target.value) || 1)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTableDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyTable}>
              Insert Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Mention Popover */}
      <Popover open={isMentionOpen} onOpenChange={setIsMentionOpen}>
        <PopoverContent 
          className="w-72 p-0" 
          align="start"
          sideOffset={5}
        >
          <div className="p-2">
            <Input 
              placeholder="Search users..." 
              value={mentionQuery}
              onChange={(e) => searchMentions(e.target.value)}
              className="mb-2"
            />
            <div className="max-h-60 overflow-y-auto space-y-1">
              {mentionResults.length > 0 ? (
                mentionResults.map(user => (
                  <div 
                    key={user.id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => insertMention(user)}
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full" />
                      ) : (
                        user.name.charAt(0)
                      )}
                    </div>
                    <span>{user.name}</span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-muted-foreground">
                  No users found
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Document Reference Popover */}
      <Popover open={isDocumentOpen} onOpenChange={setIsDocumentOpen}>
        <PopoverContent 
          className="w-80 p-0" 
          align="start"
          sideOffset={5}
        >
          <div className="p-2">
            <Input 
              placeholder="Search documents..." 
              value={documentQuery}
              onChange={(e) => searchDocuments(e.target.value)}
              className="mb-2"
            />
            <div className="max-h-60 overflow-y-auto space-y-1">
              {documentResults.length > 0 ? (
                documentResults.map(doc => (
                  <div 
                    key={doc.id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => insertDocumentRef(doc)}
                  >
                    <div className="p-2 rounded-md bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm truncate">{doc.title}</div>
                      <div className="text-xs text-muted-foreground">{doc.type}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-muted-foreground">
                  No documents found
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      {/* AI Assist Dialog */}
      <Dialog open={isAIAssistOpen} onOpenChange={setIsAIAssistOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>AI Assistant ({aiProvider})</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="generate">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="generate">Generate</TabsTrigger>
              <TabsTrigger value="improve">Improve</TabsTrigger>
            </TabsList>
            <TabsContent value="generate" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="ai-prompt">What would you like the AI to write about?</Label>
                <Input 
                  id="ai-prompt" 
                  value={aiPrompt} 
                  onChange={(e) => setAiPrompt(e.target.value)} 
                  placeholder="E.g., Write a summary of the project status"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">
                  Write a summary
                </Button>
                <Button variant="outline" size="sm">
                  Create a list
                </Button>
                <Button variant="outline" size="sm">
                  Explain a concept
                </Button>
                <Button variant="outline" size="sm">
                  Suggest next steps
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="improve" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="ai-improve">How would you like to improve your text?</Label>
                <Input 
                  id="ai-improve" 
                  value={aiPrompt} 
                  onChange={(e) => setAiPrompt(e.target.value)} 
                  placeholder="E.g., Make it more concise"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">
                  Make it concise
                </Button>
                <Button variant="outline" size="sm">
                  Improve grammar
                </Button>
                <Button variant="outline" size="sm">
                  Formal tone
                </Button>
                <Button variant="outline" size="sm">
                  Simplify language
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAIAssistOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={applyAIAssist} 
              disabled={!aiPrompt.trim() || isAILoading}
              className="gap-2"
            >
              {isAILoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>Insert AI Content</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RichTextEditor;