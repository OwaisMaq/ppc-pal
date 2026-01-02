import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CreditCard, Crown, Zap, ExternalLink } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

export const BillingSettings = () => {
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
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-2 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentUsage = usage?.optimizations_used || 0;
  const progressPercentage = usageLimit > 0 ? (currentUsage / usageLimit) * 100 : 0;

  const handleUpgrade = async () => {
    const checkoutUrl = await createCheckoutSession();
    if (checkoutUrl) {
      window.open(checkoutUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {isProTier ? <Crown className="h-5 w-5 text-warning" /> : <Zap className="h-5 w-5" />}
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold">
                  {isProTier ? 'Pro' : 'Free'}
                </span>
                <Badge variant={subscription?.status === 'active' ? 'default' : 'secondary'}>
                  {subscription?.status || 'Active'}
                </Badge>
              </div>
              {subscription?.current_period_end && (
                <p className="text-sm text-muted-foreground">
                  {isProTier ? 'Renews' : 'Resets'}: {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
            {isFreeTier ? (
              <Button onClick={handleUpgrade}>
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </Button>
            ) : (
              <Button variant="outline" onClick={openCustomerPortal}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage This Period */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage This Period</CardTitle>
          <CardDescription>
            {usage?.period_start && usage?.period_end && (
              <>
                {new Date(usage.period_start).toLocaleDateString()} – {new Date(usage.period_end).toLocaleDateString()}
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Optimizations</span>
              <span className="text-sm text-muted-foreground">
                {currentUsage} / {isProTier ? '∞' : usageLimit}
              </span>
            </div>
            {!isProTier && (
              <Progress value={Math.min(progressPercentage, 100)} className="h-2" />
            )}
          </div>
          {isFreeTier && progressPercentage >= 80 && (
            <p className="text-sm text-warning">
              You're approaching your monthly limit. Upgrade for unlimited optimizations.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Billing Portal */}
      {isProTier && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5" />
              Billing & Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View invoices, update payment methods, and manage your subscription in the Stripe Customer Portal.
            </p>
            <Button variant="outline" onClick={openCustomerPortal}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Billing Portal
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
