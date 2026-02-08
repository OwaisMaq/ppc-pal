import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Zap, Shield } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import type { PlanName } from '@/hooks/useEntitlements';

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  requiredPlan?: PlanName;
  description?: string;
}

const PLAN_PRICES: Record<string, string> = {
  starter: '$29/mo',
  pro: '$79/mo',
  agency: '$199/mo',
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  starter: <Zap className="h-5 w-5" />,
  pro: <Crown className="h-5 w-5" />,
  agency: <Shield className="h-5 w-5" />,
};

const UpgradePrompt = ({ open, onOpenChange, feature, requiredPlan = 'starter', description }: UpgradePromptProps) => {
  const { createCheckoutSession } = useSubscription();

  const handleUpgrade = async () => {
    const url = await createCheckoutSession(requiredPlan);
    if (url) {
      window.open(url, '_blank');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {PLAN_ICONS[requiredPlan] || <Crown className="h-5 w-5" />}
            Upgrade to {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}
          </DialogTitle>
          <DialogDescription>
            {description || `The "${feature}" feature requires a ${requiredPlan} plan or higher.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Unlock {feature} and more starting at {PLAN_PRICES[requiredPlan] || '$29/mo'}.
          </p>
          <div className="flex gap-3">
            <Button onClick={handleUpgrade} className="flex-1">
              Upgrade Now
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePrompt;
