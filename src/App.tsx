import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import CookieConsent from "@/components/CookieConsent";
import { DateRangeProvider } from "@/context/DateRangeContext";
import { OnboardingCheck } from "@/components/OnboardingCheck";
import { useLoginSync } from "@/hooks/useLoginSync";

// Lazy load pages for better performance
const Auth = lazy(() => import("@/pages/Auth"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Feedback = lazy(() => import("@/pages/Feedback"));
const Campaigns = lazy(() => import("@/pages/Campaigns"));
const AIInsights = lazy(() => import("@/pages/AIInsights"));
const SearchTerms = lazy(() => import("@/pages/SearchTerms"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const BudgetCopilot = lazy(() => import("@/pages/BudgetCopilot"));
const Anomalies = lazy(() => import("@/pages/Anomalies"));
const Attribution = lazy(() => import("@/pages/Attribution"));
const MultiAccount = lazy(() => import("@/pages/MultiAccount"));
const PublicLanding = lazy(() => import("@/pages/PublicLanding"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Company = lazy(() => import("@/pages/Company"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Waitlist = lazy(() => import("@/pages/Waitlist"));
const AmazonCallback = lazy(() => import("@/pages/AmazonCallback"));
const Settings = lazy(() => import("@/pages/Settings"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const DevTools = lazy(() => import("@/pages/DevTools"));
const AccountAudit = lazy(() => import("@/pages/AccountAudit"));

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
                <Route path="/account-audit" element={
                  <ProtectedRoute>
                    <AccountAudit />
                  </ProtectedRoute>
                } />
                
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
