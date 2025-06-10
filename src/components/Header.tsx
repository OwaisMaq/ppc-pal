
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { LogOut, User, Crown, LinkIcon, MessageSquare, Bot } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import ComingSoon from "@/components/ComingSoon";

const Header = () => {
  const { user, signOut } = useAuth();
  const { subscription, loading } = useSubscription();
  const location = useLocation();

  if (!user) return null;

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center">
            <div className="bg-blue-600 rounded-full p-2">
              <Bot className="h-6 w-6 text-white" />
            </div>
          </Link>
          
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-gray-500" />
            <span className="text-sm text-gray-700">{user.email}</span>
          </div>
          
          {!loading && subscription && (
            <Badge 
              variant={subscription.plan_type === 'pro' ? 'default' : 'outline'}
              className={subscription.plan_type === 'pro' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
            >
              {subscription.plan_type === 'pro' && <Crown className="h-3 w-3 mr-1" />}
              {subscription.plan_type === 'pro' ? 'Pro Plan' : 'Free Plan'}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Navigation Links */}
          <nav className="flex items-center gap-2">
            <Link 
              to="/feedback"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                location.pathname === '/feedback' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Feedback
            </Link>
          </nav>

          {/* Coming Soon Features */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <ComingSoon feature="Account Sync" className="text-xs" />
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
