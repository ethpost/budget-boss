create table transactions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,

  transaction_date date not null,
  amount numeric(10,2) not null,

  merchant_name text,
  description text,
  source text not null,
  source_transaction_id text,
  notes text,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create unique index transactions_user_source_transaction_id_key
  on transactions (user_id, source, source_transaction_id)
  where source_transaction_id is not null;