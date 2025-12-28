import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, DollarSign, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const ROICalculator = () => {
  const [monthlySpend, setMonthlySpend] = useState(5000);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Average 23% savings based on typical results
  const savingsRate = 0.23;
  const monthlySavings = Math.round(monthlySpend * savingsRate);
  const yearlySavings = monthlySavings * 12;
  
  useEffect(() => {
    setIsAnimating(true);
    const timeout = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timeout);
  }, [monthlySpend]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <Card className="p-6 lg:p-8 bg-background border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-lg">Savings Calculator</h3>
          <p className="text-xs text-muted-foreground">See your potential savings</p>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Input */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-foreground">Monthly Ad Spend</label>
            <span className="text-lg font-display font-bold text-foreground">
              {formatCurrency(monthlySpend)}
            </span>
          </div>
          <Slider
            value={[monthlySpend]}
            onValueChange={(value) => setMonthlySpend(value[0])}
            min={1000}
            max={50000}
            step={500}
            className="w-full"
          />
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
            <span>$1K</span>
            <span>$50K</span>
          </div>
        </div>
        
        {/* Results */}
        <div className="grid grid-cols-2 gap-4">
          <div className={cn(
            "p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 transition-all duration-300",
            isAnimating && "scale-[1.02]"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Monthly</span>
            </div>
            <p className="text-2xl font-display font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(monthlySavings)}
            </p>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">estimated savings</p>
          </div>
          
          <div className={cn(
            "p-4 rounded-xl bg-primary/10 border border-primary/20 transition-all duration-300",
            isAnimating && "scale-[1.02]"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary">Yearly</span>
            </div>
            <p className="text-2xl font-display font-bold text-primary">
              {formatCurrency(yearlySavings)}
            </p>
            <p className="text-[10px] text-primary/70">estimated savings</p>
          </div>
        </div>
        
        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center">
          Based on 23% average improvement across {'>'}1,000 campaigns
        </p>
      </div>
    </Card>
  );
};

export default ROICalculator;
