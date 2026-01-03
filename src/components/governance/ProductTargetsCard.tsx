import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, X, Check } from "lucide-react";
import { useProductGovernance } from "@/hooks/useProductGovernance";
import { useASINs } from "@/hooks/useASINs";
import { useASINLabels } from "@/hooks/useASINLabels";

interface ProductTargetsCardProps {
  profileId: string;
  globalTargetAcos: number;
}

export const ProductTargetsCard = ({ profileId, globalTargetAcos }: ProductTargetsCardProps) => {
  const { asins, loading: asinsLoading } = useASINs();
  const { labels } = useASINLabels();
  const { targets, loading, saving, upsertTarget, deleteTarget } = useProductGovernance(profileId);
  const [editingAsin, setEditingAsin] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const getLabel = (asin: string) => labels.find(l => l.asin === asin)?.label;
  const getTarget = (asin: string) => targets.find(t => t.asin === asin)?.target_acos;

  const handleEdit = (asin: string) => {
    const current = getTarget(asin);
    setEditingAsin(asin);
    setEditValue(current?.toString() ?? "");
  };

  const handleSave = async (asin: string) => {
    const value = editValue.trim() === "" ? null : parseFloat(editValue);
    if (value !== null && (isNaN(value) || value < 0 || value > 100)) return;
    await upsertTarget(asin, value);
    setEditingAsin(null);
    setEditValue("");
  };

  const handleClear = async (asin: string) => {
    await deleteTarget(asin);
  };

  if (asinsLoading || loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Product Targets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (asins.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Product Targets
          </CardTitle>
          <CardDescription>
            No products detected. Sync your Amazon data to see products.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-4 w-4" />
          Product Targets
        </CardTitle>
        <CardDescription>
          Set target ACOS per product. Leave blank to use the global target ({globalTargetAcos}%).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {asins.map(asinInfo => {
            const asin = asinInfo.asin;
            const label = getLabel(asin);
            const target = getTarget(asin);
            const isEditing = editingAsin === asin;

            return (
              <div
                key={asin}
                className="flex items-center justify-between gap-3 p-2 rounded-md border border-border bg-muted/30"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <code className="text-xs font-mono text-muted-foreground">{asin}</code>
                  {label && (
                    <Badge variant="secondary" className="text-xs truncate max-w-[120px]">
                      {label}
                    </Badge>
                  )}
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      placeholder={globalTargetAcos.toString()}
                      className="w-20 h-8 text-sm"
                      autoFocus
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleSave(asin)}
                      disabled={saving}
                    >
                      <Check className="h-3.5 w-3.5 text-success" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditingAsin(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {target !== undefined && target !== null ? (
                      <>
                        <Badge variant="outline" className="text-xs">
                          {target}% ACOS
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleClear(asin)}
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => handleEdit(asin)}
                      >
                        Set target
                      </Button>
                    )}
                    {target !== undefined && target !== null && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => handleEdit(asin)}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
