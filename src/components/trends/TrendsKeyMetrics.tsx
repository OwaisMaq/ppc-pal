
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp } from 'lucide-react';

interface TrendsKeyMetricsProps {
  totalSales: number;
  totalSpend: number;
  totalProfit: number;
  totalOrders: number;
  salesChange: number;
  spendChange: number;
  profitChange: number;
  ordersChange: number;
}

const TrendsKeyMetrics = ({
  totalSales,
  totalSpend,
  totalProfit,
  totalOrders,
  salesChange,
  spendChange,
  profitChange,
  ordersChange
}: TrendsKeyMetricsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatChange = (value: number) => {
    const isPositive = value >= 0;
    const formattedValue = Math.abs(value).toFixed(1);
    
    return {
      value: formattedValue,
      isPositive,
      icon: isPositive ? ArrowUp : ArrowDown,
      color: isPositive ? 'text-green-600' : 'text-red-600',
      iconColor: isPositive ? 'text-green-500' : 'text-red-500'
    };
  };

  const salesChangeFormatted = formatChange(salesChange);
  const spendChangeFormatted = formatChange(spendChange);
  const profitChangeFormatted = formatChange(profitChange);
  const ordersChangeFormatted = formatChange(ordersChange);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">Total Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalSales)}</div>
          <p className={`text-sm font-medium ${salesChangeFormatted.color}`}>
            <salesChangeFormatted.icon className={`h-4 w-4 ${salesChangeFormatted.iconColor} inline-block mr-1 align-text-top`} />
            {salesChangeFormatted.value}% {salesChangeFormatted.isPositive ? 'increase' : 'decrease'} from last month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">Advertising Spend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalSpend)}</div>
          <p className={`text-sm font-medium ${spendChangeFormatted.color}`}>
            <spendChangeFormatted.icon className={`h-4 w-4 ${spendChangeFormatted.iconColor} inline-block mr-1 align-text-top`} />
            {spendChangeFormatted.value}% {spendChangeFormatted.isPositive ? 'increase' : 'decrease'} from last month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">Net Profit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalProfit)}</div>
          <p className={`text-sm font-medium ${profitChangeFormatted.color}`}>
            <profitChangeFormatted.icon className={`h-4 w-4 ${profitChangeFormatted.iconColor} inline-block mr-1 align-text-top`} />
            {profitChangeFormatted.value}% {profitChangeFormatted.isPositive ? 'increase' : 'decrease'} from last month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{totalOrders.toLocaleString()}</div>
          <p className={`text-sm font-medium ${ordersChangeFormatted.color}`}>
            <ordersChangeFormatted.icon className={`h-4 w-4 ${ordersChangeFormatted.iconColor} inline-block mr-1 align-text-top`} />
            {ordersChangeFormatted.value}% {ordersChangeFormatted.isPositive ? 'increase' : 'decrease'} from last month
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrendsKeyMetrics;
