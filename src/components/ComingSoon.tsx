
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface ComingSoonProps {
  feature?: string;
  className?: string;
}

const ComingSoon = ({ feature, className }: ComingSoonProps) => {
  return (
    <Badge 
      variant="outline" 
      className={`inline-flex items-center gap-1 text-xs text-muted-foreground border-muted-foreground/30 ${className}`}
    >
      <Clock className="h-3 w-3" />
      Coming Soon{feature && `: ${feature}`}
    </Badge>
  );
};

export default ComingSoon;
