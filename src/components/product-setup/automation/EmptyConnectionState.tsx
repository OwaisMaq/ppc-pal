
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

const EmptyConnectionState: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-600" />
          Automation Preferences
        </CardTitle>
        <CardDescription>
          Connect an Amazon account first to configure automation settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500 text-center py-8">
          Please connect your Amazon Advertising account in the Settings page to enable automation features.
        </p>
      </CardContent>
    </Card>
  );
};

export default EmptyConnectionState;
