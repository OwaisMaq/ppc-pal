
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

const DataRetentionPolicy = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Data Retention Policy
        </CardTitle>
        <CardDescription>
          How long we keep your data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">Account Data</span>
            <span className="text-gray-600">Until account deletion</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">PPC Campaign Data</span>
            <span className="text-gray-600">2 years after last upload</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">Usage Analytics</span>
            <span className="text-gray-600">2 years</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">Support Communications</span>
            <span className="text-gray-600">3 years</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataRetentionPolicy;
