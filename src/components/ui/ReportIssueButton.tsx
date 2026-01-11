import { useState } from 'react';
import { Flag, Loader2, Check, AlertCircle, Database, MousePointerClick, Zap, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useIssueReports, ISSUE_TYPES, IssueType } from '@/hooks/useIssueReports';
import { cn } from '@/lib/utils';

interface ReportIssueButtonProps {
  featureId: string;
  featureLabel?: string;
  context?: Record<string, unknown>;
  variant?: 'icon' | 'text' | 'minimal';
  className?: string;
}

const issueIcons: Record<IssueType, React.ReactNode> = {
  not_loading: <Loader2 className="h-4 w-4" />,
  wrong_data: <Database className="h-4 w-4" />,
  button_broken: <MousePointerClick className="h-4 w-4" />,
  crashed: <Zap className="h-4 w-4" />,
  other: <MessageCircle className="h-4 w-4" />,
  general: <AlertCircle className="h-4 w-4" />,
};

export function ReportIssueButton({
  featureId,
  featureLabel,
  context,
  variant = 'icon',
  className,
}: ReportIssueButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { submitReport } = useIssueReports();

  const handleSubmit = async (issueType?: IssueType) => {
    setSubmitting(true);
    const success = await submitReport({
      featureId,
      featureLabel,
      issueType,
      context,
    });
    setSubmitting(false);
    
    if (success) {
      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
      }, 1500);
    }
  };

  // Quick submit without selecting type
  const handleQuickSubmit = () => {
    handleSubmit('general');
  };

  if (submitted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn('text-green-600 pointer-events-none', className)}
        disabled
      >
        <Check className="h-4 w-4" />
        {variant === 'text' && <span className="ml-1.5">Reported</span>}
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'text-muted-foreground hover:text-foreground transition-colors',
            variant === 'minimal' && 'h-6 w-6 p-0',
            className
          )}
          title="Report an issue with this feature"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Flag className="h-4 w-4" />
          )}
          {variant === 'text' && <span className="ml-1.5">Report Issue</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground px-2 py-1">
            What's the issue?
          </p>
          {ISSUE_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => handleSubmit(type.value)}
              disabled={submitting}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors text-left disabled:opacity-50"
            >
              {issueIcons[type.value]}
              <span>{type.label}</span>
            </button>
          ))}
          <div className="border-t my-1" />
          <button
            onClick={handleQuickSubmit}
            disabled={submitting}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground rounded-md hover:bg-muted transition-colors text-left disabled:opacity-50"
          >
            <Flag className="h-3 w-3" />
            <span>Just report (no details)</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
