import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CampaignSetRequest {
  profileId: string;
  asin: string;
  productName: string;
  productPrice?: number;
  templateType: "aggressive" | "balanced" | "conservative";
  dailyBudget: number;
  defaultBid: number;
  enableHarvesting: boolean;
  enableNegatives: boolean;
}

interface TemplateConfig {
  bidMultiplier: number;
  biddingStrategy: string;
  harvestingThreshold: number;
  negativeThreshold: number;
}

const templateConfigs: Record<string, TemplateConfig> = {
  aggressive: {
    bidMultiplier: 1.25,
    biddingStrategy: "autoForSales",
    harvestingThreshold: 1,
    negativeThreshold: 15,
  },
  balanced: {
    bidMultiplier: 1.0,
    biddingStrategy: "legacyForSales",
    harvestingThreshold: 2,
    negativeThreshold: 20,
  },
  conservative: {
    bidMultiplier: 0.8,
    biddingStrategy: "manual",
    harvestingThreshold: 3,
    negativeThreshold: 30,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const body: CampaignSetRequest = await req.json();
    const {
      profileId,
      asin,
      productName,
      productPrice,
      templateType,
      dailyBudget,
      defaultBid,
      enableHarvesting,
      enableNegatives,
    } = body;

    console.log(`[create-campaign-set] Creating campaign set for ASIN ${asin} on profile ${profileId}`);

    // Get template config
    const templateConfig = templateConfigs[templateType] || templateConfigs.balanced;
    const adjustedBid = defaultBid * templateConfig.bidMultiplier;

    // Create campaign template record
    const { data: template, error: templateError } = await supabase
      .from("campaign_templates")
      .insert({
        user_id: user.id,
        profile_id: profileId,
        name: `${productName} Campaign Set`,
        template_type: templateType,
        asin,
        product_name: productName,
        product_price: productPrice || 0,
        daily_budget: dailyBudget,
        default_bid: defaultBid,
        status: "creating",
        structure: {
          campaignTypes: ["auto", "broad", "exact", "pat"],
          enableHarvesting,
          enableNegatives,
        },
      })
      .select()
      .single();

    if (templateError) {
      console.error("[create-campaign-set] Template creation error:", templateError);
      throw new Error(`Failed to create template: ${templateError.message}`);
    }

    console.log(`[create-campaign-set] Template created: ${template.id}`);

    // Define campaign configurations
    const campaignConfigs = [
      {
        suffix: "Auto",
        type: "auto",
        targetingType: "auto",
        budget: dailyBudget * 0.3, // 30% of budget to auto
        bid: adjustedBid * 0.9, // Slightly lower bid for discovery
      },
      {
        suffix: "Broad",
        type: "manual",
        targetingType: "manual",
        matchType: "broad",
        budget: dailyBudget * 0.25,
        bid: adjustedBid,
      },
      {
        suffix: "Exact",
        type: "manual",
        targetingType: "manual",
        matchType: "exact",
        budget: dailyBudget * 0.3, // More budget to proven exact
        bid: adjustedBid * 1.1, // Premium bid for exact match
      },
      {
        suffix: "PAT",
        type: "product",
        targetingType: "manual",
        budget: dailyBudget * 0.15,
        bid: adjustedBid * 0.95,
      },
    ];

    // Generate campaign names following best practices
    const campaignsCreated = campaignConfigs.map((config, index) => ({
      id: `temp_${template.id}_${index}`,
      name: `SP_${asin}_${config.suffix}`,
      type: config.type,
      targetingType: config.targetingType,
      matchType: config.matchType,
      budget: config.budget,
      bid: config.bid,
      status: "pending",
    }));

    // Create harvesting rules if enabled
    const rulesCreated: Array<{ id: string; name: string; type: string }> = [];

    if (enableHarvesting) {
      // Auto → Broad harvesting rule
      const { data: autoToBroadRule, error: rule1Error } = await supabase
        .from("automation_rules")
        .insert({
          user_id: user.id,
          profile_id: profileId,
          name: `[${asin}] Auto → Broad Harvesting`,
          rule_type: "search_term_harvesting",
          mode: "dry_run",
          severity: "info",
          enabled: true,
          params: {
            source_campaign_type: "auto",
            target_campaign_type: "broad",
            min_conversions: templateConfig.harvestingThreshold,
            lookback_days: 14,
            asin_filter: asin,
          },
          action: {
            type: "add_keyword",
            match_type: "broad",
            bid_multiplier: 1.0,
          },
        })
        .select()
        .single();

      if (!rule1Error && autoToBroadRule) {
        rulesCreated.push({
          id: autoToBroadRule.id,
          name: autoToBroadRule.name,
          type: "auto_to_broad",
        });
      }

      // Broad → Exact harvesting rule
      const { data: broadToExactRule, error: rule2Error } = await supabase
        .from("automation_rules")
        .insert({
          user_id: user.id,
          profile_id: profileId,
          name: `[${asin}] Broad → Exact Graduation`,
          rule_type: "keyword_graduation",
          mode: "dry_run",
          severity: "info",
          enabled: true,
          params: {
            source_match_type: "broad",
            target_match_type: "exact",
            min_conversions: templateConfig.harvestingThreshold + 1,
            max_acos: 30,
            lookback_days: 14,
            asin_filter: asin,
          },
          action: {
            type: "add_keyword",
            match_type: "exact",
            bid_multiplier: 1.1,
          },
        })
        .select()
        .single();

      if (!rule2Error && broadToExactRule) {
        rulesCreated.push({
          id: broadToExactRule.id,
          name: broadToExactRule.name,
          type: "broad_to_exact",
        });
      }
    }

    if (enableNegatives) {
      // High spend no conversion negative rule
      const { data: negativeRule, error: negativeError } = await supabase
        .from("automation_rules")
        .insert({
          user_id: user.id,
          profile_id: profileId,
          name: `[${asin}] Wasted Spend Negatives`,
          rule_type: "negative_exact",
          mode: "dry_run",
          severity: "warning",
          enabled: true,
          params: {
            min_spend: productPrice ? productPrice * 0.5 : 10,
            max_conversions: 0,
            lookback_days: 14,
            asin_filter: asin,
          },
          action: {
            type: "add_negative_exact",
            scope: "campaign",
          },
        })
        .select()
        .single();

      if (!negativeError && negativeRule) {
        rulesCreated.push({
          id: negativeRule.id,
          name: negativeRule.name,
          type: "wasted_spend",
        });
      }
    }

    // Update template with created campaigns and rules
    await supabase
      .from("campaign_templates")
      .update({
        status: "active",
        campaigns_created: campaignsCreated,
        rules_created: rulesCreated,
      })
      .eq("id", template.id);

    console.log(`[create-campaign-set] Campaign set created successfully. Campaigns: ${campaignsCreated.length}, Rules: ${rulesCreated.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        templateId: template.id,
        campaignsCreated,
        rulesCreated,
        message: `Created ${campaignsCreated.length} campaigns and ${rulesCreated.length} automation rules`,
        note: "Campaigns are in 'pending' status. Amazon API integration will create them in your ad account.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[create-campaign-set] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
