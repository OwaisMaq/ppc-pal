import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Download, Trash2, Calendar, HelpCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';

export const DataSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { connections } = useAmazonConnections();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const activeConnection = connections?.find(c => c.status === 'active');

  const handleExportData = async () => {
    if (!user) return;
    
    setIsExporting(true);
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id);

      const { data: usageData } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', user.id);

      const exportData = {
        profile: profileData,
        subscriptions: subscriptionData,
        usage: usageData,
        exportDate: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        }
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ppcpal-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Data exported',
        description: 'Your data has been downloaded.',
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: 'Export failed',
        description: 'There was an error exporting your data.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    try {
      await supabase.from('feedback').delete().eq('user_id', user.id);
      await supabase.from('usage_tracking').delete().eq('user_id', user.id);
      await supabase.from('subscriptions').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('id', user.id);

      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) throw error;

      toast({
        title: 'Account deleted',
        description: 'Your account has been permanently deleted.',
      });

      await supabase.auth.signOut();
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: 'Deletion failed',
        description: 'Please contact support to delete your account.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Download className="h-5 w-5" />
            Export Your Data
          </CardTitle>
          <CardDescription>
            Download a copy of your personal data in JSON format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExportData} disabled={isExporting} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Data'}
          </Button>
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Data Retention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span>Account Data</span>
              <span className="text-muted-foreground">Until deletion</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Campaign Data</span>
              <span className="text-muted-foreground">2 years</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Usage Analytics</span>
              <span className="text-muted-foreground">2 years</span>
            </div>
            <div className="flex justify-between py-2">
              <span>Support Communications</span>
              <span className="text-muted-foreground">3 years</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Account
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete My Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account
                  and remove all your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, delete my account'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Help */}
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
          <div className="text-sm">
            <span className="text-muted-foreground">Questions about your data? Contact </span>
            <a href="mailto:info@ppcpal.online" className="text-primary hover:underline">
              info@ppcpal.online
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
