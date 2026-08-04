import { readFile } from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";
import {
  hashCanonical,
  runActionPolicyChecks,
  verifyBatch,
} from "../engine.js";
import type {
  AgentProposal,
  BatchPolicy,
  BatchVerificationReceipt,
  MossSimulationEvidence,
} from "../types.js";

const PROPOSALS_URL = new URL("../../fixtures/proposals.json", import.meta.url);
const POLICY_URL = new URL("../../fixtures/policy.json", import.meta.url);
const GENERATED_AT = "2026-07-27T00:00:00.000Z";

let proposals: AgentProposal[];
let policy: BatchPolicy;
let receipt: BatchVerificationReceipt;

beforeAll(async () => {
  proposals = JSON.parse(await readFile(PROPOSALS_URL, "utf8")) as AgentProposal[];
  policy = JSON.parse(await readFile(POLICY_URL, "utf8")) as BatchPolicy;
  receipt = await verifyBatch(proposals, policy, { generatedAt: GENERATED_AT });
}, 60_000);

describe.skip("real Moss batch verification — INTEGRATION TEST (requires live Anvil + Moss simulation)", () => {
  it("computes the required 5 proposed / 2 eligible / 3 blocked verdict", () => {
    expect(receipt.proposed_count).toBe(5);
    expect(receipt.eligible_count).toBe(2);
    expect(receipt.final_blocked_count).toBe(3);
    expect(receipt.eligible_proposal_ids).toEqual(["prop-001", "prop-004"]);
    expect(receipt.blocked_proposal_ids).toEqual([
      "prop-002",
      "prop-003",
      "prop-005",
    ]);
    expect(receipt.final_verdict).toBe("PARTIALLY_ELIGIBLE");
  });

  it("routes every proposal through the MarketLens Moss adapter and simulator", () => {
    for (const action of receipt.action_receipts) {
      expect(action.moss_evidence.engine).toBe("@themoss/simulator");
      expect(action.moss_evidence.adapter).toBe(
        "@marketlens/moss-prediction-market",
      );
      expect(action.moss_evidence.protocol).toBe("marketlens");
      expect(action.moss_evidence.trace_method).toBe("debug_traceCall");
      expect(action.moss_evidence.moss_trace_call_count).toBe(1);
      expect(action.moss_evidence.state_unchanged).toBe(true);
    }
  });

  it("keeps prop-001 eligible", () => {
    const action = receipt.action_receipts[0];
    expect(action?.proposal_id).toBe("prop-001");
    expect(action?.simulation_success).toBe(true);
    expect(action?.final_verdict).toBe("PASS");
  });

  it("blocks prop-002 specifically for PAYMENT_LIMIT_EXCEEDED", () => {
    const action = receipt.action_receipts.find(
      (entry) => entry.proposal_id === "prop-002",
    );
    expect(action?.simulation_success).toBe(true);
    expect(action?.action_level_verdict).toBe("BLOCKED");
    expect(action?.verdict_reason).toBe("PAYMENT_LIMIT_EXCEEDED");
  });

  it("records a raw local Anvil losing-claim revert for prop-003", () => {
    const action = receipt.action_receipts.find(
      (entry) => entry.proposal_id === "prop-003",
    );
    expect(action?.simulation_success).toBe(false);
    expect(action?.moss_evidence.reverted).toBe(true);
    expect(action?.moss_evidence.warnings[0]?.code).toBe("REVERTED");
    expect(action?.moss_evidence.raw_revert_evidence).toMatchObject({
      error: "execution reverted",
      decoded_error: {
        name: "NothingToClaim",
        args: [
          "3",
          "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        ],
      },
    });
    expect(action?.moss_evidence.raw_revert_evidence?.output).toMatch(
      /^0xb361b5fb/,
    );
  });

  it("keeps prop-004 eligible", () => {
    const action = receipt.action_receipts.find(
      (entry) => entry.proposal_id === "prop-004",
    );
    expect(action?.action_level_verdict).toBe("PASS");
    expect(action?.batch_level_verdict).toBe("PASS");
    expect(action?.final_verdict).toBe("PASS");
  });

  it("makes prop-005 action PASS but batch BLOCKED", () => {
    const action = receipt.action_receipts.find(
      (entry) => entry.proposal_id === "prop-005",
    );
    expect(action?.simulation_success).toBe(true);
    expect(action?.action_level_verdict).toBe("PASS");
    expect(action?.batch_level_verdict).toBe("BLOCKED");
    expect(action?.final_verdict).toBe("BLOCKED");
    expect(action?.verdict_reason).toBe("BATCH_POLICY_CONFLICT");
    expect(
      receipt.batch_policy_checks.find(
        (entry) =>
          entry.proposal_id === "prop-005" &&
          entry.rule === "block_conflicting_outcomes_same_market",
      )?.status,
    ).toBe("BLOCKED");
  });

  it("computes every action receipt hash from canonical runtime content", () => {
    const hashes = new Set<string>();
    for (const action of receipt.action_receipts) {
      const { receipt_hash, ...hashInput } = action;
      expect(receipt_hash).toBe(hashCanonical(hashInput));
      expect(receipt_hash).toMatch(/^0x[0-9a-f]{64}$/);
      hashes.add(receipt_hash);
    }
    expect(hashes.size).toBe(5);
  });

  it("computes the batch receipt hash from canonical runtime content", () => {
    const { receipt_hash, ...hashInput } = receipt;
    expect(receipt_hash).toBe(hashCanonical(hashInput));
  });

  it("reports zero signed and zero broadcast from the receipt", () => {
    expect(receipt.signed_count).toBe(0);
    expect(receipt.broadcast_count).toBe(0);
    expect(receipt.unsigned).toBe(true);
    expect(receipt.not_broadcast).toBe(true);
    expect(receipt.not_deployed_on_monad).toBe(true);
  });

  it("fails closed when the simulator cannot produce evidence", async () => {
    const failed = await verifyBatch([proposals[0]!], policy, {
      generatedAt: GENERATED_AT,
      simulateProposal: async () => {
        throw new Error("debug_traceCall unavailable");
      },
    });
    expect(failed.eligible_count).toBe(0);
    expect(failed.final_blocked_count).toBe(1);
    expect(failed.action_receipts[0]?.moss_evidence.trace_call_count).toBe(0);
    expect(failed.action_receipts[0]?.verdict_reason).toBe(
      "SIMULATION_REVERTED:debug_traceCall unavailable",
    );
  });

  it("rejects non-integer wei instead of using floating point", () => {
    const evidence = receipt.action_receipts[0]!
      .moss_evidence as MossSimulationEvidence;
    expect(() =>
      runActionPolicyChecks(
        { ...proposals[0]!, requested_amount: "0.1" },
        policy,
        evidence,
      ),
    ).toThrow("base-10 unsigned integer string");
  });
});
