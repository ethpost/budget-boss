create table decision_scenarios (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,

  as_of_date date not null default current_date,
  prompt text not null,

  proposed_amount numeric(10,2) not null,
  merchant_name text,

  historical_average_amount numeric(10,2),
  projected_month_end_variance numeric(10,2),

  health_score_before numeric(8,4),
  health_score_after numeric(8,4),

  recommendation text not null,
  rationale jsonb not null default '{}'::jsonb,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint decision_scenarios_prompt_not_blank
    check (btrim(prompt) <> ''),

  constraint decision_scenarios_recommendation_not_blank
    check (btrim(recommendation) <> ''),

  constraint decision_scenarios_proposed_amount_nonnegative
    check (proposed_amount >= 0),

  constraint decision_scenarios_before_score_range
    check (
      health_score_before is null
      or (health_score_before >= -1 and health_score_before <= 1)
    ),

  constraint decision_scenarios_after_score_range
    check (
      health_score_after is null
      or (health_score_after >= -1 and health_score_after <= 1)
    )
);

create index decision_scenarios_user_date_idx
  on decision_scenarios (user_id, as_of_date desc, created_at desc);

create index decision_scenarios_user_category_idx
  on decision_scenarios (user_id, category_id, created_at desc);

create trigger set_decision_scenarios_updated_at
before update on decision_scenarios
for each row
execute function set_updated_at();