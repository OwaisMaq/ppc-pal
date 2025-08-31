import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePlaybooks } from '@/hooks/usePlaybooks';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import { Play, Pause, Plus, Settings, Clock, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export const PlaybooksPage = () => {
  const { connections } = useAmazonConnections();
  const { 
    templates, 
    playbooks, 
    runs, 
    loading, 
    createPlaybook, 
    runPlaybook, 
    togglePlaybook, 
    fetchRuns,
    deletePlaybook 
  } = usePlaybooks();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [newPlaybook, setNewPlaybook] = useState({
    name: '',
    description: '',
    params: {} as any,
    mode: 'dry_run' as 'dry_run' | 'auto'
  });
  const [selectedProfile, setSelectedProfile] = useState<string>('');

  useEffect(() => {
    if (connections.length > 0 && !selectedProfile) {
      setSelectedProfile(connections[0].profile_id);
    }
  }, [connections, selectedProfile]);

  const handleCreatePlaybook = async () => {
    if (!selectedTemplate) return;

    const template = templates.find(t => t.key === selectedTemplate);
    if (!template) return;

    try {
      await createPlaybook({
        name: newPlaybook.name,
        description: newPlaybook.description,
        templateKey: selectedTemplate,
        params: newPlaybook.params,
        mode: newPlaybook.mode
      });

      setShowCreateDialog(false);
      setNewPlaybook({ name: '', description: '', params: {}, mode: 'dry_run' });
      setSelectedTemplate('');
    } catch (error) {
      console.error('Failed to create playbook:', error);
    }
  };

  const handleRunPlaybook = async (playbookId: string, mode: 'dry_run' | 'auto') => {
    if (!selectedProfile) return;

    try {
      await runPlaybook(playbookId, selectedProfile, mode);
      fetchRuns(playbookId);
    } catch (error) {
      console.error('Failed to run playbook:', error);
    }
  };

  const handleParamChange = (paramKey: string, value: any) => {
    setNewPlaybook(prev => ({
      ...prev,
      params: {
        ...prev.params,
        [paramKey]: value
      }
    }));
  };

  const renderParamInput = (paramKey: string, defaultValue: any) => {
    const value = newPlaybook.params[paramKey] ?? defaultValue;

    if (typeof defaultValue === 'boolean') {
      return (
        <div className="flex items-center space-x-2">
          <Switch
            checked={value}
            onCheckedChange={(checked) => handleParamChange(paramKey, checked)}
          />
          <Label>{paramKey}</Label>
        </div>
      );
    }

    if (typeof defaultValue === 'number') {
      return (
        <div>
          <Label htmlFor={paramKey}>{paramKey}</Label>
          <Input
            id={paramKey}
            type="number"
            value={value}
            onChange={(e) => handleParamChange(paramKey, parseFloat(e.target.value) || 0)}
          />
        </div>
      );
    }

    return (
      <div>
        <Label htmlFor={paramKey}>{paramKey}</Label>
        <Input
          id={paramKey}
          value={value}
          onChange={(e) => handleParamChange(paramKey, e.target.value)}
        />
      </div>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Playbooks</h1>
        <div className="flex items-center gap-4">
          <Select value={selectedProfile} onValueChange={setSelectedProfile}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select profile" />
            </SelectTrigger>
            <SelectContent>
              {connections.map(conn => (
                <SelectItem key={conn.id} value={conn.profile_id}>
                  {conn.profile_name || conn.profile_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Playbook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Playbook</DialogTitle>
                <DialogDescription>
                  Choose a template and configure parameters for your automated playbook.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="template">Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.key} value={template.key}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplate && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {templates.find(t => t.key === selectedTemplate)?.description}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newPlaybook.name}
                    onChange={(e) => setNewPlaybook(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter playbook name"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newPlaybook.description}
                    onChange={(e) => setNewPlaybook(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter playbook description"
                  />
                </div>

                <div>
                  <Label htmlFor="mode">Mode</Label>
                  <Select value={newPlaybook.mode} onValueChange={(value: 'dry_run' | 'auto') => setNewPlaybook(prev => ({ ...prev, mode: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dry_run">Dry Run (Preview Only)</SelectItem>
                      <SelectItem value="auto">Auto Apply</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedTemplate && (
                  <div className="space-y-3">
                    <Label>Parameters</Label>
                    {Object.entries(templates.find(t => t.key === selectedTemplate)?.defaultParams || {}).map(([key, defaultValue]) => (
                      <div key={key}>
                        {renderParamInput(key, defaultValue)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePlaybook} disabled={!selectedTemplate || !newPlaybook.name}>
                  Create Playbook
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="playbooks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
          <TabsTrigger value="runs">Recent Runs</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="playbooks" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading playbooks...</div>
          ) : playbooks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground">
                  No playbooks created yet. Click "Create Playbook" to get started.
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {playbooks.map((playbook) => (
                <Card key={playbook.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{playbook.name}</h3>
                          <Badge variant={playbook.mode === 'auto' ? 'default' : 'secondary'}>
                            {playbook.mode}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{playbook.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Template: {playbook.template_key}</span>
                          <span>•</span>
                          <span>Created: {format(new Date(playbook.created_at), 'MMM d, yyyy')}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={playbook.enabled}
                          onCheckedChange={(enabled) => togglePlaybook(playbook.id, enabled)}
                        />
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRunPlaybook(playbook.id, 'dry_run')}
                          disabled={!selectedProfile}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Test Run
                        </Button>

                        {playbook.mode === 'auto' && (
                          <Button
                            size="sm"
                            onClick={() => handleRunPlaybook(playbook.id, 'auto')}
                            disabled={!selectedProfile}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Run
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deletePlaybook(playbook.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="runs" className="space-y-4">
          {runs.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground">
                  No playbook runs yet.
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <Card key={run.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(run.status)}
                          <span className="font-medium">
                            {playbooks.find(p => p.id === run.playbook_id)?.name || 'Unknown Playbook'}
                          </span>
                          <Badge variant="outline">{run.profile_id}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Started: {format(new Date(run.started_at), 'MMM d, yyyy HH:mm')}
                          {run.finished_at && (
                            <span> • Duration: {Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s</span>
                          )}
                        </div>
                        {run.error && (
                          <div className="text-sm text-red-600">{run.error}</div>
                        )}
                      </div>

                      <div className="text-right text-sm">
                        <div>Actions: {run.actions_enqueued}</div>
                        <div>Alerts: {run.alerts_created}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.key}>
                <CardHeader>
                  <CardTitle>{template.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{template.description}</p>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Default Parameters:</div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {Object.entries(template.defaultParams).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span>{key}:</span>
                          <span>{JSON.stringify(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};