# Phase 3: Entity Sync System

## Overview

The Entity Sync System provides robust, incremental, and idempotent synchronization of Amazon Ads entities (Campaigns, Ad Groups, Ads, Targets/Keywords) using Amazon Ads v2 API endpoints.

## Database Schema

### Core Entity Tables

- **entity_campaigns**: Normalized campaign data with Amazon campaign metadata
- **entity_ad_groups**: Ad group data linked to campaigns  
- **entity_ads**: Product ads, brand ads, and display ads (unified)
- **entity_targets**: Keywords and product targets (unified target model)

### Sync Management Tables

- **sync_state**: Tracks sync watermarks and timestamps per profile/entity
- **sync_runs**: Observability logs for each sync execution

## API Usage

### Manual Sync Execution

#### Full Sync (Backfill)
```bash
# Sync all entities for a profile
curl "https://[project-id].supabase.co/functions/v1/entities-sync-runner?profileId=XYZ&entity=all&mode=full"

# Sync specific entity type
curl "https://[project-id].supabase.co/functions/v1/entities-sync-runner?profileId=XYZ&entity=campaigns&mode=full"
```

#### Incremental Sync  
```bash
# Incremental sync (uses high watermark for efficiency)
curl "https://[project-id].supabase.co/functions/v1/entities-sync-runner?profileId=XYZ&entity=all&mode=incremental"

# Incremental sync for specific entity
curl "https://[project-id].supabase.co/functions/v1/entities-sync-runner?profileId=XYZ&entity=targets&mode=incremental"
```

### Parameters

- **profileId** (required): Amazon Advertising profile ID
- **entity** (optional): `all` | `campaigns` | `ad_groups` | `ads` | `targets` (default: `all`)
- **mode** (optional): `full` | `incremental` (default: `incremental`)

## Key Features

### 1. Incremental Sync with Safety Window
- Uses `high_watermark` with 25-hour lookback to avoid missing updates due to clock skew
- First run goes back 30 days, subsequent runs use watermark

### 2. Rate Limiting & Retry Logic
- Exponential backoff with jitter for 429/5xx errors
- Honors `Retry-After` headers from Amazon API
- Logs Amazon request IDs and rate limits for observability

### 3. Pagination Support
- Uses `startIndex` + `count` pattern with 100 items per page
- Handles both `nextToken` and offset-based pagination
- Continues until all pages are fetched

### 4. Idempotent Upserts
- All entities keyed by `(profile_id, entity_id)` 
- Archived entities preserved (not deleted)
- `synced_at` timestamp updated on every upsert

### 5. Unified Target Model
- Keywords and product targets stored in single `entity_targets` table
- Keywords transformed: `keywordId` → `targetId`, `keywordText` → `expression.text`
- Product targets: native `targetId` and `expression` structure

## Verification Commands

### Check Sync State
```sql
SELECT * FROM sync_state WHERE profile_id = 'XYZ';
```

### Check Entity Counts
```sql
SELECT count(*) FROM entity_campaigns WHERE profile_id = 'XYZ';
SELECT count(*) FROM entity_ad_groups WHERE profile_id = 'XYZ';  
SELECT count(*) FROM entity_ads WHERE profile_id = 'XYZ';
SELECT count(*) FROM entity_targets WHERE profile_id = 'XYZ';
```

### Check Recent Sync Runs
```sql
SELECT * FROM sync_runs 
WHERE profile_id = 'XYZ' 
ORDER BY started_at DESC 
LIMIT 10;
```

## Scheduling

For automated syncs, set up a Supabase cron job to run incremental syncs every 2-4 hours:

```sql
SELECT cron.schedule(
  'entity-sync-incremental',
  '0 */4 * * *', -- Every 4 hours
  $$
  SELECT net.http_post(
    url := 'https://[project-id].supabase.co/functions/v1/entities-sync-runner?entity=all&mode=incremental',
    headers := '{"Authorization": "Bearer [anon-key]"}'::jsonb
  );
  $$
);
```

## Error Handling

- **Token Refresh**: Automatically refreshes Amazon tokens before sync
- **Connection Validation**: Validates profile exists and tokens are available
- **Partial Failures**: Individual entity failures don't stop other entities
- **Observability**: All runs logged in `sync_runs` with error details

## Data Normalization

- **Monetary Values**: Stored as `*_micros` (multiply by 1,000,000)
- **Timestamps**: ISO 8601 format with timezone
- **JSON Fields**: `bidding`, `creative`, `expression` for flexible schema
- **States**: Preserved exactly as returned by Amazon API

## Security

- Uses service role for database operations
- Tokens stored encrypted in private schema
- RLS policies protect user data access
- Amazon API credentials managed as Supabase secrets

## Next Steps (Phase 4)

Once entity sync is stable, Phase 4 will:
1. Update dashboard to join v3 reporting data with entity tables
2. Display clicks, cost, sales with proper entity context
3. Enable ASIN-level filtering and labeling using entity relationships