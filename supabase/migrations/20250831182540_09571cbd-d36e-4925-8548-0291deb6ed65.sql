-- Phase 2B: Reporting v3 schema setup
-- Create dimension tables for normalized reporting
create table if not exists public.dim_campaign (
  profile_id text not null,
  campaign_id text not null,
  name text,
  primary key(profile_id, campaign_id)
);

create table if not exists public.dim_ad_group (
  profile_id text not null,
  ad_group_id text not null,
  campaign_id text not null,
  name text,
  primary key(profile_id, ad_group_id)
);

-- Search term daily fact table
create table if not exists public.fact_search_term_daily (
  date date not null,
  profile_id text not null,
  campaign_id text not null,
  ad_group_id text not null,
  keyword_text text,           -- for keyword-targeted
  search_term text not null,   -- shopper query
  match_type text not null,    -- exact/phrase/broad/targetingExpression etc
  clicks bigint default 0,
  impressions bigint default 0,
  cost_micros bigint default 0,
  attributed_conversions_1d bigint default 0,
  attributed_conversions_7d bigint default 0,
  attributed_sales_7d_micros bigint default 0,
  primary key (date, profile_id, campaign_id, ad_group_id, search_term, match_type)
);

-- Placement daily fact table  
create table if not exists public.fact_placement_daily (
  date date not null,
  profile_id text not null,
  campaign_id text not null,
  ad_group_id text not null,
  placement text not null,     -- top_of_search, product_pages, rest_of_search, etc
  clicks bigint default 0,
  impressions bigint default 0,
  cost_micros bigint default 0,
  attributed_conversions_7d bigint default 0,
  attributed_sales_7d_micros bigint default 0,
  primary key (date, profile_id, campaign_id, ad_group_id, placement)
);

-- Report jobs tracking table
create table if not exists public.report_jobs (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null,
  report_type text not null,           -- search-term | placement
  start_date date not null,
  end_date date not null,
  status text not null default 'PENDING',
  download_url text,
  error text,
  rows_processed bigint default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for performance
create index if not exists idx_fact_search_term_profile_date on public.fact_search_term_daily (profile_id, date);
create index if not exists idx_fact_placement_profile_date on public.fact_placement_daily (profile_id, date);
create index if not exists idx_report_jobs_profile_created on public.report_jobs (profile_id, created_at desc);

-- Enable RLS on new tables
alter table public.dim_campaign enable row level security;
alter table public.dim_ad_group enable row level security;
alter table public.fact_search_term_daily enable row level security;
alter table public.fact_placement_daily enable row level security;
alter table public.report_jobs enable row level security;

-- RLS policies for dimension tables
create policy "Users can view dimensions through their connections" on public.dim_campaign
  for select using (
    exists (
      select 1 from public.amazon_connections ac 
      where ac.profile_id = dim_campaign.profile_id and ac.user_id = auth.uid()
    )
  );

create policy "Users can manage dimensions through their connections" on public.dim_campaign
  for all using (
    exists (
      select 1 from public.amazon_connections ac 
      where ac.profile_id = dim_campaign.profile_id and ac.user_id = auth.uid()
    )
  );

create policy "Users can view ad group dims through their connections" on public.dim_ad_group
  for select using (
    exists (
      select 1 from public.amazon_connections ac 
      where ac.profile_id = dim_ad_group.profile_id and ac.user_id = auth.uid()
    )
  );

create policy "Users can manage ad group dims through their connections" on public.dim_ad_group
  for all using (
    exists (
      select 1 from public.amazon_connections ac 
      where ac.profile_id = dim_ad_group.profile_id and ac.user_id = auth.uid()
    )
  );

-- RLS policies for fact tables
create policy "Users can view search term facts through their connections" on public.fact_search_term_daily
  for select using (
    exists (
      select 1 from public.amazon_connections ac 
      where ac.profile_id = fact_search_term_daily.profile_id and ac.user_id = auth.uid()
    )
  );

create policy "Users can manage search term facts through their connections" on public.fact_search_term_daily
  for all using (
    exists (
      select 1 from public.amazon_connections ac 
      where ac.profile_id = fact_search_term_daily.profile_id and ac.user_id = auth.uid()
    )
  );

create policy "Users can view placement facts through their connections" on public.fact_placement_daily
  for select using (
    exists (
      select 1 from public.amazon_connections ac 
      where ac.profile_id = fact_placement_daily.profile_id and ac.user_id = auth.uid()
    )
  );

create policy "Users can manage placement facts through their connections" on public.fact_placement_daily
  for all using (
    exists (
      select 1 from public.amazon_connections ac 
      where ac.profile_id = fact_placement_daily.profile_id and ac.user_id = auth.uid()
    )
  );

-- RLS policies for report jobs
create policy "Users can view their report jobs" on public.report_jobs
  for select using (
    exists (
      select 1 from public.amazon_connections ac 
      where ac.profile_id = report_jobs.profile_id and ac.user_id = auth.uid()
    )
  );

create policy "Users can manage their report jobs" on public.report_jobs
  for all using (
    exists (
      select 1 from public.amazon_connections ac 
      where ac.profile_id = report_jobs.profile_id and ac.user_id = auth.uid()
    )
  );