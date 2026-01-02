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
import { GlobalFiltersProvider } from "@/context/GlobalFiltersContext";
import { OnboardingCheck } from "@/components/OnboardingCheck";
import { useLoginSync } from "@/hooks/useLoginSync";

// Lazy load pages for better performance
const Auth = lazy(() => import("@/pages/Auth"));
const CommandCenter = lazy(() => import("@/pages/CommandCenter"));
const Feedback = lazy(() => import("@/pages/Feedback"));
const Campaigns = lazy(() => import("@/pages/Campaigns"));
const CampaignBuilder = lazy(() => import("@/pages/CampaignBuilder"));
const RankTracker = lazy(() => import("@/pages/RankTracker"));
const Changelog = lazy(() => import("@/pages/Changelog"));

const Privacy = lazy(() => import("@/pages/Privacy"));
const Governance = lazy(() => import("@/pages/Governance"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const SearchStudio = lazy(() => import("@/pages/SearchStudio").then(m => ({ default: m.SearchStudio })));
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
            <GlobalFiltersProvider>
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

                      {/* Rank Tracker */}
                      <Route path="/rank-tracker" element={
                        <ProtectedRoute>
                          <RankTracker />
                        </ProtectedRoute>
                      } />

                      {/* Changelog */}
                      <Route path="/changelog" element={
                        <ProtectedRoute>
                          <Changelog />
                        </ProtectedRoute>
                      } />

                      {/* Governance routes */}
                      <Route path="/governance" element={
                        <ProtectedRoute>
                          <Governance />
                        </ProtectedRoute>
                      } />
                      <Route path="/governance/queue" element={
                        <ProtectedRoute>
                          <Governance />
                        </ProtectedRoute>
                      } />
                      <Route path="/governance/history" element={
                        <ProtectedRoute>
                          <Governance />
                        </ProtectedRoute>
                      } />
                      
                      {/* Redirect from old automate route */}
                      <Route path="/automate" element={<Navigate to="/governance" replace />} />
                      <Route path="/automate/*" element={<Navigate to="/governance" replace />} />
                      
                      {/* Analytics routes */}
                      <Route path="/analytics" element={
                        <ProtectedRoute>
                          <Analytics />
                        </ProtectedRoute>
                      } />
                      <Route path="/analytics/ai-insights" element={<Navigate to="/analytics" replace />} />

                      {/* Search Studio */}
                      <Route path="/search-studio" element={
                        <ProtectedRoute>
                          <SearchStudio />
                        </ProtectedRoute>
                      } />

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
                      <Route path="/reports" element={<Navigate to="/analytics" replace />} />
                      <Route path="/reports/ai-insights" element={<Navigate to="/analytics" replace />} />
                      <Route path="/ai-insights" element={<Navigate to="/analytics" replace />} />
                      <Route path="/account-audit" element={<Navigate to="/analytics" replace />} />
                      <Route path="/attribution" element={<Navigate to="/analytics" replace />} />
                      <Route path="/anomalies" element={<Navigate to="/analytics" replace />} />
                      <Route path="/budget-copilot" element={<Navigate to="/analytics" replace />} />
                      <Route path="/multi-account" element={<Navigate to="/settings/accounts" replace />} />
                      
                      {/* 404 */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </OnboardingCheck>
              </BrowserRouter>
              <CookieConsent />
            </DateRangeProvider>
          </GlobalFiltersProvider>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
