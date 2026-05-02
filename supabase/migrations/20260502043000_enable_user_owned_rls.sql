alter table categories enable row level security;
alter table category_budget_periods enable row level security;
alter table transactions enable row level security;
alter table plaid_item_connections enable row level security;

drop policy if exists categories_user_select on categories;
drop policy if exists categories_user_insert on categories;
drop policy if exists categories_user_update on categories;
drop policy if exists categories_user_delete on categories;

create policy categories_user_select
  on categories for select
  to authenticated
  using (user_id = auth.uid());

create policy categories_user_insert
  on categories for insert
  to authenticated
  with check (user_id = auth.uid());

create policy categories_user_update
  on categories for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy categories_user_delete
  on categories for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists category_budget_periods_user_select on category_budget_periods;
drop policy if exists category_budget_periods_user_insert on category_budget_periods;
drop policy if exists category_budget_periods_user_update on category_budget_periods;
drop policy if exists category_budget_periods_user_delete on category_budget_periods;

create policy category_budget_periods_user_select
  on category_budget_periods for select
  to authenticated
  using (user_id = auth.uid());

create policy category_budget_periods_user_insert
  on category_budget_periods for insert
  to authenticated
  with check (user_id = auth.uid());

create policy category_budget_periods_user_update
  on category_budget_periods for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy category_budget_periods_user_delete
  on category_budget_periods for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists transactions_user_select on transactions;
drop policy if exists transactions_user_insert on transactions;
drop policy if exists transactions_user_update on transactions;
drop policy if exists transactions_user_delete on transactions;

create policy transactions_user_select
  on transactions for select
  to authenticated
  using (user_id = auth.uid());

create policy transactions_user_insert
  on transactions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy transactions_user_update
  on transactions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy transactions_user_delete
  on transactions for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists plaid_item_connections_user_insert on plaid_item_connections;
drop policy if exists plaid_item_connections_user_update on plaid_item_connections;

create policy plaid_item_connections_user_insert
  on plaid_item_connections for insert
  to authenticated
  with check (user_id = auth.uid());

create policy plaid_item_connections_user_update
  on plaid_item_connections for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
