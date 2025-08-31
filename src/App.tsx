
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Feedback from "@/pages/Feedback";
import DataManagement from "@/pages/DataManagement";
import PerformanceDashboard from "@/pages/PerformanceDashboard";
import AutomationPage from "@/pages/AutomationPage";
import Privacy from "@/pages/Privacy";
import PublicLanding from "@/pages/PublicLanding";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Company from "@/pages/Company";
import NotFound from "@/pages/NotFound";
import AmazonCallback from "@/pages/AmazonCallback";
import CookieConsent from "@/components/CookieConsent";
import Settings from "@/pages/Settings";
import { SearchStudio } from "@/pages/SearchStudio";
import { TargetStudio } from "@/pages/TargetStudio";
import { PlaybooksPage } from "@/pages/PlaybooksPage";


import { DateRangeProvider } from "@/context/DateRangeContext";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <DateRangeProvider>
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<PublicLanding />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/company" element={<Company />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/amazon/callback" element={<AmazonCallback />} />
                
                {/* Protected routes */}
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
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/performance" element={
                  <ProtectedRoute>
                    <PerformanceDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/automation" element={
                  <ProtectedRoute>
                    <AutomationPage />
                  </ProtectedRoute>
                } />
                <Route path="/search-studio" element={
                  <ProtectedRoute>
                    <SearchStudio />
                  </ProtectedRoute>
                } />
                <Route path="/target-studio" element={
                  <ProtectedRoute>
                    <TargetStudio />
                  </ProtectedRoute>
                } />
                <Route path="/playbooks" element={
                  <ProtectedRoute>
                    <PlaybooksPage />
                  </ProtectedRoute>
                } />
                
                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            <CookieConsent />
          </DateRangeProvider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
