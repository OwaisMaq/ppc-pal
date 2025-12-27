import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchTerms, SearchTerm } from "@/hooks/useSearchTerms";
import { 
  Search, 
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Eye,
  Ban,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const SearchTermsPanel = () => {
  const { data: searchTerms, isLoading } = useSearchTerms();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [selectedTerms, setSelectedTerms] = useState<Set<string>>(new Set());

  const filteredTerms = searchTerms?.filter((term) => {
    const matchesSearch = term.search_term.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterAction === "all" || term.ai_action === filterAction;
    return matchesSearch && matchesFilter;
  }) || [];

  const aiActionTerms = filteredTerms.filter(t => t.ai_action);
  const canApplyAll = aiActionTerms.length > 0;

  const getActionBadge = (action: SearchTerm['ai_action']) => {
    const config: Record<string, { icon: any; label: string; variant: "default" | "destructive" | "secondary" }> = {
      add_negative: { icon: Ban, label: "Add Negative", variant: "destructive" },
      increase_bid: { icon: TrendingUp, label: "Increase Bid", variant: "default" },
      decrease_bid: { icon: TrendingDown, label: "Decrease Bid", variant: "secondary" },
      monitor: { icon: Eye, label: "Monitor", variant: "secondary" },
    };

    if (!action) return null;
    const { icon: Icon, label, variant } = config[action];

    return (
      <Badge variant={variant} className="gap-1 whitespace-nowrap">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
  };

  const handleApplyAll = () => {
    toast.success(`Applying ${aiActionTerms.length} AI recommendations...`);
  };

  const handleToggleSelect = (term: string) => {
    const newSelected = new Set(selectedTerms);
    if (newSelected.has(term)) {
      newSelected.delete(term);
    } else {
      newSelected.add(term);
    }
    setSelectedTerms(newSelected);
  };

  const handleApplySelected = () => {
    if (selectedTerms.size === 0) {
      toast.error('No terms selected');
      return;
    }
    toast.success(`Applying ${selectedTerms.size} selected recommendations...`);
    setSelectedTerms(new Set());
  };

  return (
    <div className="space-y-6">
      {canApplyAll && (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {aiActionTerms.length} AI recommendations ready to apply
            </span>
            <Button size="sm" onClick={handleApplyAll}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Apply All Suggestions
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Search Terms Analysis</CardTitle>
              <CardDescription>
                {filteredTerms.length} search term{filteredTerms.length !== 1 ? 's' : ''} found
                {aiActionTerms.length > 0 && ` • ${aiActionTerms.length} with AI recommendations`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Terms</SelectItem>
                  <SelectItem value="add_negative">Add Negative</SelectItem>
                  <SelectItem value="increase_bid">Increase Bid</SelectItem>
                  <SelectItem value="decrease_bid">Decrease Bid</SelectItem>
                  <SelectItem value="monitor">Monitor</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search terms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTerms.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">
                {searchQuery || filterAction !== 'all' 
                  ? 'No search terms match your filters' 
                  : 'No search terms data available yet'}
              </p>
              {!searchQuery && filterAction === 'all' && (
                <p className="text-sm text-muted-foreground">
                  Search terms data will appear here after your campaigns collect more performance data.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {selectedTerms.size > 0 && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">
                    {selectedTerms.size} term{selectedTerms.size !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedTerms(new Set())}
                    >
                      Clear
                    </Button>
                    <Button size="sm" onClick={handleApplySelected}>
                      Apply Selected
                    </Button>
                  </div>
                </div>
              )}
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Search Term</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">ACoS</TableHead>
                    <TableHead>AI Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTerms.map((term) => (
                    <TableRow 
                      key={term.search_term}
                      className={term.ai_action ? 'bg-muted/30' : ''}
                    >
                      <TableCell>
                        {term.ai_action && (
                          <input
                            type="checkbox"
                            className="rounded border-border"
                            checked={selectedTerms.has(term.search_term)}
                            onChange={() => handleToggleSelect(term.search_term)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate">
                        {term.search_term}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(term.clicks)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(term.spend)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(term.sales)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {term.acos > 40 ? (
                            <AlertCircle className="h-3 w-3 text-destructive" />
                          ) : term.acos < 20 ? (
                            <TrendingDown className="h-3 w-3 text-success" />
                          ) : null}
                          {term.acos > 0 ? `${term.acos.toFixed(1)}%` : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionBadge(term.ai_action)}
                          {term.ai_reason && (
                            <span className="text-xs text-muted-foreground truncate max-w-xs">
                              {term.ai_reason}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
