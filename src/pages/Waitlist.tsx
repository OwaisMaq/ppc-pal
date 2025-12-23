import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Waitlist = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from("waitlist")
        .insert({ email: email.toLowerCase().trim() });

      if (error) {
        if (error.code === "23505") {
          toast.info("This email is already registered for early access.");
        } else {
          throw error;
        }
      } else {
        toast.success("You're on the list! We'll notify you when PPC Pal launches.");
        setEmail("");
      }
    } catch (error) {
      console.error("Waitlist error:", error);
      toast.error("Something went wrong. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[100dvh] sm:min-h-screen bg-background flex flex-col px-4 sm:px-6 py-6 sm:py-12">
      <div className="w-full max-w-3xl mx-auto flex flex-col flex-1 justify-between sm:justify-center sm:gap-8">
        {/* Top section: Logo + Headline */}
        <div className="text-center space-y-3 sm:space-y-4">
          <img 
            src="/ppcpal-logo.jpg" 
            alt="PPC Pal" 
            className="h-10 sm:h-16 mx-auto"
          />
          <p className="text-xs sm:text-sm font-medium text-primary tracking-wide uppercase">
            Private Beta — Limited Access
          </p>
          <h1 className="text-2xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-tight">
            Stop Wasting Money on{" "}
            <span className="text-primary">Amazon Ads</span>
          </h1>
          <p className="text-sm sm:text-xl text-muted-foreground max-w-xl mx-auto">
            For sellers spending £1k+/month on ads
          </p>
        </div>

        {/* Middle section: Dashboard Preview */}
        <div className="flex-1 sm:flex-none flex items-center sm:block my-4 sm:my-0">
          <div className="w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            {/* Window bar */}
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-green-400" />
              </div>
              <span className="text-[10px] sm:text-xs text-muted-foreground">PPC Pal Dashboard</span>
            </div>
            
            {/* Dashboard content */}
            <div className="p-3 sm:p-6 space-y-3 sm:space-y-6">
            {/* KPI Rows - 2 rows on mobile, 1 row on desktop */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4">
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4 text-left">
                <p className="text-xs sm:text-sm text-primary mb-1">Savings</p>
                <p className="text-lg sm:text-2xl font-semibold text-primary">$3.8k</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4 text-left">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Spend</p>
                <p className="text-lg sm:text-2xl font-semibold text-foreground">$12k</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4 text-left">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">ACOS</p>
                <p className="text-lg sm:text-2xl font-semibold text-foreground">24%</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4 text-left col-span-1 sm:col-span-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">ROAS</p>
                <p className="text-lg sm:text-2xl font-semibold text-foreground">4.1x</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4 text-left col-span-2 sm:col-span-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Sales</p>
                <p className="text-lg sm:text-2xl font-semibold text-foreground">$50k</p>
              </div>
            </div>

              {/* Simple chart placeholder */}
              <div className="h-20 sm:h-32 bg-muted/30 rounded-lg flex items-end justify-around px-2 sm:px-4 pb-2 sm:pb-4 gap-1 sm:gap-2">
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
        </div>

        {/* Bottom section: Form + tagline */}
        <div className="text-center space-y-3 sm:space-y-4">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 sm:gap-3 max-w-md mx-auto w-full">
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
              {isSubmitting ? "Joining..." : "Join Waitlist"}
            </Button>
          </form>

          <p className="text-xs sm:text-sm text-muted-foreground">
            Get early access when we launch. No spam, ever.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Waitlist;
