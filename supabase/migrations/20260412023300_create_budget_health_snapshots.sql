create table budget_health_snapshots (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,

  as_of_date date not null,
  period_month date not null,

  health_score numeric(8,4) not null,
  spend_to_date numeric(10,2) not null,
  budget_to_date numeric(10,2) not null,
  projected_month_end_spend numeric(10,2) not null,
  projected_month_end_variance numeric(10,2) not null,

  calculation_version text not null default 'v1',
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamp with time zone not null default now(),

  constraint budget_health_snapshots_score_range
    check (health_score >= -1 and health_score <= 1),

  constraint budget_health_snapshots_period_month_is_month_start
    check (period_month = date_trunc('month', period_month)::date)
);

create unique index budget_health_snapshots_user_date_month_version_key
  on budget_health_snapshots (user_id, as_of_date, period_month, calculation_version);

create index budget_health_snapshots_user_month_idx
  on budget_health_snapshots (user_id, period_month desc, as_of_date desc);