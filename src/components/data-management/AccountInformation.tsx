
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const AccountInformation = () => {
  const { user } = useAuth();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Account Information
        </CardTitle>
        <CardDescription>
          Your current account details and data summary
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Email Address</label>
            <p className="text-gray-900">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Account Created</label>
            <p className="text-gray-900">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
        <Separator />
        <div>
          <label className="text-sm font-medium text-gray-500">Data Categories</label>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline">Profile Data</Badge>
            <Badge variant="outline">Subscription Info</Badge>
            <Badge variant="outline">Usage Analytics</Badge>
            <Badge variant="outline">Feedback</Badge>
            <Badge variant="outline">PPC Campaign Data</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountInformation;
