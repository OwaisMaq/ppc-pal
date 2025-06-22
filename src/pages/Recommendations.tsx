
import React, { useState } from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertCircle, 
  Loader2, 
  Lightbulb, 
  TrendingUp, 
  Target,
  DollarSign,
  Filter,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import FilterBar from '@/components/FilterBar';

interface Recommendation {
  id: string;
  recommendation_type: string;
  entity_type: string;
  entity_id: string;
  current_value: string;
  recommended_value: string;
  reasoning: string;
  impact_level: string;
  estimated_impact: number;
  applied: boolean;
  applied_at: string;
  created_at: string;
}

const Recommendations = () => {
  const { user } = useAuth();
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [impactFilter, setImpactFilter] = useState('all');
  const [appliedFilter, setAppliedFilter] = useState('all');

  const { data: recommendations, isLoading, error } = useQuery({
    queryKey: ['recommendations', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('optimization_recommendations')
        .select(`
          *,
          optimization_results!inner(user_id)
        `)
        .eq('optimization_results.user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Recommendation[];
    },
    enabled: !!user,
  });

  const filteredRecommendations = React.useMemo(() => {
    if (!recommendations) return [];
    
    return recommendations.filter(rec => {
      if (impactFilter !== 'all' && rec.impact_level !== impactFilter) {
        return false;
      }
      if (appliedFilter === 'applied' && !rec.applied) {
        return false;
      }
      if (appliedFilter === 'pending' && rec.applied) {
        return false;
      }
      return true;
    });
  }, [recommendations, impactFilter, appliedFilter]);

  const getImpactColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'bid_adjustment':
        return <TrendingUp className="h-4 w-4" />;
      case 'keyword_optimization':
        return <Target className="h-4 w-4" />;
      case 'budget_optimization':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const handleApplyRecommendation = async (recommendationId: string) => {
    try {
      const { error } = await supabase
        .from('optimization_recommendations')
        .update({ 
          applied: true, 
          applied_at: new Date().toISOString() 
        })
        .eq('id', recommendationId);

      if (error) throw error;

      // Refresh the data
      window.location.reload();
    } catch (error) {
      console.error('Error applying recommendation:', error);
    }
  };

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Recommendations</h1>
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (error) {
    return (
      <AuthenticatedLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Recommendations</h1>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load recommendations. Please try again later.
            </AlertDescription>
          </Alert>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Optimization Recommendations</h1>
            <p className="text-gray-600 mt-2">
              AI-powered suggestions to improve your campaign performance
            </p>
          </div>
        </div>

        <FilterBar
          selectedCountry={selectedCountry}
          selectedAsin={selectedCampaign}
          selectedProduct={selectedProduct}
          onCountryChange={setSelectedCountry}
          onAsinChange={setSelectedCampaign}
          onProductChange={setSelectedProduct}
        />

        <div className="flex items-center gap-4 mb-6">
          <Select value={impactFilter} onValueChange={setImpactFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by impact" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="all">All Impact Levels</SelectItem>
              <SelectItem value="high">High Impact</SelectItem>
              <SelectItem value="medium">Medium Impact</SelectItem>
              <SelectItem value="low">Low Impact</SelectItem>
            </SelectContent>
          </Select>

          <Select value={appliedFilter} onValueChange={setAppliedFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="all">All Recommendations</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredRecommendations.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No recommendations found. Run an optimization to generate AI-powered suggestions.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {filteredRecommendations.map((recommendation) => (
              <Card key={recommendation.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getRecommendationIcon(recommendation.recommendation_type)}
                      <div>
                        <CardTitle className="text-lg">
                          {recommendation.recommendation_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </CardTitle>
                        <CardDescription>
                          {recommendation.entity_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} optimization
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getImpactColor(recommendation.impact_level)}>
                        {recommendation.impact_level.toUpperCase()} IMPACT
                      </Badge>
                      {recommendation.applied ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Applied
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">
                          <XCircle className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-700 mb-2">Current Value</h4>
                        <p className="text-lg font-semibold">{recommendation.current_value}</p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-700 mb-2">Recommended Value</h4>
                        <p className="text-lg font-semibold text-blue-600">{recommendation.recommended_value}</p>
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium text-green-700 mb-2">Reasoning</h4>
                      <p className="text-gray-700">{recommendation.reasoning}</p>
                    </div>

                    {recommendation.estimated_impact && (
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h4 className="font-medium text-purple-700 mb-2">Estimated Impact</h4>
                        <p className="text-lg font-semibold text-purple-600">
                          ${recommendation.estimated_impact.toFixed(2)} additional revenue
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t">
                      <p className="text-sm text-gray-600">
                        Created on {new Date(recommendation.created_at).toLocaleDateString()}
                        {recommendation.applied_at && (
                          <> • Applied on {new Date(recommendation.applied_at).toLocaleDateString()}</>
                        )}
                      </p>
                      {!recommendation.applied && (
                        <Button 
                          onClick={() => handleApplyRecommendation(recommendation.id)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Apply Recommendation
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
};

export default Recommendations;
