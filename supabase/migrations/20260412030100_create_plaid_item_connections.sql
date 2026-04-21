create table plaid_item_connections (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  access_token text not null,
  cursor text,
  institution_name text,
  last_sync_at timestamp with time zone,
  last_webhook_at timestamp with time zone,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint plaid_item_connections_item_id_not_blank
    check (btrim(item_id) <> ''),

  constraint plaid_item_connections_access_token_not_blank
    check (btrim(access_token) <> '')
);

create unique index plaid_item_connections_item_id_key
  on plaid_item_connections (item_id);

create index plaid_item_connections_user_idx
  on plaid_item_connections (user_id, created_at desc);

create trigger set_plaid_item_connections_updated_at
before update on plaid_item_connections
for each row
execute function set_updated_at();
