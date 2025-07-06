
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { connectionId, profiles } = await req.json()
    
    console.log('=== Update Connection Profiles Started ===')
    console.log('Connection ID:', connectionId)
    console.log('Profiles to update:', profiles?.length || 0)

    if (!connectionId || !profiles || !Array.isArray(profiles) || profiles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Connection ID and profiles array are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use the first profile as the primary profile
    const primaryProfile = profiles[0]
    const profileId = primaryProfile.profileId.toString()
    const profileName = primaryProfile.countryCode || `Profile ${primaryProfile.profileId}`
    const marketplaceId = primaryProfile.accountInfo?.marketplaceStringId || 
                         primaryProfile.marketplaceStringId || 
                         primaryProfile.countryCode

    console.log('Primary profile details:', {
      profileId,
      profileName,
      marketplaceId
    })

    // Update the connection with the found profile
    const { error: updateError } = await supabaseClient
      .from('amazon_connections')
      .update({
        profile_id: profileId,
        profile_name: profileName,
        marketplace_id: marketplaceId,
        status: 'setup_required', // Will be set to active after successful sync
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    if (updateError) {
      console.error('Failed to update connection:', updateError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update connection with profiles',
          details: updateError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Connection updated successfully')

    return new Response(
      JSON.stringify({
        success: true,
        message: `Connection updated with profile ${profileId}`,
        profileId,
        profileName,
        marketplaceId,
        totalProfiles: profiles.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== Update Connection Profiles Error ===')
    console.error('Error details:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error during profile update',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
