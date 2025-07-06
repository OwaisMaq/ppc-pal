# Amazon Token Refresh Issue Analysis and Fix

## Problem Summary

The Amazon OAuth callback process was successful, but immediately after connecting, the enhanced sync was failing with 400 errors when trying to refresh the token. This was causing a cascade of failures in all subsequent API calls.

## Root Cause Analysis

From the console logs, the issue flow was:

1. **OAuth Callback Success**: The OAuth callback successfully creates a connection with a fresh access token
2. **Immediate Token Refresh**: The enhanced sync immediately calls `refreshTokenIfNeeded()` on the newly created connection
3. **Token Refresh Failure**: The token refresh function returns a 400 error
4. **Cascade Failure**: All subsequent API calls (account validation, profile detection) fail

### Key Issues Identified:

1. **Unnecessary Token Refresh**: The system was attempting to refresh a token that was literally just created seconds ago
2. **Poor Error Handling**: The token refresh function wasn't properly handling the case of very new connections
3. **Inefficient Logic**: The enhanced sync was calling token refresh without checking if the connection was new

## Technical Details

### Original Flow:
```
OAuth Callback → Create Connection (fresh token) → Enhanced Sync → Token Refresh (400 error) → All API calls fail
```

### Connection Creation:
- OAuth callback creates connection with `status: 'setup_required'`
- Profile ID set to `'setup_required_no_profiles_found'` (no advertising profiles found)
- Fresh access token with proper expiry time

### Token Refresh Logic Issues:
- Function was being called on connections less than 5 minutes old
- Fresh tokens don't need refreshing
- API calls were failing due to unnecessary token refresh attempts

## Implemented Fix

### 1. Enhanced Token Refresh Function (`amazon-token-refresh/index.ts`)

Added logic to skip token refresh for very new connections:

```typescript
// Skip refresh if connection was just created (less than 5 minutes ago)
const connectionAge = Math.round((now.getTime() - new Date(connection.created_at).getTime()) / (1000 * 60));
if (connectionAge < 5) {
  console.log('Connection is very new, skipping refresh');
  return new Response(
    JSON.stringify({
      success: true,
      message: 'Token is newly created, no refresh needed',
      hoursUntilExpiry,
      refreshed: false,
      connectionAge
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### 2. Enhanced Sync Logic (`useEnhancedAmazonSync.ts`)

Modified the connection recovery and debug functions to check connection age before attempting token refresh:

```typescript
// Check if connection is very new (less than 5 minutes old)
const connectionAge = Math.round((Date.now() - new Date(connection.created_at).getTime()) / (1000 * 60));
const isNewConnection = connectionAge < 5;

// Step 1: Refresh token if needed (skip for very new connections)
let tokenValid = true;
if (!isNewConnection) {
  tokenValid = await refreshTokenIfNeeded(connectionId);
} else {
  addStep('Token validation skipped', 'info', 'Connection is newly created, token is fresh');
}
```

### 3. Added Debug Logging

Enhanced logging throughout the token refresh process to better diagnose issues:

- Request body validation
- Connection age calculation
- Token expiry analysis
- Step-by-step process logging

## Expected Outcome

### New Flow:
```
OAuth Callback → Create Connection (fresh token) → Enhanced Sync → Skip Token Refresh (new connection) → Direct API calls
```

### Benefits:
1. **Eliminates 400 Errors**: No more unnecessary token refresh attempts on new connections
2. **Faster Processing**: Skips unnecessary API calls for fresh tokens
3. **Better User Experience**: Immediate progression to profile detection after OAuth
4. **Improved Reliability**: Reduces potential points of failure in the connection flow

## Verification Steps

After implementing the fix:

1. **Monitor Console Logs**: Should see "Token validation skipped" messages for new connections
2. **Check Enhanced Sync**: Should proceed directly to account validation and profile detection
3. **Verify API Calls**: Account validation and profile detection should work with fresh tokens
4. **Test Full Flow**: OAuth → Enhanced Sync → Profile Detection should complete successfully

## Additional Improvements

The fix also includes:

- Better error messages with detailed context
- Connection age tracking for debugging
- Improved logging throughout the process
- More robust error handling for edge cases

## Next Steps

1. Test the fix with a new Amazon OAuth connection
2. Monitor for any remaining 400 errors
3. Verify that profile detection now works correctly
4. Consider implementing similar optimizations for other OAuth providers if applicable