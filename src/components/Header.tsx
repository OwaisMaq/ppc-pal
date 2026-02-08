
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlements } from "@/hooks/useEntitlements";
import TierBadge from "@/components/TierBadge";
import { LogOut, User, Bot, Shield, Database, Settings as SettingsIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";


const Header = () => {
  const { user, signOut } = useAuth();
  const { plan, loading } = useEntitlements();
  const location = useLocation();

  if (!user) return null;

  return (
    <header className="bg-background border-b border-border px-4 py-3">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-foreground flex items-center justify-center">
              <Bot className="h-5 w-5 text-background" />
            </div>
            <span className="font-display font-semibold text-lg">PPC Pal</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{user.email}</span>
          </div>
          
          {!loading && <TierBadge plan={plan} />}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Navigation Links */}
          <nav className="flex items-center gap-2">
            
            <Link 
              to="/data-management"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/data-management' 
                  ? 'bg-muted text-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Database className="h-4 w-4" />
              My Data
            </Link>
            
            
            <Link 
              to="/privacy"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/privacy' 
                  ? 'bg-muted text-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Shield className="h-4 w-4" />
              Privacy
            </Link>

            <Link 
              to="/settings"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/settings' 
                  ? 'bg-muted text-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <SettingsIcon className="h-4 w-4" />
              Settings
            </Link>

          </nav>
          
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
