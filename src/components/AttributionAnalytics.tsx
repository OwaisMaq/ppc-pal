import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Download, RotateCcw, Play } from "lucide-react";
import { useAttribution } from "@/hooks/useAttribution";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useSubscription } from "@/hooks/useSubscription";
import { formatDistanceToNow } from "date-fns";

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface AttributionAnalyticsProps {
  dateFrom: string;
  dateTo: string;
}

export const AttributionAnalytics = ({ dateFrom, dateTo }: AttributionAnalyticsProps) => {
  const { connections } = useAmazonConnections();
  const { subscription } = useSubscription();
  const {
    conversionPaths,
    attributionResults,
    timeLagData,
    loading,
    getAvailableModels,
    fetchConversionPaths,
    fetchTimeLagData,
    runAttributionModel,
    fetchAttributionResults,
    runConversionPathIngestion
  } = useAttribution();

  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('last_click');
  const [selectedSource, setSelectedSource] = useState<string>('v3');
  const [availableModels, setAvailableModels] = useState<any[]>([]);

  const isPro = subscription?.plan_type === 'pro';
  const isStarter = subscription?.plan_type === 'pro'; // Only pro tier for now

  useEffect(() => {
    if (connections.length > 0 && !selectedProfile) {
      setSelectedProfile(connections[0].profile_id!);
    }
  }, [connections, selectedProfile]);

  useEffect(() => {
    const loadModels = async () => {
      const models = await getAvailableModels();
      setAvailableModels(models);
    };
    loadModels();
  }, [getAvailableModels]);

  useEffect(() => {
    if (selectedProfile) {
      fetchConversionPaths({
        profileId: selectedProfile,
        dateFrom,
        dateTo,
        source: selectedSource
      });
      
      fetchTimeLagData({
        profileId: selectedProfile,
        dateFrom,
        dateTo,
        source: selectedSource
      });
    }
  }, [selectedProfile, dateFrom, dateTo, selectedSource, fetchConversionPaths, fetchTimeLagData]);

  const handleRunModel = async () => {
    if (!selectedProfile) return;

    try {
      await runAttributionModel({
        profileId: selectedProfile,
        model: selectedModel,
        dateFrom,
        dateTo
      });

      // Fetch results after run completes
      setTimeout(() => {
        fetchAttributionResults({
          profileId: selectedProfile,
          dateFrom,
          dateTo,
          model: selectedModel
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to run attribution model:', error);
    }
  };

  const handleIngestPaths = async () => {
    try {
      await runConversionPathIngestion(selectedProfile);
      
      // Refresh paths after ingestion
      setTimeout(() => {
        if (selectedProfile) {
          fetchConversionPaths({
            profileId: selectedProfile,
            dateFrom,
            dateTo,
            source: selectedSource
          });
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to ingest conversion paths:', error);
    }
  };

  const formatCurrency = (micros: number) => {
    return `£${(micros / 1000000).toFixed(2)}`;
  };

  const formatPathSteps = (pathJson: any[]) => {
    return pathJson.map(step => `${step.type.toUpperCase()}(${step.interaction})`).join(' → ');
  };

  // Calculate KPIs from attribution results
  const attributionKpis = attributionResults.reduce((acc, result) => {
    acc.totalSales += result.sales_weighted_micros;
    acc.totalConversions += result.conversions_weighted;
    return acc;
  }, { totalSales: 0, totalConversions: 0 });

  // Prepare time lag chart data
  const timeLagChartData = timeLagData.map(bucket => ({
    bucket: bucket.bucket,
    conversions: bucket.conversions,
    sales: bucket.sales_micros / 1000000
  }));

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-primary" />
            Attribution Analytics
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

            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Attribution model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem 
                    key={model.id} 
                    value={model.id}
                    disabled={!model.free && !isStarter}
                  >
                    <div className="flex items-center gap-2">
                      {model.name}
                      {!model.free && !isStarter && (
                        <Badge variant="outline" className="text-xs">Pro</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="v3">v3</SelectItem>
                <SelectItem value="amc" disabled={!isPro}>
                  AMC {!isPro && "(Pro)"}
                </SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleRunModel} disabled={loading || !selectedProfile}>
              <Play className="h-4 w-4 mr-2" />
              Run Model
            </Button>

            <Button onClick={handleIngestPaths} variant="outline" disabled={loading}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Refresh Paths
            </Button>

            <Button variant="outline" disabled={!isStarter}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV {!isStarter && "(Starter+)"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attribution KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatCurrency(attributionKpis.totalSales)}
            </div>
            <p className="text-xs text-muted-foreground">Attributed Sales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {Math.round(attributionKpis.totalConversions)}
            </div>
            <p className="text-xs text-muted-foreground">Attributed Conversions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {conversionPaths.length}
            </div>
            <p className="text-xs text-muted-foreground">Unique Paths</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {conversionPaths.reduce((sum, path) => sum + path.touch_count, 0) / Math.max(conversionPaths.length, 1) || 0}
            </div>
            <p className="text-xs text-muted-foreground">Avg. Path Length</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="paths" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="paths">Top Paths</TabsTrigger>
          <TabsTrigger value="timelag">Time to Conversion</TabsTrigger>
          <TabsTrigger value="results">Attribution Results</TabsTrigger>
        </TabsList>

        <TabsContent value="paths" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Conversion Paths</CardTitle>
            </CardHeader>
            <CardContent>
              {conversionPaths.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No conversion paths found. Try running path ingestion first.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Path</TableHead>
                      <TableHead>Touches</TableHead>
                      <TableHead>Conversions</TableHead>
                      <TableHead>Sales</TableHead>
                      <TableHead>Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversionPaths.slice(0, 10).map((path, index) => {
                      const totalConversions = conversionPaths.reduce((sum, p) => sum + p.conversions, 0);
                      const share = totalConversions > 0 ? (path.conversions / totalConversions) * 100 : 0;
                      
                      return (
                        <TableRow key={path.path_fingerprint}>
                          <TableCell className="font-medium">
                            <div className="max-w-md truncate">
                              {formatPathSteps(path.path_json)}
                            </div>
                          </TableCell>
                          <TableCell>{path.touch_count}</TableCell>
                          <TableCell>{path.conversions}</TableCell>
                          <TableCell>{formatCurrency(path.sales_micros)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={share} className="w-16 h-2" />
                              <span className="text-sm">{share.toFixed(1)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timelag" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Time to Conversion</CardTitle>
            </CardHeader>
            <CardContent>
              {timeLagChartData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No time lag data available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timeLagChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [
                      name === 'conversions' ? value : formatCurrency(Number(value) * 1000000),
                      name === 'conversions' ? 'Conversions' : 'Sales'
                    ]} />
                    <Bar dataKey="conversions" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Attribution Results</CardTitle>
            </CardHeader>
            <CardContent>
              {attributionResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No attribution results. Run an attribution model first.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Level</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>Attributed Conversions</TableHead>
                      <TableHead>Attributed Sales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attributionResults.slice(0, 20).map((result, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge variant="outline">{result.level}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {result.campaign_id || result.ad_group_id || result.target_id || 'N/A'}
                        </TableCell>
                        <TableCell>{result.conversions_weighted.toFixed(2)}</TableCell>
                        <TableCell>{formatCurrency(result.sales_weighted_micros)}</TableCell>
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