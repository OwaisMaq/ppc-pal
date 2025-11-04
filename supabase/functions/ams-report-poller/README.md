# AMS Report Poller

This edge function polls Amazon Advertising reports that have been queued by the sync process and processes them when ready.

## How It Works

1. **Sync Queues Reports**: When `sync-amazon-data` runs, it requests reports from Amazon but doesn't wait for them to complete. Instead, it saves the report IDs to the `pending_amazon_reports` table with status `pending`.

2. **Poller Processes Reports**: This function runs periodically (every 10-30 seconds) to:
   - Fetch pending reports from the database
   - Check their status with Amazon's API
   - Download and process completed reports
   - Update entities (campaigns, ad groups, targets) with performance data
   - Mark reports as `completed` or `failed`

3. **Background Processing**: Reports are processed in the background without blocking the sync process, allowing the sync to complete quickly while ensuring all data is eventually pulled.

## Setup

### Option 1: Supabase Platform Cron (Recommended)

Add this cron job to your Supabase project:

```sql
-- Run every 30 seconds
select cron.schedule(
  'poll-amazon-reports',
  '*/30 * * * * *',  -- Every 30 seconds
  $$
  select net.http_post(
    url := 'https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/ams-report-poller',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
```

### Option 2: External Cron Service

Use a service like GitHub Actions, Vercel Cron, or any cron service to call:

```bash
curl -X POST https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/ams-report-poller
```

### Option 3: Manual Trigger (for testing)

You can manually trigger the poller:

```bash
curl -X POST https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/ams-report-poller
```

## Report Processing

The poller:
- Checks up to 10 pending reports per run
- Polls each report no more than once every 10 seconds
- Gives up after 100 attempts (~15 minutes)
- Updates performance metrics for campaigns, ad groups, and targets
- Inserts data into streaming tables for real-time dashboards

## Monitoring

Check the `pending_amazon_reports` table to monitor:

```sql
SELECT 
  report_type,
  status,
  COUNT(*) as count,
  AVG(poll_count) as avg_polls,
  MAX(created_at) as latest_created
FROM pending_amazon_reports
GROUP BY report_type, status;
```

## Benefits

- ✅ **No Timeouts**: Sync completes quickly without waiting for slow Amazon reports
- ✅ **All Data Retrieved**: Reports are processed in background until complete
- ✅ **Scalable**: Multiple reports can be processed concurrently
- ✅ **Resilient**: Failed reports are retried automatically
- ✅ **Fast Syncs**: Entity data syncs immediately, performance data follows
