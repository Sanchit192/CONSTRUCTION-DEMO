import { useEffect, useRef, useState } from "react";
import { FileText, Sparkles, Download } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface DocumentSummaryProps {
  fileName: string | null;
  summary: string | null;
  isLoading: boolean;
}

export function DocumentSummary({
  fileName,
  summary,
  isLoading,
}: DocumentSummaryProps) {
  const summaryRef = useRef<HTMLDivElement>(null);

  // --- Local state for local storage ---
  const [storedSummary, setStoredSummary] = useState<string | null>(null);

  // Load summary from local storage on mount
  useEffect(() => {
    const savedSummary = localStorage.getItem("documentSummary");
    if (savedSummary) setStoredSummary(savedSummary);
  }, []);

  // Update local storage whenever `summary` changes
  useEffect(() => {
    if (summary) {
      localStorage.setItem("documentSummary", summary);
      setStoredSummary(summary);
    }
  }, [summary]);

  const handleDownloadPDF = async () => {
    if (!summaryRef.current) return;

    const element = summaryRef.current;
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.height = "auto";
    clone.style.position = "absolute";
    clone.style.top = "-9999px";
    clone.style.overflow = "visible";

    document.body.appendChild(clone);

    const canvas = await html2canvas(clone, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    document.body.removeChild(clone);

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${fileName || "document-summary"}.pdf`);
  };

  const splitFinalRecommendation = (text: string) => {
    const lines = text.split("\n");
    const frStart = lines.findIndex((line) =>
      line.toLowerCase().includes("final recommendation")
    );
    if (frStart === -1) return { finalRecommendation: "", rest: text };

    let frEnd = frStart + 1;
    while (frEnd < lines.length && lines[frEnd].trim() !== "") frEnd++;

    const finalRecommendation = lines.slice(frStart, frEnd).join("\n");
    const rest = lines.slice(frEnd).join("\n");
    return { finalRecommendation, rest };
  };

  return (
    <Card className="h-[450px] w-full flex flex-col shadow-md border border-slate-200 z-0">
      <CardHeader className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#F5A623]" />
            <span className="text-lg font-semibold text-slate-900">
              Document Comparison
            </span>
          </div>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 text-sm text-slate-700 hover:bg-slate-100 transition"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
        {fileName && (
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 truncate">
            <FileText className="w-4 h-4" />
            <span className="truncate">{fileName}</span>
          </div>
        )}
      </CardHeader>

      <CardContent ref={summaryRef} className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[80%]" />
          </div>
        )}

        {!isLoading && storedSummary && (() => {
          const { finalRecommendation, rest } = splitFinalRecommendation(storedSummary);
          return (
            <div className="prose prose-slate max-w-full break-words text-sm">
              {finalRecommendation && (
                <div className="border-l-4 border-[#F5A623] bg-amber-50 p-4 rounded my-4">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {finalRecommendation}
                  </ReactMarkdown>
                </div>
              )}
              {rest && (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: (props) => (
                      <h1 className="text-xl font-bold text-slate-900 my-4" {...props} />
                    ),
                    h2: (props) => (
                      <h2 className="text-lg font-semibold text-[#F5A623] my-3" {...props} />
                    ),
                    h3: (props) => (
                      <h3 className="text-base font-semibold text-slate-800 my-2" {...props} />
                    ),
                    strong: (props) => (
                      <strong className="font-semibold text-slate-900" {...props} />
                    ),
                    ul: (props) => (
                      <ul className="list-disc pl-6 space-y-1" {...props} />
                    ),
                    ol: (props) => (
                      <ol className="list-decimal pl-6 space-y-1" {...props} />
                    ),
                    table: (props) => (
                      <div className="overflow-x-auto my-4">
                        <table
                          className="w-full border border-slate-300 text-xs"
                          {...props}
                        />
                      </div>
                    ),
                    th: (props) => (
                      <th className="border border-slate-300 bg-slate-100 px-2 py-1 text-left font-semibold text-slate-800" {...props} />
                    ),
                    td: (props) => (
                      <td className="border border-slate-300 px-2 py-1" {...props} />
                    ),
                    blockquote: (props) => (
                      <div className="border-l-4 border-[#F5A623] bg-amber-50 p-4 rounded my-4" {...props} />
                    ),
                  }}
                >
                  {rest}
                </ReactMarkdown>
              )}
            </div>
          );
        })()}

        {!isLoading && !storedSummary && (
          <div className="text-center text-xs text-slate-500">
            Select files and click Compare
          </div>
        )}
      </CardContent>
    </Card>
  );
}
