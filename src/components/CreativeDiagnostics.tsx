import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image, Video, FileImage, Download, RefreshCw, TrendingDown, Eye, Wand2, Check, X, AlertTriangle, Loader2 } from "lucide-react";
import { useCreativeDiagnostics, type CreativePerformance, type AdBreakdown } from "@/hooks/useCreativeDiagnostics";
import { useCreativeRecommendations } from "@/hooks/useCreativeRecommendations";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useSubscription } from "@/hooks/useSubscription";

interface CreativeDiagnosticsProps {
  dateFrom: string;
  dateTo: string;
}

const ASSET_TYPE_ICONS = {
  image: FileImage,
  video: Video,
  logo: Image,
  headline: FileImage
};

export const CreativeDiagnostics = ({ dateFrom, dateTo }: CreativeDiagnosticsProps) => {
  const { connections } = useAmazonConnections();
  const { subscription } = useSubscription();
  const {
    assets,
    adBreakdown,
    underperformers,
    loading,
    fetchAssets,
    fetchAdBreakdown,
    fetchUnderperformers,
    syncAssets,
    getAssetMetrics
  } = useCreativeDiagnostics();

  const [selectedProfile, setSelectedProfile] = useState<string>('');

  const {
    recommendations,
    loading: recsLoading,
    generating,
    generateRecommendations,
    applyRecommendation,
    dismissRecommendation,
    fetchRecommendations
  } = useCreativeRecommendations(selectedProfile);

  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<string>('impressions');
  const [selectedAsset, setSelectedAsset] = useState<CreativePerformance | null>(null);
  const [showUnderperformers, setShowUnderperformers] = useState(false);
  const [minImpressions, setMinImpressions] = useState<string>('1000');
  const [activeTab, setActiveTab] = useState<string>('assets');

  const isStarter = subscription?.plan_type === 'pro'; // Only pro tier for now

  useEffect(() => {
    if (connections.length > 0 && !selectedProfile) {
      setSelectedProfile(connections[0].profile_id!);
    }
  }, [connections, selectedProfile]);

  useEffect(() => {
    if (selectedProfile) {
      fetchAssets({
        profileId: selectedProfile,
        dateFrom,
        dateTo,
        type: selectedType,
        sort: selectedSort
      });
    }
  }, [selectedProfile, dateFrom, dateTo, selectedType, selectedSort, fetchAssets]);

  const handleViewAssetBreakdown = async (asset: CreativePerformance) => {
    setSelectedAsset(asset);
    if (asset.asset_id) {
      await fetchAdBreakdown({
        profileId: selectedProfile,
        assetId: asset.asset_id,
        dateFrom,
        dateTo
      });
    }
  };

  const handleShowUnderperformers = async () => {
    if (!selectedProfile) return;
    
    await fetchUnderperformers({
      profileId: selectedProfile,
      dateFrom,
      dateTo,
      metric: 'ctr',
      threshold: 10
    });
    
    setShowUnderperformers(true);
  };

  const handleSyncAssets = async () => {
    if (!selectedProfile) return;
    
    try {
      await syncAssets(selectedProfile);
      // Refresh assets after sync
      setTimeout(() => {
        fetchAssets({
          profileId: selectedProfile,
          dateFrom,
          dateTo,
          type: selectedType,
          sort: selectedSort
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to sync assets:', error);
    }
  };

  const formatCurrency = (micros: number) => {
    return `£${(micros / 1000000).toFixed(2)}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getAssetTypeIcon = (type: string) => {
    const IconComponent = ASSET_TYPE_ICONS[type as keyof typeof ASSET_TYPE_ICONS] || FileImage;
    return <IconComponent className="h-4 w-4" />;
  };

  const metrics = getAssetMetrics(assets);
  const displayAssets = showUnderperformers ? underperformers : assets.filter(asset => 
    asset.impressions >= parseInt(minImpressions)
  );

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5 text-brand-primary" />
            Creative Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <Select value={selectedProfile} onValueChange={setSelectedProfile}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select profile" />
              </SelectTrigger>
              <SelectContent>
                {connections.map((conn) => (
                  <SelectItem key={conn.profile_id} value={conn.profile_id!}>
                    {conn.profile_name || conn.profile_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Asset type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="logo">Logos</SelectItem>
                <SelectItem value="headline">Headlines</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedSort} onValueChange={setSelectedSort}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="impressions">Impressions</SelectItem>
                <SelectItem value="clicks">Clicks</SelectItem>
                <SelectItem value="cost_micros">Cost</SelectItem>
                <SelectItem value="sales_7d_micros">Sales</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Min impressions:</span>
              <Input
                type="number"
                value={minImpressions}
                onChange={(e) => setMinImpressions(e.target.value)}
                className="w-20"
              />
            </div>

            <Button onClick={handleSyncAssets} variant="outline" disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Assets
            </Button>

            <Button 
              onClick={handleShowUnderperformers} 
              variant={showUnderperformers ? "default" : "outline"}
              disabled={!isStarter}
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              Underperformers {!isStarter && "(Starter+)"}
            </Button>

            <Button variant="outline" disabled={!isStarter}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV {!isStarter && "(Starter+)"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Creative KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{metrics.totalAssets}</div>
            <p className="text-xs text-muted-foreground">Total Assets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{metrics.totalImpressions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Impressions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatPercentage(metrics.avgCtr)}</div>
            <p className="text-xs text-muted-foreground">Avg CTR</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">£{metrics.avgCpc.toFixed(3)}</div>
            <p className="text-xs text-muted-foreground">Avg CPC</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatPercentage(metrics.avgAcos)}</div>
            <p className="text-xs text-muted-foreground">Avg ACOS</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed View - Assets and Recommendations */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="assets">
            Assets ({displayAssets.length})
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-1">
            <Wand2 className="h-3.5 w-3.5" />
            Recommendations
            {recommendations.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {recommendations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  {showUnderperformers ? 'Underperforming' : 'Creative'} Assets 
                  ({displayAssets.length})
                </span>
                {showUnderperformers && (
                  <Button variant="outline" size="sm" onClick={() => setShowUnderperformers(false)}>
                    Show All
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {displayAssets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No assets found. Try syncing assets or adjusting filters.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Impressions</TableHead>
                      <TableHead>CTR</TableHead>
                      <TableHead>CPC</TableHead>
                      <TableHead>Conversions</TableHead>
                      <TableHead>ACOS</TableHead>
                      <TableHead>Video VTR</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayAssets.map((asset, index) => (
                      <TableRow key={asset.asset_id || index}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getAssetTypeIcon(asset.asset_id?.split('_')[0] || 'image')}
                            <span className="font-mono text-sm">
                              {asset.asset_id?.slice(-8) || asset.ad_id.slice(-8)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {asset.asset_id?.split('_')[0] || 'unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>{asset.impressions.toLocaleString()}</TableCell>
                        <TableCell>{formatPercentage(asset.ctr)}</TableCell>
                        <TableCell>£{asset.cpc.toFixed(3)}</TableCell>
                        <TableCell>{asset.conversions_7d}</TableCell>
                        <TableCell>{formatPercentage(asset.acos)}</TableCell>
                        <TableCell>
                          {asset.vtr_25 !== null ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-xs">
                                <span>25%:</span>
                                <Progress value={asset.vtr_25 || 0} className="w-12 h-1" />
                                <span>{formatPercentage(asset.vtr_25 || 0)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span>100%:</span>
                                <Progress value={asset.vtr_100 || 0} className="w-12 h-1" />
                                <span>{formatPercentage(asset.vtr_100 || 0)}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewAssetBreakdown(asset)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Used In
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>
                                  Asset Usage: {selectedAsset?.asset_id?.slice(-8) || 'N/A'}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                {adBreakdown.length === 0 ? (
                                  <div className="text-center py-8 text-muted-foreground">
                                    No ads found using this asset.
                                  </div>
                                ) : (
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Ad ID</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Campaign</TableHead>
                                        <TableHead>Impressions</TableHead>
                                        <TableHead>CTR</TableHead>
                                        <TableHead>CPC</TableHead>
                                        <TableHead>ACOS</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {adBreakdown.map((ad, index) => (
                                        <TableRow key={index}>
                                          <TableCell className="font-mono text-sm">
                                            {ad.ad_id.slice(-8)}
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant="secondary">{ad.role}</Badge>
                                          </TableCell>
                                          <TableCell className="font-mono text-sm">
                                            {ad.campaign_id?.slice(-8) || 'N/A'}
                                          </TableCell>
                                          <TableCell>{ad.impressions.toLocaleString()}</TableCell>
                                          <TableCell>{formatPercentage(ad.ctr)}</TableCell>
                                          <TableCell>£{ad.cpc.toFixed(3)}</TableCell>
                                          <TableCell>{formatPercentage(ad.acos)}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-brand-primary" />
                  AI Creative Recommendations
                </div>
                <Button 
                  onClick={() => generateRecommendations()}
                  disabled={generating || !selectedProfile}
                  size="sm"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Recommendations
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : recommendations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recommendations yet.</p>
                  <p className="text-sm mt-2">Click "Generate Recommendations" to analyze your creatives.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Impact</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recommendations.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="font-mono text-sm">
                          {rec.asset_id.slice(-8)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={rec.recommendation_type === 'pause' ? 'destructive' : 'secondary'}
                          >
                            {rec.recommendation_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm truncate">{rec.reason}</p>
                        </TableCell>
                        <TableCell>
                          <Progress 
                            value={rec.confidence * 100} 
                            className="w-16 h-2"
                          />
                          <span className="text-xs text-muted-foreground">
                            {(rec.confidence * 100).toFixed(0)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              rec.impact_estimate === 'high' ? 'destructive' : 
                              rec.impact_estimate === 'medium' ? 'default' : 'secondary'
                            }
                          >
                            {rec.impact_estimate || 'medium'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => applyRecommendation(rec.id)}
                              className="h-8"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Apply
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => dismissRecommendation(rec.id)}
                              className="h-8"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};