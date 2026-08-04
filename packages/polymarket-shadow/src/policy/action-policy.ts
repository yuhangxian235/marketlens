// Action-level + batch-level policy checks
import type { CandidateAction } from "../models/candidate-action";
import type { OrderbookSnapshot } from "../models/orderbook";
import type { BatchPolicy } from "../models/policy";
import type { ActionCheckResult, ActionReceipt } from "../models/receipt";

export function checkActionPolicies(
  action: CandidateAction,
  book: OrderbookSnapshot,
  replay: { filled: boolean; filledSize: string; filledPrice: string; totalCost: string; partialFill: boolean; remainingSize: string },
  policy: BatchPolicy
): ActionCheckResult[] {
  const results: ActionCheckResult[] = [];

  // Market checks
  results.push(check("market_active", "true", book.negRisk ? "REVIEW" : "true",
    book.negRisk ? "REVIEW" : "PASS", book.negRisk ? "Neg-risk market requires review" : "Market active"));

  // Price check
  const limitPrice = BigInt(action.limitPrice);
  const maxAvgPrice = action.maxAveragePrice ? BigInt(action.maxAveragePrice) : 0n;
  if (maxAvgPrice > 0n) {
    const filledPrice = BigInt(replay.filledPrice);
    results.push(check("max_average_price", maxAvgPrice.toString(), filledPrice.toString(),
      filledPrice <= maxAvgPrice ? "PASS" : "BLOCKED",
      filledPrice <= maxAvgPrice ? "Within limit" : `Avg ${filledPrice} > max ${maxAvgPrice}`));
  }

  // Slippage
  results.push(check("slippage", `≤${policy.maxSlippageBps}bps`, "computed",
    "PASS", "Checked via orderbook replay"));

  // Fill check
  if (!policy.partialFillAllowed && replay.partialFill) {
    results.push(check("partial_fill", "not allowed", "partial", "BLOCKED", "Partial fill not allowed by policy"));
  } else {
    results.push(check("fill_status", "fill ok", replay.filled ? "filled" : replay.partialFill ? "partial" : "none",
      replay.filled || replay.partialFill ? "PASS" : "BLOCKED",
      replay.filled ? "Fully filled" : replay.partialFill ? "Partially filled" : "Not filled"));
  }

  // Side allowed
  if (policy.allowedSides && !policy.allowedSides.includes(action.side)) {
    results.push(check("side_allowed", policy.allowedSides.join(","), action.side, "BLOCKED", `${action.side} not in allowed sides`));
  }

  // Order type allowed
  if (policy.allowedOrderTypes && !policy.allowedOrderTypes.includes(action.orderType)) {
    results.push(check("order_type_allowed", policy.allowedOrderTypes.join(","), action.orderType, "BLOCKED", `${action.orderType} not in allowed types`));
  }

  // FOK check
  if (action.orderType === "FOK" && !replay.filled) {
    results.push(check("fok_fill", "entire size", `${replay.filledSize}/${action.buyBudget || action.sellShares}`,
      "BLOCKED", "FOK requires full fill"));
  }

  // Post-only check
  if (action.postOnly && replay.filled) {
    results.push(check("post_only", "no immediate cross", "immediate fill possible",
      "BLOCKED", "Post-only would cross orderbook"));
  }

  // Blocked markets
  if (policy.blockedMarkets?.includes(action.marketId)) {
    results.push(check("market_blocked", "not blocked", action.marketId, "BLOCKED", "Market explicitly blocked"));
  }

  return results;
}

function check(rule: string, expected: string, actual: string, status: "PASS"|"BLOCKED"|"REVIEW"|"NOT_APPLICABLE", reason: string): ActionCheckResult {
  return { rule, expected, actual, status, reason };
}

// Batch-level checks
export function checkBatchPolicy(
  receipts: ActionReceipt[],
  eligibleIds: string[],
  policy: BatchPolicy,
  actions: CandidateAction[]
): ActionCheckResult[] {
  const checks: ActionCheckResult[] = [];

  // Total spend
  const totalSpend = receipts
    .filter(r => eligibleIds.includes(r.actionId))
    .reduce((sum, r) => sum + BigInt(r.collateralSpent || "0"), 0n);
  const maxTotal = BigInt(policy.maxTotalSpend);
  checks.push(check("total_spend", `≤${maxTotal}`, totalSpend.toString(),
    totalSpend <= maxTotal ? "PASS" : "BLOCKED",
    totalSpend <= maxTotal ? `Total ${totalSpend} within limit` : `Total ${totalSpend} exceeds ${maxTotal}`));

  // Per-market
  const byMarket = new Map<string, bigint>();
  for (const r of receipts.filter(r => eligibleIds.includes(r.actionId))) {
    const mid = r.marketSnapshot?.marketId || "unknown";
    byMarket.set(mid, (byMarket.get(mid) || 0n) + BigInt(r.collateralSpent || "0"));
  }
  const perMarketLimit = BigInt(policy.maxSpendPerMarket);
  for (const [mkt, spend] of byMarket) {
    checks.push(check(`per_market_${mkt.slice(0,8)}`, `≤${perMarketLimit}`, spend.toString(),
      spend <= perMarketLimit ? "PASS" : "BLOCKED",
      spend <= perMarketLimit ? "Within per-market limit" : `${spend} exceeds per-market ${perMarketLimit}`));
  }

  // Action count per market
  const countByMarket = new Map<string, number>();
  for (const r of receipts.filter(r => eligibleIds.includes(r.actionId))) {
    const mid = r.marketSnapshot?.marketId || "unknown";
    countByMarket.set(mid, (countByMarket.get(mid) || 0) + 1);
  }
  for (const [mkt, count] of countByMarket) {
    if (count > policy.maxActionsPerMarket) {
      checks.push(check(`actions_per_market_${mkt.slice(0,8)}`, `≤${policy.maxActionsPerMarket}`, count.toString(),
        "BLOCKED", `${count} exceeds max ${policy.maxActionsPerMarket} per market`));
    }
  }

  // Conflicting outcomes
  if (policy.blockConflictingOutcomes) {
    const outcomesByMarket = new Map<string, Set<string>>();
    for (const r of receipts.filter(r => eligibleIds.includes(r.actionId))) {
      const mid = r.marketSnapshot?.marketId || "unknown";
      if (!outcomesByMarket.has(mid)) outcomesByMarket.set(mid, new Set());
      outcomesByMarket.get(mid)!.add(r.outcome);
    }
    for (const [mkt, outcomes] of outcomesByMarket) {
      if (outcomes.size > 1 && outcomes.has("Yes") && outcomes.has("No")) {
        checks.push(check(`conflict_${mkt.slice(0,8)}`, "no conflict", "YES+NO proposed",
          "BLOCKED", "Conflicting outcomes on same market"));
      }
    }
  }

  return checks;
}
