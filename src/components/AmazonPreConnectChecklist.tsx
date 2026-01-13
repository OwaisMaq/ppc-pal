import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';

interface AmazonPreConnectChecklistProps {
  onProceed: () => void;
  onCancel?: () => void;
}

const AmazonPreConnectChecklist = ({ onProceed, onCancel }: AmazonPreConnectChecklistProps) => {
  const [checkedItems, setCheckedItems] = useState({
    hasAdvertisingAccount: false,
    willUseCorrectEmail: false,
    hasApiAccess: false,
  });

  const allChecked = Object.values(checkedItems).every(Boolean);

  const handleCheckChange = (key: keyof typeof checkedItems) => {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Before You Connect
        </CardTitle>
        <CardDescription>
          Please confirm the following requirements to ensure a successful connection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {/* Checklist Item 1 */}
          <label 
            className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
            htmlFor="check-advertising"
          >
            <Checkbox 
              id="check-advertising"
              checked={checkedItems.hasAdvertisingAccount}
              onCheckedChange={() => handleCheckChange('hasAdvertisingAccount')}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">I have an active Amazon Advertising account</span>
                {checkedItems.hasAdvertisingAccount && (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                A regular Amazon Seller Central account is not enough. You need an Amazon Advertising account with active campaigns.
              </p>
            </div>
          </label>

          {/* Checklist Item 2 */}
          <label 
            className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
            htmlFor="check-email"
          >
            <Checkbox 
              id="check-email"
              checked={checkedItems.willUseCorrectEmail}
              onCheckedChange={() => handleCheckChange('willUseCorrectEmail')}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">I will log in with the correct Amazon account</span>
                {checkedItems.willUseCorrectEmail && (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Use the email address associated with your Amazon Advertising account, not a personal Amazon account.
              </p>
            </div>
          </label>

          {/* Checklist Item 3 */}
          <label 
            className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
            htmlFor="check-api"
          >
            <Checkbox 
              id="check-api"
              checked={checkedItems.hasApiAccess}
              onCheckedChange={() => handleCheckChange('hasApiAccess')}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">My account has API access enabled</span>
                {checkedItems.hasApiAccess && (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                API access must be enabled in your Amazon Advertising settings. New accounts may need to wait 30+ days.
              </p>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 mt-1 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  window.open('https://advertising.amazon.com/', '_blank');
                }}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Check API Settings
              </Button>
            </div>
          </label>
        </div>

        {!allChecked && (
          <Alert variant="default" className="border-warning/50 bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-sm">
              Please confirm all requirements above before connecting. If you're unsure about any item, 
              check your Amazon Advertising account settings first.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            onClick={onProceed}
            disabled={!allChecked}
            className="flex-1"
          >
            Continue to Amazon Login
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Need help? <a 
            href="https://advertising.amazon.com/get-started" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Learn about Amazon Advertising
          </a>
        </p>
      </CardContent>
    </Card>
  );
};

export default AmazonPreConnectChecklist;
