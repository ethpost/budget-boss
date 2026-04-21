create table decision_scenario_evidence (
  id uuid primary key default gen_random_uuid(),

  scenario_id uuid not null references decision_scenarios(id) on delete cascade,
  transaction_id uuid references transactions(id) on delete set null,

  evidence_kind text not null,
  evidence_summary text,

  created_at timestamp with time zone not null default now(),

  constraint decision_scenario_evidence_kind_not_blank
    check (btrim(evidence_kind) <> '')
);

create index decision_scenario_evidence_scenario_idx
  on decision_scenario_evidence (scenario_id);

create index decision_scenario_evidence_transaction_idx
  on decision_scenario_evidence (transaction_id)
  where transaction_id is not null;