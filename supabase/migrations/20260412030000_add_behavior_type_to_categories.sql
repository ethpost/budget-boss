-- Add behavior_type column to categories

alter table public.categories
add column behavior_type text;

-- Restrict allowed values

alter table public.categories
add constraint categories_behavior_type_check
check (behavior_type in ('fixed', 'variable', 'discretionary'));