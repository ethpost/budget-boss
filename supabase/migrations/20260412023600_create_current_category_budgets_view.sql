create view current_category_budgets as
select
  cbp.id,
  cbp.user_id,
  cbp.category_id,
  cbp.monthly_budget,
  cbp.effective_start_date,
  cbp.effective_end_date
from category_budget_periods cbp
where cbp.effective_end_date is null;