
import React, { useState } from 'react';
import FeedbackForm from '@/components/FeedbackForm';
import FeedbackList from '@/components/FeedbackList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';

const Feedback = () => {
  const [activeTab, setActiveTab] = useState('submit');

  const handleFeedbackSuccess = () => {
    setActiveTab('history');
  };

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Feedback</h1>
          <p className="text-gray-600">
            Help us improve PPC Pal by sharing your thoughts, reporting issues, or suggesting new features.
          </p>
        </div>

        <div className="max-w-4xl">
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
    </AuthenticatedLayout>
  );
};

export default Feedback;
