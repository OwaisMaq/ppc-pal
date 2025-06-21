
import React from 'react';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900">{`${label}`}</p>
        {payload.map((entry: any, index: number) => {
          const dataKeyString = String(entry.dataKey);
          const formattedDataKey = dataKeyString.charAt(0).toUpperCase() + dataKeyString.slice(1);
          
          return (
            <p key={index} className={`text-sm`} style={{ color: entry.color }}>
              {`${formattedDataKey}: $${entry.value.toLocaleString()}`}
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

export default CustomTooltip;
