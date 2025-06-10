
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Cookie, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always required
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    } else {
      const savedPreferences = JSON.parse(consent);
      setPreferences(savedPreferences);
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem('cookie-consent', JSON.stringify(prefs));
    setPreferences(prefs);
    setShowBanner(false);
  };

  const acceptAll = () => {
    const allAccepted = {
      essential: true,
      analytics: true,
      marketing: true
    };
    savePreferences(allAccepted);
  };

  const acceptEssential = () => {
    const essentialOnly = {
      essential: true,
      analytics: false,
      marketing: false
    };
    savePreferences(essentialOnly);
  };

  const handlePreferenceChange = (key: keyof CookiePreferences, value: boolean) => {
    if (key === 'essential') return; // Essential cookies cannot be disabled
    
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <Card className="mx-auto max-w-4xl border-2 shadow-lg bg-white">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Cookie className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">We use cookies</h3>
              <p className="text-gray-700 text-sm mb-4">
                We use essential cookies to make our site work. We'd also like to set optional cookies 
                to help us improve our website and analyze how it's used. You can choose which cookies 
                to accept below.
              </p>
              
              <div className="flex flex-wrap gap-3">
                <Button onClick={acceptAll} size="sm">
                  Accept All
                </Button>
                <Button onClick={acceptEssential} variant="outline" size="sm">
                  Essential Only
                </Button>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Customize
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Cookie Preferences</DialogTitle>
                      <DialogDescription>
                        Choose which cookies you'd like to accept
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Essential Cookies</span>
                            <Badge variant="outline" className="text-xs">Required</Badge>
                          </div>
                          <Switch 
                            checked={true} 
                            disabled={true}
                          />
                        </div>
                        <p className="text-sm text-gray-600">
                          Required for the website to function properly. Cannot be disabled.
                        </p>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Analytics Cookies</span>
                          <Switch 
                            checked={preferences.analytics}
                            onCheckedChange={(checked) => handlePreferenceChange('analytics', checked)}
                          />
                        </div>
                        <p className="text-sm text-gray-600">
                          Help us understand how visitors interact with our website.
                        </p>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Marketing Cookies</span>
                          <Switch 
                            checked={preferences.marketing}
                            onCheckedChange={(checked) => handlePreferenceChange('marketing', checked)}
                          />
                        </div>
                        <p className="text-sm text-gray-600">
                          Used to track visitors and show relevant advertisements.
                        </p>
                      </div>
                      
                      <div className="flex gap-2 pt-4">
                        <Button 
                          onClick={() => savePreferences(preferences)} 
                          className="flex-1"
                        >
                          Save Preferences
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBanner(false)}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CookieConsent;
