import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const NPS_DELAY_DAYS = 7;
const NPS_DISMISSED_KEY = "ppcpal_nps_dismissed";

export const NPSPrompt = () => {
  const [show, setShow] = useState(false);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    // Already dismissed this session or permanently
    if (localStorage.getItem(NPS_DISMISSED_KEY)) return;

    // Check if account is old enough
    const createdAt = new Date(user.created_at || Date.now());
    const daysSince = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < NPS_DELAY_DAYS) return;

    // Check if already prompted in DB
    const checkDb = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("nps_prompted_at")
        .eq("id", user.id)
        .single();

      if (data?.nps_prompted_at) {
        localStorage.setItem(NPS_DISMISSED_KEY, "true");
        return;
      }
      setShow(true);
    };

    checkDb();
  }, [user]);

  const handleSubmit = async () => {
    if (selectedScore === null || !user) return;

    try {
      await supabase.from("feedback").insert({
        user_id: user.id,
        user_email: user.email,
        feedback_type: "nps",
        subject: `NPS Score: ${selectedScore}`,
        message: `NPS score: ${selectedScore}/10`,
      });

      await supabase
        .from("profiles")
        .update({ nps_prompted_at: new Date().toISOString() })
        .eq("id", user.id);

      track("nps_score", { score: selectedScore });

      setSubmitted(true);
      localStorage.setItem(NPS_DISMISSED_KEY, "true");

      toast({ title: "Thanks for your feedback!" });

      setTimeout(() => setShow(false), 2000);
    } catch {
      toast({ title: "Error", description: "Failed to submit. Try again later.", variant: "destructive" });
    }
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(NPS_DISMISSED_KEY, "true");
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 z-40 w-80 animate-fade-in">
      <Card className="shadow-lg border">
        <CardContent className="pt-4 pb-3 px-4 space-y-3">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium pr-2">
              {submitted
                ? "Thanks! 🎉"
                : "How likely are you to recommend PPC Pal to a colleague?"}
            </p>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={dismiss}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {!submitted && (
            <>
              <div className="flex gap-1 justify-between">
                {Array.from({ length: 11 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedScore(i)}
                    className={cn(
                      "h-8 w-6 text-xs rounded font-medium transition-colors",
                      selectedScore === i
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    )}
                  >
                    {i}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                <span>Not likely</span>
                <span>Very likely</span>
              </div>
              <Button
                size="sm"
                className="w-full"
                disabled={selectedScore === null}
                onClick={handleSubmit}
              >
                Submit
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
