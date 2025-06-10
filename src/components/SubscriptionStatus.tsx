
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Crown, Zap, AlertTriangle } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

const SubscriptionStatus = () => {
  const { subscription, usage, usageLimit, loading, isFreeTier, isProTier } = useSubscription();

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-gray-200 h-10 w-10"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentUsage = usage?.optimizations_used || 0;
  const progressPercentage = usageLimit > 0 ? (currentUsage / usageLimit) * 100 : 0;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          {isProTier ? (
            <>
              <Crown className="h-5 w-5 text-yellow-500" />
              <span>Pro Plan</span>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Active
              </Badge>
            </>
          ) : (
            <>
              <Zap className="h-5 w-5 text-gray-500" />
              <span>Free Plan</span>
              <Badge variant="outline">Free</Badge>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Optimizations Used</span>
            <span className="font-medium">
              {currentUsage} / {usageLimit === 0 ? '0' : usageLimit}
            </span>
          </div>
          {usageLimit > 0 ? (
            <Progress value={progressPercentage} className="h-2" />
          ) : (
            <div className="h-2 bg-gray-200 rounded-full">
              <div className="h-2 bg-gray-400 rounded-full w-full"></div>
            </div>
          )}
        </div>

        {isFreeTier && (
          <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
            <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-orange-700">
              <p className="font-medium">Free Plan Limitations</p>
              <p>Upgrade to Pro for unlimited optimizations and premium features.</p>
            </div>
          </div>
        )}

        {isProTier && progressPercentage > 80 && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-700">
              <p className="font-medium">Usage Warning</p>
              <p>You're approaching your monthly optimization limit.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionStatus;
