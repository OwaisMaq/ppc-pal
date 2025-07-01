
import { useState, useEffect } from 'react';

interface AsinData {
  asin: string;
  title: string;
  sales: number;
  orders: number;
  revenue: number;
}

export const useAsinData = () => {
  const [data, setData] = useState<AsinData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Mock ASIN data for now
    const mockData: AsinData[] = [
      {
        asin: 'B07ABC123',
        title: 'Sample Product 1',
        sales: 1250,
        orders: 45,
        revenue: 3750
      },
      {
        asin: 'B08DEF456',
        title: 'Sample Product 2',
        sales: 890,
        orders: 28,
        revenue: 2670
      }
    ];
    
    setData(mockData);
  }, []);

  return { data, isLoading, error };
};
