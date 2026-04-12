alter table transactions
  add constraint transactions_source_not_blank
  check (btrim(source) <> '');

create index transactions_user_date_idx
  on transactions (user_id, transaction_date desc);

create index transactions_user_category_date_idx
  on transactions (user_id, category_id, transaction_date desc);

create index transactions_user_merchant_date_idx
  on transactions (user_id, merchant_name, transaction_date desc)
  where merchant_name is not null;

create trigger set_transactions_updated_at
before update on transactions
for each row
execute function public.set_updated_at();