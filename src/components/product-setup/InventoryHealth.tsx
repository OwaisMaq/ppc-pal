
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, TrendingUp, Package } from 'lucide-react';

interface InventoryItem {
  asin: string;
  productTitle: string;
  currentStock: number;
  reorderLevel: number;
  salesVelocity: number;
  daysOfInventory: number;
  status: 'healthy' | 'low' | 'critical' | 'out-of-stock';
}

const InventoryHealth = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('2 hours ago');
  
  const [inventory] = useState<InventoryItem[]>([
    {
      asin: 'B07XJ8C8F5',
      productTitle: 'Wireless Bluetooth Headphones',
      currentStock: 450,
      reorderLevel: 100,
      salesVelocity: 15,
      daysOfInventory: 30,
      status: 'healthy'
    },
    {
      asin: 'B08N5WRWNW',
      productTitle: 'Smart Fitness Tracker',
      currentStock: 75,
      reorderLevel: 100,
      salesVelocity: 12,
      daysOfInventory: 6,
      status: 'low'
    },
    {
      asin: 'B09JQVH9X2',
      productTitle: 'Portable Phone Charger',
      currentStock: 25,
      reorderLevel: 50,
      salesVelocity: 8,
      daysOfInventory: 3,
      status: 'critical'
    },
    {
      asin: 'B0BCTZTL1F',
      productTitle: 'LED Desk Lamp with USB',
      currentStock: 0,
      reorderLevel: 25,
      salesVelocity: 5,
      daysOfInventory: 0,
      status: 'out-of-stock'
    }
  ]);

  const handleRefreshInventory = async () => {
    setIsRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setIsRefreshing(false);
      setLastUpdated('Just now');
    }, 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'low':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'out-of-stock':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'healthy': 'default',
      'low': 'secondary',
      'critical': 'destructive',
      'out-of-stock': 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status.replace('-', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getStockProgress = (current: number, reorder: number) => {
    const maxStock = reorder * 3; // Assume healthy stock is 3x reorder level
    return Math.min((current / maxStock) * 100, 100);
  };

  const healthyCount = inventory.filter(item => item.status === 'healthy').length;
  const lowCount = inventory.filter(item => item.status === 'low').length;
  const criticalCount = inventory.filter(item => item.status === 'critical').length;
  const outOfStockCount = inventory.filter(item => item.status === 'out-of-stock').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Inventory Overview</h3>
          <p className="text-sm text-gray-500">Last updated: {lastUpdated}</p>
        </div>
        <Button 
          onClick={handleRefreshInventory} 
          disabled={isRefreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Healthy</p>
                <p className="text-2xl font-bold">{healthyCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Low Stock</p>
                <p className="text-2xl font-bold">{lowCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Critical</p>
                <p className="text-2xl font-bold">{criticalCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Out of Stock</p>
                <p className="text-2xl font-bold">{outOfStockCount}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Product Inventory Details
          </CardTitle>
          <CardDescription>
            Monitor stock levels and reorder points for all your products
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Stock Level</TableHead>
                  <TableHead>Sales/Day</TableHead>
                  <TableHead>Days Left</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => (
                  <TableRow key={item.asin}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.productTitle}</p>
                        <p className="text-sm text-gray-500 font-mono">{item.asin}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.currentStock.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Reorder: {item.reorderLevel}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress 
                          value={getStockProgress(item.currentStock, item.reorderLevel)} 
                          className="w-20 h-2"
                        />
                        <p className="text-xs text-gray-500">
                          {Math.round(getStockProgress(item.currentStock, item.reorderLevel))}%
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-gray-400" />
                        {item.salesVelocity}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        item.daysOfInventory <= 3 ? 'text-red-600' :
                        item.daysOfInventory <= 7 ? 'text-orange-600' :
                        item.daysOfInventory <= 14 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {item.daysOfInventory} days
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="px-8">
          Export Inventory Report
        </Button>
      </div>
    </div>
  );
};

export default InventoryHealth;
