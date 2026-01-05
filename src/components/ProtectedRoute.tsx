
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  const navigate = useNavigate();
  const location = useLocation();

  const loading = authLoading || approvalLoading || adminLoading;

  useEffect(() => {
    console.log('ProtectedRoute: Auth check for path:', location.pathname);
    console.log('ProtectedRoute: User:', user?.email || 'No user', 'Loading:', loading, 'Approved:', isApproved, 'Admin:', isAdmin);
    
    // If still loading, don't redirect
    if (loading) return;
    
    // CRITICAL: Only redirect if we're actually on a protected route and there's no user
    if (!user && isProtectedRoute(location.pathname)) {
      console.log('ProtectedRoute: No user found, redirecting to auth from protected route:', location.pathname);
      navigate("/auth", { replace: true });
      return;
    }
    
    // If user exists but is not approved (and not admin), redirect to pending approval
    if (user && !isApproved && !isAdmin && isProtectedRoute(location.pathname)) {
      console.log('ProtectedRoute: User not approved, redirecting to pending-approval');
      navigate("/pending-approval", { replace: true });
      return;
    }
    
    if (user) {
      console.log('ProtectedRoute: User authenticated and approved, allowing access to protected route:', location.pathname);
    }
  }, [user, loading, navigate, location.pathname, isApproved, isAdmin]);

  if (loading) {
    console.log('ProtectedRoute: Still loading auth/approval state for protected route');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute: No user, showing loading while redirect happens from protected route');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not approved and not admin, show loading while redirect happens
  if (!isApproved && !isAdmin) {
    console.log('ProtectedRoute: User not approved, showing loading while redirect happens');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  console.log('ProtectedRoute: Rendering protected content for:', location.pathname);
  return <>{children}</>;
};

export default ProtectedRoute;
