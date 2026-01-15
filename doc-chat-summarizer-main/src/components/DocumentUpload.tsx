import { useEffect, useState } from "react";
import { Upload, FileText, Loader2, Flag,Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://construction-demo-g9gggbgsd0bmdccx.eastus-01.azurewebsites.net/api";

/* ---------------- TYPES ---------------- */
interface UploadedFile {
  name: string;
}

interface UploadedDocument {
  id: string;
  fileName: string;
  content: string;
}

interface DocumentUploadProps {
  documents: UploadedDocument[];
  onDocumentAdd: (content: string, fileName: string) => void;
  onDocumentRemove: (id: string) => void;
  onClearAll: () => void;
  isProcessing: boolean;

  /** selected files */
  onFilesSelect: (files: string[]) => void;

  /** FINAL FILE */
  onFinalFileSelect: (fileName: string) => void;

  /** COMPARE (summary trigger) */
  onCompare: (project: string, files: string[]) => void;

  /** PROJECT SELECTION CALLBACK */
  onProjectSelect?: (project: string) => void;
}

/* ---------------- COMPONENT ---------------- */
export function DocumentUpload({
  documents,
  onDocumentAdd,
  onDocumentRemove,
  onClearAll,
  isProcessing,
  onFilesSelect,
  onFinalFileSelect,
  onCompare,
  onProjectSelect, // ✅ added
}: DocumentUploadProps) {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [newProject, setNewProject] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [finalFile, setFinalFile] = useState<string | null>(null);

  const [finalFileByProject, setFinalFileByProject] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  /* ---------------- FETCH PROJECTS ---------------- */
  const fetchProjects = async () => {
    const res = await fetch(`${API_BASE}/projects`);
    const data = await res.json();
    setProjects(data);
  };

  /* ---------------- FETCH FILES ---------------- */
  const fetchFiles = async (project: string) => {
    const res = await fetch(`${API_BASE}/projects/${project}/files`);
    const data = await res.json();

    setFiles(data.map((f: string) => ({ name: f })));

    // restore FINAL for this project
    const finalForProject = finalFileByProject[project] || null;
    setFinalFile(finalForProject);

    if (finalForProject) {
      setSelectedFiles([finalForProject]);
      onFilesSelect([finalForProject]);
    } else {
      setSelectedFiles([]);
      onFilesSelect([]);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  /* ---------------- PROJECT HANDLING ---------------- */
  const handleProjectSelect = (value: string) => {
    setSelectedProject(value);
    setNewProject("");
    fetchFiles(value);

    // ✅ notify parent about selected project
    if (onProjectSelect) onProjectSelect(value);
  };

  const handleCreateProject = () => {
    if (!newProject.trim()) return;

    setSelectedProject(newProject);
    setProjects((prev) => [...new Set([...prev, newProject])]);
    setFiles([]);
    setSelectedFiles([]);
    setFinalFile(null);
    setNewProject("");
    onFilesSelect([]);

    // ✅ notify parent about new project
    if (onProjectSelect) onProjectSelect(newProject);
  };

  /* ---------------- FILE UPLOAD ---------------- */
  const handleUploadFile = async (file: File) => {
    if (!selectedProject) {
      alert("Select or create a project first");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    await fetch(`${API_BASE}/projects/${selectedProject}/upload`, {
      method: "POST",
      body: formData,
    });

    setLoading(false);
    fetchFiles(selectedProject);
    fetchProjects();
  };

  /* ---------------- FILE SELECTION ---------------- */
  const toggleFile = (fileName: string) => {
    if (finalFile) return; // lock after finalize

    setSelectedFiles((prev) => {
      const updated = prev.includes(fileName)
        ? prev.filter((f) => f !== fileName)
        : [...prev, fileName];

      onFilesSelect(updated);
      return updated;
    });
  };

  /* ---------------- MARK FINAL ---------------- */
  const markAsFinal = (fileName: string) => {
  if (finalFile === fileName) {
    // ✅ unmark if clicking again
    setFinalFile(null);
    setSelectedFiles([]);
    setFinalFileByProject((prev) => {
      const updated = { ...prev };
      delete updated[selectedProject];
      return updated;
    });
    onFilesSelect([]);
    onFinalFileSelect(null);
  } else {
    // mark as final
    setFinalFile(fileName);
    setSelectedFiles([fileName]);
    setFinalFileByProject((prev) => ({
      ...prev,
      [selectedProject]: fileName,
    }));
    onFilesSelect([fileName]);
    onFinalFileSelect(fileName);
  }
};

  /* ---------------- FINALIZE ---------------- */
  const handleFinalize = () => {
    if (!finalFile) return;

    navigate("/dailyreports", {
      state: {
        project: selectedProject,
        finalFile,
      },
    });
  };

  const handleDeleteFile = async (fileName: string) => {
  if (!selectedProject) {
    alert("Select a project first");
    return;
  }

  if (!confirm(`Are you sure you want to delete ${fileName}?`)) return;

  try {
    const res = await fetch(
      `${API_BASE}/projects/${selectedProject}/files?fileName=${encodeURIComponent(fileName)}`,
      {
        method: "DELETE",
      }
    );

    if (!res.ok) {
      const error = await res.json();
      alert(`Failed to delete file: ${error.message || res.statusText}`);
      return;
    }

    // ✅ remove from UI
    setFiles((prev) => prev.filter((f) => f.name !== fileName));

    // ✅ remove from selectedFiles if it was selected
    setSelectedFiles((prev) => prev.filter((f) => f !== fileName));

    // ✅ unmark final if it was final
    if (finalFile === fileName) {
      setFinalFile(null);
      setFinalFileByProject((prev) => {
        const updated = { ...prev };
        delete updated[selectedProject];
        return updated;
      });
      onFilesSelect([]);
      onFinalFileSelect(null);
    }

    alert(`${fileName} deleted successfully`);
  } catch (err) {
    console.error(err);
    alert("Error deleting file");
  }
};


  /* ---------------- UI ---------------- */
  return (
    <div className="w-full max-w-3xl space-y-6 p-6 bg-white rounded-lg shadow">
      {/* CREATE PROJECT */}
      <div className="flex gap-2">
        <input
          value={newProject}
          onChange={(e) => setNewProject(e.target.value)}
          placeholder="New project name"
          className="flex-1 p-2 border rounded-md"
        />
        <Button onClick={handleCreateProject}>Create</Button>
      </div>

      {/* PROJECT SELECT */}
      <select
        value={selectedProject}
        onChange={(e) => handleProjectSelect(e.target.value)}
        className="w-full p-2 border rounded-md"
      >
        <option value="">Select project</option>
        {projects.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      {/* FILE UPLOAD */}
      <div className="border-2 border-dashed rounded-lg p-6 text-center">
        <input
          type="file"
          className="hidden"
          id="fileUpload"
          onChange={(e) => e.target.files && handleUploadFile(e.target.files[0])}
        />
        <label
          htmlFor="fileUpload"
          className="cursor-pointer flex flex-col items-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <Upload className="w-8 h-8" />
          )}
          <p className="text-sm">
            Upload to <strong>{selectedProject || "—"}</strong>
          </p>
        </label>
        
      </div>

      {/* FILE LIST */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">Files</h3>
{files.map((file) => {
  const isFinal = finalFile === file.name;

  return (
    <div
      key={file.name}
      className={`flex items-center justify-between p-3 rounded border ${
        isFinal ? "border-green-500 bg-green-50" : "bg-gray-100"
      }`}
    >
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={selectedFiles.includes(file.name)}
          disabled={!!finalFile}
          onChange={() => toggleFile(file.name)}
        />
        <FileText className="w-4 h-4" />
        <span className="truncate">{file.name}</span>
        {/* {isFinal && (
          <span className="text-xs px-2 py-0.5 rounded bg-green-600 text-white">
            FINAL
          </span>
        )} */}
      </label>

      <div className="flex items-center gap-2">
        {/* Flag toggle */}
        <button
          onClick={() => markAsFinal(file.name)}
          className={`p-1 ${
            isFinal ? "text-green-600" : "text-gray-400 hover:text-green-600"
          }`}
        >
          <Flag className="w-5 h-5" />
        </button>

        {/* Delete button */}
        <button
          onClick={() => handleDeleteFile(file.name)}
          className="p-1 text-red-500 hover:text-red-700"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
})}

        </div>
      )}

      {/* ACTION BUTTONS */}
      <div className="flex gap-3">
        <Button className="flex-1" disabled={!finalFile} onClick={handleFinalize}>
          Finalize
        </Button>

        <Button
          variant="outline"
          className="flex-1"
          disabled={selectedFiles.length === 0}
          onClick={() => onCompare(selectedProject, selectedFiles)}
        >
          Compare
        </Button>
      </div>
    </div>
  );
}
