import { useState } from "react";
import { Pencil, Plus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useASINs } from "@/hooks/useASINs";
import { useASINLabels } from "@/hooks/useASINLabels";

export const ASINLabelManager = () => {
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
      <Card>
        <CardHeader>
          <CardTitle>ASIN Labels</CardTitle>
          <CardDescription>Loading ASINs...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (asins.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ASIN Labels</CardTitle>
          <CardDescription>No ASINs found. Connect your Amazon account and sync data first.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ASIN Labels</CardTitle>
        <CardDescription>
          Set custom labels for your ASINs to make them easier to identify
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {asins.map((asinInfo) => {
          const isEditing = editingAsin === asinInfo.asin;
          const existingLabelId = asinInfo.label ? 
            labels.find(l => l.asin === asinInfo.asin)?.id : undefined;

          return (
            <div key={asinInfo.asin} className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {asinInfo.asin}
                  </Badge>
                </div>
                {isEditing ? (
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="Enter custom label..."
                      className="h-8"
                      onKeyPress={(e) => {
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
                      size="sm"
                      onClick={() => handleSaveLabel(asinInfo.asin, existingLabelId)}
                      className="h-8 w-8 p-0"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="mt-1">
                    {asinInfo.label ? (
                      <span className="text-sm text-muted-foreground">{asinInfo.label}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">No label set</span>
                    )}
                  </div>
                )}
              </div>
              {!isEditing && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditLabel(asinInfo.asin, asinInfo.label)}
                    className="h-8 w-8 p-0"
                  >
                    {asinInfo.label ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </Button>
                  {asinInfo.label && existingLabelId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteLabel(existingLabelId)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};