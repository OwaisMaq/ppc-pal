
import React from 'react';
import Header from '@/components/Header';

interface DataManagementLayoutProps {
  children: React.ReactNode;
}

const DataManagementLayout = ({ children }: DataManagementLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      <Header />
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        {children}
      </div>
    </div>
  );
};

export default DataManagementLayout;
