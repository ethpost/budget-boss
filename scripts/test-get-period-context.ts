// scripts/test-get-period-context.ts

import { getPeriodContext } from "../lib/budget-health/domain/get-period-context";

console.log(JSON.stringify(getPeriodContext("2026-04-11"), null, 2));
console.log(JSON.stringify(getPeriodContext("2026-02-28"), null, 2));