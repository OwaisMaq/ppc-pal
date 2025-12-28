import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase,
  Layers, 
  Target, 
  Tags,
  Search 
} from "lucide-react";

export type CampaignLevel = 'portfolios' | 'campaigns' | 'ad-groups' | 'targets' | 'search-terms';

interface CampaignLevelSelectorProps {
  value: CampaignLevel;
  onChange: (value: CampaignLevel) => void;
  counts?: {
    portfolios?: number;
    campaigns?: number;
    adGroups?: number;
    targets?: number;
    searchTerms?: number;
  };
}

const levels: {
  id: CampaignLevel;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'portfolios', label: 'Portfolios', icon: Briefcase },
  { id: 'campaigns', label: 'Campaigns', icon: Layers },
  { id: 'ad-groups', label: 'Ad Groups', icon: Target },
  { id: 'targets', label: 'Targets / Keywords', icon: Tags },
  { id: 'search-terms', label: 'Search Terms', icon: Search },
];

export function CampaignLevelSelector({ 
  value, 
  onChange,
  counts 
}: CampaignLevelSelectorProps) {
  const getCount = (id: CampaignLevel) => {
    switch (id) {
      case 'portfolios': return counts?.portfolios;
      case 'campaigns': return counts?.campaigns;
      case 'ad-groups': return counts?.adGroups;
      case 'targets': return counts?.targets;
      case 'search-terms': return counts?.searchTerms;
      default: return undefined;
    }
  };

  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as CampaignLevel)} className="w-full">
      <TabsList className="w-full justify-start h-auto p-1 bg-muted/50">
        {levels.map((level) => {
          const count = getCount(level.id);
          const Icon = level.icon;
          
          return (
            <TabsTrigger 
              key={level.id} 
              value={level.id}
              className="flex items-center gap-2 data-[state=active]:bg-background"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{level.label}</span>
              {count !== undefined && (
                <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                  {count.toLocaleString()}
                </Badge>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}

export default CampaignLevelSelector;
