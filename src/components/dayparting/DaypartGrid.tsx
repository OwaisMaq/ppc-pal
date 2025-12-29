import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { DaypartSlot } from '@/hooks/useDayparting';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DaypartGridProps {
  schedule: DaypartSlot[];
  onChange: (schedule: DaypartSlot[]) => void;
  readOnly?: boolean;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const DaypartGrid = ({ schedule, onChange, readOnly = false }: DaypartGridProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'enable' | 'disable' | null>(null);

  // Create a map for quick lookups
  const scheduleMap = useMemo(() => {
    const map = new Map<string, DaypartSlot>();
    schedule.forEach(slot => {
      map.set(`${slot.day}-${slot.hour}`, slot);
    });
    return map;
  }, [schedule]);

  const getSlot = (day: number, hour: number): DaypartSlot => {
    return scheduleMap.get(`${day}-${hour}`) || { day, hour, enabled: true, multiplier: 1.0 };
  };

  const toggleSlot = useCallback((day: number, hour: number, forceState?: boolean) => {
    if (readOnly) return;
    
    const newSchedule = schedule.map(slot => {
      if (slot.day === day && slot.hour === hour) {
        const newEnabled = forceState !== undefined ? forceState : !slot.enabled;
        return {
          ...slot,
          enabled: newEnabled,
          multiplier: newEnabled ? 1.0 : 0.01,
        };
      }
      return slot;
    });
    onChange(newSchedule);
  }, [schedule, onChange, readOnly]);

  const handleMouseDown = (day: number, hour: number) => {
    if (readOnly) return;
    setIsDragging(true);
    const slot = getSlot(day, hour);
    const newMode = slot.enabled ? 'disable' : 'enable';
    setDragMode(newMode);
    toggleSlot(day, hour, newMode === 'enable');
  };

  const handleMouseEnter = (day: number, hour: number) => {
    if (!isDragging || !dragMode || readOnly) return;
    toggleSlot(day, hour, dragMode === 'enable');
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragMode(null);
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12a';
    if (hour < 12) return `${hour}a`;
    if (hour === 12) return '12p';
    return `${hour - 12}p`;
  };

  const getSlotColor = (slot: DaypartSlot) => {
    if (!slot.enabled) return 'bg-muted';
    if (slot.multiplier >= 1.5) return 'bg-success';
    if (slot.multiplier >= 1.2) return 'bg-success/70';
    if (slot.multiplier >= 1.0) return 'bg-primary';
    if (slot.multiplier >= 0.5) return 'bg-warning';
    return 'bg-muted';
  };

  return (
    <TooltipProvider>
      <div 
        className="select-none"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Header with hours */}
        <div className="flex gap-px mb-1">
          <div className="w-12 flex-shrink-0" />
          {HOURS.map(hour => (
            <div 
              key={hour} 
              className={cn(
                "flex-1 text-center text-[10px] text-muted-foreground",
                hour % 3 === 0 ? "opacity-100" : "opacity-0"
              )}
            >
              {formatHour(hour)}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        {DAYS.map((dayName, dayIndex) => (
          <div key={dayIndex} className="flex gap-px mb-px">
            <div className="w-12 flex-shrink-0 text-xs text-muted-foreground flex items-center">
              {dayName}
            </div>
            {HOURS.map(hour => {
              const slot = getSlot(dayIndex, hour);
              return (
                <Tooltip key={`${dayIndex}-${hour}`}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "flex-1 h-6 rounded-sm cursor-pointer transition-colors",
                        getSlotColor(slot),
                        !readOnly && "hover:opacity-80",
                        readOnly && "cursor-default"
                      )}
                      onMouseDown={() => handleMouseDown(dayIndex, hour)}
                      onMouseEnter={() => handleMouseEnter(dayIndex, hour)}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-medium">{dayName} {formatHour(hour)}</p>
                    <p className="text-muted-foreground">
                      {slot.enabled 
                        ? `Active (${slot.multiplier.toFixed(1)}x bid)` 
                        : 'Paused'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-sm bg-primary" />
            <span>Active</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-sm bg-success" />
            <span>Peak (+20-50%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-sm bg-muted" />
            <span>Paused</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
