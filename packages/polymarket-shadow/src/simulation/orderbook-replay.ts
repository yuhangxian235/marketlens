// Deterministic orderbook replay engine
// Uses string-based arithmetic throughout — no floating point.
import type { BookLevel, OrderbookSnapshot } from "../models/orderbook";
import type { CandidateAction } from "../models/candidate-action";

export interface ReplayResult {
  actionId: string;
  filled: boolean;
  filledSize: string;       // shares filled (string)
  filledPrice: string;      // average fill price in cents (string)
  remainingSize: string;    // unfilled shares (string)
  worstPrice: string;
  totalCost: string;        // total spent (cents × shares, in cent-units)
  levelsConsumed: number;
  partialFill: boolean;
  warnings: string[];
}

/** Walk ask levels for a BUY. All arithmetic in bigint via strings. */
export function replayBuy(
  action: CandidateAction,
  book: OrderbookSnapshot,
  maxSlippageBps: number
): ReplayResult {
  const limitCents = BigInt(action.limitPrice);
  const maxPrice = limitCents + (limitCents * BigInt(maxSlippageBps)) / 10000n;
  const size = BigInt(action.maxSpend || action.buyBudget || "0");
  const maxSpend = BigInt(action.maxSpend || "0");

  let remaining = size;
  let totalCost = 0n;
  let totalFilled = 0n;
  let worstPrice = 0n;
  let levels = 0;
  const warnings: string[] = [];

  const asks = [...book.asks].sort((a, b) => {
    const ap = BigInt(a.price), bp = BigInt(b.price);
    return ap < bp ? -1 : ap > bp ? 1 : 0;
  });

  for (const level of asks) {
    const price = BigInt(level.price);
    if (price > maxPrice) break;
    const avail = BigInt(level.size);
    const take = remaining < avail ? remaining : avail;
    if (take <= 0n) break;

    totalCost += take * price;
    totalFilled += take;
    remaining -= take;
    worstPrice = price > worstPrice ? price : worstPrice;
    levels++;
    if (remaining <= 0n) break;
  }

  if (totalFilled === 0n) {
    warnings.push("No fill: no asks within limit price + slippage");
    return { actionId: action.actionId, filled: false, filledSize: "0", filledPrice: "0",
      remainingSize: size.toString(), worstPrice: "0", totalCost: "0",
      levelsConsumed: 0, partialFill: false, warnings };
  }

  if (maxSpend > 0n && totalCost > maxSpend) {
    warnings.push(`Estimated cost ${totalCost} exceeds max spend ${maxSpend}`);
    return { actionId: action.actionId, filled: false, filledSize: "0", filledPrice: "0",
      remainingSize: size.toString(), worstPrice: worstPrice.toString(), totalCost: totalCost.toString(),
      levelsConsumed: levels, partialFill: false, warnings };
  }

  const avgPrice = totalCost / totalFilled;
  const partial = totalFilled < size;

  if (partial) warnings.push(`Partial fill: ${totalFilled}/${size} shares`);

  return {
    actionId: action.actionId,
    filled: !partial || totalFilled === size,
    filledSize: totalFilled.toString(),
    filledPrice: avgPrice.toString(),
    remainingSize: remaining.toString(),
    worstPrice: worstPrice.toString(),
    totalCost: totalCost.toString(),
    levelsConsumed: levels,
    partialFill: partial,
    warnings,
  };
}

/** Walk bid levels for a SELL. */
export function replaySell(
  action: CandidateAction,
  book: OrderbookSnapshot,
  maxSlippageBps: number
): ReplayResult {
  const limitCents = BigInt(action.limitPrice);
  const minPrice = limitCents - (limitCents * BigInt(maxSlippageBps)) / 10000n;
  const size = BigInt(action.sellShares || "0");
  if (size <= 0n) {
    return { actionId: action.actionId, filled: false, filledSize: "0", filledPrice: "0",
      remainingSize: "0", worstPrice: "0", totalCost: "0",
      levelsConsumed: 0, partialFill: false, warnings: ["No shares to sell"] };
  }

  let remaining = size;
  let totalRevenue = 0n;
  let totalFilled = 0n;
  let worstPrice = 999999n;
  let levels = 0;
  const warnings: string[] = [];

  const bids = [...book.bids].sort((a, b) => {
    const ap = BigInt(a.price), bp = BigInt(b.price);
    return ap > bp ? -1 : ap < bp ? 1 : 0; // descending
  });

  for (const level of bids) {
    const price = BigInt(level.price);
    if (price < minPrice) break;
    const avail = BigInt(level.size);
    const take = remaining < avail ? remaining : avail;
    if (take <= 0n) break;

    totalRevenue += take * price;
    totalFilled += take;
    remaining -= take;
    worstPrice = price < worstPrice ? price : worstPrice;
    levels++;
    if (remaining <= 0n) break;
  }

  if (totalFilled === 0n) {
    warnings.push("No fill: no bids within limit price - slippage");
    return { actionId: action.actionId, filled: false, filledSize: "0", filledPrice: "0",
      remainingSize: size.toString(), worstPrice: "0", totalCost: "0",
      levelsConsumed: 0, partialFill: false, warnings };
  }

  const avgPrice = totalRevenue / totalFilled;
  const partial = totalFilled < size;
  if (partial) warnings.push(`Partial fill: ${totalFilled}/${size} shares`);

  return {
    actionId: action.actionId,
    filled: !partial,
    filledSize: totalFilled.toString(),
    filledPrice: avgPrice.toString(),
    remainingSize: remaining.toString(),
    worstPrice: worstPrice === 999999n ? "0" : worstPrice.toString(),
    totalCost: totalRevenue.toString(), // revenue for sell
    levelsConsumed: levels,
    partialFill: partial,
    warnings,
  };
}

/** Dispatch based on side */
export function replayOrder(
  action: CandidateAction,
  book: OrderbookSnapshot,
  maxSlippageBps: number
): ReplayResult {
  if (action.side === "BUY") return replayBuy(action, book, maxSlippageBps);
  return replaySell(action, book, maxSlippageBps);
}
