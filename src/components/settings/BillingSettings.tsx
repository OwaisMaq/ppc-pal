import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Crown, Zap, Shield, Sparkles, ExternalLink, Check } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useEntitlements } from '@/hooks/useEntitlements';
import type { PlanName } from '@/hooks/useEntitlements';

const TIERS: { plan: PlanName; label: string; price: string; icon: React.ReactNode; features: string[] }[] = [
  {
    plan: 'free', label: 'Free', price: '$0/mo',
    icon: <Sparkles className="h-5 w-5" />,
    features: ['1 profile', '1 campaign', '7 days history', 'AI Insights', 'All data levels'],
  },
  {
    plan: 'starter', label: 'Starter', price: '$29/mo',
    icon: <Zap className="h-5 w-5" />,
    features: ['3 profiles', '100 campaigns', '30 days history', '5 automation rules', 'Email alerts'],
  },
  {
    plan: 'pro', label: 'Pro', price: '$79/mo',
    icon: <Crown className="h-5 w-5" />,
    features: ['10 profiles', '1,000 campaigns', '90 days history', 'Unlimited rules', 'Playbooks & Budget Copilot', 'Anomaly Detection'],
  },
  {
    plan: 'agency', label: 'Agency', price: '$199/mo',
    icon: <Shield className="h-5 w-5" />,
    features: ['Unlimited profiles', 'Unlimited campaigns', '365 days history', 'White-label & API access', 'Full multi-account management'],
  },
];

export const BillingSettings = () => {
  const { loading, createCheckoutSession, openCustomerPortal } = useSubscription();
  const { plan, planLabel, entitlements } = useEntitlements();

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

  const handleUpgrade = async (targetPlan: PlanName) => {
    const url = await createCheckoutSession(targetPlan);
    if (url) window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Plan</CardTitle>
          <CardDescription>You are on the <strong>{planLabel}</strong> plan.</CardDescription>
        </CardHeader>
        {plan !== 'free' && (
          <CardContent>
            <Button variant="outline" onClick={openCustomerPortal}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage Subscription
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Plan Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TIERS.map((tier) => {
          const isCurrent = tier.plan === plan;
          const isUpgrade = TIERS.findIndex(t => t.plan === tier.plan) > TIERS.findIndex(t => t.plan === plan);

          return (
            <Card key={tier.plan} className={isCurrent ? 'border-primary ring-1 ring-primary' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  {tier.icon}
                  <CardTitle className="text-base">{tier.label}</CardTitle>
                </div>
                <p className="text-2xl font-bold">{tier.price}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Badge variant="secondary" className="w-full justify-center">Current Plan</Badge>
                ) : isUpgrade ? (
                  <Button className="w-full" size="sm" onClick={() => handleUpgrade(tier.plan)}>
                    Upgrade
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" size="sm" disabled>
                    Included
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Billing Portal */}
      {plan !== 'free' && (
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
