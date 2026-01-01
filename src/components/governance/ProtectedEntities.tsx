import React, { useState } from 'react';
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
import { ShieldCheck, Plus, X, Loader2, Target, Layers, Tag, Crosshair } from 'lucide-react';
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
      toast.success(`${name || 'Entity'} removed`);
    } catch {
      toast.error('Failed to remove protection');
    }
  };

  const getEntityIcon = (type: string) => {
    const config = ENTITY_TYPES.find((t) => t.value === type);
    const Icon = config?.icon || ShieldCheck;
    return <Icon className="h-3 w-3" />;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Protected Entities</span>
          <Badge variant="secondary" className="text-xs">{entities.length}</Badge>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Add
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
                Protect
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {entities.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          No protected entities — automation can modify all items
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {entities.map((entity) => (
            <Badge
              key={entity.id}
              variant="secondary"
              className="gap-1 pr-1 text-xs font-normal"
            >
              {getEntityIcon(entity.entity_type)}
              <span className="max-w-[120px] truncate">
                {entity.entity_name || entity.entity_id}
              </span>
              <button
                onClick={() => handleRemove(entity.id, entity.entity_name)}
                disabled={saving}
                className="ml-0.5 p-0.5 rounded hover:bg-muted-foreground/20 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
