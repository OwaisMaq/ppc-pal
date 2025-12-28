import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background">
              <Bot className="h-5 w-5" />
            </span>
            <span className="font-display font-semibold text-lg">PPC Pal</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Home</Link>
            <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
          </nav>
          
          <div className="flex items-center gap-3">
            <Link to="/auth" className="hidden md:block">
              <Button variant="outline">Sign in</Button>
            </Link>
            <Link to="/auth">
              <Button>Start free</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto py-16 lg:py-24 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-4">Legal</p>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">Privacy Policy</h1>
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">1. Information We Collect</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Personal Information</h4>
                  <p className="text-muted-foreground">
                    We collect information you provide directly to us, such as when you create an account, 
                    use our services, or contact us for support. This includes:
                  </p>
                  <ul className="list-disc ml-6 mt-2 text-muted-foreground">
                    <li>Email address</li>
                    <li>Account preferences</li>
                    <li>PPC campaign data from connected accounts</li>
                    <li>Feedback and support communications</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Usage Information</h4>
                  <p className="text-muted-foreground">
                    We automatically collect certain information about your use of our service, including:
                  </p>
                  <ul className="list-disc ml-6 mt-2 text-muted-foreground">
                    <li>Log data and usage analytics</li>
                    <li>Device and browser information</li>
                    <li>IP address and location data</li>
                    <li>Feature usage and optimization history</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">2. How We Use Your Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">We use the information we collect to:</p>
                <ul className="list-disc ml-6 text-muted-foreground space-y-1">
                  <li>Provide and improve our PPC optimization services</li>
                  <li>Process your advertising data and generate insights</li>
                  <li>Communicate with you about your account and our services</li>
                  <li>Provide customer support</li>
                  <li>Comply with legal obligations</li>
                  <li>Protect against fraud and abuse</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">3. Data Sharing and Disclosure</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  We do not sell, trade, or otherwise transfer your personal information to third parties, 
                  except in the following circumstances:
                </p>
                <ul className="list-disc ml-6 text-muted-foreground space-y-1">
                  <li>With your explicit consent</li>
                  <li>To comply with legal obligations</li>
                  <li>To protect our rights and safety</li>
                  <li>With trusted service providers who assist in our operations</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">4. Your Rights Under GDPR</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  If you are a resident of the European Economic Area (EEA), you have the following rights:
                </p>
                <ul className="list-disc ml-6 text-muted-foreground space-y-1">
                  <li><strong className="text-foreground">Right to Access:</strong> Request copies of your personal data</li>
                  <li><strong className="text-foreground">Right to Rectification:</strong> Request correction of inaccurate data</li>
                  <li><strong className="text-foreground">Right to Erasure:</strong> Request deletion of your personal data</li>
                  <li><strong className="text-foreground">Right to Data Portability:</strong> Request transfer of your data</li>
                  <li><strong className="text-foreground">Right to Object:</strong> Object to processing of your data</li>
                  <li><strong className="text-foreground">Right to Restrict Processing:</strong> Request limitation of data processing</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  To exercise these rights, please visit your account settings or contact us at{" "}
                  <a href="mailto:info@ppcpal.online" className="text-primary hover:underline">info@ppcpal.online</a>
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">5. Data Retention</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We retain your personal information for as long as necessary to provide our services 
                  and fulfill the purposes outlined in this privacy policy. Specifically:
                </p>
                <ul className="list-disc ml-6 mt-2 text-muted-foreground space-y-1">
                  <li>Account data: Until account deletion</li>
                  <li>PPC campaign data: 2 years after last sync</li>
                  <li>Usage analytics: 2 years</li>
                  <li>Support communications: 3 years</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">6. Data Security</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We implement appropriate technical and organizational measures to protect your personal data 
                  against unauthorized access, alteration, disclosure, or destruction. This includes encryption, 
                  access controls, and regular security assessments.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">7. Cookies and Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We use essential cookies to provide our services and may use analytics cookies to improve 
                  our platform. You can manage your cookie preferences through your browser settings.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">8. Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  If you have any questions about this Privacy Policy or our data practices, please contact us at:
                </p>
                <div className="mt-4 space-y-2">
                  <p className="text-foreground">
                    Email:{" "}
                    <a href="mailto:info@ppcpal.online" className="text-primary hover:underline">info@ppcpal.online</a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-muted border-t border-border">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
                <Bot className="h-4 w-4" />
              </span>
              <span className="font-semibold text-foreground">PPC Pal</span>
            </div>
            
            <div className="flex items-center gap-6 mb-4 md:mb-0">
              <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Privacy
              </Link>
              <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Terms
              </Link>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-muted-foreground text-sm">© 2024 WISH AND WILLOW LTD. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Privacy;
