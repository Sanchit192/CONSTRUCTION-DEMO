import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface UploadedDocument {
  id: string;
  fileName: string;
  content: string;
}

export function useDocumentChat() {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const { toast } = useToast();

  /** ------------------------ */
  /** Selected file & project for chat */
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  /* ---------------------------------- */
  /* Upload only (NO API call here) */
  /* ---------------------------------- */
  const addDocument = useCallback((content: string, name: string) => {
    const newDoc: UploadedDocument = {
      id: crypto.randomUUID(),
      fileName: name,
      content,
    };

    setDocuments((prev) => [...prev, newDoc]);
    setSummary(null);
    setMessages([]);
  }, []);

  /* ---------------------------------- */
  /* Compare documents (UNCHANGED) */
  /* ---------------------------------- */
  const compareDocuments = useCallback(
    async (projectName: string, files: string[]) => {
      if (files.length < 2) return;

      setIsSummarizing(true);
      setSummary(null);

      try {
        const res = await fetch(
          "https://construction-demo-g9gggbgsd0bmdccx.eastus-01.azurewebsites.net/api/contracts/compare",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectName,
              files,
            }),
          }
        );

        if (!res.ok) throw new Error("Compare failed");

        const data = await res.json();
        setSummary(data.comparison);
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to compare documents",
          variant: "destructive",
        });
      } finally {
        setIsSummarizing(false);
      }
    },
    [toast]
  );

  /* ---------------------------------- */
  /* Handlers for DocumentUpload selection */
  /* ---------------------------------- */
  const handleFilesSelect = useCallback(
    (files: string[], project: string) => {
      setSelectedProject(project);
      setSelectedFile(files[0] || null); // pick first selected file for chat
    },
    []
  );

  const handleFinalFileSelect = useCallback(
  (fileName: string, project: string) => {
    setSelectedProject(project);
    setSelectedFile(fileName); // ✅ update selected file
  },
  []
);

  /* ---------------------------------- */
  /* Chat logic */
  /* ---------------------------------- */
  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!selectedFile || !selectedProject) {
        toast({
          title: "No file selected",
          description: "Please select a document to chat with.",
          variant: "destructive",
        });
        return;
      }

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: userMessage,
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsChatLoading(true);

      try {
        const res = await fetch("https://construction-demo-g9gggbgsd0bmdccx.eastus-01.azurewebsites.net/api/document-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectName: selectedProject,
            fileName: selectedFile,
            question: userMessage,
          }),
        });

        const data = await res.json();

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.answer || "No answer returned from API.",
          },
        ]);
      } catch (error) {
        toast({
          title: "Error",
          description: "Chat failed",
          variant: "destructive",
        });
      } finally {
        setIsChatLoading(false);
      }
    },
    [selectedFile, selectedProject, toast]
  );

  return {
    documents,
    summary,
    messages,
    isProcessing,
    isSummarizing,
    isChatLoading,
    addDocument,
    compareDocuments,
    removeDocument: (id: string) =>
      setDocuments((prev) => prev.filter((d) => d.id !== id)),
    clearAllDocuments: () => {
      setDocuments([]);
      setSummary(null);
      setMessages([]);
      setSelectedFile(null);
      setSelectedProject(null);
    },
    sendMessage,
    handleFilesSelect,    // 🔹 pass to DocumentUpload
    handleFinalFileSelect // 🔹 pass to DocumentUpload
  };
}
