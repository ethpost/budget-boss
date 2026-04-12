create extension if not exists btree_gist;

create table category_budget_periods (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,

  monthly_budget numeric(10,2) not null,
  effective_start_date date not null,
  effective_end_date date,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint category_budget_periods_monthly_budget_nonnegative
    check (monthly_budget >= 0),

  constraint category_budget_periods_valid_date_range
    check (
      effective_end_date is null
      or effective_end_date >= effective_start_date
    )
);

create unique index category_budget_periods_one_open_row_per_category
  on category_budget_periods (user_id, category_id)
  where effective_end_date is null;

alter table category_budget_periods
  add constraint category_budget_periods_no_overlapping_ranges
  exclude using gist (
    user_id with =,
    category_id with =,
    daterange(
      effective_start_date,
      coalesce(effective_end_date + 1, 'infinity'::date),
      '[)'
    ) with &&
  );

create index category_budget_periods_user_category_start_idx
  on category_budget_periods (user_id, category_id, effective_start_date desc);

create trigger set_category_budget_periods_updated_at
before update on category_budget_periods
for each row
execute function set_updated_at();