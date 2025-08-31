import React, { useMemo } from "react";
import { useReactTable, getCoreRowModel, getSortedRowModel, createColumnHelper, flexRender, SortingState } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardTableRow } from "@/hooks/useDashboardData";

interface DashboardTableProps {
  data: { rows: DashboardTableRow[]; duration_ms?: number } | null;
  loading: boolean;
  error: string | null;
  level: 'campaign' | 'ad_group' | 'target' | 'search_term' | 'placement';
  onRowClick?: (row: DashboardTableRow) => void;
}

const columnHelper = createColumnHelper<DashboardTableRow>();

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
const formatNumber = (value: number) => value.toLocaleString();
const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

export const DashboardTable: React.FC<DashboardTableProps> = ({
  data,
  loading,
  error,
  level,
  onRowClick
}) => {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'spend', desc: true }
  ]);

  const columns = useMemo(() => [
    columnHelper.accessor('name', {
      id: 'name',
      header: level === 'campaign' ? 'Campaign' : 
             level === 'ad_group' ? 'Ad Group' :
             level === 'target' ? 'Target' : 'Name',
      cell: (info) => (
        <div className="font-medium max-w-[200px] truncate" title={info.getValue()}>
          {info.getValue()}
        </div>
      ),
      enableSorting: true,
    }),
    columnHelper.accessor('clicks', {
      id: 'clicks',
      header: 'Clicks',
      cell: (info) => formatNumber(info.getValue()),
      enableSorting: true,
    }),
    columnHelper.accessor('impressions', {
      id: 'impressions',
      header: 'Impressions',
      cell: (info) => formatNumber(info.getValue()),
      enableSorting: true,
    }),
    columnHelper.accessor('spend', {
      id: 'spend',
      header: 'Spend',
      cell: (info) => formatCurrency(info.getValue()),
      enableSorting: true,
    }),
    columnHelper.accessor('sales', {
      id: 'sales',
      header: 'Sales',
      cell: (info) => formatCurrency(info.getValue()),
      enableSorting: true,
    }),
    columnHelper.accessor('acos', {
      id: 'acos',
      header: 'ACOS',
      cell: (info) => formatPercentage(info.getValue()),
      enableSorting: true,
    }),
    columnHelper.accessor('roas', {
      id: 'roas',
      header: 'ROAS',
      cell: (info) => info.getValue().toFixed(2),
      enableSorting: true,
    }),
    columnHelper.accessor('cpc', {
      id: 'cpc',
      header: 'CPC',
      cell: (info) => formatCurrency(info.getValue()),
      enableSorting: true,
    }),
    columnHelper.accessor('ctr', {
      id: 'ctr',
      header: 'CTR',
      cell: (info) => formatPercentage(info.getValue()),
      enableSorting: true,
    }),
    columnHelper.accessor('cvr', {
      id: 'cvr',
      header: 'CVR',
      cell: (info) => formatPercentage(info.getValue()),
      enableSorting: true,
    }),
  ], [level]);

  const table = useReactTable({
    data: data?.rows || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  const handleExportCSV = () => {
    if (!data?.rows) return;

    const headers = columns.map(col => col.header?.toString() || '').join(',');
    const rows = data.rows.map(row => 
      columns.map(col => {
        const value = row[col.id as keyof DashboardTableRow];
        return typeof value === 'string' ? `"${value}"` : value;
      }).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${level}-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
        <p className="text-destructive text-sm">Error loading table data: {error}</p>
      </div>
    );
  }

  if (!data?.rows || data.rows.length === 0) {
    return (
      <div className="p-8 text-center bg-muted/50 border rounded-lg">
        <p className="text-muted-foreground">
          No data available for the selected period and filters.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Try expanding your date range or running a data backfill.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {level.charAt(0).toUpperCase() + level.slice(1)} Performance
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="bg-muted/50">
                    {header.isPlaceholder ? null : (
                      <div
                        className={header.column.getCanSort() ? "flex items-center space-x-2 cursor-pointer select-none" : ""}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <div className="flex flex-col">
                            <ChevronUp className={`h-3 w-3 ${
                              header.column.getIsSorted() === 'asc' ? 'text-foreground' : 'text-muted-foreground'
                            }`} />
                            <ChevronDown className={`h-3 w-3 ${
                              header.column.getIsSorted() === 'desc' ? 'text-foreground' : 'text-muted-foreground'
                            }`} />
                          </div>
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow 
                key={row.id}
                className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <p>Showing {data.rows.length} entries</p>
        {data.duration_ms && (
          <p>Query time: {data.duration_ms}ms</p>
        )}
      </div>
    </div>
  );
};