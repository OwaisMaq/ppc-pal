
import React, { useState } from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, TrendingUp, TrendingDown, Minus, Eye, Download } from 'lucide-react';

const mockOptimizationLogs = [
  {
    id: 1,
    timestamp: '2024-06-21 09:15:00',
    campaignName: 'Summer Collection 2024',
    actionType: 'Bid Adjustment',
    keyword: 'wireless headphones',
    oldValue: '$2.50',
    newValue: '$3.20',
    reason: 'High conversion rate, low ACOS - increased bid for more visibility',
    impact: 'positive',
    estimatedImpact: '+$45.20',
    status: 'applied'
  },
  {
    id: 2,
    timestamp: '2024-06-21 08:45:00',
    campaignName: 'Electronics Bestsellers',
    actionType: 'Negative Keyword',
    keyword: 'cheap wireless headphones',
    oldValue: 'Active',
    newValue: 'Negative',
    reason: 'Low quality traffic, high click cost with no conversions',
    impact: 'positive',
    estimatedImpact: '+$23.40',
    status: 'applied'
  },
  {
    id: 3,
    timestamp: '2024-06-21 08:30:00',
    campaignName: 'Tech Accessories',
    actionType: 'Bid Adjustment',
    keyword: 'bluetooth speakers',
    oldValue: '$1.80',
    newValue: '$1.35',
    reason: 'ACOS above target threshold - reduced bid to improve profitability',
    impact: 'neutral',
    estimatedImpact: '-$12.10',
    status: 'applied'
  },
  {
    id: 4,
    timestamp: '2024-06-21 07:20:00',
    campaignName: 'Mobile Accessories',
    actionType: 'Match Type Change',
    keyword: 'phone case',
    oldValue: 'Broad',
    newValue: 'Phrase',
    reason: 'Too much irrelevant traffic - tightened match type for better targeting',
    impact: 'positive',
    estimatedImpact: '+$18.60',
    status: 'applied'
  },
  {
    id: 5,
    timestamp: '2024-06-20 16:45:00',
    campaignName: 'Gaming Setup',
    actionType: 'Budget Adjustment',
    keyword: 'N/A',
    oldValue: '$150.00',
    newValue: '$200.00',
    reason: 'Campaign hitting budget cap early - increased to capture more opportunities',
    impact: 'positive',
    estimatedImpact: '+$125.80',
    status: 'pending'
  },
  {
    id: 6,
    timestamp: '2024-06-20 14:30:00',
    campaignName: 'Home Audio',
    actionType: 'Keyword Addition',
    keyword: 'smart speakers alexa',
    oldValue: 'N/A',
    newValue: '$2.10',
    reason: 'High search volume keyword with good relevance - added to capture traffic',
    impact: 'positive',
    estimatedImpact: '+$67.30',
    status: 'applied'
  }
];

const OptimizationLogs = () => {
  const [filter, setFilter] = useState('all');

  const filteredLogs = mockOptimizationLogs.filter(log => {
    if (filter === 'all') return true;
    return log.status === filter;
  });

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied':
        return <Badge variant="default" className="bg-green-100 text-green-800">Applied</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            Optimisation Logs
          </h1>
          <p className="text-gray-600">
            View detailed logs of all optimization activities and their impact on campaign performance
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Optimizations</p>
                  <p className="text-2xl font-bold">147</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">This Week</p>
                  <p className="text-2xl font-bold">23</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Estimated Savings</p>
                  <p className="text-2xl font-bold text-green-600">$2,847</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold">94%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Optimizations</CardTitle>
                <CardDescription>
                  Track all optimization changes and their impacts on campaign performance
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={filter} onValueChange={setFilter} className="mb-4">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="applied">Applied</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Keyword/Target</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {log.timestamp}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.campaignName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.actionType}</Badge>
                      </TableCell>
                      <TableCell>{log.keyword}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="text-gray-500">{log.oldValue}</span>
                          <span className="mx-2">→</span>
                          <span className="font-medium">{log.newValue}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getImpactIcon(log.impact)}
                          <span className={`text-sm font-medium ${
                            log.impact === 'positive' ? 'text-green-600' : 
                            log.impact === 'negative' ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {log.estimatedImpact}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(log.status)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
};

export default OptimizationLogs;
