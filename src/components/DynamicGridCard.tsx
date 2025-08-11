import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const generateGrid = (rows = 6, cols = 8) => {
  return Array.from({ length: rows }).map((_, r) =>
    Array.from({ length: cols }).map((_, c) => {
      // Simple heat formula
      const v = Math.sin((r + 1) * 0.8) * Math.cos((c + 1) * 0.6);
      return v;
    })
  );
};

const DynamicGridCard: React.FC = () => {
  const grid = generateGrid();

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Dynamic Performance Grid</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-8 gap-1">
          {grid.flatMap((row, ri) =>
            row.map((v, ci) => {
              const intensity = Math.round((Math.abs(v) * 60) + 20); // 20–80
              return (
                <div
                  key={`${ri}-${ci}`}
                  className="aspect-square rounded-md"
                  style={{
                    background: `hsl(var(--brand) / ${intensity}%)`,
                  }}
                  aria-hidden
                />
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DynamicGridCard;
