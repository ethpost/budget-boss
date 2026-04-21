# Transaction Import Contract

Use this shape for any bank feed or export that should land in `transactions`.

## Required fields
- `source`
- `sourceTransactionId`
- `transactionDate` in `YYYY-MM-DD`
- `amount`

## Optional fields
- `merchantName`
- `description`
- `notes`
- `categoryId`

## Example

```json
[
  {
    "source": "plaid",
    "sourceTransactionId": "tx_123",
    "transactionDate": "2026-04-11",
    "amount": 12.35,
    "merchantName": "Coffee Shop",
    "description": "Morning latte",
    "notes": "Imported from bank feed",
    "categoryId": "cat-coffee"
  }
]
```

## Import command

```bash
npm run import:transactions -- --user-id <uuid> --input <path-to-json>
```

The import script normalizes the feed rows, then upserts into `transactions`
using the verified schema fields and the `source` + `source_transaction_id`
dedupe key.

## Plaid command

```bash
npm run import:plaid-transactions -- --user-id <uuid> --input <path-to-json>
```

The Plaid adapter accepts either:
- an array of Plaid transactions, or
- an object with a `transactions` array

Pending Plaid transactions are skipped by default so only confirmed activity
reaches the budget math.

## Live Plaid sync

```bash
npm run sync:plaid-transactions -- --user-id <uuid> --access-token <token>
```

Required Plaid env vars:
- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- `PLAID_ENV` (`sandbox`, `development`, or `production`)

The live sync uses Plaid's transaction fetch endpoint over a deterministic date
window, then routes the rows through the same normalization and upsert path.
