alter table categories
  drop column monthly_budget;

alter table categories
  add constraint categories_name_not_blank
  check (btrim(name) <> '');

create unique index categories_user_active_name_key
  on categories (user_id, lower(name))
  where is_active = true;

create trigger set_categories_updated_at
before update on categories
for each row
execute function set_updated_at();