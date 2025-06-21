import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const FeedbackList = () => {
  const [feedbackItems, setFeedbackItems] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchFeedback = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('feedback')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching feedback:', error);
        } else {
          setFeedbackItems(data);
        }
      } catch (error) {
        console.error('Error fetching feedback:', error);
      }
    };

    fetchFeedback();
  }, [user]);

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <Badge variant="secondary">Positive</Badge>;
      case 'negative':
        return <Badge variant="destructive">Negative</Badge>;
      default:
        return <Badge>Neutral</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Your Feedback
        </CardTitle>
        <CardDescription>
          Here's what you've shared with us
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {feedbackItems.length > 0 ? (
          feedbackItems.map((item) => (
            <div key={item.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {getSentimentBadge(item.sentiment)}
                  <span className="text-gray-600 text-sm">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm text-gray-700">{item.rating} / 5</span>
                </div>
              </div>
              <p className="text-gray-800">{item.comment}</p>
              <Separator />
            </div>
          ))
        ) : (
          <p className="text-gray-500">No feedback submitted yet.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default FeedbackList;
