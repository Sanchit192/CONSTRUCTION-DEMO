import { FileText } from "lucide-react";
import { Link, Outlet } from "react-router-dom";

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="border-b bg-card/50 sticky top-0 z-10 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* LEFT */}
          <div className="flex items-center gap-4">
            {/* LOGO */}
            <img
              src="/CG-Logo-Dark.png"
              alt="DocAI Logo"
              className="h-12 w-auto object-contain"
            />
            <span className="h-8 w-px bg-border" />
            <div>
              <h1 className="text-xl font-semibold">DocAI</h1>
              <p className="text-sm text-muted-foreground">
                Upload, summarize, and chat with documents
              </p>
            </div>
          </div>

          {/* RIGHT NAV */}
          <nav className="flex items-center gap-6">
            <Link
              to="/"
              className="text-sm font-medium hover:text-primary transition"
            >
              Documents
            </Link>

            <Link
              to="/dailyreports"
              className="text-sm font-medium hover:text-primary transition"
            >
              Daily Reports
            </Link>
          </nav>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <main className="container mx-auto px-2 pt-5 pb-2">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
