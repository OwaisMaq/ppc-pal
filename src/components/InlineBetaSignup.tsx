import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { track } from "@/lib/analytics";
import { toast } from "sonner";

const MARKETPLACES = ["UK", "US", "DE", "FR", "IT", "ES", "CA", "AU", "Other"] as const;
const SPEND_RANGES = ["<£1k", "£1k–£5k", "£5k–£15k", "£15k–£50k", "£50k+"] as const;
const GOALS = ["Reduce ACoS", "Increase Sales", "Scale Profitably", "Save Time", "Improve Reporting"] as const;

const signupSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  fullName: z.string().trim().max(100).optional(),
  marketplace: z.string().min(1, "Please select a marketplace"),
  adSpendRange: z.string().min(1, "Please select your ad spend range"),
  primaryGoal: z.string().min(1, "Please select your primary goal"),
  currentTool: z.string().trim().max(100).optional(),
});

export default function InlineBetaSignup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [marketplace, setMarketplace] = useState("");
  const [adSpendRange, setAdSpendRange] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [currentTool, setCurrentTool] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = signupSchema.safeParse({
      email,
      fullName: fullName || undefined,
      marketplace,
      adSpendRange,
      primaryGoal,
      currentTool: currentTool || undefined,
    });

    if (!result.success) {
      const firstError = result.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    setLoading(true);
    track("mvp_lead_form_submit_attempt", { source: "landing" });

    const { error } = await supabase.from("waitlist").insert({
      email: cleanEmail,
      full_name: fullName.trim() || null,
      marketplace: marketplace || null,
      ad_spend_range: adSpendRange || null,
      primary_goal: primaryGoal || null,
      current_tool: currentTool.trim() || null,
      source_page: "landing",
    });

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        track("mvp_lead_form_duplicate", { source: "landing" });
        toast.info("You're already on the list.");
        return;
      }
      track("mvp_lead_form_submit_error", { message: error.message });
      toast.error("Could not join the beta. Please try again.");
      return;
    }

    track("mvp_lead_form_submit_success", { source: "landing", marketplace, adSpendRange, primaryGoal });
    toast.success("You're on the list. We'll be in touch.");
    setFullName("");
    setEmail("");
    setMarketplace("");
    setAdSpendRange("");
    setPrimaryGoal("");
    setCurrentTool("");
  };

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md mx-auto" id="beta-signup">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="bg-background"
          maxLength={100}
        />
        <Input
          type="email"
          placeholder="Email address *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-background"
          maxLength={255}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={marketplace}
          onChange={(e) => setMarketplace(e.target.value)}
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Marketplace *</option>
          {MARKETPLACES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={adSpendRange}
          onChange={(e) => setAdSpendRange(e.target.value)}
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Monthly spend *</option>
          {SPEND_RANGES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <select
          value={primaryGoal}
          onChange={(e) => setPrimaryGoal(e.target.value)}
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Primary goal *</option>
          {GOALS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      <Input
        placeholder="Current tool (optional)"
        value={currentTool}
        onChange={(e) => setCurrentTool(e.target.value)}
        className="bg-background"
        maxLength={100}
      />

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Joining..." : "Join the beta"}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        By joining, you agree to be contacted about PPC Pal beta access. You can opt out at any time.
      </p>
    </form>
  );
}
