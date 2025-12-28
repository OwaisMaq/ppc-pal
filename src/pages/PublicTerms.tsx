import { Link } from "react-router-dom";
import { Bot, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PublicTerms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Bot className="h-5 w-5" />
            </span>
            <span className="font-semibold text-lg">PPC Pal</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: 2025-12-27</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">Beta Access</h2>
            <p className="text-muted-foreground leading-relaxed">
              PPC Pal is currently in beta. Access may be limited and features may change without notice. By joining the beta, you acknowledge that the service is provided "as is" and may have limitations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">No Advertising Advice</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nothing on this website or within the PPC Pal service constitutes financial or advertising advice. All optimization suggestions are data-driven recommendations that you should review before applying.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Communication</h2>
            <p className="text-muted-foreground leading-relaxed">
              By joining the beta, you agree to be contacted about access, onboarding, and product updates. You can opt out of non-essential communications at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Your Control</h2>
            <p className="text-muted-foreground leading-relaxed">
              You remain in full control of your Amazon Advertising account. PPC Pal provides recommendations and automation features that you can enable, pause, or stop at any time. All changes made by PPC Pal are logged and explainable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              WISH AND WILLOW LTD is not liable for any changes in your advertising performance, whether positive or negative, resulting from the use of PPC Pal recommendations or automation features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these terms, contact us at{" "}
              <a href="mailto:info@ppcpal.online" className="text-primary hover:underline">
                info@ppcpal.online
              </a>
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          © 2024 WISH AND WILLOW LTD. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
