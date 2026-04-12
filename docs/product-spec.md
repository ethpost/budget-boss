# Budgeting App – Source of Truth

## Core Principles
- NOT a cash-flow app
- DO NOT use account balances for decision logic
- Focus on:
  - pace vs budget
  - projected month-end impact
  - historical behavior
  - decision support

## Golden Metric
- Budget Health Score ∈ [-1, 1]
  - negative = under plan
  - 0 = on plan
  - positive = over plan

## Current Stack
- Next.js + Tailwind
- Supabase (Postgres + Auth)
- Vercel
- Plaid TBD
- OpenAI API

## Constraints
- One step at a time
- Do not assume anything not explicitly defined
- Do not modify unrelated parts of the system