import { Badge } from '@/components/ui/badge';
import { Crown, Zap, Shield, Sparkles } from 'lucide-react';
import type { PlanName } from '@/hooks/useEntitlements';

interface TierBadgeProps {
  plan: PlanName;
  className?: string;
}

const PLAN_CONFIG: Record<PlanName, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'outline' }> = {
  free: { label: 'Free', icon: <Sparkles className="h-3 w-3 mr-1" />, variant: 'outline' },
  starter: { label: 'Starter', icon: <Zap className="h-3 w-3 mr-1" />, variant: 'secondary' },
  pro: { label: 'Pro', icon: <Crown className="h-3 w-3 mr-1" />, variant: 'default' },
  agency: { label: 'Agency', icon: <Shield className="h-3 w-3 mr-1" />, variant: 'default' },
};

const TierBadge = ({ plan, className }: TierBadgeProps) => {
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.free;

  return (
    <Badge variant={config.variant} className={className}>
      {config.icon}
      {config.label}
    </Badge>
  );
};

export default TierBadge;
