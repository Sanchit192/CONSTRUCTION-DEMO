import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import DailyReports from "./components/dailyreports";
import AppLayout from "./layouts/Applayout";
import SignUp from "./pages/signup";

const queryClient = new QueryClient();

function App() {
  const [userSession, setUserSession] = useState<string | null>(
    localStorage.getItem("userSession")
  );

  // Function to log in / sign up
  const handleLogin = (session: string) => {
    localStorage.setItem("userSession", session);
    setUserSession(session);
  };

  // Function to log out
  const handleLogout = () => {
    localStorage.clear();
    localStorage.removeItem("userSession");
    setUserSession(null);
  };

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />

          <Routes>
            {/* Public route */}
            <Route
              path="/signup"
              element={
                userSession ? (
                  <Navigate to="/" />
                ) : (
                  <SignUp onSignUp={handleLogin} />
                )
              }
            />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                userSession ? (
                  <AppLayout user={JSON.parse(userSession)} onLogout={handleLogout} />
                ) : (
                  <Navigate to="/signup" />
                )
              }
            >
              <Route index element={<Index />} />
              <Route path="dailyreports" element={<DailyReports />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
