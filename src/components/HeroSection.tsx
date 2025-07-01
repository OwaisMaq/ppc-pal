
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdvertisingData } from '@/types/common';
import { TrendingUp, BarChart3, Target } from 'lucide-react';

interface HeroSectionProps {
  data: AdvertisingData | null;
}

const HeroSection = ({ data }: HeroSectionProps) => {
  return (
    <div className="mb-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to PPC Pal
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Your comprehensive business intelligence platform for managing and optimizing your advertising campaigns.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-blue-600" />
            <CardTitle>Performance Analytics</CardTitle>
            <CardDescription>
              Track your campaign performance with detailed analytics and insights
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <CardTitle>Data Visualization</CardTitle>
            <CardDescription>
              Visualize your data with interactive charts and comprehensive reports
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-purple-600" />
            <CardTitle>Smart Optimization</CardTitle>
            <CardDescription>
              Get AI-powered recommendations to optimize your advertising spend
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};

export default HeroSection;
