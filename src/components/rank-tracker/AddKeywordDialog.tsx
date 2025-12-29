import { Button } from "@/components/ui/button";
import { Plus, Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AddKeywordDialogProps {
  onAdd: (data: { asin: string; keyword: string }) => void;
  isAdding: boolean;
  disabled?: boolean;
}

export function AddKeywordDialog({ disabled = true }: AddKeywordDialogProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button disabled={disabled}>
              <Plus className="h-4 w-4 mr-2" />
              Add Keyword
              {disabled && <Clock className="h-3 w-3 ml-2" />}
            </Button>
          </span>
        </TooltipTrigger>
        {disabled && (
          <TooltipContent>
            <p>Coming soon - API integration in progress</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
