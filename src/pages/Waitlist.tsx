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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
      <div className="w-full max-w-3xl mx-auto text-center space-y-6 sm:space-y-8">
        {/* Logo */}
        <img 
          src="/ppcpal-logo.jpg" 
          alt="PPC Pal" 
          className="h-12 sm:h-16 mx-auto"
        />
        
        {/* Headline */}
        <div className="space-y-3 sm:space-y-4">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-tight">
            Stop Wasting Money on{" "}
            <span className="text-primary">Amazon Ads</span>
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground max-w-xl mx-auto px-2">
            AI-powered PPC optimization that manages your campaigns 24/7 — so you don't have to.
          </p>
        </div>

        {/* Dashboard Preview */}
        <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          {/* Window bar */}
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-green-400" />
            </div>
            <span className="text-xs text-muted-foreground ml-2">PPC Pal Dashboard</span>
          </div>
          
          {/* Dashboard content */}
          <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
            {/* KPI Row - scrollable on mobile */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4">
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4 text-left col-span-2 sm:col-span-1">
                <div className="flex items-center gap-1.5 sm:gap-2 text-primary text-xs sm:text-sm mb-1">
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>AI Savings</span>
                </div>
                <p className="text-xl sm:text-2xl font-semibold text-primary">$3,847</p>
                <p className="text-xs text-muted-foreground">142 optimizations</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4 text-left">
                <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground text-xs sm:text-sm mb-1">
                  <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Spend</span>
                </div>
                <p className="text-xl sm:text-2xl font-semibold text-foreground">$12,347</p>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4 text-left">
                <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground text-xs sm:text-sm mb-1">
                  <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>ACOS</span>
                </div>
                <p className="text-xl sm:text-2xl font-semibold text-foreground">24.6%</p>
                <p className="text-xs text-green-600">↓ 3.2% vs last month</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4 text-left">
                <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground text-xs sm:text-sm mb-1">
                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>ROAS</span>
                </div>
                <p className="text-xl sm:text-2xl font-semibold text-foreground">4.07x</p>
                <p className="text-xs text-green-600">↑ 0.5x vs last month</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4 text-left col-span-2 sm:col-span-1">
                <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground text-xs sm:text-sm mb-1">
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Sales</span>
                </div>
                <p className="text-xl sm:text-2xl font-semibold text-foreground">$50,234</p>
                <p className="text-xs text-green-600">↑ 12% vs last month</p>
              </div>
            </div>

            {/* Simple chart placeholder */}
            <div className="h-24 sm:h-32 bg-muted/30 rounded-lg flex items-end justify-around px-2 sm:px-4 pb-3 sm:pb-4 gap-1 sm:gap-2">
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
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto w-full px-2 sm:px-0">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 h-11 sm:h-12 text-base"
            disabled={isSubmitting}
          />
          <Button 
            type="submit" 
            size="lg"
            className="h-11 sm:h-12 px-6 sm:px-8 text-base font-medium"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Joining..." : "Join the Waitlist"}
          </Button>
        </form>

        <p className="text-xs sm:text-sm text-muted-foreground">
          Get early access when we launch. No spam, ever.
        </p>
      </div>
    </div>
  );
};

export default Waitlist;
