
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const PROTECTED_ROUTES = ['/app', '/feedback', '/data-management'];

const isProtectedRoute = (pathname: string) => {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('ProtectedRoute: Auth check for path:', location.pathname);
    console.log('ProtectedRoute: User:', user?.email || 'No user', 'Loading:', loading);
    
    // CRITICAL: Only redirect if we're actually on a protected route and there's no user
    if (!loading && !user && isProtectedRoute(location.pathname)) {
      console.log('ProtectedRoute: No user found, redirecting to auth from protected route:', location.pathname);
      navigate("/auth", { replace: true });
    } else if (!loading && user) {
      console.log('ProtectedRoute: User authenticated, allowing access to protected route:', location.pathname);
    }
  }, [user, loading, navigate, location.pathname]);

  if (loading) {
    console.log('ProtectedRoute: Still loading auth state for protected route');
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute: No user, showing loading while redirect happens from protected route');
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  console.log('ProtectedRoute: Rendering protected content for:', location.pathname);
  return <>{children}</>;
};

export default ProtectedRoute;
