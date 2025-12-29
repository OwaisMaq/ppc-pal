import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "@/components/DashboardShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CampaignWizard } from "@/components/campaigns/wizard";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { ArrowLeft, Wand2, Loader2 } from "lucide-react";

export default function CampaignBuilder() {
  const navigate = useNavigate();
  const { connections, loading: isLoading } = useAmazonConnections();
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");

  // Auto-select first connection
  useEffect(() => {
    if (connections?.length > 0 && !selectedProfileId) {
      setSelectedProfileId(connections[0].profile_id);
    }
  }, [connections, selectedProfileId]);

  const activeConnections = connections?.filter((c) => c.status === "active") || [];

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  if (activeConnections.length === 0) {
    return (
      <DashboardShell>
        <div className="max-w-2xl mx-auto py-8">
          <Card>
            <CardHeader>
              <CardTitle>No Amazon Account Connected</CardTitle>
              <CardDescription>
                Connect your Amazon Advertising account to create campaign sets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/settings")}>
                Go to Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="max-w-4xl mx-auto py-4 sm:py-8 px-4">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/campaigns")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wand2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">One-Click Campaign Builder</h1>
                <p className="text-muted-foreground">
                  Create a structured 4-campaign set with auto-harvesting
                </p>
              </div>
            </div>

            {activeConnections.length > 1 && (
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {activeConnections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.profile_id}>
                      {conn.profile_name || conn.profile_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Wizard */}
        {selectedProfileId && (
          <CampaignWizard
            profileId={selectedProfileId}
            onComplete={() => navigate("/campaigns")}
          />
        )}
      </div>
    </DashboardShell>
  );
}
