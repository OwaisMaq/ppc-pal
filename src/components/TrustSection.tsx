import React from "react";
import { Shield, Users, Zap, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

const TrustSection: React.FC = () => {
  const stats = [
    { icon: Users, label: "Active Users", value: "2.4k+", color: "electric-purple" },
    { icon: Zap, label: "ROAS Improved", value: "avg 2.3x", color: "electric-orange" },
    { icon: CheckCircle, label: "Success Rate", value: "94%", color: "electric-green" },
  ];

  return (
    <section className="relative py-20 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-electric-purple/10 animate-float-slow blur-xl" aria-hidden="true" />
      <div className="absolute bottom-10 right-16 w-16 h-16 rounded-lg bg-electric-orange/10 animate-float rotate-45 blur-xl" aria-hidden="true" />
      
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-semibold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Trusted by Amazon sellers worldwide
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join thousands of sellers who've already transformed their PPC performance with our AI-powered optimization.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          {stats.map((stat, index) => (
            <Card key={index} className="relative p-6 text-center bg-gradient-to-br from-card to-muted/30 border-border/50 hover:border-electric-purple/20 transition-all duration-300">
              <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-electric-purple/20 to-electric-orange/20 mb-4">
                <stat.icon className={`w-6 h-6 text-${stat.color}`} />
              </div>
              <div className={`text-2xl font-bold text-${stat.color} mb-1`}>{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
              
              {/* Subtle glow effect */}
              <div className={`absolute inset-0 bg-gradient-to-br from-${stat.color}/5 to-transparent rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300`} />
            </Card>
          ))}
        </div>
        
        {/* Security badge */}
        <div className="flex items-center justify-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-electric-green" />
            <span className="text-sm">Enterprise-grade security</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="text-sm">Official Amazon API integration</div>
          <div className="w-px h-4 bg-border" />
          <div className="text-sm">SOC 2 compliant</div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;