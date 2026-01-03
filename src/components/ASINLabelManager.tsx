import { useState } from "react";
import { Pencil, Plus, X, Check, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useASINs } from "@/hooks/useASINs";
import { useASINLabels } from "@/hooks/useASINLabels";

interface ASINLabelManagerProps {
  showEmptyState?: boolean;
}

export const ASINLabelManager = ({ showEmptyState = true }: ASINLabelManagerProps) => {
  const { asins, loading: asinsLoading } = useASINs();
  const { labels, createLabel, updateLabel, deleteLabel } = useASINLabels();
  const [editingAsin, setEditingAsin] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");

  const handleSaveLabel = async (asin: string, existingLabelId?: string) => {
    if (!newLabel.trim()) return;

    if (existingLabelId) {
      await updateLabel(existingLabelId, newLabel.trim());
    } else {
      await createLabel(asin, newLabel.trim());
    }

    setEditingAsin(null);
    setNewLabel("");
  };

  const handleEditLabel = (asin: string, currentLabel?: string) => {
    setEditingAsin(asin);
    setNewLabel(currentLabel || "");
  };

  const handleCancelEdit = () => {
    setEditingAsin(null);
    setNewLabel("");
  };

  if (asinsLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (asins.length === 0) {
    if (!showEmptyState) return null;
    return (
      <p className="text-sm text-muted-foreground">
        No products detected. Connect your Amazon account and sync data first.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-3">
        Set custom labels for your products to make them easier to identify
      </p>
      {asins.map((asinInfo) => {
        const isEditing = editingAsin === asinInfo.asin;
        const existingLabelId = asinInfo.label ? 
          labels.find(l => l.asin === asinInfo.asin)?.id : undefined;

        return (
          <div 
            key={asinInfo.asin} 
            className="flex items-center gap-3 p-2.5 border border-border rounded-md bg-muted/30"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-muted-foreground">
                  {asinInfo.asin}
                </code>
                {asinInfo.label && !isEditing && (
                  <Badge variant="secondary" className="text-xs truncate max-w-[150px]">
                    {asinInfo.label}
                  </Badge>
                )}
              </div>
              {isEditing && (
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Enter custom label..."
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveLabel(asinInfo.asin, existingLabelId);
                      }
                      if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleSaveLabel(asinInfo.asin, existingLabelId)}
                    className="h-7 w-7"
                  >
                    <Check className="h-3.5 w-3.5 text-success" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    className="h-7 w-7"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
            {!isEditing && (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEditLabel(asinInfo.asin, asinInfo.label)}
                  className="h-7 text-xs px-2"
                >
                  {asinInfo.label ? <Pencil className="h-3.5 w-3.5" /> : "Add label"}
                </Button>
                {asinInfo.label && existingLabelId && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteLabel(existingLabelId)}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
