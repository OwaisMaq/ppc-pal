import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export const BetaWelcomeBanner = () => {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              Welcome to the PPC Pal Beta
            </h2>
            <p className="text-muted-foreground">
              You're among our first users, and your feedback directly shapes the product. 
              We're here to help you succeed with Amazon advertising.
            </p>
            <div className="flex items-center gap-4 pt-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success" />
                <span className="text-muted-foreground">Support response within 24 hours</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">Direct access to the team</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
