import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Mail, MessageSquare, Building2, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    subject: "",
    message: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Thank you for your message! We'll get back to you soon.");
    setFormData({
      name: "",
      email: "",
      company: "",
      subject: "",
      message: ""
    });
  };

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
            <Link to="/company" className="text-muted-foreground hover:text-foreground transition-colors">Company</Link>
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

      <div className="container mx-auto px-4 py-16 lg:py-24">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-4">Contact</p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
            Get in touch
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Have questions about PPC Pal? Want to learn more about our AI-powered optimization platform? 
            We'd love to hear from you.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Contact Form */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Send us a message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Your name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      name="company"
                      type="text"
                      placeholder="Your company name"
                      value={formData.company}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      name="subject"
                      type="text"
                      placeholder="What's this about?"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Tell us more about your inquiry..."
                      rows={6}
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <Button type="submit" className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <div className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-foreground">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    Company Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">WISH AND WILLOW LTD</h3>
                    <p className="text-muted-foreground text-sm">
                      UK Private Limited Company specializing in AI-powered e-commerce optimization tools.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <a 
                      href="mailto:info@ppcpal.online" 
                      className="text-primary hover:underline transition-colors"
                    >
                      info@ppcpal.online
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-foreground">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    Quick Answers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">How does PPC Pal work?</h4>
                    <p className="text-muted-foreground text-sm">
                      Connect your Amazon Ads account, and our AI optimizes your bids 24/7 automatically.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Is my data secure?</h4>
                    <p className="text-muted-foreground text-sm">
                      Yes—bank-level encryption, OAuth integration, and we never store your Amazon password.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">How fast will I see results?</h4>
                    <p className="text-muted-foreground text-sm">
                      Most sellers see improvements within 72 hours of connecting their account.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Response Times</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email inquiries:</span>
                      <span className="text-foreground font-medium">Within 24 hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Technical support:</span>
                      <span className="text-foreground font-medium">Within 4 hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sales inquiries:</span>
                      <span className="text-foreground font-medium">Same business day</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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

export default Contact;
