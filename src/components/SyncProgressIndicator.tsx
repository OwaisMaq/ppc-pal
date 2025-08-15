import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react"
import { useSyncProgress } from "@/hooks/useSyncProgress"

interface SyncProgressIndicatorProps {
  connectionId: string
}

export function SyncProgressIndicator({ connectionId }: SyncProgressIndicatorProps) {
  const { currentSync, loading, isRunning, progress, phase, error } = useSyncProgress(connectionId)

  if (loading) {
    return (
      <Card className="border-muted">
        <CardContent className="flex items-center gap-2 p-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Checking sync status...</span>
        </CardContent>
      </Card>
    )
  }

  if (!isRunning && !error) {
    return null
  }

  const getPhaseDisplay = (phase: string | null) => {
    switch (phase) {
      case 'starting':
        return 'Initializing sync...'
      case 'syncing_entities':
        return 'Syncing campaigns, ad groups, and keywords...'
      case 'syncing_performance':
        return 'Fetching performance data...'
      case 'complete':
        return 'Sync completed successfully!'
      case 'error':
        return 'Sync failed'
      default:
        return 'Syncing data...'
    }
  }

  const getStatusVariant = () => {
    if (error) return 'destructive'
    if (progress === 100) return 'default'
    return 'default'
  }

  return (
    <Card className="border-muted">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {error ? (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          ) : progress === 100 ? (
            <CheckCircle className="h-4 w-4 text-success" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          Data Sync in Progress
          <Badge variant={getStatusVariant()}>
            {error ? 'Failed' : progress === 100 ? 'Complete' : 'Running'}
          </Badge>
        </CardTitle>
        <CardDescription>
          {getPhaseDisplay(phase)}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {!error && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress}% complete</span>
              <span>{phase || 'Processing...'}</span>
            </div>
          </div>
        )}
        {error && (
          <div className="text-sm text-destructive">
            {typeof error === 'string' ? error : error.error || 'An error occurred during sync'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}