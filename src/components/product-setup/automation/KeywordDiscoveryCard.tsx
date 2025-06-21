
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TrendingUp } from 'lucide-react';

interface KeywordDiscoveryCardProps {
  autoKeywords: boolean;
  onAutoKeywordsChange: (enabled: boolean) => void;
}

const KeywordDiscoveryCard: React.FC<KeywordDiscoveryCardProps> = ({
  autoKeywords,
  onAutoKeywordsChange,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Keyword Discovery
        </CardTitle>
        <CardDescription>
          Automatically discover and add new profitable keywords
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="auto-keywords">Enable Auto Keyword Discovery</Label>
            <p className="text-sm text-gray-500">
              Add high-performing search terms as new keywords automatically
            </p>
          </div>
          <Switch
            id="auto-keywords"
            checked={autoKeywords}
            onCheckedChange={onAutoKeywordsChange}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default KeywordDiscoveryCard;
