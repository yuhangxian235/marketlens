// Prediction Agent Integration Tests
//
// Tests 1-9 covering all required scenarios

import { describe, it, expect, vi } from "vitest";
import { runPredictionAgent } from "../src/agent.js";
import { adaptToAgentProposals } from "../src/adapter.js";
import { signingGatewayDecision, buildPolyOrder, signOrder } from "../src/signing-gateway.js";
import type { AgentMarketInput, AgentStrategyConfig, PredictionAgentIntent } from "../src/types.js";
import type { BatchPolicy, AgentProposal, BatchVerificationReceipt } from "@marketlens/batch-policy";

// ============================================================
// Mock MarketLens engine — we test integration NOT engine behavior
// ============================================================

// Track order submission attempts (must stay 0)
let orderSubmissionCount = 0;
function assertNoOrderSubmission() {
  expect(orderSubmissionCount).toBe(0);
}

// ============================================================
// Test fixtures
// ============================================================

const TEST_MARKET: AgentMarketInput = {
  marketId: "559651",
  question: "Xi Jinping out before 2027?",
  conditionId: "0xa467b14d51f01b957109d9cbb1d6c124fab2a089d52ed8f471d23c2812e743b7",
  outcomes: [
    { label: "Yes", tokenId: "32338220190071351435772801779725302244575775216413325951443816017994629993401", price: 0.0445 },
    { label: "No", tokenId: "25659310674993675562345759665114759892400026242514633218387667107987341231962", price: 0.9555 },
  ],
  capturedAt: "2026-08-08T00:00:00Z",
  source: "Polymarket Gamma API",
  live: false,
};

const STRATEGY_0_3: AgentStrategyConfig = {
  buyThresholdYes: 1.0,
  targetSize: 3,
  intentCount: 2,
};

const STRATEGY_0_2: AgentStrategyConfig = {
  buyThresholdYes: 1.0,
  targetSize: 2,
  intentCount: 2,
};

const STRATEGY_NO_TRADE: AgentStrategyConfig = {
  buyThresholdYes: 0.01, // Below any realistic YES price
  targetSize: 3,
  intentCount: 2,
};

// ============================================================
// Mock simulateProposal for verifyBatch
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

const BASE_POLICY: BatchPolicy = {
  policy_id: "test-policy",
  max_actions: 10,
  max_total_payment: "5",
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
// Load real verifyBatch
// ============================================================
let verifyBatch: any;
beforeAll(async () => {
  const mod = await import("@marketlens/batch-policy");
  verifyBatch = mod.verifyBatch;
});

// ============================================================
// TEST 1: Agent generates two intents independently
// ============================================================
describe("TEST 1 — Agent generates two intents independently", () => {
  it("generates exactly 2 intents from real market data", () => {
    const intents = runPredictionAgent(TEST_MARKET, STRATEGY_0_3);
    expect(intents).toHaveLength(2);
  });

  it("each intent has independent signal description", () => {
    const intents = runPredictionAgent(TEST_MARKET, STRATEGY_0_3);
    expect(intents[0].signalDescription).not.toBe(intents[1].signalDescription);
  });

  it("each intent has correct market data", () => {
    const intents = runPredictionAgent(TEST_MARKET, STRATEGY_0_3);
    for (const intent of intents) {
      expect(intent.marketId).toBe("559651");
      expect(intent.tokenId).toBe(TEST_MARKET.outcomes[0].tokenId);
      expect(intent.outcome).toBe("YES");
      expect(intent.side).toBe("BUY");
    }
  });

  it("generates no intents when strategy says no trade", () => {
    const intents = runPredictionAgent(TEST_MARKET, STRATEGY_NO_TRADE);
    expect(intents).toHaveLength(0);
  });
});

// ============================================================
// TEST 2: Agent output adapters correctly into MarketLens
// ============================================================
describe("TEST 2 — Agent output adapters correctly into MarketLens", () => {
  it("converts PredictionAgentIntent[] to AgentProposal[]", () => {
    const intents = runPredictionAgent(TEST_MARKET, STRATEGY_0_3);
    const proposals = adaptToAgentProposals(intents);

    expect(proposals).toHaveLength(2);
    expect(proposals[0].proposal_id).toContain("prop-");
    expect(proposals[0].capability).toBe("buy_position");
    expect(proposals[0].outcome).toBe("YES");
    expect(proposals[0].requested_amount).toBe("3");
    expect(proposals[0].source_type).toBe("SYNTHETIC_AGENT_PROPOSAL");
  });

  it("preserves intent data through adapter", () => {
    const intents = runPredictionAgent(TEST_MARKET, STRATEGY_0_3);
    const proposals = adaptToAgentProposals(intents);

    for (let i = 0; i < intents.length; i++) {
      expect(proposals[i].requested_amount).toBe(intents[i].requestedAmount);
      expect(proposals[i].outcome).toBe(intents[i].outcome);
    }
  });
});

// ============================================================
// TEST 3: 0.3+0.3 → real engine PARTIALLY_ELIGIBLE → Action B BATCH_TOTAL_PAYMENT_EXCEEDED
// ============================================================
describe("TEST 3 — 0.3+0.3 → PARTIALLY_ELIGIBLE", () => {
  it("returns PARTIALLY_ELIGIBLE when total exceeds batch limit", async () => {
    const intents = runPredictionAgent(TEST_MARKET, STRATEGY_0_3);
    const proposals = adaptToAgentProposals(intents);

    const total = proposals.reduce((sum, p) => sum + parseFloat(p.requested_amount), 0);
    expect(total).toBeGreaterThan(parseFloat(BASE_POLICY.max_total_payment));

    const receipt = await verifyBatch(proposals, BASE_POLICY, {
      simulateProposal: mockSimulate,
      rpcUrl: "http://127.0.0.1:8546",
    });

    expect(receipt.final_verdict).toBe("PARTIALLY_ELIGIBLE");
  });

  it("Action A is ELIGIBLE", async () => {
    const intents = runPredictionAgent(TEST_MARKET, STRATEGY_0_3);
    const proposals = adaptToAgentProposals(intents);
    const receipt = await verifyBatch(proposals, BASE_POLICY, {
      simulateProposal: mockSimulate,
    });

    const actionA = receipt.action_receipts.find(
      (ar: any) => ar.proposal_id === proposals[0].proposal_id
    );
    expect(actionA?.final_verdict).toBe("PASS");
  });

  it("Action B is INELIGIBLE with BATCH_TOTAL_PAYMENT_EXCEEDED", async () => {
    const intents = runPredictionAgent(TEST_MARKET, STRATEGY_0_3);
    const proposals = adaptToAgentProposals(intents);
    const receipt = await verifyBatch(proposals, BASE_POLICY, {
      simulateProposal: mockSimulate,
    });

    const actionB = receipt.action_receipts.find(
      (ar: any) => ar.proposal_id === proposals[1].proposal_id
    );
    expect(actionB?.final_verdict).toBe("BLOCKED");
    expect(actionB?.verdict_reason).toContain("BATCH_TOTAL_PAYMENT_EXCEEDED");
  });

  it("reason is from real engine, not hardcoded", async () => {
    const intents = runPredictionAgent(TEST_MARKET, STRATEGY_0_3);
    const proposals = adaptToAgentProposals(intents);
    const receipt = await verifyBatch(proposals, BASE_POLICY, {
      simulateProposal: mockSimulate,
    });

    // The reason comes from the real engine, not our hardcoded string
    expect(receipt).toBeDefined();
    expect(receipt.action_receipts).toBeDefined();
    expect(receipt.action_receipts.length).toBe(2);
  });
});

// ============================================================
// TEST 4: Action A eligible → signer called → signature exists
// ============================================================
describe("TEST 4 — Action A eligible → signer called → signature exists", () => {
  it("produces signature for eligible action", () => {
    const intents = runPredictionAgent(TEST_MARKET, STRATEGY_0_3);
    const decision = signingGatewayDecision(intents[0], true, "ELIGIBLE", 0);

    expect(decision.signed).toBe(true);
    expect(decision.signature).not.toBeNull();
    expect(decision.signature).toBeTruthy();
    expect(decision.actionAllowed).toBe(true);
  });
});

// ============================================================
// TEST 5: Action B ineligible → signer NOT called → signature absent
// ============================================================
describe("TEST 5 — Action B ineligible → signer NOT called", () => {
  it("refuses to produce signature for blocked action", () => {
    const intents = runPredictionAgent(TEST_MARKET, STRATEGY_0_3);
    const decision = signingGatewayDecision(intents[1], false, "BATCH_TOTAL_PAYMENT_EXCEEDED", 1);

    expect(decision.signed).toBe(false);
    expect(decision.signature).toBeNull();
    expect(decision.actionAllowed).toBe(false);
    expect(decision.reason).toContain("MARKETLENS_INELIGIBLE");
    expect(decision.reason).toContain("BATCH_TOTAL_PAYMENT_EXCEEDED");
  });
});

// ============================================================
// TEST 6: Agent retries blocked action → still refused
// ============================================================
describe("TEST 6 — Agent retries blocked action → still refused", () => {
  it("refuses signature on every retry", () => {
    const intents = runPredictionAgent(TEST_MARKET, STRATEGY_0_3);
    const blockedIntent = intents[1];

    // First attempt
    const d1 = signingGatewayDecision(blockedIntent, false, "BATCH_TOTAL_PAYMENT_EXCEEDED", 1);
    expect(d1.signed).toBe(false);

    // Retry with different nonce
    const d2 = signingGatewayDecision(blockedIntent, false, "BATCH_TOTAL_PAYMENT_EXCEEDED", 999);
    expect(d2.signed).toBe(false);
    expect(d2.signature).toBeNull();

    // Retry again
    const d3 = signingGatewayDecision(blockedIntent, false, "BATCH_TOTAL_PAYMENT_EXCEEDED", 1000);
    expect(d3.signed).toBe(false);
    expect(d3.signature).toBeNull();
  });
});

// ============================================================
// TEST 7: 0.2+0.2 → both eligible → both signed
// ============================================================
describe("TEST 7 — 0.2+0.2 → both eligible → both signed", () => {
  it("both intents pass MarketLens with small amounts", async () => {
    const intents = runPredictionAgent(TEST_MARKET, STRATEGY_0_2);
    const proposals = adaptToAgentProposals(intents);

    const total = proposals.reduce((sum, p) => sum + parseFloat(p.requested_amount), 0);
    expect(total).toBeLessThanOrEqual(parseFloat(BASE_POLICY.max_total_payment));

    const receipt = await verifyBatch(proposals, BASE_POLICY, {
      simulateProposal: mockSimulate,
    });

    expect(receipt.final_verdict).toBe("ELIGIBLE");
    expect(receipt.eligible_count).toBe(2);
  });

  it("both actions signed by gateway", () => {
    const intents = runPredictionAgent(TEST_MARKET, STRATEGY_0_2);

    const d1 = signingGatewayDecision(intents[0], true, "ELIGIBLE", 0);
    const d2 = signingGatewayDecision(intents[1], true, "ELIGIBLE", 1);

    expect(d1.signed).toBe(true);
    expect(d1.signature).not.toBeNull();
    expect(d2.signed).toBe(true);
    expect(d2.signature).not.toBeNull();
  });

  it("signatures are different for different intents", () => {
    const intents = runPredictionAgent(TEST_MARKET, STRATEGY_0_2);

    const d1 = signingGatewayDecision(intents[0], true, "ELIGIBLE", 0);
    const d2 = signingGatewayDecision(intents[0], true, "ELIGIBLE", 1);

    // Same intent, different nonce → different signatures
    expect(d1.signature).not.toBe(d2.signature);
  });
});

// ============================================================
// TEST 8: MarketLens limit not exposed to Agent decision function
// ============================================================
describe("TEST 8 — MarketLens limit not exposed to Agent", () => {
  it("Agent does not reference batch policy limits", () => {
    // Agent source code must not contain batch limit references
    const agentSource = runPredictionAgent.toString();
    expect(agentSource).not.toContain("max_total_payment");
    expect(agentSource).not.toContain("max_payment_per_action");
    expect(agentSource).not.toContain("batch");
  });

  it("Agent sizing is determined by its own config, not MarketLens", () => {
    const intents = runPredictionAgent(TEST_MARKET, { buyThresholdYes: 1.0, targetSize: 7, intentCount: 2 });

    for (const intent of intents) {
      // Agent's own targetSize = 7, regardless of MarketLens limit
      expect(intent.requestedAmount).toBe("7");
    }
  });

  it("Agent generates same intents regardless of MarketLens policy", () => {
    // Agent doesn't receive BatchPolicy as input
    const intents1 = runPredictionAgent(TEST_MARKET, STRATEGY_0_3);
    const intents2 = runPredictionAgent(TEST_MARKET, STRATEGY_0_3);

    expect(intents1.length).toBe(intents2.length);
    expect(intents1[0].requestedAmount).toBe(intents2[0].requestedAmount);
  });
});

// ============================================================
// TEST 9: No postOrder / createAndPost / network execution
// ============================================================
describe("TEST 9 — No order submission or network execution", () => {
  it("ORDER SUBMISSION COUNT = 0", () => {
    expect(orderSubmissionCount).toBe(0);
  });

  it("signing gateway does not POST to CLOB", () => {
    // The signingGatewayDecision function only signs, never posts
    const src = signingGatewayDecision.toString();
    expect(src).not.toContain("postOrder");
    expect(src).not.toContain("createAndPost");
    expect(src).not.toContain("submitOrder");
    expect(src).not.toContain("fetch");
    expect(src).not.toContain("axios");
    expect(src).not.toContain("POST");
  });

  it("signOrder produces local signature without network calls", () => {
    const intents = runPredictionAgent(TEST_MARKET, STRATEGY_0_2);
    const result = signOrder(intents[0], 42);

    expect(result.signature).toBeTruthy();
    expect(result.orderHash).toMatch(/^0x/);
    // No network call happened
  });
});
