import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Zap, Scale, Shield, TrendingUp, Target, DollarSign } from "lucide-react";

export type TemplateType = "aggressive" | "balanced" | "conservative";

interface Template {
  id: TemplateType;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  dailyBudget: number;
  defaultBid: number;
  recommended?: boolean;
}

const templates: Template[] = [
  {
    id: "aggressive",
    title: "Aggressive Growth",
    description: "Maximum visibility and data collection. Higher bids, faster learning.",
    icon: <Zap className="h-6 w-6 text-warning" />,
    features: [
      "Higher default bids (+25%)",
      "Faster keyword harvesting",
      "Broader match types initially",
      "Dynamic bidding: Up and down"
    ],
    dailyBudget: 75,
    defaultBid: 1.00,
  },
  {
    id: "balanced",
    title: "Balanced",
    description: "Optimal balance between growth and efficiency. Recommended for most sellers.",
    icon: <Scale className="h-6 w-6 text-primary" />,
    features: [
      "Market-average bids",
      "Steady keyword discovery",
      "Mixed match types",
      "Dynamic bidding: Down only"
    ],
    dailyBudget: 50,
    defaultBid: 0.75,
    recommended: true,
  },
  {
    id: "conservative",
    title: "Conservative",
    description: "Protect margins with careful spending. Lower bids, proven keywords only.",
    icon: <Shield className="h-6 w-6 text-success" />,
    features: [
      "Lower default bids (-20%)",
      "Strict harvesting criteria",
      "Exact match focus",
      "Fixed bids"
    ],
    dailyBudget: 30,
    defaultBid: 0.50,
  },
];

interface TemplateSelectorProps {
  selectedTemplate: TemplateType;
  onSelectTemplate: (template: TemplateType) => void;
}

export function TemplateSelector({ selectedTemplate, onSelectTemplate }: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {templates.map((template) => (
        <Card
          key={template.id}
          className={cn(
            "cursor-pointer transition-all duration-200 hover:shadow-md relative",
            selectedTemplate === template.id
              ? "ring-2 ring-primary border-primary"
              : "hover:border-primary/50"
          )}
          onClick={() => onSelectTemplate(template.id)}
        >
          {template.recommended && (
            <Badge className="absolute -top-2 right-4 bg-primary text-primary-foreground">
              Recommended
            </Badge>
          )}
          
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                {template.icon}
              </div>
              <div>
                <CardTitle className="text-lg">{template.title}</CardTitle>
              </div>
            </div>
            <CardDescription className="mt-2">
              {template.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <ul className="space-y-1.5 text-sm">
              {template.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-muted-foreground">
                  <Target className="h-3 w-3 text-primary flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            
            <div className="pt-3 border-t border-border grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-sm font-medium">
                  <DollarSign className="h-3.5 w-3.5" />
                  {template.dailyBudget}
                </div>
                <p className="text-xs text-muted-foreground">Daily budget</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-sm font-medium">
                  <TrendingUp className="h-3.5 w-3.5" />
                  ${template.defaultBid.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Default bid</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export { templates };
