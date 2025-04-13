import { formatDistanceToNow } from "date-fns";
import { Document } from "@/lib/types";
import { Button } from "@/components/ui/button";

type RecentDocumentsProps = {
  documents: Document[];
  onViewAll: () => void;
};

export default function RecentDocuments({ documents, onViewAll }: RecentDocumentsProps) {
  const formatTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return "recently";
    }
  };

  const getDocumentIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return "ri-file-pdf-line";
      case 'excel':
      case 'spreadsheet':
        return "ri-file-excel-2-line";
      case 'word':
      case 'doc':
        return "ri-file-word-line";
      case 'ppt':
      case 'presentation':
        return "ri-file-ppt-line";
      default:
        return "ri-file-text-line";
    }
  };

  const getDocumentIconColor = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return "bg-red-100 text-red-700";
      case 'excel':
      case 'spreadsheet':
        return "bg-green-100 text-green-700";
      case 'word':
      case 'doc':
        return "bg-blue-100 text-blue-700";
      case 'ppt':
      case 'presentation':
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-blue-100 text-blue-700";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-800">Recent Documents</h2>
        <Button 
          variant="ghost" 
          className="text-sm text-primary font-medium hover:text-blue-700"
          onClick={onViewAll}
        >
          View All
        </Button>
      </div>
      <div className="divide-y divide-gray-200">
        {documents.map((document) => (
          <div key={document.id} className="px-6 py-4 hover:bg-gray-50">
            <div className="flex items-start space-x-3">
              <div className={`w-10 h-10 rounded flex items-center justify-center ${getDocumentIconColor(document.fileType)}`}>
                <i className={getDocumentIcon(document.fileType)}></i>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-800">{document.title}</h3>
                <div className="mt-1 flex items-center text-xs text-gray-500">
                  <span>
                    Updated {formatTimeAgo(document.updatedAt)} 
                    {document.updatedByUser && ` by ${document.updatedByUser.fullName}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {documents.length === 0 && (
          <div className="px-6 py-4 text-sm text-gray-500 italic">
            No recent documents to display.
          </div>
        )}
      </div>
    </div>
  );
}
