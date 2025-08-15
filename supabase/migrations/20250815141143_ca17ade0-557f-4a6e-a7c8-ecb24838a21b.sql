-- Add unique constraint for campaign performance history to prevent duplicates
ALTER TABLE campaign_performance_history 
ADD CONSTRAINT campaign_perf_unique UNIQUE (campaign_id, date, attribution_window);

-- Add unique constraint for adgroup performance history  
ALTER TABLE adgroup_performance_history 
ADD CONSTRAINT adgroup_perf_unique UNIQUE (adgroup_id, date, attribution_window);

-- Add unique constraint for keyword performance history
ALTER TABLE keyword_performance_history 
ADD CONSTRAINT keyword_perf_unique UNIQUE (keyword_id, date, attribution_window);