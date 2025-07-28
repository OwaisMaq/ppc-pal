import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface AttributionWindow {
  window: '7d' | '14d';
  label: string;
}

interface AttributionWindowSelectorProps {
  selectedWindow: '7d' | '14d';
  onWindowChange: (window: '7d' | '14d') => void;
  attributionWindows: AttributionWindow[];
}

export const AttributionWindowSelector = ({
  selectedWindow,
  onWindowChange,
  attributionWindows
}: AttributionWindowSelectorProps) => {
  return (
    <div className="flex flex-col space-y-2">
      <Label htmlFor="attribution-window">Attribution Window</Label>
      <Select value={selectedWindow} onValueChange={onWindowChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select attribution window" />
        </SelectTrigger>
        <SelectContent>
          {attributionWindows.map((window) => (
            <SelectItem key={window.window} value={window.window}>
              {window.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};