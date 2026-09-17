-- Trendloom — Consumer Trend Intelligence 데이터 모델 (기획서 8장)
-- raw_search_trend 는 append-only 로그다. 절대 UPDATE/DELETE 로 원본을 덮어쓰지 않는다(재현성 원칙).

create extension if not exists pgcrypto;

create table if not exists keyword_master (
  keyword_id uuid primary key default gen_random_uuid(),
  keyword text not null unique,
  normalized_keyword text,
  category text,
  subcategory text,
  synonyms text[] default '{}',
  seasonality text,
  created_at timestamptz not null default now()
);

create table if not exists raw_search_trend (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  keyword_group text not null,
  keyword text not null,
  gender text not null check (gender in ('f', 'm')),
  age_group text not null,
  period_start date not null,
  period_end date not null,
  relative_value numeric not null,
  collected_at timestamptz not null default now()
);

create index if not exists idx_raw_search_trend_lookup
  on raw_search_trend (keyword_group, gender, age_group, period_start);

create table if not exists trend_metric (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid not null references keyword_master (keyword_id),
  gender text not null check (gender in ('f', 'm')),
  age_group text not null,
  period text not null,
  current_value numeric not null,
  previous_value numeric not null,
  change_rate numeric not null,
  rank int,
  trend_direction text not null check (trend_direction in ('RISING', 'STABLE', 'FALLING')),
  calculated_at timestamptz not null default now()
);

create index if not exists idx_trend_metric_lookup
  on trend_metric (keyword_id, gender, age_group, period);

create table if not exists pinterest_reference (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid not null references keyword_master (keyword_id),
  search_query text not null,
  image_url text,
  destination_url text not null,
  title text,
  collected_at timestamptz not null default now()
);

create index if not exists idx_pinterest_reference_keyword
  on pinterest_reference (keyword_id);
