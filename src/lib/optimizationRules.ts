
import { OptimizationMetrics, ReportData } from './excel/types';
import { PERFORMANCE_THRESHOLDS } from './excel/constants';

export interface OptimizationRule {
  name: string;
  description: string;
  condition: (data: any, metrics?: OptimizationMetrics) => boolean;
  action: 'increase_bid' | 'decrease_bid' | 'pause' | 'change_match_type' | 'add_negative' | 'increase_budget' | 'decrease_budget';
  impact: 'high' | 'medium' | 'low';
  reasoning: string;
}

// Advanced optimization rules for Amazon Ads Partner level
export const OPTIMIZATION_RULES: OptimizationRule[] = [
  {
    name: 'High Converting Low Bid',
    description: 'Keywords with good conversion but low bids that could capture more traffic',
    condition: (data, metrics) => {
      if (!metrics) return false;
      const conversionRate = (metrics.orders / metrics.clicks) * 100;
      const currentBid = parseFloat(data.Bid || data['Max CPC'] || data['Max Bid'] || '0');
      return conversionRate > 10 && currentBid < 1.5 && metrics.impressions > PERFORMANCE_THRESHOLDS.MIN_IMPRESSIONS;
    },
    action: 'increase_bid',
    impact: 'high',
    reasoning: 'High conversion rate indicates strong keyword performance - increase bid to capture more traffic'
  },
  
  {
    name: 'High ACOS Underperformer',
    description: 'Keywords with high advertising cost of sales that should be paused or bid reduced',
    condition: (data, metrics) => {
      if (!metrics) return false;
      return metrics.acos > PERFORMANCE_THRESHOLDS.HIGH_ACOS && metrics.clicks > PERFORMANCE_THRESHOLDS.MIN_CLICKS;
    },
    action: 'decrease_bid',
    impact: 'high',
    reasoning: 'High ACOS indicates poor profitability - reduce bid to improve efficiency'
  },
  
  {
    name: 'Low CTR Broad Match',
    description: 'Broad match keywords with low click-through rates should be changed to phrase match',
    condition: (data, metrics) => {
      if (!metrics) return false;
      const matchType = data['Match Type'] || data['Match type'] || '';
      return matchType.toLowerCase() === 'broad' && metrics.ctr < PERFORMANCE_THRESHOLDS.LOW_CTR && 
             metrics.impressions > PERFORMANCE_THRESHOLDS.MIN_IMPRESSIONS;
    },
    action: 'change_match_type',
    impact: 'medium',
    reasoning: 'Low CTR on broad match suggests poor relevance - tighten to phrase match for better targeting'
  },
  
  {
    name: 'High Spend Zero Sales',
    description: 'Keywords spending money but generating no sales should be paused',
    condition: (data, metrics) => {
      if (!metrics) return false;
      return metrics.spend > 50 && metrics.sales === 0 && metrics.clicks > 20;
    },
    action: 'pause',
    impact: 'high',
    reasoning: 'High spend with no sales indicates poor keyword performance - pause to prevent waste'
  },
  
  {
    name: 'Profitable Low Impression Share',
    description: 'Profitable keywords with low impression share need bid increases',
    condition: (data, metrics) => {
      if (!metrics) return false;
      const roas = metrics.sales / metrics.spend;
      const currentBid = parseFloat(data.Bid || data['Max CPC'] || data['Max Bid'] || '0');
      return roas > PERFORMANCE_THRESHOLDS.TARGET_ROAS && currentBid < 2.0 && metrics.impressions < 5000;
    },
    action: 'increase_bid',
    impact: 'medium',
    reasoning: 'Good ROAS with low impressions suggests room for growth - increase bid for more visibility'
  },
  
  {
    name: 'Campaign Budget Constraint',
    description: 'Campaigns hitting budget limits with good performance need budget increases',
    condition: (data, metrics) => {
      if (!metrics) return false;
      const budgetUtilization = data['Budget Utilization'] || 0;
      const roas = metrics.sales / metrics.spend;
      return budgetUtilization > 90 && roas > PERFORMANCE_THRESHOLDS.TARGET_ROAS;
    },
    action: 'increase_budget',
    impact: 'high',
    reasoning: 'High budget utilization with good ROAS indicates opportunity for scaling - increase budget'
  },
  
  {
    name: 'Expensive Low Performer',
    description: 'High CPC keywords with poor performance metrics',
    condition: (data, metrics) => {
      if (!metrics) return false;
      return metrics.cpc > PERFORMANCE_THRESHOLDS.HIGH_CPC && 
             metrics.acos > PERFORMANCE_THRESHOLDS.HIGH_ACOS && 
             metrics.clicks > PERFORMANCE_THRESHOLDS.MIN_CLICKS;
    },
    action: 'decrease_bid',
    impact: 'high',
    reasoning: 'High CPC combined with poor performance - reduce bid to improve cost efficiency'
  }
];

// Function to evaluate all rules against a data row
export const evaluateOptimizationRules = (data: any, metrics?: OptimizationMetrics): OptimizationRule[] => {
  return OPTIMIZATION_RULES.filter(rule => rule.condition(data, metrics));
};

// Function to prioritize rules by impact
export const prioritizeRules = (rules: OptimizationRule[]): OptimizationRule[] => {
  const impactOrder = { 'high': 3, 'medium': 2, 'low': 1 };
  return rules.sort((a, b) => impactOrder[b.impact] - impactOrder[a.impact]);
};

// Function to generate optimization recommendations
export const generateRecommendations = (data: any[]): Array<{
  entity: any;
  rules: OptimizationRule[];
  priority: 'high' | 'medium' | 'low';
}> => {
  return data.map(entity => {
    const metrics = extractMetricsFromEntity(entity);
    const applicableRules = evaluateOptimizationRules(entity, metrics);
    const prioritizedRules = prioritizeRules(applicableRules);
    
    const priority = prioritizedRules.length > 0 ? prioritizedRules[0].impact : 'low';
    
    return {
      entity,
      rules: prioritizedRules,
      priority
    };
  }).filter(rec => rec.rules.length > 0);
};

// Helper function to extract metrics from entity data
const extractMetricsFromEntity = (entity: any): OptimizationMetrics | undefined => {
  try {
    return {
      impressions: parseFloat(entity.Impressions || entity.impressions || '0'),
      clicks: parseFloat(entity.Clicks || entity.clicks || '0'),
      spend: parseFloat(entity.Spend || entity.spend || entity.Cost || '0'),
      sales: parseFloat(entity.Sales || entity.sales || entity['Attributed Sales 7d'] || '0'),
      orders: parseFloat(entity.Orders || entity.orders || entity['Attributed Units Ordered 7d'] || '0'),
      ctr: parseFloat(entity.CTR || entity.ctr || entity['Click-Through Rate'] || '0'),
      cpc: parseFloat(entity.CPC || entity.cpc || entity['Cost Per Click'] || '0'),
      acos: parseFloat(entity.ACOS || entity.acos || entity.ACoS || '0'),
      roas: parseFloat(entity.ROAS || entity.roas || entity.RoAS || '0'),
      conversionRate: parseFloat(entity['Conversion Rate'] || entity.conversionRate || '0')
    };
  } catch (error) {
    console.warn('Error extracting metrics from entity:', error);
    return undefined;
  }
};
