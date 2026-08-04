import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  createUnsignedAllowlist,
  evaluateBatchWithEvidence,
  hashCanonical,
} from "../index.js";
import type {
  AgentProposal,
  BatchPolicy,
  MossSimulationEvidence,
} from "../types.js";

const publishedRoot = new URL(
  "../../../../web/public/data/batch-verification/",
  import.meta.url,
);
const GENERATED_AT = "2026-08-03T00:00:00.000Z";

async function readJson<T>(name: string): Promise<T> {
  return JSON.parse(
    await readFile(new URL(name, publishedRoot), "utf8"),
  ) as T;
}

async function loadPublishedEvidence(): Promise<{
  proposals: AgentProposal[];
  policy: BatchPolicy;
  simulations: Record<string, MossSimulationEvidence>;
}> {
  return {
    proposals: await readJson<AgentProposal[]>("proposals.json"),
    policy: await readJson<BatchPolicy>("policy.json"),
    simulations: await readJson<Record<string, MossSimulationEvidence>>(
      "simulation-results.json",
    ),
  };
}

describe("policy evaluation over verified Moss evidence", () => {
  it("reproduces the published 2-of-5 verdict with the default policy", async () => {
    const { proposals, policy, simulations } = await loadPublishedEvidence();

    const receipt = await evaluateBatchWithEvidence(
      proposals,
      policy,
      simulations,
      { generatedAt: GENERATED_AT },
    );

    expect(receipt.eligible_proposal_ids).toEqual(["prop-001", "prop-004"]);
    expect(receipt.blocked_proposal_ids).toEqual([
      "prop-002",
      "prop-003",
      "prop-005",
    ]);
    expect(receipt.signed_count).toBe(0);
    expect(receipt.broadcast_count).toBe(0);
  });

  it("re-evaluates policy without replacing the real Moss evidence", async () => {
    const { proposals, policy, simulations } = await loadPublishedEvidence();
    const relaxedPolicy: BatchPolicy = {
      ...policy,
      policy_id: "interactive-user-policy-v1",
      max_total_payment: "10000000000000000000",
      max_payment_per_action: "10000000000000000000",
      max_payment_per_market: "10000000000000000000",
      block_conflicting_outcomes_same_market: false,
    };

    const receipt = await evaluateBatchWithEvidence(
      proposals,
      relaxedPolicy,
      simulations,
      { generatedAt: GENERATED_AT },
    );

    expect(receipt.eligible_proposal_ids).toEqual([
      "prop-001",
      "prop-002",
      "prop-004",
      "prop-005",
    ]);
    expect(receipt.blocked_proposal_ids).toEqual(["prop-003"]);
    expect(
      receipt.action_receipts.find(
        (action) => action.proposal_id === "prop-003",
      )?.moss_evidence.raw_revert_evidence?.decoded_error?.name,
    ).toBe("NothingToClaim");
    expect(
      receipt.action_receipts.every(
        (action) => action.moss_evidence === simulations[action.proposal_id],
      ),
    ).toBe(true);
  });

  it("fails closed when the evidence set is incomplete or contains unknown IDs", async () => {
    const { proposals, policy, simulations } = await loadPublishedEvidence();
    const { "prop-003": missing, ...incomplete } = simulations;
    void missing;

    await expect(
      evaluateBatchWithEvidence(proposals, policy, incomplete),
    ).rejects.toThrow("Missing Moss evidence for prop-003");

    await expect(
      evaluateBatchWithEvidence(proposals, policy, {
        ...simulations,
        "prop-999": simulations["prop-001"]!,
      }),
    ).rejects.toThrow("Unexpected Moss evidence for prop-999");
  });
});

describe("unsigned allowlist artifact", () => {
  it("contains only eligible actions and hashes canonical runtime content", async () => {
    const { proposals, policy, simulations } = await loadPublishedEvidence();
    const receipt = await evaluateBatchWithEvidence(
      proposals,
      policy,
      simulations,
      { generatedAt: GENERATED_AT },
    );

    const allowlist = createUnsignedAllowlist(receipt, policy);
    const { allowlist_hash: allowlistHash, ...hashInput } = allowlist;

    expect(allowlist.artifact_type).toBe(
      "UNSIGNED_ELIGIBLE_ACTION_ALLOWLIST",
    );
    expect(allowlist.eligible_actions.map((action) => action.proposal_id)).toEqual([
      "prop-001",
      "prop-004",
    ]);
    expect(allowlist.blocked_actions.map((action) => action.proposal_id)).toEqual([
      "prop-002",
      "prop-003",
      "prop-005",
    ]);
    expect(allowlist.signed_count).toBe(0);
    expect(allowlist.broadcast_count).toBe(0);
    expect(allowlist.boundaries).toEqual([
      "UNSIGNED",
      "NOT BROADCAST",
      "NOT DEPLOYED ON MONAD",
    ]);
    expect(allowlistHash).toBe(hashCanonical(hashInput));
    expect(allowlistHash).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
