import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, DollarSign, Target, BarChart3, Sparkles } from "lucide-react";

const Waitlist = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from("waitlist")
        .insert({ email: email.toLowerCase().trim() });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already on the list!",
            description: "This email is already registered for early access.",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "You're on the list!",
          description: "We'll notify you when PPC Pal launches.",
        });
        setEmail("");
      }
    } catch (error) {
      console.error("Waitlist error:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen sm:min-h-screen bg-background flex flex-col items-center justify-center px-3 sm:px-6 py-2 sm:py-12 overflow-hidden">
      <div className="w-full max-w-3xl mx-auto text-center space-y-2 sm:space-y-8">
        {/* Logo */}
        <img 
          src="/ppcpal-logo.jpg" 
          alt="PPC Pal" 
          className="h-6 sm:h-16 mx-auto"
        />
        
        {/* Headline */}
        <div className="space-y-1 sm:space-y-4">
          <h1 className="text-lg sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-tight">
            Stop Wasting Money on{" "}
            <span className="text-primary">Amazon Ads</span>
          </h1>
          <p className="text-[11px] sm:text-xl text-muted-foreground max-w-xl mx-auto">
            AI-powered PPC optimization that manages your campaigns 24/7.
          </p>
        </div>

        {/* Dashboard Preview */}
        <div className="rounded-lg sm:rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          {/* Window bar */}
          <div className="flex items-center gap-1.5 px-2 sm:px-4 py-1 sm:py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 sm:h-3 sm:w-3 rounded-full bg-red-400" />
              <span className="h-1.5 w-1.5 sm:h-3 sm:w-3 rounded-full bg-amber-400" />
              <span className="h-1.5 w-1.5 sm:h-3 sm:w-3 rounded-full bg-green-400" />
            </div>
            <span className="text-[8px] sm:text-xs text-muted-foreground ml-1">PPC Pal Dashboard</span>
          </div>
          
          {/* Dashboard content */}
          <div className="p-1.5 sm:p-6 space-y-1.5 sm:space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-5 gap-1 sm:gap-4">
              <div className="bg-muted/50 rounded p-1 sm:p-4 text-left">
                <p className="text-[7px] sm:text-sm text-primary truncate mb-0.5">Savings</p>
                <p className="text-[10px] sm:text-2xl font-semibold text-primary">$3.8k</p>
              </div>
              <div className="bg-muted/50 rounded p-1 sm:p-4 text-left">
                <p className="text-[7px] sm:text-sm text-muted-foreground truncate mb-0.5">Spend</p>
                <p className="text-[10px] sm:text-2xl font-semibold text-foreground">$12k</p>
              </div>
              <div className="bg-muted/50 rounded p-1 sm:p-4 text-left">
                <p className="text-[7px] sm:text-sm text-muted-foreground truncate mb-0.5">ACOS</p>
                <p className="text-[10px] sm:text-2xl font-semibold text-foreground">24%</p>
              </div>
              <div className="bg-muted/50 rounded p-1 sm:p-4 text-left">
                <p className="text-[7px] sm:text-sm text-muted-foreground truncate mb-0.5">ROAS</p>
                <p className="text-[10px] sm:text-2xl font-semibold text-foreground">4.1x</p>
              </div>
              <div className="bg-muted/50 rounded p-1 sm:p-4 text-left">
                <p className="text-[7px] sm:text-sm text-muted-foreground truncate mb-0.5">Sales</p>
                <p className="text-[10px] sm:text-2xl font-semibold text-foreground">$50k</p>
              </div>
            </div>

            {/* Simple chart placeholder */}
            <div className="h-10 sm:h-32 bg-muted/30 rounded flex items-end justify-around px-1 sm:px-4 pb-1 sm:pb-4 gap-0.5 sm:gap-2">
              {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 88].map((height, i) => (
                <div
                  key={i}
                  className="bg-primary/60 rounded-t w-full max-w-[40px]"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Email signup form */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-1.5 sm:gap-3 max-w-md mx-auto w-full">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 h-9 sm:h-12 text-sm sm:text-base"
            disabled={isSubmitting}
          />
          <Button 
            type="submit" 
            size="default"
            className="h-9 sm:h-12 px-4 sm:px-8 text-sm sm:text-base font-medium"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Joining..." : "Join Waitlist"}
          </Button>
        </form>

        <p className="text-[9px] sm:text-sm text-muted-foreground">
          Get early access when we launch. No spam, ever.
        </p>
      </div>
    </div>
  );
};

export default Waitlist;
