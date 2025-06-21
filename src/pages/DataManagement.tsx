
import React from 'react';
import Header from '@/components/Header';
import AccountInformation from '@/components/data-management/AccountInformation';
import DataExport from '@/components/data-management/DataExport';
import DataRetentionPolicy from '@/components/data-management/DataRetentionPolicy';
import AccountDeletion from '@/components/data-management/AccountDeletion';
import ContactInfo from '@/components/data-management/ContactInfo';

const DataManagement = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      <Header />
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Management</h1>
          <p className="text-gray-600">
            Manage your personal data and exercise your privacy rights
          </p>
        </div>

        <div className="space-y-6">
          <AccountInformation />
          <DataExport />
          <DataRetentionPolicy />
          <AccountDeletion />
          <ContactInfo />
        </div>
      </div>
    </div>
  );
};

export default DataManagement;
