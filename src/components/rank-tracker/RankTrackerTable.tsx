import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ReportIssueButton } from "@/components/ui/ReportIssueButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, TrendingUp, TrendingDown, Minus, ChevronRight, Search } from "lucide-react";
import { TrackedKeyword } from "@/hooks/useRankTracker";
import { formatDistanceToNow } from "date-fns";

interface RankTrackerTableProps {
  keywords: TrackedKeyword[];
  onRemove: (id: string) => void;
  onSelect: (keyword: TrackedKeyword) => void;
  selectedId: string | null;
  isRemoving: boolean;
}

export function RankTrackerTable({ 
  keywords, 
  onRemove, 
  onSelect, 
  selectedId,
  isRemoving 
}: RankTrackerTableProps) {
  const [search, setSearch] = useState("");
  const [asinFilter, setAsinFilter] = useState<string>("all");

  // Get unique ASINs for filter
  const uniqueAsins = Array.from(new Set(keywords.map(k => k.asin)));

  const filteredKeywords = keywords.filter((kw) => {
    const matchesSearch = kw.keyword.toLowerCase().includes(search.toLowerCase());
    const matchesAsin = asinFilter === "all" || kw.asin === asinFilter;
    return matchesSearch && matchesAsin;
  });

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-success" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendBadge = (trend: number) => {
    if (trend > 0) {
      return <Badge variant="outline" className="text-success border-success/30">↑ {Math.abs(trend)}</Badge>;
    }
    if (trend < 0) {
      return <Badge variant="outline" className="text-destructive border-destructive/30">↓ {Math.abs(trend)}</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground">—</Badge>;
  };

  const getRankDisplay = (rank: number | null) => {
    if (rank === null) return <span className="text-muted-foreground">—</span>;
    if (rank <= 3) return <span className="font-semibold text-success">{rank}</span>;
    if (rank <= 10) return <span className="font-medium text-primary">{rank}</span>;
    if (rank <= 20) return <span className="text-warning">{rank}</span>;
    return <span className="text-muted-foreground">{rank}</span>;
  };

  if (keywords.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No keywords being tracked yet.</p>
        <p className="text-sm">Add keywords to start monitoring their rank positions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <ReportIssueButton 
          featureId="rank_tracker" 
          featureLabel="Rank Tracker"
          variant="minimal"
        />
        <Select value={asinFilter} onValueChange={setAsinFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by ASIN" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ASINs</SelectItem>
            {uniqueAsins.map((asin) => (
              <SelectItem key={asin} value={asin}>{asin}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Keyword</TableHead>
              <TableHead>ASIN</TableHead>
              <TableHead className="text-center">Sponsored Rank</TableHead>
              <TableHead className="text-center">Organic Rank</TableHead>
              <TableHead className="text-center">Trend</TableHead>
              <TableHead>Last Checked</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredKeywords.map((kw) => (
              <TableRow 
                key={kw.id}
                className={selectedId === kw.id ? "bg-muted/50" : "cursor-pointer hover:bg-muted/30"}
                onClick={() => onSelect(kw)}
              >
                <TableCell className="font-medium">{kw.keyword}</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{kw.asin}</code>
                </TableCell>
                <TableCell className="text-center">
                  {getRankDisplay(kw.current_sponsored_rank)}
                </TableCell>
                <TableCell className="text-center">
                  {getRankDisplay(kw.current_organic_rank)}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {getTrendIcon(kw.rank_trend)}
                    {getTrendBadge(kw.rank_trend)}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {kw.last_checked_at 
                    ? formatDistanceToNow(new Date(kw.last_checked_at), { addSuffix: true })
                    : "Never"
                  }
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(kw.id);
                      }}
                      disabled={isRemoving}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        Tracking {filteredKeywords.length} of {keywords.length} keywords
      </p>
    </div>
  );
}
