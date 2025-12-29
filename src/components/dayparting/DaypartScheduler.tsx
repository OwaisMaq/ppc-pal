import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DaypartGrid } from './DaypartGrid';
import { 
  useDayparting, 
  DaypartSchedule, 
  DaypartSlot,
  generateDefaultSchedule,
  generateBusinessHoursSchedule,
  generatePeakHoursSchedule
} from '@/hooks/useDayparting';
import { Clock, Plus, Trash2, Loader2, Calendar, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface Campaign {
  campaign_id: string;
  campaign_name: string;
  status: string;
}

interface DaypartSchedulerProps {
  profileId: string;
  campaigns: Campaign[];
}

type ScheduleTemplate = 'custom' | 'always_on' | 'business_hours' | 'peak_hours';

export const DaypartScheduler = ({ profileId, campaigns }: DaypartSchedulerProps) => {
  const { 
    schedules, 
    loading, 
    saveSchedule, 
    toggleSchedule, 
    deleteSchedule,
    isSaving 
  } = useDayparting(profileId);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplate>('business_hours');
  const [editingSchedule, setEditingSchedule] = useState<DaypartSlot[]>(generateBusinessHoursSchedule());
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  // Get campaigns without schedules
  const availableCampaigns = campaigns.filter(
    c => !schedules.some(s => s.campaign_id === c.campaign_id)
  );

  const handleTemplateChange = (template: ScheduleTemplate) => {
    setSelectedTemplate(template);
    switch (template) {
      case 'always_on':
        setEditingSchedule(generateDefaultSchedule());
        break;
      case 'business_hours':
        setEditingSchedule(generateBusinessHoursSchedule());
        break;
      case 'peak_hours':
        setEditingSchedule(generatePeakHoursSchedule());
        break;
      default:
        // Keep current for custom
        break;
    }
  };

  const handleSave = async () => {
    if (!selectedCampaign && !editingScheduleId) return;

    const campaign = campaigns.find(c => c.campaign_id === selectedCampaign);
    
    await saveSchedule({
      campaignId: editingScheduleId 
        ? schedules.find(s => s.id === editingScheduleId)?.campaign_id || selectedCampaign
        : selectedCampaign,
      campaignName: campaign?.campaign_name,
      schedule: editingSchedule,
      enabled: true,
    });

    setIsDialogOpen(false);
    setSelectedCampaign('');
    setEditingScheduleId(null);
    setEditingSchedule(generateBusinessHoursSchedule());
  };

  const handleEdit = (schedule: DaypartSchedule) => {
    setEditingScheduleId(schedule.id);
    setEditingSchedule(schedule.schedule);
    setSelectedTemplate('custom');
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingScheduleId(null);
    setSelectedCampaign('');
    setSelectedTemplate('business_hours');
    setEditingSchedule(generateBusinessHoursSchedule());
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Dayparting Schedules
          </h3>
          <p className="text-sm text-muted-foreground">
            Automatically pause or adjust bids based on time of day
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} disabled={availableCampaigns.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {editingScheduleId ? 'Edit Daypart Schedule' : 'Create Daypart Schedule'}
              </DialogTitle>
              <DialogDescription>
                Set when your campaign should be active. Click or drag to toggle hours.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Campaign selector (only for new) */}
              {!editingScheduleId && (
                <div className="space-y-2">
                  <Label>Campaign</Label>
                  <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCampaigns.map(c => (
                        <SelectItem key={c.campaign_id} value={c.campaign_id}>
                          {c.campaign_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Template selector */}
              <div className="space-y-2">
                <Label>Start from template</Label>
                <Select value={selectedTemplate} onValueChange={(v) => handleTemplateChange(v as ScheduleTemplate)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always_on">Always On (24/7)</SelectItem>
                    <SelectItem value="business_hours">Business Hours (8am-10pm)</SelectItem>
                    <SelectItem value="peak_hours">Peak Hours (+30% at peak times)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Grid */}
              <div className="border rounded-lg p-4">
                <DaypartGrid 
                  schedule={editingSchedule} 
                  onChange={setEditingSchedule} 
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={(!selectedCampaign && !editingScheduleId) || isSaving}
                >
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Schedule
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Existing schedules */}
      {schedules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No dayparting schedules configured
            </p>
            <Button variant="outline" onClick={openNewDialog} disabled={availableCampaigns.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first schedule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {schedules.map(schedule => {
            const campaign = campaigns.find(c => c.campaign_id === schedule.campaign_id);
            const enabledHours = schedule.schedule.filter(s => s.enabled).length;
            const totalHours = 24 * 7;
            const coverage = Math.round((enabledHours / totalHours) * 100);

            return (
              <Card key={schedule.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={schedule.enabled}
                        onCheckedChange={(enabled) => toggleSchedule({ scheduleId: schedule.id, enabled })}
                      />
                      <div>
                        <CardTitle className="text-base">
                          {campaign?.campaign_name || schedule.campaign_id}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {coverage}% coverage
                          </Badge>
                          {schedule.last_applied_at && (
                            <span className="text-xs">
                              Last run: {format(new Date(schedule.last_applied_at), 'MMM d, h:mm a')}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(schedule)}>
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive"
                        onClick={() => deleteSchedule(schedule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <DaypartGrid schedule={schedule.schedule} onChange={() => {}} readOnly />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
