
import { useEffect } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useApprovalStatus } from "@/hooks/useApprovalStatus";
import { useAdminRole } from "@/hooks/useAdminRole";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const PROTECTED_ROUTES = ['/dashboard', '/feedback', '/data-management', '/command-center', '/campaigns', '/governance', '/analytics', '/settings', '/rank-tracker', '/changelog', '/onboarding', '/dev-tools', '/admin'];

const isProtectedRoute = (pathname: string) => {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isApproved, loading: approvalLoading } = useApprovalStatus();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const location = useLocation();

  const loading = authLoading || approvalLoading || adminLoading;

  // Show loading spinner while checking auth/approval status
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // No user - redirect to auth
  if (!user) {
    console.log('ProtectedRoute: No user, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // User exists but not approved and not admin - redirect to pending approval
  if (!isApproved && !isAdmin) {
    console.log('ProtectedRoute: User not approved, redirecting to pending-approval');
    return <Navigate to="/pending-approval" replace />;
  }

  console.log('ProtectedRoute: Rendering protected content for:', location.pathname);
  return <>{children}</>;
};

export default ProtectedRoute;
