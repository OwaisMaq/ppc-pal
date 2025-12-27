import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "react-router-dom";
import { 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  ChevronDown,
  Sparkles,
  ExternalLink
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface MatterItem {
  id: string;
  type: 'positive' | 'attention';
  title: string;
  description: string;
  details?: string;
  link?: {
    label: string;
    to: string;
  };
}

interface WhatMattersNowProps {
  items: MatterItem[];
  loading?: boolean;
}

export const WhatMattersNow = ({ items, loading }: WhatMattersNowProps) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const positiveItems = items.filter(i => i.type === 'positive').slice(0, 3);
  const attentionItems = items.filter(i => i.type === 'attention').slice(0, 3);
  
  const noActionRequired = positiveItems.length === 0 && attentionItems.length === 0;

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/4" />
            <div className="grid md:grid-cols-2 gap-4">
              <div className="h-24 bg-muted rounded" />
              <div className="h-24 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          What Matters Now
        </CardTitle>
      </CardHeader>
      <CardContent>
        {noActionRequired ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="p-3 rounded-full bg-success/10 mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No Action Required</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Everything is running smoothly. Your automations are working as expected and all metrics are within normal ranges.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Positive Outcomes */}
            {positiveItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <TrendingUp className="h-4 w-4 text-success" />
                  Positive Outcomes
                </div>
                <div className="space-y-2">
                  {positiveItems.map((item) => (
                    <Collapsible 
                      key={item.id} 
                      open={expandedIds.has(item.id)}
                      onOpenChange={() => toggleExpanded(item.id)}
                    >
                      <div className="rounded-lg border border-success/20 bg-success/5 overflow-hidden">
                        <CollapsibleTrigger asChild>
                          <button className="w-full flex items-start gap-3 p-3 text-left hover:bg-success/10 transition-colors">
                            <CheckCircle className="h-4 w-4 text-success mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{item.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                            </div>
                            <ChevronDown className={cn(
                              "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
                              expandedIds.has(item.id) && "rotate-180"
                            )} />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-3 pb-3 pt-0">
                            <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                            {item.details && (
                              <p className="text-xs text-muted-foreground mb-2">{item.details}</p>
                            )}
                            {item.link && (
                              <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
                                <Link to={item.link.to}>
                                  {item.link.label}
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              </div>
            )}

            {/* Attention Required */}
            {attentionItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <TrendingDown className="h-4 w-4 text-warning" />
                  Requires Attention
                </div>
                <div className="space-y-2">
                  {attentionItems.map((item) => (
                    <Collapsible 
                      key={item.id} 
                      open={expandedIds.has(item.id)}
                      onOpenChange={() => toggleExpanded(item.id)}
                    >
                      <div className="rounded-lg border border-warning/20 bg-warning/5 overflow-hidden">
                        <CollapsibleTrigger asChild>
                          <button className="w-full flex items-start gap-3 p-3 text-left hover:bg-warning/10 transition-colors">
                            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{item.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                            </div>
                            <ChevronDown className={cn(
                              "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
                              expandedIds.has(item.id) && "rotate-180"
                            )} />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-3 pb-3 pt-0">
                            <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                            {item.details && (
                              <p className="text-xs text-muted-foreground mb-2">{item.details}</p>
                            )}
                            {item.link && (
                              <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
                                <Link to={item.link.to}>
                                  {item.link.label}
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};