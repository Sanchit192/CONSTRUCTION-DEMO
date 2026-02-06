import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = 
  "https://construction-demo-g9gggbgsd0bmdccx.eastus-01.azurewebsites.net/api";

// const API_BASE = "http://localhost:7071/api";
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
  /** Selected files & project for chat */
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  /* ---------------------------------- */
  /* Persistence */
  /* ---------------------------------- */
  useEffect(() => {
    const saved = localStorage.getItem('documentChat_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.selectedFiles) setSelectedFiles(parsed.selectedFiles);
        if (parsed.selectedProject) setSelectedProject(parsed.selectedProject);
      } catch (e) {
        console.error('Failed to load saved state', e);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedFiles.length > 0 || selectedProject) {
      localStorage.setItem('documentChat_state', JSON.stringify({
        selectedFiles,
        selectedProject
      }));
    }
  }, [selectedFiles, selectedProject]);

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
          `${API_BASE}/contracts/compare`,
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
      setSelectedFiles(files); // keep all selected files for chat
    },
    []
  );

  const handleFinalFileSelect = useCallback(
    (fileName: string, project: string) => {
      setSelectedProject(project);
      setSelectedFiles([fileName]); // ensure final selection is a single file
    },
    []
  );

  /* ---------------------------------- */
  /* Chat logic */
  /* ---------------------------------- */
  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (selectedFiles.length === 0 || !selectedProject) {
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
        const res = await fetch(`${API_BASE}/document-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectName: selectedProject,
            fileName: selectedFiles[0],
            fileNames: selectedFiles,
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
    [selectedFiles, selectedProject, toast]
  );

  return {
    documents,
    summary,
    messages,
    isProcessing,
    isSummarizing,
    isChatLoading,
    selectedFiles,
    selectedProject,
    addDocument,
    compareDocuments,
    removeDocument: (id: string) =>
      setDocuments((prev) => prev.filter((d) => d.id !== id)),
    clearAllDocuments: () => {
      setDocuments([]);
      setSummary(null);
      setMessages([]);
      setSelectedFiles([]);
      setSelectedProject(null);
      localStorage.removeItem('documentChat_state');
    },
    sendMessage,
    handleFilesSelect,    // 🔹 pass to DocumentUpload
    handleFinalFileSelect // 🔹 pass to DocumentUpload
  };
}
