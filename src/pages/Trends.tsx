
import React from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import TrendsMetricsCard from '@/components/trends/TrendsMetricsCard';
import TrendsChart from '@/components/trends/TrendsChart';
import TrendsKeyMetrics from '@/components/trends/TrendsKeyMetrics';

const Trends = () => {
  const trendsData = [
    { name: "Jan", sales: 4000, spend: 2400, profit: 1600 },
    { name: "Feb", sales: 3000, spend: 1398, profit: 1602 },
    { name: "Mar", sales: 2000, spend: 9800, profit: -7800 },
    { name: "Apr", sales: 2780, spend: 3908, profit: -1128 },
    { name: "May", sales: 1890, spend: 4800, profit: -2910 },
    { name: "Jun", sales: 2390, spend: 3800, profit: -1410 },
    { name: "Jul", sales: 3490, spend: 4300, profit: -810 },
  ];

  const totalUsers = 1234;
  const newUserGrowth = 12;

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Trends & Insights</h1>

        <TrendsMetricsCard 
          totalUsers={totalUsers} 
          newUserGrowth={newUserGrowth} 
        />

        <TrendsChart data={trendsData} />

        <TrendsKeyMetrics />
      </div>
    </AuthenticatedLayout>
  );
};

export default Trends;
