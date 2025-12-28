import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ShieldCheck, Plus, Trash2, Loader2, Target, Layers, Tag, Crosshair } from 'lucide-react';
import { ProtectedEntity } from '@/hooks/useGovernance';
import { toast } from 'sonner';

interface ProtectedEntitiesProps {
  entities: ProtectedEntity[];
  saving: boolean;
  onAdd: (
    entityType: ProtectedEntity['entity_type'],
    entityId: string,
    entityName?: string,
    reason?: string
  ) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

const ENTITY_TYPES = [
  { value: 'campaign', label: 'Campaign', icon: Layers },
  { value: 'ad_group', label: 'Ad Group', icon: Target },
  { value: 'keyword', label: 'Keyword', icon: Tag },
  { value: 'target', label: 'Target', icon: Crosshair },
] as const;

export function ProtectedEntities({
  entities,
  saving,
  onAdd,
  onRemove,
}: ProtectedEntitiesProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entityType, setEntityType] = useState<ProtectedEntity['entity_type']>('campaign');
  const [entityId, setEntityId] = useState('');
  const [entityName, setEntityName] = useState('');
  const [reason, setReason] = useState('');

  const handleAdd = async () => {
    if (!entityId.trim()) {
      toast.error('Entity ID is required');
      return;
    }

    try {
      await onAdd(entityType, entityId.trim(), entityName.trim() || undefined, reason.trim() || undefined);
      toast.success('Entity protected');
      setDialogOpen(false);
      setEntityId('');
      setEntityName('');
      setReason('');
    } catch {
      toast.error('Failed to protect entity');
    }
  };

  const handleRemove = async (id: string, name: string | null) => {
    try {
      await onRemove(id);
      toast.success(`${name || 'Entity'} is no longer protected`);
    } catch {
      toast.error('Failed to remove protection');
    }
  };

  const getEntityIcon = (type: string) => {
    const config = ENTITY_TYPES.find((t) => t.value === type);
    return config?.icon || ShieldCheck;
  };

  const getEntityLabel = (type: string) => {
    const config = ENTITY_TYPES.find((t) => t.value === type);
    return config?.label || type;
  };

  const groupedEntities = ENTITY_TYPES.map((type) => ({
    ...type,
    entities: entities.filter((e) => e.entity_type === type.value),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-brand-primary" />
            <div>
              <CardTitle>Protected Entities</CardTitle>
              <CardDescription>
                These campaigns, ad groups, keywords, and targets won't be modified by automation
              </CardDescription>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Protection
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Protect Entity</DialogTitle>
                <DialogDescription>
                  Add an entity that automation should never modify
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Entity Type</Label>
                  <Select value={entityType} onValueChange={(v) => setEntityType(v as ProtectedEntity['entity_type'])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTITY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entity-id">Entity ID *</Label>
                  <Input
                    id="entity-id"
                    placeholder="e.g., 123456789012345"
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    The Amazon ID for this {entityType.replace('_', ' ')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entity-name">Name (optional)</Label>
                  <Input
                    id="entity-name"
                    placeholder="e.g., Brand Defense Campaign"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (optional)</Label>
                  <Input
                    id="reason"
                    placeholder="e.g., Seasonal campaign with fixed bids"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={saving || !entityId.trim()}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Protect Entity
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {entities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No protected entities yet</p>
            <p className="text-xs mt-1">
              Add entities that automation should never modify
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedEntities
              .filter((group) => group.entities.length > 0)
              .map((group) => (
                <div key={group.value}>
                  <div className="flex items-center gap-2 mb-2">
                    <group.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{group.label}s</span>
                    <Badge variant="secondary" className="text-xs">
                      {group.entities.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {group.entities.map((entity) => (
                      <div
                        key={entity.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {entity.entity_name || entity.entity_id}
                          </p>
                          {entity.entity_name && (
                            <p className="text-xs text-muted-foreground truncate">
                              ID: {entity.entity_id}
                            </p>
                          )}
                          {entity.reason && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {entity.reason}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemove(entity.id, entity.entity_name)}
                          disabled={saving}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
