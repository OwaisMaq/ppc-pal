import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Feedback from "@/pages/Feedback";
import Campaigns from "@/pages/Campaigns";
import AIInsights from "@/pages/AIInsights";
import SearchTerms from "@/pages/SearchTerms";
import Privacy from "@/pages/Privacy";
import BudgetCopilot from "@/pages/BudgetCopilot";
import Anomalies from "@/pages/Anomalies";
import Attribution from "@/pages/Attribution";
import MultiAccount from "@/pages/MultiAccount";
import PublicLanding from "@/pages/PublicLanding";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Company from "@/pages/Company";
import NotFound from "@/pages/NotFound";
import Waitlist from "@/pages/Waitlist";
import AmazonCallback from "@/pages/AmazonCallback";
import CookieConsent from "@/components/CookieConsent";
import Settings from "@/pages/Settings";
import Onboarding from "@/pages/Onboarding";
import DevTools from "@/pages/DevTools";
import { DateRangeProvider } from "@/context/DateRangeContext";
import { OnboardingCheck } from "@/components/OnboardingCheck";
import { useLoginSync } from "@/hooks/useLoginSync";

const queryClient = new QueryClient();

const AppContent = () => {
  useLoginSync();
  return null;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
        <TooltipProvider>
          <Toaster />
          <DateRangeProvider>
            <BrowserRouter>
              <OnboardingCheck>
                <Routes>
                {/* Public routes */}
                <Route path="/" element={<PublicLanding />} />
                <Route path="/waitlist" element={<Waitlist />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/company" element={<Company />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/amazon/callback" element={<AmazonCallback />} />
                <Route path="/onboarding" element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                } />
                
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
                <Route path="/campaigns" element={
                  <ProtectedRoute>
                    <Campaigns />
                  </ProtectedRoute>
                } />
                <Route path="/ai-insights" element={
                  <ProtectedRoute>
                    <AIInsights />
                  </ProtectedRoute>
                } />
                <Route path="/search-terms" element={
                  <ProtectedRoute>
                    <SearchTerms />
                  </ProtectedRoute>
                } />
                <Route path="/budget-copilot" element={
                  <ProtectedRoute>
                    <BudgetCopilot />
                  </ProtectedRoute>
                } />
                <Route path="/anomalies" element={
                  <ProtectedRoute>
                    <Anomalies />
                  </ProtectedRoute>
                } />
                <Route path="/attribution" element={
                  <ProtectedRoute>
                    <Attribution />
                  </ProtectedRoute>
                } />
                <Route path="/multi-account" element={
                  <ProtectedRoute>
                    <MultiAccount />
                  </ProtectedRoute>
                } />
                <Route path="/dev-tools" element={
                  <ProtectedRoute>
                    <DevTools />
                  </ProtectedRoute>
                } />
                
                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </OnboardingCheck>
            </BrowserRouter>
            <CookieConsent />
          </DateRangeProvider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
