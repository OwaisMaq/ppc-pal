import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import CookieConsent from "@/components/CookieConsent";
import { DateRangeProvider } from "@/context/DateRangeContext";
import { OnboardingCheck } from "@/components/OnboardingCheck";
import { useLoginSync } from "@/hooks/useLoginSync";

// Lazy load pages for better performance
const Auth = lazy(() => import("@/pages/Auth"));
const CommandCenter = lazy(() => import("@/pages/CommandCenter"));
const Feedback = lazy(() => import("@/pages/Feedback"));
const Campaigns = lazy(() => import("@/pages/Campaigns"));
const CampaignBuilder = lazy(() => import("@/pages/CampaignBuilder"));

const Privacy = lazy(() => import("@/pages/Privacy"));
const Automate = lazy(() => import("@/pages/Automate"));
const Reports = lazy(() => import("@/pages/Reports"));
const MultiAccount = lazy(() => import("@/pages/MultiAccount"));
const PublicLanding = lazy(() => import("@/pages/PublicLanding"));
const PublicPrivacy = lazy(() => import("@/pages/PublicPrivacy"));
const PublicTerms = lazy(() => import("@/pages/PublicTerms"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Company = lazy(() => import("@/pages/Company"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Waitlist = lazy(() => import("@/pages/Waitlist"));
const AmazonCallback = lazy(() => import("@/pages/AmazonCallback"));
const Settings = lazy(() => import("@/pages/Settings"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const DevTools = lazy(() => import("@/pages/DevTools"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000,
    },
  },
});

const AppContent = () => {
  useLoginSync();
  return null;
};

// Loading fallback for lazy-loaded pages
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
          <TooltipProvider>
            <Toaster />
            <DateRangeProvider>
              <BrowserRouter>
                <OnboardingCheck>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Public routes */}
                      <Route path="/" element={<PublicLanding />} />
                      <Route path="/privacy" element={<PublicPrivacy />} />
                      <Route path="/terms" element={<PublicTerms />} />
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
                      
                      {/* Command Center - Main dashboard */}
                      <Route path="/command-center" element={
                        <ProtectedRoute>
                          <CommandCenter />
                        </ProtectedRoute>
                      } />
                      
                      {/* Campaigns routes */}
                      <Route path="/campaigns" element={
                        <ProtectedRoute>
                          <Campaigns />
                        </ProtectedRoute>
                      } />
                      <Route path="/campaigns/new" element={
                        <ProtectedRoute>
                          <CampaignBuilder />
                        </ProtectedRoute>
                      } />
                      <Route path="/campaigns/search-terms" element={<Navigate to="/campaigns" replace />} />

                      
                      {/* Automate routes */}
                      <Route path="/automate" element={
                        <ProtectedRoute>
                          <Automate />
                        </ProtectedRoute>
                      } />
                      <Route path="/automate/queue" element={
                        <ProtectedRoute>
                          <Automate />
                        </ProtectedRoute>
                      } />
                      <Route path="/automate/history" element={
                        <ProtectedRoute>
                          <Automate />
                        </ProtectedRoute>
                      } />
                      
                      {/* Reports routes */}
                      <Route path="/reports" element={
                        <ProtectedRoute>
                          <Reports />
                        </ProtectedRoute>
                      } />
                      <Route path="/reports/ai-insights" element={<Navigate to="/reports" replace />} />

                      
                      {/* Settings routes */}
                      <Route path="/settings" element={
                        <ProtectedRoute>
                          <Settings />
                        </ProtectedRoute>
                      } />
                      <Route path="/settings/accounts" element={<Navigate to="/settings" replace />} />

                      
                      {/* Other protected routes */}
                      <Route path="/feedback" element={
                        <ProtectedRoute>
                          <Feedback />
                        </ProtectedRoute>
                      } />
                      <Route path="/dev-tools" element={
                        <ProtectedRoute>
                          <DevTools />
                        </ProtectedRoute>
                      } />
                      
                      {/* Redirects from old routes */}
                      <Route path="/dashboard" element={<Navigate to="/command-center" replace />} />
                      <Route path="/overview" element={<Navigate to="/command-center" replace />} />
                      <Route path="/search-terms" element={<Navigate to="/campaigns/search-terms" replace />} />
                      <Route path="/ai-insights" element={<Navigate to="/reports/ai-insights" replace />} />
                      <Route path="/account-audit" element={<Navigate to="/reports" replace />} />
                      <Route path="/attribution" element={<Navigate to="/reports" replace />} />
                      <Route path="/anomalies" element={<Navigate to="/reports" replace />} />
                      <Route path="/budget-copilot" element={<Navigate to="/reports" replace />} />
                      <Route path="/multi-account" element={<Navigate to="/settings/accounts" replace />} />
                      
                      {/* 404 */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </OnboardingCheck>
              </BrowserRouter>
              <CookieConsent />
            </DateRangeProvider>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
