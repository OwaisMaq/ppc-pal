
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Download, TrendingUp, Users } from "lucide-react";

const InfoCards = () => {
  const cards = [
    {
      icon: BarChart3,
      title: "Performance Analysis",
      description: "Analyze campaign performance and identify optimization opportunities",
      color: "text-brand-primary",
      bgColor: "bg-brand-primary/5 hover:bg-brand-primary/10"
    },
    {
      icon: TrendingUp, 
      title: "Smart Insights",
      description: "AI-powered recommendations for campaign optimization",
      color: "text-brand-accent",
      bgColor: "bg-brand-accent/5 hover:bg-brand-accent/10"
    },
    {
      icon: Download,
      title: "Export Results",
      description: "Get your optimized data in Excel format",
      color: "text-success",
      bgColor: "bg-success/5 hover:bg-success/10"
    },
    {
      icon: Users,
      title: "Multi-Account",
      description: "Manage multiple Amazon advertising accounts",
      color: "text-neutral-600",
      bgColor: "bg-neutral-100 hover:bg-neutral-200"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className={`transition-all duration-200 cursor-pointer border-muted hover:shadow-md ${card.bgColor}`}>
          <CardContent className="p-4 text-center">
            <card.icon className={`h-6 w-6 ${card.color} mx-auto mb-2`} />
            <h3 className="font-semibold text-sm mb-1">{card.title}</h3>
            <p className="text-xs text-muted-foreground leading-tight">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default InfoCards;
