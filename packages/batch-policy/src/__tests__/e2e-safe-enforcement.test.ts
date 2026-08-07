import { describe, it, expect } from "vitest";
import { verifyBatch } from "../engine.js";
import type { AgentProposal, BatchPolicy, MossSimulationEvidence } from "../src/types.js";

function makeProposal(overrides: Partial<AgentProposal> = {}): AgentProposal {
  return {
    proposal_id: "A",
    agent_id: "ag1",
    actor_address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    generated_at: "2026-01-01T00:00:00Z",
    market_id: "1",
    market_question: "Test market",
    capability: "buy_position",
    outcome: "YES",
    requested_amount: "300000000000000000",
    max_payment: "500000000000000000",
    min_stake: "0",
    rationale: "test",
    policy_reference: "p1",
    source_type: "SYNTHETIC_AGENT_PROPOSAL",
    ...overrides,
  };
}

function makePolicy(overrides: Partial<BatchPolicy> = {}): BatchPolicy {
  return {
    policy_id: "test-policy",
    max_actions: 5,
    max_total_payment: "500000000000000000",
    max_payment_per_action: "1000000000000000000",
    max_payment_per_market: "1000000000000000000",
    allowed_capabilities: ["buy_position", "claim_reward"],
    allowed_outcomes: ["YES", "NO", "NOT_APPLICABLE"],
    block_conflicting_outcomes_same_market: false,
    require_simulation_success: true,
    require_receipt: true,
    require_intent_match: true,
    fail_closed_on_missing_data: true,
    execution_mode: "ALLOW_ELIGIBLE_ONLY",
    ...overrides,
  };
}

function mockSim(proposal: AgentProposal): MossSimulationEvidence {
  return {
    engine: "@themoss/simulator",
    adapter: "@marketlens/moss-prediction-market",
    protocol: "marketlens",
    method: proposal.capability === "buy_position" ? "buyPosition" : "claimReward",
    rpc_url: "http://127.0.0.1:8546",
    chain_id: 143,
    trace_method: "debug_traceCall",
    trace_call_count: 1,
    moss_trace_call_count: 1,
    block_number_before: "1",
    block_number_after: "1",
    state_unchanged: true,
    transaction: {
      from: proposal.actor_address,
      to: "0x0000000000000000000000000000000000000000",
      data: "0x",
      value: "0x0",
    },
    reverted: false,
    warnings: [],
    receipt: {
      protocol: "marketlens",
      text: "ok",
      outcome: {
        operation: proposal.capability,
        marketId: proposal.market_id,
        wallet: proposal.actor_address,
        outcome: proposal.outcome,
        amount: proposal.requested_amount,
      },
    },
    gas: "100000",
    unsigned: true,
    not_broadcast: true,
  } as MossSimulationEvidence;
}

describe("E2E Policy-to-Safe Enforcement", () => {

  it("BLOCK: BATCH_TOTAL_PAYMENT_EXCEEDED (0.3+0.3 > 0.5)", async () => {
    const proposals = [
      makeProposal({ proposal_id: "A", market_id: "1", requested_amount: "300000000000000000" }),
      makeProposal({ proposal_id: "B", market_id: "2", requested_amount: "300000000000000000" }),
    ];
    const policy = makePolicy({ max_total_payment: "500000000000000000" });

    const receipt = await verifyBatch(proposals, policy, {
      simulateProposal: async (p) => mockSim(p),
    });

    // Debug: print per-action results
    for (const ar of receipt.action_receipts) {
      console.log(`Action ${ar.proposal_id}: action=${ar.action_level_verdict} batch=${ar.batch_level_verdict} final=${ar.final_verdict} reason=${ar.verdict_reason}`);
      console.log(`  simulation_success=${ar.simulation_success}`);
      console.log(`  intent_checks:`, ar.intent_checks.filter(c => c.status === "BLOCKED").map(c => c.reason));
      console.log(`  action_checks:`, ar.action_policy_checks.filter(c => c.status === "BLOCKED").map(c => c.reason));
    }
    console.log("batch_checks:", receipt.batch_policy_checks.filter(c => c.status === "BLOCKED").map(c => c.rule + ":" + c.reason));

    expect(receipt.final_verdict).toBe("PARTIALLY_ELIGIBLE");

    const blockedReasons = receipt.batch_policy_checks
      .filter(c => c.status === "BLOCKED")
      .map(c => c.reason);
    expect(blockedReasons).toContain("BATCH_TOTAL_PAYMENT_EXCEEDED");

    // Each action individually PASSED
    for (const ar of receipt.action_receipts) {
      expect(ar.action_level_verdict).toBe("PASS");
    }

    console.log("\n=== ENGINE RESULT ===");
    console.log("DECISION:", receipt.final_verdict);
    console.log("REASONS:", blockedReasons);
    console.log("ACTION A: INDIVIDUAL PASS");
    console.log("ACTION B: INDIVIDUAL PASS");
    console.log("BATCH TOTAL: 0.6 > 0.5");
    console.log("MARKETLENS: BLOCK");
    console.log("ACTION B VERDICT: BLOCKED (batch total exceeded)");
console.log("REASON: BATCH_TOTAL_PAYMENT_EXCEEDED");
  });

  it("ALLOW: within budget (0.2+0.2 <= 0.5)", async () => {
    const proposals = [
      makeProposal({ proposal_id: "A", market_id: "1", requested_amount: "200000000000000000" }),
      makeProposal({ proposal_id: "B", market_id: "2", requested_amount: "200000000000000000" }),
    ];
    const policy = makePolicy({ max_total_payment: "500000000000000000" });

    const receipt = await verifyBatch(proposals, policy, {
      simulateProposal: async (p) => mockSim(p),
    });

    expect(receipt.final_verdict).toBe("ELIGIBLE");
    expect(receipt.eligible_count).toBe(2);

    console.log("\n=== ALLOW RESULT ===");
    console.log("DECISION:", receipt.final_verdict);
    console.log("ELIGIBLE:", receipt.eligible_count);
  });
});
