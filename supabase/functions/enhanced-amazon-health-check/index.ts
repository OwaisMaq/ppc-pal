import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AmazonConnection {
  id: string;
  profile_id: string;
  profile_name: string;
  marketplace_id: string;
  access_token: string;
  advertising_api_endpoint: string;
  health_status?: string;
  health_issues?: string[];
}

interface HealthCheckResult {
  healthy: boolean;
  issues: string[];
  details: {
    tokenValid: boolean;
    profileAccess: boolean;
    campaignAccess: boolean;
    apiEndpointReachable: boolean;
    permissions: {
      profiles: boolean;
      campaigns: boolean;
      adGroups: boolean;
      keywords: boolean;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from JWT token
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Unauthorized')
    }

    const { connectionId } = await req.json()

    console.log(`Enhanced health check requested for user: ${user.id}, connectionId: ${connectionId || 'ALL'}`)

    // Get connections to check
    let connectionsQuery = supabase
      .from('amazon_connections')
      .select('*')
      .eq('user_id', user.id)

    if (connectionId) {
      connectionsQuery = connectionsQuery.eq('id', connectionId)
    }

    const { data: connections, error: connectionsError } = await connectionsQuery
    
    if (connectionsError) {
      throw new Error(`Failed to fetch connections: ${connectionsError.message}`)
    }

    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No connections found' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      })
    }

    const results: Array<{ connectionId: string; result: HealthCheckResult }> = []

    // Perform health check for each connection
    for (const connection of connections) {
      console.log(`Checking health for connection: ${connection.id}`)
      
      const healthResult = await performEnhancedHealthCheck(connection)
      results.push({
        connectionId: connection.id,
        result: healthResult
      })

      // Update connection health in database
      const updateData = {
        health_status: healthResult.healthy ? 'healthy' : (healthResult.issues.length > 0 ? 'degraded' : 'error'),
        health_issues: healthResult.issues,
        last_health_check: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      await supabase
        .from('amazon_connections')
        .update(updateData)
        .eq('id', connection.id)

      console.log(`Updated health status for ${connection.id}: ${updateData.health_status}`)
    }

    return new Response(JSON.stringify({
      success: true,
      results,
      summary: {
        total: results.length,
        healthy: results.filter(r => r.result.healthy).length,
        degraded: results.filter(r => !r.result.healthy && r.result.issues.length > 0).length,
        error: results.filter(r => !r.result.healthy && r.result.issues.length === 0).length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Enhanced health check error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

async function performEnhancedHealthCheck(connection: AmazonConnection): Promise<HealthCheckResult> {
  const issues: string[] = []
  const details = {
    tokenValid: false,
    profileAccess: false,
    campaignAccess: false,
    apiEndpointReachable: false,
    permissions: {
      profiles: false,
      campaigns: false,
      adGroups: false,
      keywords: false
    }
  }

  try {
    // Check if token is expired
    const now = new Date()
    const expiryDate = new Date(connection.token_expires_at)
    if (expiryDate <= now) {
      issues.push('Access token has expired')
      return {
        healthy: false,
        issues,
        details
      }
    }

    // Test API endpoint reachability with profiles endpoint
    console.log(`Testing API endpoint: ${connection.advertising_api_endpoint}`)
    
    const profilesResponse = await makeAmazonRequest(
      `${connection.advertising_api_endpoint}/v2/profiles`,
      connection.access_token
    )

    if (profilesResponse.success) {
      details.tokenValid = true
      details.profileAccess = true
      details.apiEndpointReachable = true
      details.permissions.profiles = true
      console.log('Profiles API test: SUCCESS')
    } else {
      if (profilesResponse.status === 401) {
        issues.push('Access token is invalid or expired')
      } else if (profilesResponse.status === 403) {
        issues.push('Insufficient permissions for profiles API access')
        details.tokenValid = true // Token is valid but lacks permissions
      } else {
        issues.push(`API endpoint unreachable: ${profilesResponse.error}`)
      }
    }

    // Test campaigns access (more comprehensive permission check)
    if (details.tokenValid) {
      console.log('Testing campaigns API access...')
      
      const campaignsResponse = await makeAmazonRequest(
        `${connection.advertising_api_endpoint}/sp/campaigns?maxResults=1`,
        connection.access_token,
        connection.profile_id
      )

      if (campaignsResponse.success) {
        details.campaignAccess = true
        details.permissions.campaigns = true
        console.log('Campaigns API test: SUCCESS')
      } else {
        if (campaignsResponse.status === 403) {
          issues.push('Insufficient permissions for campaign data access - API approval may be required')
        } else if (campaignsResponse.status === 401) {
          issues.push('Campaign API authentication failed')
        } else {
          issues.push(`Campaign API access failed: ${campaignsResponse.error}`)
        }
      }

      // Test ad groups access
      const adGroupsResponse = await makeAmazonRequest(
        `${connection.advertising_api_endpoint}/sp/adGroups?maxResults=1`,
        connection.access_token,
        connection.profile_id
      )

      if (adGroupsResponse.success) {
        details.permissions.adGroups = true
      }

      // Test keywords access
      const keywordsResponse = await makeAmazonRequest(
        `${connection.advertising_api_endpoint}/sp/keywords?maxResults=1`,
        connection.access_token,
        connection.profile_id
      )

      if (keywordsResponse.success) {
        details.permissions.keywords = true
      }
    }

    // Determine overall health
    const healthy = details.tokenValid && 
                   details.profileAccess && 
                   details.campaignAccess && 
                   details.permissions.campaigns

    return {
      healthy,
      issues,
      details
    }

  } catch (error) {
    console.error(`Health check error for connection ${connection.id}:`, error)
    issues.push(`Health check failed: ${error.message}`)
    
    return {
      healthy: false,
      issues,
      details
    }
  }
}

async function makeAmazonRequest(
  url: string, 
  accessToken: string, 
  profileId?: string
): Promise<{ success: boolean; status?: number; error?: string; data?: any }> {
  try {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Amazon-Advertising-API-ClientId': Deno.env.get('AMAZON_CLIENT_ID') || ''
    }

    if (profileId) {
      headers['Amazon-Advertising-API-Scope'] = profileId
    }

    console.log(`Making request to: ${url}`)

    const response = await fetch(url, {
      method: 'GET',
      headers
    })

    const responseText = await response.text()
    console.log(`Response status: ${response.status}`)

    if (response.ok) {
      return {
        success: true,
        status: response.status,
        data: responseText ? JSON.parse(responseText) : null
      }
    } else {
      return {
        success: false,
        status: response.status,
        error: responseText || `HTTP ${response.status}`
      }
    }

  } catch (error) {
    console.error(`Request failed:`, error)
    return {
      success: false,
      error: error.message
    }
  }
}