create table categories (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null,
  description text,

  monthly_budget numeric(10,2) not null,

  is_active boolean not null default true,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);