
import React from 'react';

interface TrendsHeaderProps {
  title: string;
  description: string;
}

const TrendsHeader = ({ title, description }: TrendsHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-gray-600 mt-2">{description}</p>
      </div>
    </div>
  );
};

export default TrendsHeader;
