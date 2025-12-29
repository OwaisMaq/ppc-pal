import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrackedKeyword {
  id: string;
  profile_id: string;
  asin: string;
  keyword: string;
  current_sponsored_rank: number | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting rank tracker sync...");

    // Get all active tracked keywords
    const { data: trackedKeywords, error: fetchError } = await supabase
      .from("keyword_rank_tracking")
      .select("*")
      .eq("is_active", true);

    if (fetchError) {
      throw new Error(`Failed to fetch tracked keywords: ${fetchError.message}`);
    }

    console.log(`Found ${trackedKeywords?.length || 0} keywords to check`);

    if (!trackedKeywords || trackedKeywords.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No keywords to track", checked: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updated = 0;
    let errors = 0;

    // Process each keyword
    for (const keyword of trackedKeywords as TrackedKeyword[]) {
      try {
        // In a real implementation, you would:
        // 1. Use Amazon SP-API to get sponsored rank
        // 2. Use product search API or scraping service to get organic rank
        
        // For now, we'll simulate rank updates with slight variations
        // This is a placeholder - integrate with actual rank checking service
        const previousSponsoredRank = keyword.current_sponsored_rank;
        
        // Simulate rank check (replace with actual API call)
        const newSponsoredRank = simulateRankCheck(previousSponsoredRank);
        const newOrganicRank = simulateRankCheck(null);
        
        // Calculate trend (positive = improved, negative = dropped)
        const rankTrend = previousSponsoredRank && newSponsoredRank
          ? previousSponsoredRank - newSponsoredRank
          : 0;

        // Update the tracking record
        const { error: updateError } = await supabase
          .from("keyword_rank_tracking")
          .update({
            current_sponsored_rank: newSponsoredRank,
            current_organic_rank: newOrganicRank,
            best_sponsored_rank: Math.min(
              newSponsoredRank || 999,
              keyword.current_sponsored_rank || 999
            ) === 999 ? null : Math.min(
              newSponsoredRank || 999,
              keyword.current_sponsored_rank || 999
            ),
            rank_trend: rankTrend,
            last_checked_at: new Date().toISOString(),
          })
          .eq("id", keyword.id);

        if (updateError) {
          console.error(`Error updating keyword ${keyword.id}:`, updateError);
          errors++;
          continue;
        }

        // Insert history record
        const { error: historyError } = await supabase
          .from("keyword_rank_history")
          .insert({
            tracking_id: keyword.id,
            profile_id: keyword.profile_id,
            sponsored_rank: newSponsoredRank,
            organic_rank: newOrganicRank,
          });

        if (historyError) {
          console.error(`Error inserting history for ${keyword.id}:`, historyError);
        }

        updated++;
      } catch (error) {
        console.error(`Error processing keyword ${keyword.keyword}:`, error);
        errors++;
      }
    }

    console.log(`Rank sync complete. Updated: ${updated}, Errors: ${errors}`);

    return new Response(
      JSON.stringify({
        success: true,
        checked: trackedKeywords.length,
        updated,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Rank tracker sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Placeholder function - replace with actual rank checking logic
function simulateRankCheck(previousRank: number | null): number | null {
  // Simulate no data 10% of the time
  if (Math.random() < 0.1) return null;
  
  if (previousRank === null) {
    // New keyword, generate initial rank
    return Math.floor(Math.random() * 50) + 1;
  }
  
  // Simulate rank change (-5 to +5 positions)
  const change = Math.floor(Math.random() * 11) - 5;
  const newRank = Math.max(1, previousRank + change);
  return Math.min(newRank, 100); // Cap at 100
}
