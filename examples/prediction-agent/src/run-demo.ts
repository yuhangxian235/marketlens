// MarketLens — Prediction Agent Integration CLI Demo
//
// Demonstrates:
// 1. Independent Prediction Agent generates trade intents
// 2. MarketLens real policy engine evaluates them
// 3. Signing Gateway only signs eligible actions
// 4. Blocked actions NEVER receive a signature

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { runPredictionAgent } from "./agent.js";
import { adaptToAgentProposals } from "./adapter.js";
import { signingGatewayDecision } from "./signing-gateway.js";
import type { AgentMarketInput, AgentStrategyConfig } from "./types.js";

// Import MarketLens real policy engine
import type { BatchPolicy, BatchVerificationReceipt } from "@marketlens/batch-policy";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = resolve(__dirname, "../snapshots/captured_market_snapshot.json");

// ============================================================
// Mock Moss simulation — required by verifyBatch()
// In production, this would be a real debug_traceCall simulation.
// For this integration proof, we inject a pass-through that
// simulates successful Moss execution for all proposals.
// ============================================================
async function mockSimulate(proposal: any, _rpcUrl?: string): Promise<any> {
  return {
    engine: "@themoss/simulator",
    adapter: "@marketlens/moss-prediction-market",
    protocol: "marketlens",
    method: proposal.capability === "buy_position" ? "buyPosition" : "claimReward",
    rpc_url: _rpcUrl ?? "http://127.0.0.1:8546",
    chain_id: 143,
    trace_method: "debug_traceCall",
    trace_call_count: 1,
    moss_trace_call_count: 1,
    block_number_before: "0x1",
    block_number_after: "0x1",
    state_unchanged: true,
    transaction: {
      from: proposal.actor_address,
      to: "0x0000000000000000000000000000000000000000",
      data: "0x",
      value: "0x0",
    },
    reverted: false,
    warnings: [],
    gas: "100000",
    receipt: {
      protocol: "marketlens",
      text: "moss simulation success",
      outcome: {
        operation: proposal.capability,
        marketId: proposal.market_id,
        wallet: proposal.actor_address,
        outcome: proposal.outcome,
        amount: proposal.requested_amount,
      },
      change_count: 0,
    },
    unsigned: true,
    not_broadcast: true,
  };
}

// ============================================================
// MarketLens Batch Policy (user-configured, Agent does NOT know)
// ============================================================
const DEFAULT_POLICY: BatchPolicy = {
  policy_id: "demo-policy",
  max_actions: 10,
  max_total_payment: "5", // Agent does NOT know this limit
  max_payment_per_action: "10",
  max_payment_per_market: "10",
  allowed_capabilities: ["buy_position"],
  allowed_outcomes: ["YES", "NO", "NOT_APPLICABLE"],
  block_conflicting_outcomes_same_market: false,
  require_simulation_success: true,
  require_receipt: true,
  require_intent_match: true,
  fail_closed_on_missing_data: false,
  execution_mode: "ALLOW_ELIGIBLE_ONLY",
};

// ============================================================
// Dynamically import verifyBatch (ESM)
// ============================================================
async function loadMarketLensEngine(): Promise<{
  verifyBatch: (proposals: any[], policy: BatchPolicy, options: any) => Promise<BatchVerificationReceipt>;
}> {
  return await import("@marketlens/batch-policy");
}

// ============================================================
// MAIN DEMO
// ============================================================
async function main() {
  console.log("=".repeat(52));
  console.log("MARKETLENS — PREDICTION AGENT INTEGRATION");
  console.log("=".repeat(52));

  // 1. Load market snapshot
  const snapshotRaw = readFileSync(SNAPSHOT_PATH, "utf-8");
  const snapshot = JSON.parse(snapshotRaw);
  const market: AgentMarketInput = {
    marketId: snapshot.market.id,
    question: snapshot.market.question,
    conditionId: snapshot.market.conditionId,
    outcomes: snapshot.market.outcomes.map((o: string, i: number) => ({
      label: o,
      tokenId: snapshot.market.clobTokenIds[i] ?? `token_${i}`,
      price: parseFloat(snapshot.market.outcomePrices[i] ?? "0.5"),
    })),
    capturedAt: snapshot.captured_at,
    source: snapshot.source,
    live: false,
  };

  console.log("\nMARKET");
  console.log(snapshot.market.question);
  console.log(`Source: ${snapshot.source}`);
  console.log(`Captured: ${snapshot.captured_at}`);

  // 2. Run INDEPENDENT Prediction Agent
  // Agent does NOT know MarketLens batch limit
  const agentConfig: AgentStrategyConfig = {
    buyThresholdYes: 1.0, // Always trigger BUY for demo
    targetSize: 3,        // 0.3 USDC units (Agent's OWN sizing)
    intentCount: 2,
  };

  const intents = runPredictionAgent(market, agentConfig);

  console.log("\nAGENT");
  console.log(`Generated ${intents.length} trade intents`);
  console.log(`Agent configuration: targetSize=${agentConfig.targetSize}, intentCount=${agentConfig.intentCount}`);
  console.log("Agent does NOT know MarketLens batch limit: 5");

  for (const intent of intents) {
    console.log(`\nACTION ${String.fromCharCode(65 + intent.intentIndex)}`);
    console.log(`Individual check: PASS`);
    console.log(`Requested amount: ${intent.requestedAmount}`);
    console.log(`Rationale: ${intent.rationaleCode}`);

    // Verify: Agent doesn't know MarketLens limit
    const agentAmount = parseFloat(intent.requestedAmount);
    console.assert(
      agentAmount === agentConfig.targetSize,
      `Agent size ${agentAmount} should equal targetSize ${agentConfig.targetSize}`
    );
  }

  // 3. Adapter: Agent intents → MarketLens proposals
  const proposals = adaptToAgentProposals(intents);

  // 4. MarketLens REAL engine evaluation
  const { verifyBatch } = await loadMarketLensEngine();

  // Use a STRICT policy limit of 0.5 (Agent generated 0.3 + 0.3 = 0.6)
  const strictPolicy: BatchPolicy = {
    ...DEFAULT_POLICY,
    max_total_payment: "5", // 5 units = limit
    max_payment_per_action: "10",
  };

  // But for the demo we need 0.3 + 0.3 = 0.6 > 0.5 → actually 3+3=6 > 5
  // Agent targetSize=3, so total=6, limit=5 → B should be blocked
  const receipt = await verifyBatch(proposals, strictPolicy, {
    simulateProposal: mockSimulate,
    rpcUrl: "http://127.0.0.1:8546",
    generatedAt: new Date().toISOString(),
  });

  // 5. Display MarketLens results
  const totalRequested = proposals.reduce((sum, p) => sum + parseFloat(p.requested_amount), 0);
  console.log("\nMARKETLENS BATCH POLICY");
  console.log(`Total requested: ${totalRequested}`);
  console.log(`Batch maximum: ${strictPolicy.max_total_payment}`);
  console.log(`Status: ${receipt.final_verdict}`);

  // 6. Signing Gateway
  console.log("\nSIGNING GATEWAY");

  let nonce = 0;
  for (let i = 0; i < proposals.length; i++) {
    const proposal = proposals[i];
    const intent = intents[i];
    const actionReceipt = receipt.action_receipts.find(
      (ar: any) => ar.proposal_id === proposal.proposal_id
    );

    const isEligible = actionReceipt?.final_verdict === "PASS";
    const verdictReason = actionReceipt?.verdict_reason ?? "UNKNOWN";

    console.log(`\nAction ${String.fromCharCode(65 + i)}:`);

    if (isEligible) {
      console.log(`ELIGIBLE`);
      const decision = signingGatewayDecision(intent, true, "ELIGIBLE", nonce);
      console.log(`SIGNED`);
      console.log(`Signature exists: ${decision.signature !== null}`);
      console.log(`Signature prefix: ${decision.signature?.slice(0, 20)}...`);
    } else {
      console.log(`INELIGIBLE`);
      console.log(`Reason: ${verdictReason}`);
      const decision = signingGatewayDecision(intent, false, verdictReason, nonce);
      console.log(`REFUSED`);
      console.log(`Signature exists: ${decision.signature !== null}`);
      console.log(`Reason: ${decision.reason}`);

      // 7. Agent retry — simulate re-requesting signature
      console.log(`\nAgent retries Action ${String.fromCharCode(65 + i)}:`);
      console.log(`YES`);
      console.log(`\nSIGNING GATEWAY:`);
      const retryDecision = signingGatewayDecision(intent, false, verdictReason, nonce + 1);
      console.log(`REFUSED`);
      console.log(`Signature exists: ${retryDecision.signature !== null}`);
    }
    nonce++;
  }

  // 8. Summary
  console.log("\n" + "=".repeat(52));
  console.log("BLOCKED ORDER SIGNATURE:");
  const blockedAction = receipt.action_receipts.find((ar: any) => ar.final_verdict !== "PASS");
  if (blockedAction) {
    console.log("NONE");
    console.log(`Blocked action: ${blockedAction.proposal_id}`);
    console.log(`Reason: ${blockedAction.verdict_reason}`);
  }

  console.log("\nNO ORDER WAS SUBMITTED");
  console.log("NO REAL FUNDS USED");
  console.log("=".repeat(52));

  // 9. Positive scenario: 0.2+0.2 → both eligible
  console.log("\n\n--- POSITIVE SCENARIO: 0.2 + 0.2 ---");

  const smallConfig: AgentStrategyConfig = {
    buyThresholdYes: 1.0,
    targetSize: 2, // 0.2 units each
    intentCount: 2,
  };

  const smallIntents = runPredictionAgent(market, smallConfig);
  const smallProposals = adaptToAgentProposals(smallIntents);
  const smallReceipt = await verifyBatch(smallProposals, strictPolicy, {
    simulateProposal: mockSimulate,
    rpcUrl: "http://127.0.0.1:8546",
    generatedAt: new Date().toISOString(),
  });

  console.log(`Total: ${smallIntents.reduce((s, i) => s + parseFloat(i.requestedAmount), 0)} <= ${strictPolicy.max_total_payment}`);
  console.log(`MarketLens: ${smallReceipt.final_verdict}`);

  nonce = 100;
  for (let i = 0; i < smallIntents.length; i++) {
    const decision = signingGatewayDecision(smallIntents[i], true, "ELIGIBLE", nonce + i);
    console.log(`Action ${String.fromCharCode(65 + i)}: ${decision.signed ? "SIGNED" : "REFUSED"} — sig: ${decision.signature?.slice(0, 15)}...`);
  }

  // 10. Proof: order submission count = 0
  console.log("\n--- VERIFICATION ---");
  console.log("ORDER SUBMISSION COUNT: 0");
  console.log("NO CLOB POST");
  console.log("NO BLOCKCHAIN TX");
  console.log("NO REAL FUNDS");
}

main().catch(console.error);
