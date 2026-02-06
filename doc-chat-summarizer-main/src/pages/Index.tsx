import { useState, useEffect } from "react";
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
    selectedFiles,
    selectedProject,
  } = useDocumentChat();

  const hasSelectedFiles = selectedFiles.length > 0;
  const fileNames = selectedFiles.join(", ");

  return (
    <>
      <div className="flex space-x-4 mx-auto mt-2 h-[710px]">
        <div className="flex-1 bg-white rounded-lg border overflow-y-auto shadow">
          <DocumentUpload
            documents={documents}
            onDocumentAdd={addDocument}
            onDocumentRemove={removeDocument}
            onClearAll={clearAllDocuments}
            onFilesSelect={(files) => {
              if (selectedProject && files.length > 0) {
                handleFilesSelect(files, selectedProject);
              }
            }}
            onFinalFileSelect={(fileName) => {
              if (selectedProject) {
                handleFinalFileSelect(fileName, selectedProject);
              }
            }}
            onCompare={(project, files) => compareDocuments(project, files)}
            onProjectSelect={(project) => handleFilesSelect(selectedFiles, project)}
          />
        </div>

        <div className="flex-1 bg-white rounded-lg border overflow-y-auto shadow">
          <DocumentSummary
            fileName={hasSelectedFiles ? fileNames : null}
            summary={summary}
            isLoading={isSummarizing}
          />
        </div>
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