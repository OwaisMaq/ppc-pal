import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AttributionWindow } from '@/lib/amazon/types';

interface AttributionWindowSelectorProps {
  value: AttributionWindow;
  onChange: (value: AttributionWindow) => void;
  className?: string;
}

export const AttributionWindowSelector: React.FC<AttributionWindowSelectorProps> = ({
  value,
  onChange,
  className = ""
}) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`w-48 ${className}`}>
        <SelectValue placeholder="Select attribution window" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7d">7-Day Attribution</SelectItem>
        <SelectItem value="14d">14-Day Attribution</SelectItem>
      </SelectContent>
    </Select>
  );
};