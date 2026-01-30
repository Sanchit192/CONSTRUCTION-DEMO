import { useState, useMemo, useEffect } from 'react';
import { StatCard } from '@/components/StatCard';
import { MatchingTable } from '@/components/MatchingTable';
import { MatchingDetails } from '@/components/MatchingDetails';
import { getMatchingResults } from '@/data/mockData';
import { MatchingResult } from '@/types/invoice';
import {
  FileText,
  Package,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

/* ===========================
   TYPES
=========================== */
type Project = {
  id: string;
  name: string;
};

const API_BASE =
  "https://construction-demo-g9gggbgsd0bmdccx.eastus-01.azurewebsites.net/api";

const InvoiceWorkspace = () => {
  const [selectedResult, setSelectedResult] =
    useState<MatchingResult | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');

  /* ===========================
     DATA
  =========================== */
  const matchingResults = useMemo(() => getMatchingResults(), []);

  /* ===========================
     FETCH PROJECTS
  =========================== */
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${API_BASE}/projects`);
        const data = await res.json();
        console.log('Fetched projects:', data);
        // If API returns array of strings, map to { id, name }
        if (Array.isArray(data) && typeof data[0] === 'string') {
          setProjects(data.map((name, idx) => ({ id: String(idx), name })));
        } else {
          setProjects(data);
        }
      } catch (error) {
        console.error('Failed to fetch projects', error);
      }
    };

    fetchProjects();
  }, []);

  /* ===========================
     FILTER BY PROJECT
  =========================== */
  const projectFilteredResults = useMemo(() => {
    if (selectedProject === 'all') return matchingResults;
    return matchingResults.filter(
      (r) => r.projectName === selectedProject
    );
  }, [matchingResults, selectedProject]);

  /* ===========================
     STATS
  =========================== */
  const stats = useMemo(() => {
    const totalPOs = projectFilteredResults.length;
    const matched = projectFilteredResults.filter(
      (r) => r.overallStatus === 'complete'
    ).length;
    const anomalies = projectFilteredResults.filter(
      (r) => r.overallStatus === 'anomaly'
    ).length;
    const pending = projectFilteredResults.filter(
      (r) =>
        r.overallStatus === 'pending' ||
        r.overallStatus === 'partial'
    ).length;

    const totalAnomalies = projectFilteredResults.reduce(
      (acc, r) =>
        acc +
        r.step1Anomalies.length +
        r.step2Anomalies.length +
        r.step3Anomalies.length,
      0
    );

    return { totalPOs, matched, anomalies, pending, totalAnomalies };
  }, [projectFilteredResults]);

  /* ===========================
     HANDLERS
  =========================== */
  const handleViewDetails = (result: MatchingResult) => {
    setSelectedResult(result);
    setDetailsOpen(true);
  };

  const filterByStatus = (status: string) => {
    if (status === 'all') return projectFilteredResults;
    if (status === 'anomaly')
      return projectFilteredResults.filter(
        (r) => r.overallStatus === 'anomaly'
      );
    if (status === 'pending')
      return projectFilteredResults.filter(
        (r) =>
          r.overallStatus === 'pending' ||
          r.overallStatus === 'partial'
      );
    return projectFilteredResults.filter(
      (r) => r.overallStatus === 'complete'
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8 space-y-8">

        {/* ================= HEADER + PROJECT SELECT ================= */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-serif font-bold tracking-tight">
              Dashboard
            </h2>
            <p className="text-muted-foreground mt-1">
              Monitor 3-way invoice matching and detect anomalies in real-time
            </p>
          </div>

          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm focus:outline-none"
          >
            <option value="all">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.name}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* ================= STATS ================= */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Purchase Orders" value={stats.totalPOs} icon={FileText} />
          <StatCard title="Fully Matched" value={stats.matched} icon={CheckCircle2} variant="success" />
          <StatCard title="With Anomalies" value={stats.anomalies} icon={AlertTriangle} variant="destructive" />
          <StatCard title="Pending Review" value={stats.pending} icon={Clock} variant="warning" />
        </div>

        {/* ================= ANOMALY SUMMARY ================= */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Anomaly Detection Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard
                title="Step 1: PO ↔ SOW"
                count={projectFilteredResults.reduce((a, r) => a + r.step1Anomalies.length, 0)}
                icon={<FileText className="h-5 w-5" />}
              />
              <SummaryCard
                title="Step 2: PO ↔ Receipt"
                count={projectFilteredResults.reduce((a, r) => a + r.step2Anomalies.length, 0)}
                icon={<Package className="h-5 w-5" />}
              />
              <SummaryCard
                title="Step 3: Receipt ↔ Invoice"
                count={projectFilteredResults.reduce((a, r) => a + r.step3Anomalies.length, 0)}
                icon={<Receipt className="h-5 w-5" />}
              />
            </div>
          </CardContent>
        </Card>

        {/* ================= MATCHING TABLE ================= */}
        <Card>
          <CardHeader>
            <CardTitle>Matching Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All ({projectFilteredResults.length})</TabsTrigger>
                <TabsTrigger value="complete">Matched ({stats.matched})</TabsTrigger>
                <TabsTrigger value="anomaly">Anomalies ({stats.anomalies})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
              </TabsList>

              {['all', 'complete', 'anomaly', 'pending'].map((tab) => (
                <TabsContent key={tab} value={tab}>
                  <MatchingTable
                    results={filterByStatus(tab)}
                    onViewDetails={handleViewDetails}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </main>

      {/* ================= DETAILS MODAL ================= */}
      <MatchingDetails
        result={selectedResult}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
};

/* ===========================
   SMALL SUMMARY CARD
=========================== */
const SummaryCard = ({
  title,
  count,
  icon,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
}) => (
  <div className="p-4 rounded-lg bg-muted/50 border">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-muted">{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-xl font-bold">{count} issues</p>
      </div>
    </div>
  </div>
);

export default InvoiceWorkspace;
