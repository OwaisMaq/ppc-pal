
import React from 'react';
import DataManagementLayout from '@/components/data-management/DataManagementLayout';
import DataManagementHeader from '@/components/data-management/DataManagementHeader';
import DataManagementSections from '@/components/data-management/DataManagementSections';

const DataManagement = () => {
  return (
    <DataManagementLayout>
      <DataManagementHeader />
      <DataManagementSections />
    </DataManagementLayout>
  );
};

export default DataManagement;
