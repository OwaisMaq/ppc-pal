import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateExperimentInput } from '@/hooks/useExperiments';

interface NewExperimentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateExperimentInput) => void;
  isCreating: boolean;
}

export const NewExperimentDialog: React.FC<NewExperimentDialogProps> = ({
  open, onOpenChange, onSubmit, isCreating
}) => {
  const [name, setName] = useState('');
  const [experimentType, setExperimentType] = useState('holdout');
  const [entityType, setEntityType] = useState('campaign');
  const [entityId, setEntityId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSubmit = () => {
    if (!name || !entityId || !startDate || !endDate) return;
    onSubmit({
      name,
      experimentType,
      entityId,
      entityType,
      treatmentStartDate: startDate,
      treatmentEndDate: endDate,
    });
    setName(''); setEntityId(''); setStartDate(''); setEndDate('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Incrementality Experiment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Experiment Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Brand Campaign Holdout Test" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={experimentType} onValueChange={setExperimentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="holdout">Holdout</SelectItem>
                  <SelectItem value="geo_split">Geo Split</SelectItem>
                  <SelectItem value="time_based">Time-Based</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="campaign">Campaign</SelectItem>
                  <SelectItem value="ad_group">Ad Group</SelectItem>
                  <SelectItem value="portfolio">Portfolio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Entity ID</Label>
            <Input value={entityId} onChange={e => setEntityId(e.target.value)} placeholder="Campaign or entity ID" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isCreating || !name || !entityId || !startDate || !endDate}>
            {isCreating ? 'Creating...' : 'Create Experiment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
