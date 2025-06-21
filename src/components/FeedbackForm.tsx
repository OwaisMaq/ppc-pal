import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const FeedbackForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [feedbackText, setFeedbackText] = useState('');
  const [rating, setRating] = useState('');
  const [feedbackType, setFeedbackType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedbackSubmit = async () => {
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "You must be logged in to submit feedback.",
        variant: "destructive",
      });
      return;
    }

    if (!feedbackText || !rating || !feedbackType) {
      toast({
        title: "Missing fields",
        description: "Please fill out all fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('feedback')
        .insert([
          {
            user_id: user.id,
            feedback_text: feedbackText,
            rating: parseInt(rating),
            feedback_type: feedbackType,
          },
        ]);

      if (error) {
        throw error;
      }

      setFeedbackText('');
      setRating('');
      setFeedbackType('');

      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback!",
      });
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Failed to submit",
        description: error.message || "There was an error submitting your feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Feedback Form
        </CardTitle>
        <CardDescription>
          We appreciate your feedback!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full gap-2">
          <Label htmlFor="feedback">Your Feedback</Label>
          <Textarea
            id="feedback"
            placeholder="Tell us what you think..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
          />
        </div>
        <div className="grid w-full gap-2">
          <Label htmlFor="rating">Rating</Label>
          <Select value={rating} onValueChange={(value) => setRating(value)}>
            <SelectTrigger id="rating">
              <SelectValue placeholder="Select a rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 - Poor</SelectItem>
              <SelectItem value="2">2 - Fair</SelectItem>
              <SelectItem value="3">3 - Good</SelectItem>
              <SelectItem value="4">4 - Very Good</SelectItem>
              <SelectItem value="5">5 - Excellent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid w-full gap-2">
          <Label htmlFor="feedback-type">Feedback Type</Label>
          <Select value={feedbackType} onValueChange={(value) => setFeedbackType(value)}>
            <SelectTrigger id="feedback-type">
              <SelectValue placeholder="Select feedback type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bug">Bug Report</SelectItem>
              <SelectItem value="feature">Feature Request</SelectItem>
              <SelectItem value="improvement">Improvement Suggestion</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleFeedbackSubmit} disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              Submitting...
            </>
          ) : (
            <>
              Submit Feedback
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default FeedbackForm;
