import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  AlertTriangle, 
  TrendingDown, 
  Ban, 
  DollarSign,
  Sparkles,
  ArrowRight,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickWin {
  type: 'wasted_spend' | 'high_acos_keywords' | 'missing_negatives' | 'budget_opportunity';
  count: number;
  potentialSavings: number;
  description: string;
}

interface QuickWinsCardProps {
  wins: QuickWin[];
  totalPotentialSavings: number;
  loading?: boolean;
  profileId?: string;
}

const iconMap = {
  wasted_spend: AlertTriangle,
  high_acos_keywords: TrendingDown,
  missing_negatives: Ban,
  budget_opportunity: DollarSign
};

const colorMap = {
  wasted_spend: 'text-destructive bg-destructive/10',
  high_acos_keywords: 'text-amber-600 bg-amber-500/10',
  missing_negatives: 'text-destructive bg-destructive/10',
  budget_opportunity: 'text-primary bg-primary/10'
};

const linkMap = {
  wasted_spend: '/search-terms',
  high_acos_keywords: '/search-studio',
  missing_negatives: '/search-terms',
  budget_opportunity: '/budget-copilot'
};

export const QuickWinsCard = ({ 
  wins, 
  totalPotentialSavings, 
  loading,
  profileId 
}: QuickWinsCardProps) => {
  if (loading) {
    return (
      <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-background">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
            <span className="text-sm text-muted-foreground">Analyzing your campaigns...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (wins.length === 0) {
    return (
      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-background">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 py-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-emerald-700 dark:text-emerald-400">Looking good!</p>
              <p className="text-sm text-muted-foreground">No immediate issues found. Keep monitoring.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-background overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-600" />
            Quick Wins Found
          </CardTitle>
          {totalPotentialSavings > 0 && (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
              Save ~${totalPotentialSavings.toLocaleString()}/mo
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          We found {wins.length} opportunities to improve your campaigns:
        </p>
        
        <div className="space-y-2">
          {wins.map((win, i) => {
            const Icon = iconMap[win.type];
            const colors = colorMap[win.type];
            const link = linkMap[win.type];
            
            return (
              <Link
                key={i}
                to={link}
                className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors group"
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", colors)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{win.description}</p>
                  {win.potentialSavings > 0 && (
                    <p className="text-xs text-emerald-600">
                      Potential savings: ~${win.potentialSavings.toLocaleString()}/mo
                    </p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
        
        <div className="pt-2">
          <Link to="/automate">
            <Button className="w-full gap-2" size="sm">
              Fix automatically with rules <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickWinsCard;
