import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Bell, Mail, MessageSquare, Save, AlertCircle } from "lucide-react";
import { useNotificationPrefs, type NotificationPreferences } from "@/hooks/useNotificationPrefs";
import { useToast } from "@/hooks/use-toast";

export const NotificationSettings = () => {
  const { preferences, loading, updatePreferences } = useNotificationPrefs();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<Partial<NotificationPreferences>>({
    slack_webhook: '',
    email: '',
    digest_frequency: 'hourly'
  });

  // No need to call fetchPreferences manually as the hook does it automatically

  useEffect(() => {
    if (preferences) {
      setFormData({
        slack_webhook: preferences.slack_webhook || '',
        email: preferences.email || '',
        digest_frequency: preferences.digest_frequency || 'hourly'
      });
    }
  }, [preferences]);

  const handleSave = async () => {
    try {
      await updatePreferences(formData);
      toast({
        title: "Settings Saved",
        description: "Your notification preferences have been updated",
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save notification preferences",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: keyof NotificationPreferences, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-brand-primary" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Email Settings */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-medium">Email Notifications</Label>
              </div>
              <div className="space-y-3 pl-6">
                <div>
                  <Label htmlFor="email" className="text-sm">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your-email@example.com"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to use your account email
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Slack Settings */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-medium">Slack Notifications</Label>
              </div>
              <div className="space-y-3 pl-6">
                <div>
                  <Label htmlFor="slack-webhook" className="text-sm">Slack Webhook URL</Label>
                  <Input
                    id="slack-webhook"
                    type="url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={formData.slack_webhook || ''}
                    onChange={(e) => handleInputChange('slack_webhook', e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Create a webhook in your Slack workspace to receive notifications
                  </p>
                </div>
                
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">How to set up Slack notifications:</p>
                        <ol className="list-decimal list-inside space-y-1 text-xs">
                          <li>Go to your Slack workspace settings</li>
                          <li>Create a new "Incoming Webhook" app</li>
                          <li>Choose the channel for PPC Pal notifications</li>
                          <li>Copy the webhook URL and paste it above</li>
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Separator />

            {/* Digest Frequency */}
            <div>
              <div className="space-y-3">
                <Label className="text-base font-medium">Digest Frequency</Label>
                <div className="pl-6">
                  <Select 
                    value={formData.digest_frequency || 'hourly'} 
                    onValueChange={(value) => handleInputChange('digest_frequency', value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant">Instant (as they happen)</SelectItem>
                      <SelectItem value="hourly">Hourly digest</SelectItem>
                      <SelectItem value="daily">Daily digest</SelectItem>
                      <SelectItem value="weekly">Weekly Profit Pulse</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    How often you want to receive grouped notifications.
                    {formData.digest_frequency === 'weekly' && (
                      <span className="block mt-1 text-primary">
                        Weekly Profit Pulse includes savings breakdown, win rate, week-over-week trends, and quick wins — delivered every Monday.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Types Info */}
      <Card>
        <CardHeader>
          <CardTitle>What You'll Be Notified About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-error rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <div className="font-medium">Critical Anomalies</div>
                <div className="text-muted-foreground">Significant spikes or drops in spend, ACOS, conversions</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-warning rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <div className="font-medium">Budget Recommendations</div>
                <div className="text-muted-foreground">When campaigns are pacing too fast or slow</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-success rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <div className="font-medium">Automation Actions</div>
                <div className="text-muted-foreground">When rules trigger campaign changes</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};