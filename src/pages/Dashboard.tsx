
import React from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';

const Dashboard = () => {
  return (
    <AuthenticatedLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome to your dashboard.
          </p>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default Dashboard;
