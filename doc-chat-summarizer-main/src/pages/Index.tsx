import { useState } from "react";
import { DocumentUpload } from "@/components/DocumentUpload";
import { DocumentSummary } from "@/components/DocumentSummary";
import { ChatDialog } from "@/components/ChatbotDailog";
import { useDocumentChat } from "@/hooks/useDocumentChat";

const Index = () => {
  const {
    documents,
    summary,
    messages,
    isSummarizing,
    isChatLoading,
    addDocument,
    removeDocument,
    clearAllDocuments,
    sendMessage,
    compareDocuments,
    handleFilesSelect,
    handleFinalFileSelect,
  } = useDocumentChat();

  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");

  const hasSelectedFiles = selectedFiles.length > 0;
  const fileNames = selectedFiles.join(", ");

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-6">
        <DocumentUpload
          documents={documents}
          onDocumentAdd={addDocument}
          onDocumentRemove={removeDocument}
          onClearAll={clearAllDocuments}
          onFilesSelect={(files) => {
            setSelectedFiles(files);
            if (selectedProject && files.length > 0) {
              handleFilesSelect(files, selectedProject);
            }
          }}
          onFinalFileSelect={(fileName) => {
            setSelectedFiles([fileName]);
            if (selectedProject) {
              handleFinalFileSelect(fileName, selectedProject);
            }
          }}
          onCompare={(project, files) => compareDocuments(project, files)}
          onProjectSelect={(project) => setSelectedProject(project)}
        />

        <DocumentSummary
          fileName={hasSelectedFiles ? fileNames : null}
          summary={summary}
          isLoading={isSummarizing}
        />
      </div>

      <ChatDialog
  messages={messages}
  onSendMessage={sendMessage}
  isLoading={isChatLoading}
  disabled={selectedFiles.length === 0}
/>
    </>
  );
};

export default Index;
