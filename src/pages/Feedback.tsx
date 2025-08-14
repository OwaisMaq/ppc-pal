
import React, { useState } from 'react';
import DashboardShell from '@/components/DashboardShell';
import FeedbackForm from '@/components/FeedbackForm';
import FeedbackList from '@/components/FeedbackList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare } from 'lucide-react';

const Feedback = () => {
  const [activeTab, setActiveTab] = useState('submit');

  const handleFeedbackSuccess = () => {
    setActiveTab('history');
  };

  return (
    <DashboardShell>
      <div className="container mx-auto py-6 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Feedback</h1>
          </div>
          <p className="text-gray-600">
            Help us improve PPC Pal by sharing your thoughts, reporting issues, or suggesting new features.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="submit">Submit Feedback</TabsTrigger>
              <TabsTrigger value="history">Your Feedback</TabsTrigger>
            </TabsList>
            
            <TabsContent value="submit" className="mt-6">
              <FeedbackForm onSuccess={handleFeedbackSuccess} />
            </TabsContent>
            
            <TabsContent value="history" className="mt-6">
              <FeedbackList />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardShell>
  );
};

export default Feedback;
