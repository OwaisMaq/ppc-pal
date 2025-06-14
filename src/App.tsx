
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import CookieConsent from "@/components/CookieConsent";
import PublicLanding from "./pages/PublicLanding";
import Company from "./pages/Company";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Feedback from "./pages/Feedback";
import Privacy from "./pages/Privacy";
import DataManagement from "./pages/DataManagement";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";

const queryClient = new QueryClient();

const RouteLogger = () => {
  const location = useLocation();
  
  useEffect(() => {
    console.log('RouteLogger: Route changed to:', location.pathname);
    console.log('RouteLogger: Full URL:', window.location.href);
    console.log('RouteLogger: Search params:', location.search);
    console.log('RouteLogger: Hash:', location.hash);
  }, [location.pathname, location.search, location.hash]);
  
  return null;
};

const App = () => {
  useEffect(() => {
    console.log('App: Initial load, current URL:', window.location.href);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <RouteLogger />
            <Routes>
              {/* Public routes - these should NEVER redirect to auth automatically */}
              <Route path="/" element={<PublicLanding />} />
              <Route path="/company" element={<Company />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/privacy" element={<Privacy />} />
              
              {/* Protected routes - these redirect to auth if not authenticated */}
              <Route path="/app" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/feedback" element={
                <ProtectedRoute>
                  <Feedback />
                </ProtectedRoute>
              } />
              <Route path="/data-management" element={
                <ProtectedRoute>
                  <DataManagement />
                </ProtectedRoute>
              } />
              
              {/* Catch-all route for 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <CookieConsent />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
