
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, Users } from 'lucide-react';

interface TrendsMetricsCardProps {
  totalUsers: number;
  newUserGrowth: number;
}

const TrendsMetricsCard = ({ totalUsers, newUserGrowth }: TrendsMetricsCardProps) => {
  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-500" />
          User Statistics
        </CardTitle>
        <Badge variant="secondary" className="rounded-md">
          Updated monthly
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{totalUsers}</div>
        <p className="text-sm text-gray-500">
          <ArrowUp className="h-4 w-4 text-green-500 inline-block mr-1 align-text-top" />
          {newUserGrowth}% new users this month
        </p>
      </CardContent>
    </Card>
  );
};

export default TrendsMetricsCard;
