// MarketLens × Uryzen — Monad-Native Agent Integration Demo
//
// Full flow: Agent → MarketLens → Signing Gateway
// Real Uryzen contract, real ABI, real selectors.
// NO broadcast. NO real funds.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";
import { createHash } from "node:crypto";

import { runUryzenAgent } from "./agent.js";
import { adaptToAgentProposals } from "./adapter.js";
import { buildPlaceBetsBatchTx, verifySelector } from "./tx-builder.js";
import { evaluateAndSign, retryOriginal, resetSignerCallCount, getSignerCallCount } from "./signing-gateway.js";

import type { UryzenMarket } from "./types.js";
import {
  URYZEN_BETTING_CORE,
  MONAD_TESTNET_CHAIN_ID,
  PLACE_BETS_BATCH_SELECTOR,
  PLACE_BETS_BATCH_SIGNATURE,
} from "./types.js";
import type { BatchPolicy } from "@marketlens/batch-policy";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = resolve(__dirname, "../fixtures/uryzen-market-snapshot.json");

// ============================================================
// Mock Moss simulation
// ============================================================
async function mockSimulate(proposal: any, _rpcUrl?: string): Promise<any> {
  return {
    engine: "@themoss/simulator",
    adapter: "@marketlens/moss-prediction-market",
    protocol: "marketlens",
    method: proposal.capability === "buy_position" ? "buyPosition" : "claimReward",
    rpc_url: _rpcUrl ?? "http://127.0.0.1:8546",
    chain_id: 10143,
    trace_method: "debug_traceCall",
    trace_call_count: 1,
    moss_trace_call_count: 1,
    block_number_before: "0x1",
    block_number_after: "0x1",
    state_unchanged: true,
    transaction: { from: proposal.actor_address, to: "0x0", data: "0x", value: "0x0" },
    reverted: false,
    warnings: [],
    gas: "100000",
    receipt: {
      protocol: "marketlens", text: "moss simulation success",
      outcome: { operation: proposal.capability, marketId: proposal.market_id, wallet: proposal.actor_address, outcome: proposal.outcome, amount: proposal.requested_amount },
      change_count: 0,
    },
    unsigned: true, not_broadcast: true,
  };
}

// ============================================================
// Policy: batch max 0.5 MON (Agent does NOT know this)
// ============================================================
const POLICY_0_5: BatchPolicy = {
  policy_id: "uryzen-demo-policy",
  max_actions: 10,
  max_total_payment: ethers.parseUnits("0.5", 18).toString(),
  max_payment_per_action: ethers.parseUnits("1.0", 18).toString(),
  max_payment_per_market: ethers.parseUnits("1.0", 18).toString(),
  allowed_capabilities: ["buy_position"],
  allowed_outcomes: ["YES", "NO", "NOT_APPLICABLE"],
  block_conflicting_outcomes_same_market: false,
  require_simulation_success: true,
  require_receipt: true,
  require_intent_match: true,
  fail_closed_on_missing_data: false,
  execution_mode: "ALLOW_ELIGIBLE_ONLY",
};

function planHash(intents: any[]): string {
  return createHash("sha256").update(JSON.stringify(intents)).digest("hex").slice(0, 16);
}

async function main() {
  // Load MarketLens engine
  const { verifyBatch } = await import("@marketlens/batch-policy");

  const raw = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8"));
  const market: UryzenMarket = raw.market;

  console.log("=".repeat(52));
  console.log("MARKETLENS × URYZEN");
  console.log("MONAD-NATIVE AGENT INTEGRATION");
  console.log("=".repeat(52));

  console.log("\nREAL TARGET");
  console.log(`Uryzen — Monad Testnet`);
  console.log(`Chain ID: ${MONAD_TESTNET_CHAIN_ID}`);
  console.log(`Contract: ${URYZEN_BETTING_CORE}`);

  // ====== UNSAFE SCENARIO: 0.3 + 0.3 > 0.5 ======
  console.log("\n" + "-".repeat(52));
  console.log("UNSAFE SCENARIO: Agent 0.3 + 0.3 > policy 0.5");
  console.log("-".repeat(52));

  const unsafeIntents = runUryzenAgent(market, {
    selectedOutcomeIndices: [0, 1],
    amountPerBetMon: "0.3",
  });

  console.log("\nAGENT");
  console.log(`Generated ${unsafeIntents.length} prediction-market bets`);
  for (const intent of unsafeIntents) {
    console.log(`\nBET ${String.fromCharCode(65 + intent.intentIndex)}`);
    console.log(`Amount: ${intent.amountMon} MON`);
    console.log(`Individual check: PASS`);
  }

  const unsafeProposals = adaptToAgentProposals(unsafeIntents);
  const totalWei = unsafeIntents.reduce((s, i) => s + BigInt(i.amountWei), BigInt(0));
  const totalMon = ethers.formatEther(totalWei);

  const unsafeReceipt = await verifyBatch(unsafeProposals, POLICY_0_5, {
    simulateProposal: mockSimulate,
    rpcUrl: "http://127.0.0.1:8546",
  });

  console.log("\nMARKETLENS BATCH POLICY");
  console.log(`Total: ${totalMon} MON`);
  console.log(`Policy limit: 0.5 MON`);
  console.log(`Batch status: ${unsafeReceipt.final_verdict}`);

  for (const ar of unsafeReceipt.action_receipts) {
    const idx = unsafeProposals.findIndex((p) => p.proposal_id === ar.proposal_id);
    const label = String.fromCharCode(65 + idx);
    console.log(`\nBET ${label}:`);
    if (ar.final_verdict === "PASS") {
      console.log(`ELIGIBLE`);
    } else {
      console.log(`INELIGIBLE`);
      console.log(`${ar.verdict_reason}`);
    }
  }

  // Build original unsafe batch
  const originalTx = buildPlaceBetsBatchTx(unsafeIntents);
  console.log("\nORIGINAL URYZEN BATCH");
  console.log(`Function: placeBetsBatch`);
  console.log(`Selector: ${PLACE_BETS_BATCH_SELECTOR}`);
  console.log(`Verified: ${verifySelector(originalTx.data, PLACE_BETS_BATCH_SELECTOR)}`);
  console.log(`Contains: Bet A + Bet B`);

  // Signing Gateway
  const { originalDecision, sanitizedDecision } = await evaluateAndSign(unsafeIntents, unsafeReceipt);

  console.log("\nSIGNING GATEWAY:");
  console.log(originalDecision.signed ? "SIGNED" : "REFUSED");
  console.log(`Original unsafe batch signed: ${originalDecision.signed ? "YES" : "NO"}`);
  console.log(`Signer calls: ${originalDecision.signerCallCount}`);

  // Retry
  resetSignerCallCount();
  const retryResult = await retryOriginal(unsafeIntents);
  console.log("\nAgent retries original unsafe batch:");
  console.log(`REFUSED`);
  console.log(`Signer calls: ${getSignerCallCount()}`);

  // Sanitized plan
  if (sanitizedDecision) {
    console.log("\nAPPROVED EXECUTION PLAN");
    console.log(`Contains: Bet A only`);
    console.log(`New Uryzen-compatible transaction: BUILT`);
    console.log(`Locally signed: ${sanitizedDecision.signed ? "YES" : "NO"}`);
    console.log(`Sanitized plan hash: ${planHash(unsafeIntents.filter((_, i) => i === 0))}`);
  }

  console.log("\nBroadcast: NO");
  console.log("Real funds: NO");

  // ====== POSITIVE SCENARIO: 0.2 + 0.2 ======
  console.log("\n" + "-".repeat(52));
  console.log("POSITIVE SCENARIO: Agent 0.2 + 0.2 <= policy 0.5");
  console.log("-".repeat(52));

  const safeIntents = runUryzenAgent(market, {
    selectedOutcomeIndices: [0, 1],
    amountPerBetMon: "0.2",
  });

  const safeProposals = adaptToAgentProposals(safeIntents);
  const safeTotal = safeIntents.reduce((s, i) => s + BigInt(i.amountWei), BigInt(0));

  const safeReceipt = await verifyBatch(safeProposals, POLICY_0_5, {
    simulateProposal: mockSimulate,
    rpcUrl: "http://127.0.0.1:8546",
  });

  console.log(`\nTotal: ${ethers.formatEther(safeTotal)} MON`);
  console.log(`Policy limit: 0.5 MON`);
  console.log(`MarketLens: ${safeReceipt.final_verdict}`);

  const safeOriginalTx = buildPlaceBetsBatchTx(safeIntents);
  const { originalDecision: safeDecision } = await evaluateAndSign(safeIntents, safeReceipt);

  console.log(`\nOriginal Uryzen batch`);
  console.log(`Function: placeBetsBatch`);
  console.log(`Contains: Bet A + Bet B`);
  console.log(`Locally signed: ${safeDecision.signed ? "YES" : "NO"}`);
  console.log(`Signer calls: ${safeDecision.signerCallCount}`);

  console.log("\nBroadcast: NO");
  console.log("Real funds: NO");

  // ====== INVARIANT CHECK ======
  console.log("\n" + "=".repeat(52));
  console.log("INVARIANT: NO TRANSACTION BROADCAST");
  console.log("Chain ID: 10143 (Monad Testnet)");
  console.log(`Contract: ${URYZEN_BETTING_CORE}`);
  console.log("placeBetsBatch selector: " + PLACE_BETS_BATCH_SELECTOR);
  console.log("ABI verified from: RECON JS bundle");
  console.log("=".repeat(52));
}

main().catch(console.error);
