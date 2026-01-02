import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Bell, Mail, MessageSquare, Save, ChevronDown } from 'lucide-react';
import { useNotificationPrefs, type NotificationPreferences } from '@/hooks/useNotificationPrefs';
import { useToast } from '@/hooks/use-toast';

type DigestFrequency = 'instant' | 'hourly' | 'daily';

export const NotificationsSettings = () => {
  const { preferences, loading, updatePreferences } = useNotificationPrefs();
  const { toast } = useToast();
  const [showSlackSetup, setShowSlackSetup] = useState(false);
  
  const [formData, setFormData] = useState<{
    slack_webhook: string;
    email: string;
    digest_frequency: DigestFrequency;
  }>({
    slack_webhook: '',
    email: '',
    digest_frequency: 'hourly'
  });

  useEffect(() => {
    if (preferences) {
      setFormData({
        slack_webhook: preferences.slack_webhook || '',
        email: preferences.email || '',
        digest_frequency: (preferences.digest_frequency as DigestFrequency) || 'hourly'
      });
    }
  }, [preferences]);

  const handleSave = async () => {
    try {
      await updatePreferences(formData);
      toast({
        title: 'Settings saved',
        description: 'Your notification preferences have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5" />
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address
          </Label>
          <Input
            type="email"
            placeholder="your-email@example.com"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">Leave empty to use your account email</p>
        </div>

        {/* Digest Frequency */}
        <div className="space-y-2">
          <Label>Digest Frequency</Label>
          <Select 
            value={formData.digest_frequency} 
            onValueChange={(value: DigestFrequency) => setFormData({ ...formData, digest_frequency: value })}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instant">Instant</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Slack */}
        <Collapsible open={showSlackSetup} onOpenChange={setShowSlackSetup}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Slack Integration
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showSlackSetup ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-2">
            <Input
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              value={formData.slack_webhook || ''}
              onChange={(e) => setFormData({ ...formData, slack_webhook: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Create an Incoming Webhook in your Slack workspace and paste the URL here.
            </p>
          </CollapsibleContent>
        </Collapsible>

        <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Notifications'}
        </Button>
      </CardContent>
    </Card>
  );
};
