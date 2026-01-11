import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Clock, AlertTriangle } from "lucide-react";

interface Feature {
  name: string;
  status: 'ready' | 'beta' | 'coming';
}

const features: Feature[] = [
  { name: 'Amazon Ads connection & sync', status: 'ready' },
  { name: 'Campaign & ad group management', status: 'ready' },
  { name: 'Search term analysis', status: 'ready' },
  { name: 'Automation rules engine', status: 'ready' },
  { name: 'Negative keyword automation', status: 'ready' },
  { name: 'Bid optimization', status: 'beta' },
  { name: 'Budget pacing', status: 'beta' },
  { name: 'Rank tracking', status: 'coming' },
  { name: 'AI-powered insights', status: 'beta' },
];

const limitations = [
  'Data sync may take up to 24 hours for initial historical import',
  'Some advanced filtering options are still in development',
  'Report exports are limited to CSV format',
  'Bulk operations process up to 100 items at a time',
];

export const BetaExpectations = () => {
  const readyFeatures = features.filter(f => f.status === 'ready');
  const betaFeatures = features.filter(f => f.status === 'beta');
  const comingFeatures = features.filter(f => f.status === 'coming');

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Features Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Feature Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Ready */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Check className="h-4 w-4 text-success" />
              <span className="text-sm font-medium">Fully Working</span>
            </div>
            <ul className="space-y-1 ml-6">
              {readyFeatures.map(f => (
                <li key={f.name} className="text-sm text-muted-foreground">
                  {f.name}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Beta */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium">In Beta</span>
            </div>
            <ul className="space-y-1 ml-6">
              {betaFeatures.map(f => (
                <li key={f.name} className="text-sm text-muted-foreground">
                  {f.name}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Coming Soon */}
          {comingFeatures.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Coming Soon</span>
              </div>
              <ul className="space-y-1 ml-6">
                {comingFeatures.map(f => (
                  <li key={f.name} className="text-sm text-muted-foreground">
                    {f.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Known Limitations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Known Limitations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            We're actively working to address these items:
          </p>
          <ul className="space-y-2">
            {limitations.map((limitation, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                <span className="text-muted-foreground">{limitation}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">
              Found an issue not listed here? We'd love to hear about it in the feedback section below.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
