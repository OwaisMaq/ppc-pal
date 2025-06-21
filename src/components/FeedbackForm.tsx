
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface FeedbackFormProps {
  onSuccess?: () => void;
}

const FeedbackForm = ({ onSuccess }: FeedbackFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
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

    if (!subject || !message || !feedbackType) {
      toast({
        title: "Missing fields",
        description: "Please fill out all fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('feedback')
        .insert({
          user_id: user.id,
          subject: subject,
          message: message,
          feedback_type: feedbackType,
          user_email: user.email,
        });

      if (error) {
        throw error;
      }

      setSubject('');
      setMessage('');
      setFeedbackType('');

      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback!",
      });

      if (onSuccess) {
        onSuccess();
      }
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
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            placeholder="Brief summary of your feedback..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div className="grid w-full gap-2">
          <Label htmlFor="message">Your Feedback</Label>
          <Textarea
            id="message"
            placeholder="Tell us what you think..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <div className="grid w-full gap-2">
          <Label htmlFor="feedback-type">Feedback Type</Label>
          <Select value={feedbackType} onValueChange={(value) => setFeedbackType(value)}>
            <SelectTrigger id="feedback-type">
              <SelectValue placeholder="Select feedback type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bug_report">Bug Report</SelectItem>
              <SelectItem value="feature_request">Feature Request</SelectItem>
              <SelectItem value="improvement">Improvement Suggestion</SelectItem>
              <SelectItem value="general">General Feedback</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleFeedbackSubmit} disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Submitting..." : "Submit Feedback"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default FeedbackForm;
