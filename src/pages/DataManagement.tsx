
import React from 'react';
import DataManagementHeader from '@/components/data-management/DataManagementHeader';
import DataManagementSections from '@/components/data-management/DataManagementSections';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';

const DataManagement = () => {
  return (
    <AuthenticatedLayout>
      <div className="max-w-4xl space-y-6">
        <DataManagementHeader />
        <DataManagementSections />
      </div>
    </AuthenticatedLayout>
  );
};

export default DataManagement;
