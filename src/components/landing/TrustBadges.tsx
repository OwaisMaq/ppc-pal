import { Shield, Lock, Zap, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrustBadgesProps {
  variant?: "horizontal" | "vertical" | "compact";
  className?: string;
}

const TrustBadges = ({ variant = "horizontal", className }: TrustBadgesProps) => {
  const badges = [
    { icon: Shield, label: "30-Day Money Back", color: "text-emerald-600" },
    { icon: Lock, label: "Bank-Level Security", color: "text-primary" },
    { icon: Zap, label: "5 Min Setup", color: "text-amber-600" }
  ];

  if (variant === "compact") {
    return (
      <div className={cn("flex flex-wrap items-center gap-3 text-xs text-muted-foreground", className)}>
        {badges.map((badge, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <badge.icon className={cn("h-3.5 w-3.5", badge.color)} />
            <span>{badge.label}</span>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "vertical") {
    return (
      <div className={cn("space-y-3", className)}>
        {badges.map((badge, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className={cn("w-8 h-8 rounded-lg bg-background flex items-center justify-center shadow-sm")}>
              <badge.icon className={cn("h-4 w-4", badge.color)} />
            </div>
            <span className="text-sm font-medium">{badge.label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center gap-6", className)}>
      {badges.map((badge, i) => (
        <div key={i} className="flex items-center gap-2">
          <badge.icon className={cn("h-4 w-4", badge.color)} />
          <span className="text-sm text-muted-foreground">{badge.label}</span>
        </div>
      ))}
    </div>
  );
};

// Amazon Partner Badge Component
export const AmazonPartnerBadge = ({ className }: { className?: string }) => (
  <div className={cn(
    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20",
    className
  )}>
    <svg className="h-4 w-4 text-amber-600" viewBox="0 0 24 24" fill="currentColor">
      <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.154.108-.39.262-.715.46-1.418.858-2.936 1.526-4.555 2.015-1.62.49-3.274.734-4.96.734-1.857 0-3.634-.27-5.33-.807-1.693-.54-3.26-1.31-4.702-2.312-.197-.138-.254-.28-.17-.426l.046-.053zm19.574-8.74c0-.205-.035-.395-.106-.567-.07-.17-.173-.323-.31-.456-.136-.133-.3-.235-.49-.305-.19-.07-.403-.106-.64-.106-.315 0-.598.056-.847.168-.25.112-.464.27-.644.47-.18.202-.318.443-.414.722-.096.28-.144.587-.144.92 0 .318.043.61.13.874.086.265.212.494.378.688.166.194.37.345.61.453.24.108.517.162.83.162.32 0 .597-.054.83-.162.232-.108.43-.26.593-.453.162-.194.287-.423.374-.688.086-.264.13-.556.13-.874v.154zm3.082.154c0 .492-.07.958-.21 1.4-.14.44-.345.83-.615 1.17-.27.338-.602.606-.997.803-.395.197-.847.295-1.355.295-.455 0-.858-.086-1.207-.258-.35-.172-.638-.427-.864-.764v2.966h-2.58V10.4h2.462v.828c.226-.337.513-.593.863-.768.35-.175.76-.263 1.23-.263.508 0 .96.098 1.355.295.395.198.727.466.997.804.27.34.476.73.615 1.17.14.44.21.907.21 1.4v.154z"/>
    </svg>
    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Amazon Ads Partner</span>
  </div>
);

// Live Stats Badge
export const LiveStatsBadge = ({ actionsToday = 247 }: { actionsToday?: number }) => (
  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
    </span>
    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
      {actionsToday.toLocaleString()} optimizations today
    </span>
  </div>
);

// Managed Spend Badge
export const ManagedSpendBadge = ({ amount = "$2M+" }: { amount?: string }) => (
  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
    <CheckCircle2 className="h-4 w-4 text-primary" />
    <span className="text-xs font-semibold text-primary">
      {amount} monthly ad spend managed
    </span>
  </div>
);

export default TrustBadges;
