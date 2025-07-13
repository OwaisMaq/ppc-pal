import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Crown, Zap, AlertTriangle, CreditCard, Settings } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
const SubscriptionStatus = () => {
  const {
    subscription,
    usage,
    usageLimit,
    loading,
    isFreeTier,
    isProTier,
    createCheckoutSession,
    openCustomerPortal
  } = useSubscription();
  if (loading) {
    return <Card className="w-full">
        <CardContent className="p-6">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-gray-200 h-10 w-10"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>;
  }
  const currentUsage = usage?.optimizations_used || 0;
  const progressPercentage = usageLimit > 0 ? currentUsage / usageLimit * 100 : 0;
  const handleUpgrade = async () => {
    const checkoutUrl = await createCheckoutSession();
    if (checkoutUrl) {
      window.open(checkoutUrl, '_blank');
    }
  };
  const handleManageSubscription = () => {
    openCustomerPortal();
  };
  return <Card className="w-full">
      
      
    </Card>;
};
export default SubscriptionStatus;