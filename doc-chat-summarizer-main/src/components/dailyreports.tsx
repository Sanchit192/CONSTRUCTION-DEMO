import { useEffect, useState } from "react";
import { Upload, FileText, Loader2, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";

const API_BASE = "https://construction-demo-g9gggbgsd0bmdccx.eastus-01.azurewebsites.net/api";

/* ---------------- TYPES ---------------- */
interface UploadedFile {
  name: string;
}

interface LocationState {
  project?: string;
  finalFile?: string;
}

/* ---------------- COMPONENT ---------------- */
const DailyReports = () => {
  const location = useLocation();
  const state = location.state as LocationState | undefined;

  const [projects, setProjects] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState(state?.project || "");
  const [finalFile, setFinalFile] = useState<string | null>(state?.finalFile || null);

  const [existingFiles, setExistingFiles] = useState<UploadedFile[]>([]); // Files already in project (excluding final)
  const [sessionFiles, setSessionFiles] = useState<UploadedFile[]>([]);   // Newly uploaded files
  const [selectedFile, setSelectedFile] = useState<string | null>(null);   // Single file to compare
  const [loading, setLoading] = useState(false);

  const [comparisonResult, setComparisonResult] = useState<string>("");

  /* ---------------- FETCH PROJECTS ---------------- */
  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects`);
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };

  /* ---------------- FETCH EXISTING FILES ---------------- */
  const fetchFiles = async (project: string) => {
    try {
      const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(project)}/files`);
      const data = await res.json();

      const filtered = data
        .filter((f: string) => f !== finalFile)
        .map((f: string) => ({ name: f }));

      setExistingFiles(filtered);
      setSelectedFile(null);
    } catch (err) {
      console.error("Failed to fetch files", err);
    }
  };

  /* ---------------- INITIAL LOAD ---------------- */
  useEffect(() => {
    fetchProjects();
    if (selectedProject) fetchFiles(selectedProject);
  }, []);

  /* ---------------- PROJECT SELECT ---------------- */
  const handleProjectSelect = (project: string) => {
    setSelectedProject(project);
    setExistingFiles([]);
    setSessionFiles([]);
    setSelectedFile(null);
    setComparisonResult(""); // Clear previous summary
    if (project) fetchFiles(project);
  };

  /* ---------------- FILE UPLOAD ---------------- */
  const handleUploadFile = async (file: File) => {
    if (!selectedProject) {
      alert("Please select a project first");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `${API_BASE}/projects/daily-reports/${encodeURIComponent(selectedProject)}/upload`,
        { method: "POST", body: formData }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setSessionFiles((prev) => [...prev, { name: file.name }]);
      setSelectedFile(file.name); // auto-select uploaded file
    } catch (err: any) {
      console.error(err);
      alert(err.message || "File upload failed");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- FILE SELECTION ---------------- */
  const handleSelectFile = (fileName: string) => {
    setSelectedFile(fileName === selectedFile ? null : fileName);
  };

  /* ---------------- COMPARE ---------------- */
  const handleCompare = async () => {
  if (!selectedProject || !selectedFile || !finalFile) {
    setComparisonResult("Please select a project and a daily report");
    return;
  }

  setComparisonResult("Loading...");

  try {
    const res = await fetch(`${API_BASE}/daily-reports/anomaly-detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: selectedProject,
        files: [
          selectedFile, // DAILY REPORT
          finalFile     // FINAL SOW
        ]
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Comparison failed");

    setComparisonResult(data.anomalies);
    console.log(data);
  } catch (err: any) {
    console.error(err);
    setComparisonResult(err.message || "Comparison failed");
  }
};

const formatSummary = (text: string) => {
  return text
    .split("•")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [category, expected, actual, severity] =
        line.split("|").map(p => p.trim());

      return { category, expected, actual, severity };
    });
};


  /* ---------------- UI ---------------- */
  return (
    <div className="flex space-x-4 max-w-8xl mx-auto mt-2  h-[450px] ">
  {/* LEFT PANEL */}
  <div className="w-1/2 bg-white p-6 rounded-lg border h-full overflow-y-auto space-y-3 shadow">
    {/* HEADER */}
    <div className="flex justify-between items-start mb-2">
      <div>
        <h2 className="text-lg font-bold mb-2">Daily Reports</h2>
        <p className="text-xs text-muted-foreground">
          Compare a file with the finalized report
        </p>
      </div>

      {finalFile && (
        <div className="flex items-center gap-1 p-1 border border-green-500 bg-green-50 rounded text-xs">
          <FileText className="w-4 h-4" />
          <span className="truncate max-w-xs">{finalFile}</span>
          <span className="px-1 py-0.5 rounded bg-green-600 text-white text-[10px]">
            FINAL
          </span>
          <Flag className="w-4 h-4 text-green-600" />
        </div>
      )}
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

    {/* UPLOAD */}
    {selectedProject && (
      <div className="border-2 border-dashed rounded-lg p-3 text-center">
        <input
          type="file"
          className="hidden"
          id="dailyUpload"
          onChange={(e) => e.target.files && handleUploadFile(e.target.files[0])}
        />
        <label
          htmlFor="dailyUpload"
          className="cursor-pointer flex flex-col items-center gap-1"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
          <p className="text-xs">
            Upload file to <strong>{selectedProject}</strong>
          </p>
        </label>
        <p className="mt-2 text-xs text-gray-500">
    Supported file types: PDF, DOC, DOCX
  </p>
      </div>
    )}

    {/* EXISTING FILES */}
    {(existingFiles.length > 0 || sessionFiles.length > 0) && (
      <div className="space-y-2">
        {/* {existingFiles.length > 0 && (
          <>
            <h3 className="font-medium text-sm">Existing Files</h3>
            {existingFiles.map((file) => (
              <div
                key={file.name}
                className={`flex items-center justify-between p-2 rounded border cursor-pointer text-sm ${
                  selectedFile === file.name ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50"
                }`}
                onClick={() => handleSelectFile(file.name)}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3 h-3" />
                  <span className="truncate">{file.name}</span>
                </div>
              </div>
            ))}
          </>
        )} */}

        {sessionFiles.length > 0 && (
          <>
            <h3 className="font-medium text-sm">Uploaded This Session</h3>
            {sessionFiles.map((file) => (
              <div
                key={file.name}
                className={`flex items-center justify-between p-2 rounded border cursor-pointer text-sm ${
                  selectedFile === file.name ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50"
                }`}
                onClick={() => handleSelectFile(file.name)}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3 h-3" />
                  <span className="truncate">{file.name}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    )}

    {/* COMPARE BUTTON */}
    <Button
      disabled={!selectedProject || !selectedFile || !finalFile}
      onClick={handleCompare}
      className="mt-2 w-full text-sm"
    >
      Compare
    </Button>
  </div>

  {/* RIGHT PANEL */}
  {/* RIGHT PANEL */}
<div className="w-1/2 bg-white p-4 rounded-lg border overflow-y-auto shadow ">
  <h2 className="text-lg font-bold mb-2">Anomaly Summary</h2>

  {/* SHOW SKELETON WHEN LOADING */}
  {comparisonResult === "Loading..." ? (
    <div className="space-y-2 animate-pulse">
      {/* KPI Skeleton */}
      <div className="flex gap-3 mb-3">
        <div className="flex-1 h-6 bg-gray-200 rounded"></div>
        <div className="flex-1 h-6 bg-gray-200 rounded"></div>
        <div className="flex-1 h-6 bg-gray-200 rounded"></div>
      </div>

      {/* Anomaly Cards Skeleton */}
      {Array(3)
        .fill(0)
        .map((_, idx) => (
          <div key={idx} className="bg-white p-2 rounded-lg border shadow-sm text-sm space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        ))}
    </div>
  ) : comparisonResult ? (
    <>
      {/* KPI SUMMARY */}
      {formatSummary(comparisonResult).length > 0 && (() => {
        const summary = formatSummary(comparisonResult);
        const highCount = summary.filter((i) => i.severity === "Impact: High").length;
        const mediumCount = summary.filter((i) => i.severity === "Impact: Medium").length;
        const lowCount = summary.filter((i) => i.severity === "Impact: Low").length;

        return (
          <div className="flex gap-3 mb-3 text-xs">
            <div className="flex-1 bg-red-100 text-red-700 font-semibold p-1 rounded text-center">
              High: {highCount}
            </div>
            <div className="flex-1 bg-yellow-100 text-yellow-700 font-semibold p-1 rounded text-center">
              Medium: {mediumCount}
            </div>
            <div className="flex-1 bg-green-100 text-green-700 font-semibold p-1 rounded text-center">
              Low: {lowCount}
            </div>
          </div>
        );
      })()}

      {/* ANOMALY LIST */}
      <div className="space-y-2">
        {formatSummary(comparisonResult).map((item, idx) => (
          <div key={idx} className="bg-white p-2 rounded-lg border shadow-sm text-sm">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-semibold">{item.category}</h3>
              <span
                className={`text-[10px] px-1 py-0.5 rounded font-medium ${
                  item.severity === "Impact: High"
                    ? "bg-red-100 text-red-700"
                    : item.severity === "Impact: Medium"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {item.severity}
              </span>
            </div>
            <div className="space-y-1">
              <p>
                <strong>Expected:</strong> {item.expected}
              </p>
              <p>
                <strong>Observed:</strong> {item.actual}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  ) : (
    <p className="text-muted-foreground text-xs">
      Select a file to compare with the final SOW.
    </p>
  )}
</div>
</div>
  );
};

export default DailyReports;
