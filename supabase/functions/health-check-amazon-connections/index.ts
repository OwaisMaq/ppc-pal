import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Comprehensive health check for Amazon connections
async function performHealthCheck(
  connection: any,
  clientId: string,
  supabase: any
): Promise<{ healthy: boolean; issues: string[]; details: any }> {
  const issues: string[] = []
  const details: any = {}
  
  try {
    // 1. Validate token format
    if (!connection.access_token || typeof connection.access_token !== 'string') {
      issues.push('Invalid access token format')
      return { healthy: false, issues, details }
    }
    
    const accessToken = connection.access_token.trim()
    if (accessToken.length < 10) {
      issues.push('Access token too short')
      return { healthy: false, issues, details }
    }
    
    details.tokenLength = accessToken.length
    details.tokenPreview = accessToken.substring(0, 20) + '...'
    
    // 2. Check token expiration
    const now = new Date()
    const expiresAt = new Date(connection.token_expires_at)
    const timeUntilExpiry = expiresAt.getTime() - now.getTime()
    
    details.tokenExpiresAt = expiresAt.toISOString()
    details.timeUntilExpiryMinutes = Math.floor(timeUntilExpiry / (1000 * 60))
    
    if (timeUntilExpiry <= 0) {
      issues.push('Access token expired')
    } else if (timeUntilExpiry < 5 * 60 * 1000) { // Less than 5 minutes
      issues.push('Access token expiring soon')
    }
    
    // 3. Validate endpoint
    const apiEndpoint = connection.advertising_api_endpoint
    if (!apiEndpoint) {
      issues.push('No API endpoint configured')
      return { healthy: false, issues, details }
    }
    
    details.apiEndpoint = apiEndpoint
    
    // 4. Test profile access
    try {
      console.log(`Testing profile access for connection ${connection.id}`)
      
      const profileResponse = await fetch(`${apiEndpoint}/profiles`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': connection.profile_id,
          'Amazon-Advertising-API-Version': '3.0',
          'User-Agent': 'Amazon-Advertising-API-SDK/1.0'
        },
      })
      
      details.profileTest = {
        status: profileResponse.status,
        ok: profileResponse.ok
      }
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        details.profileTest.profileCount = Array.isArray(profileData) ? profileData.length : 1
      } else {
        const errorText = await profileResponse.text()
        details.profileTest.error = errorText
        
        if (profileResponse.status === 401) {
          issues.push('Profile API: Token invalid or expired')
        } else if (profileResponse.status === 403) {
          issues.push('Profile API: Insufficient permissions')
        } else if (profileResponse.status === 429) {
          issues.push('Profile API: Rate limited')
        } else {
          issues.push(`Profile API: HTTP ${profileResponse.status}`)
        }
      }
    } catch (profileError) {
      issues.push(`Profile API: Network error - ${profileError.message}`)
      details.profileTest = { error: profileError.message }
    }
    
    // 5. Test campaigns access if profile test passed
    if (details.profileTest?.ok) {
      try {
        console.log(`Testing campaigns access for connection ${connection.id}`)
        
        const campaignsResponse = await fetch(`${apiEndpoint}/sp/campaigns?maxResults=1`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Amazon-Advertising-API-Scope': connection.profile_id,
            'Amazon-Advertising-API-Version': '3.0',
            'User-Agent': 'Amazon-Advertising-API-SDK/1.0'
          },
        })
        
        details.campaignsTest = {
          status: campaignsResponse.status,
          ok: campaignsResponse.ok
        }
        
        if (!campaignsResponse.ok) {
          const errorText = await campaignsResponse.text()
          details.campaignsTest.error = errorText
          
          if (campaignsResponse.status === 401) {
            issues.push('Campaigns API: Token invalid or expired')
          } else if (campaignsResponse.status === 403) {
            issues.push('Campaigns API: Insufficient permissions')
          } else if (campaignsResponse.status === 429) {
            issues.push('Campaigns API: Rate limited')
          } else {
            issues.push(`Campaigns API: HTTP ${campaignsResponse.status}`)
          }
        }
      } catch (campaignsError) {
        issues.push(`Campaigns API: Network error - ${campaignsError.message}`)
        details.campaignsTest = { error: campaignsError.message }
      }
    }
    
    // 6. Update connection health status
    const healthStatus = issues.length === 0 ? 'healthy' : 'degraded'
    
    await supabase
      .from('amazon_connections')
      .update({
        last_health_check: new Date().toISOString(),
        health_status: healthStatus,
        health_issues: issues.length > 0 ? issues : null,
      })
      .eq('id', connection.id)
    
    console.log(`Health check completed for connection ${connection.id}: ${healthStatus}`)
    
    return {
      healthy: issues.length === 0,
      issues,
      details
    }
    
  } catch (error) {
    console.error(`Health check failed for connection ${connection.id}:`, error)
    issues.push(`Health check failed: ${error.message}`)
    
    return {
      healthy: false,
      issues,
      details: { ...details, error: error.message }
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authorization')
    }

    const clientId = Deno.env.get('AMAZON_CLIENT_ID')
    if (!clientId) {
      throw new Error('Amazon client ID not configured')
    }

    const body = await req.json().catch(() => ({}))
    const { connectionId } = body

    if (connectionId) {
      // Check specific connection
      const { data: connection, error: connectionError } = await supabase
        .from('amazon_connections')
        .select('*')
        .eq('id', connectionId)
        .eq('user_id', user.id)
        .single()

      if (connectionError || !connection) {
        throw new Error('Connection not found')
      }

      const healthCheck = await performHealthCheck(connection, clientId, supabase)

      return new Response(
        JSON.stringify({
          success: true,
          connection: {
            id: connection.id,
            profile_name: connection.profile_name,
            marketplace_id: connection.marketplace_id,
            status: connection.status,
            ...healthCheck
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    } else {
      // Check all user connections
      const { data: connections, error: connectionsError } = await supabase
        .from('amazon_connections')
        .select('*')
        .eq('user_id', user.id)

      if (connectionsError) {
        throw new Error(`Failed to fetch connections: ${connectionsError.message}`)
      }

      const results = []
      
      for (const connection of connections || []) {
        console.log(`Running health check for connection: ${connection.id}`)
        
        try {
          const healthCheck = await performHealthCheck(connection, clientId, supabase)
          
          results.push({
            id: connection.id,
            profile_name: connection.profile_name,
            marketplace_id: connection.marketplace_id,
            status: connection.status,
            ...healthCheck
          })
        } catch (error) {
          console.error(`Health check failed for connection ${connection.id}:`, error)
          results.push({
            id: connection.id,
            profile_name: connection.profile_name,
            marketplace_id: connection.marketplace_id,
            status: connection.status,
            healthy: false,
            issues: [`Health check failed: ${error.message}`],
            details: { error: error.message }
          })
        }
        
        // Small delay between checks to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      const summary = {
        total: results.length,
        healthy: results.filter(r => r.healthy).length,
        degraded: results.filter(r => !r.healthy).length,
        issues: results.flatMap(r => r.issues || [])
      }

      return new Response(
        JSON.stringify({
          success: true,
          summary,
          connections: results
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

  } catch (error) {
    console.error('Health check function failed:', error)

    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})