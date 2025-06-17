
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Auth from "@/pages/Auth";
import Index from "@/pages/Index";
import Dashboard from "@/pages/Dashboard";
import Feedback from "@/pages/Feedback";
import DataManagement from "@/pages/DataManagement";
import Privacy from "@/pages/Privacy";
import PublicLanding from "@/pages/PublicLanding";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Company from "@/pages/Company";
import NotFound from "@/pages/NotFound";
import CookieConsent from "@/components/CookieConsent";
import { useEffect } from "react";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Handle Amazon OAuth callback
    const handleAmazonCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      if (code && state && window.location.pathname === '/auth/amazon/callback') {
        // This would be handled by the useAmazonConnections hook
        console.log('Amazon OAuth callback received', { code, state });
        // Redirect to dashboard after handling
        window.location.href = '/dashboard';
      }
    };

    handleAmazonCallback();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<PublicLanding />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/company" element={<Company />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/amazon/callback" element={<Navigate to="/dashboard" replace />} />
              
              {/* Protected routes */}
              <Route path="/app" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
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
              <Route path="/privacy" element={
                <ProtectedRoute>
                  <Privacy />
                </ProtectedRoute>
              } />
              
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <CookieConsent />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
