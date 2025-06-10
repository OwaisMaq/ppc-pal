
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { LogOut, User, Crown } from "lucide-react";

const Header = () => {
  const { user, signOut } = useAuth();
  const { subscription, loading } = useSubscription();

  if (!user) return null;

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
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
    </header>
  );
};

export default Header;
