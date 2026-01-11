
import { useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useApprovalStatus } from "@/hooks/useApprovalStatus";
import { useAdminRole } from "@/hooks/useAdminRole";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

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
    return <Navigate to="/auth" replace />;
  }

  // User exists but not approved and not admin - redirect to pending approval
  if (!isApproved && !isAdmin) {
    return <Navigate to="/pending-approval" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
