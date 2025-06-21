
import React from 'react';
import AccountInformation from './AccountInformation';
import DataExport from './DataExport';
import DataRetentionPolicy from './DataRetentionPolicy';
import AccountDeletion from './AccountDeletion';
import ContactInfo from './ContactInfo';

const DataManagementSections = () => {
  return (
    <div className="space-y-6">
      <AccountInformation />
      <DataExport />
      <DataRetentionPolicy />
      <AccountDeletion />
      <ContactInfo />
    </div>
  );
};

export default DataManagementSections;
