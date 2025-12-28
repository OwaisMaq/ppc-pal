import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Layers, 
  Target, 
  Tags,
  Search 
} from "lucide-react";

export type CampaignLevel = 'campaigns' | 'ad-groups' | 'keywords' | 'search-terms';

interface CampaignLevelSelectorProps {
  value: CampaignLevel;
  onChange: (value: CampaignLevel) => void;
  counts?: {
    campaigns?: number;
    adGroups?: number;
    keywords?: number;
    searchTerms?: number;
  };
}

const levels: {
  id: CampaignLevel;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'campaigns', label: 'Campaigns', icon: Layers },
  { id: 'ad-groups', label: 'Ad Groups', icon: Target },
  { id: 'keywords', label: 'Keywords', icon: Tags },
  { id: 'search-terms', label: 'Search Terms', icon: Search },
];

export function CampaignLevelSelector({ 
  value, 
  onChange,
  counts 
}: CampaignLevelSelectorProps) {
  const getCount = (id: CampaignLevel) => {
    switch (id) {
      case 'campaigns': return counts?.campaigns;
      case 'ad-groups': return counts?.adGroups;
      case 'keywords': return counts?.keywords;
      case 'search-terms': return counts?.searchTerms;
      default: return undefined;
    }
  };

  return (
    <Select value={value} onValueChange={(v) => onChange(v as CampaignLevel)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {levels.map((level) => {
          const count = getCount(level.id);
          const Icon = level.icon;
          
          return (
            <SelectItem key={level.id} value={level.id}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{level.label}</span>
                {count !== undefined && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {count}
                  </Badge>
                )}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export default CampaignLevelSelector;
