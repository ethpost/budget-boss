alter table transactions
  add constraint transactions_user_source_transaction_id_unique
  unique (user_id, source, source_transaction_id);
