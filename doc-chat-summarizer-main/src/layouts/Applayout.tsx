import { FileText } from "lucide-react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

interface AppLayoutProps {
  user: { name: string; email?: string };
  onLogout: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ user, onLogout }) => {
  const [showLogout, setShowLogout] = useState(false);
  const circleRef = useRef<HTMLDivElement>(null);

  const getInitials = (name: string) => {
    const names = name.trim().split(" ");
    return names.length === 1
      ? names[0][0].toUpperCase()
      : (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  // Close logout if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (circleRef.current && !circleRef.current.contains(event.target as Node)) {
        setShowLogout(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="border-b bg-card/50 sticky top-0 z-10 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* LEFT */}
          <div className="flex items-center gap-4">
            <img src="/CG-Logo-Dark.png" alt="DocAI Logo" className="h-12 w-auto object-contain" />
            <span className="h-8 w-px bg-border" />
            <div>
              <h1 className="text-xl font-semibold">DocAI</h1>
              <p className="text-sm text-muted-foreground">
                Upload, summarize, and chat with documents
              </p>
            </div>
          </div>

          {/* RIGHT NAV */}
          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-6">
              <Link to="/" className="text-sm font-medium hover:text-primary transition">
                Documents
              </Link>
              <Link to="/dailyreports" className="text-sm font-medium hover:text-primary transition">
                Daily Reports
              </Link>
            </nav>

            {/* User Initials Circle */}
            {user && (
              <div className="relative" ref={circleRef}>
                <div
                  className="w-10 h-10 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold cursor-pointer"
                  onClick={() => setShowLogout((prev) => !prev)}
                >
                  {getInitials(user.name)}
                </div>

                {/* Dropdown Logout */}
                {showLogout && (
                  <button
                    onClick={onLogout}
                    className="absolute right-0 mt-2 px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition shadow-md"
                  >
                    Logout
                  </button>
                )}
              </div>
            )}
          </div>
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

