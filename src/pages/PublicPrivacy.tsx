import { Link } from "react-router-dom";
import { Bot, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PublicPrivacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background">
              <Bot className="h-5 w-5" />
            </span>
            <span className="font-display font-semibold text-lg">PPC Pal</span>
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
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: 2025-12-27</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              We collect beta sign-up information (e.g., email and optional qualifiers like marketplace, ad spend range, and goals) to manage access to PPC Pal and improve our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information is used to contact you about beta access, onboarding, and product updates. We do not sell your data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Analytics</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you consent to analytics cookies, we use privacy-focused analytics to understand how visitors interact with our website and improve the conversion funnel. You can manage your cookie preferences at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Data Deletion</h2>
            <p className="text-muted-foreground leading-relaxed">
              You can request deletion of your data at any time by contacting us at{" "}
              <a href="mailto:info@ppcpal.online" className="text-primary hover:underline">
                info@ppcpal.online
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For privacy-related questions, contact us at{" "}
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
