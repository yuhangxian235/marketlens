import { readFile } from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";
import {
  generateAgentProposals,
  type LocalMarketSnapshot,
} from "../src/index.js";

const SNAPSHOT_URL = new URL(
  "../fixtures/local-market-snapshot.json",
  import.meta.url,
);
const GENERATED_AT = "2026-07-26T00:00:00.000Z";

let snapshot: LocalMarketSnapshot;

beforeAll(async () => {
  snapshot = JSON.parse(
    await readFile(SNAPSHOT_URL, "utf8"),
  ) as LocalMarketSnapshot;
});

describe("local deterministic Agent Planner interface", () => {
  it("generates the five demo proposals from market signals", () => {
    const proposals = generateAgentProposals({ snapshot, generatedAt: GENERATED_AT });

    expect(
      proposals.map((proposal) => [
        proposal.proposal_id,
        proposal.capability,
        proposal.market_id,
        proposal.outcome,
        proposal.requested_amount,
      ]),
    ).toEqual([
      ["prop-001", "buy_position", "1", "YES", "100000000000000000"],
      ["prop-002", "buy_position", "2", "NO", "8000000000000000000"],
      ["prop-003", "claim_reward", "3", "NOT_APPLICABLE", "0"],
      ["prop-004", "buy_position", "4", "YES", "150000000000000000"],
      ["prop-005", "buy_position", "4", "NO", "150000000000000000"],
    ]);
  });

  it("attaches runtime planning provenance without a verdict", () => {
    const proposals = generateAgentProposals({ snapshot, generatedAt: GENERATED_AT });

    for (const proposal of proposals) {
      expect(proposal.source_type).toBe("SYNTHETIC_AGENT_PROPOSAL");
      expect(proposal.planner_evidence).toMatchObject({
        planner: "@marketlens/agent-planner",
        snapshot_id: snapshot.snapshot_id,
        deterministic: true,
      });
      expect(JSON.stringify(proposal)).not.toMatch(/eligible|blocked|verdict/i);
    }
  });

  it("is deterministic and does not mutate the snapshot", () => {
    const snapshotBefore = structuredClone(snapshot);
    const left = generateAgentProposals({ snapshot, generatedAt: GENERATED_AT });
    const right = generateAgentProposals({ snapshot, generatedAt: GENERATED_AT });

    expect(left).toEqual(right);
    expect(snapshot).toEqual(snapshotBefore);
  });

  it("removes the contrarian market-4 proposal when its signal falls below threshold", () => {
    const changed = structuredClone(snapshot);
    const market = changed.markets.find((entry) => entry.market_id === "4");
    if (!market) throw new Error("Missing market 4 fixture");
    market.contrarian_signal_bps = 6999;

    const proposals = generateAgentProposals({ snapshot: changed, generatedAt: GENERATED_AT });

    expect(proposals).toHaveLength(4);
    expect(
      proposals.filter((proposal) => proposal.market_id === "4").map((proposal) => proposal.outcome),
    ).toEqual(["YES"]);
  });

  it("rejects floating-point or malformed wei inputs", () => {
    const changed = structuredClone(snapshot);
    changed.markets[0]!.momentum_stake_wei = "0.1";

    expect(() =>
      generateAgentProposals({ snapshot: changed, generatedAt: GENERATED_AT }),
    ).toThrow("base-10 unsigned integer string");
  });

  it("rejects invalid basis-point signals", () => {
    const changed = structuredClone(snapshot);
    changed.markets[0]!.momentum_signal_bps = 10_001;

    expect(() =>
      generateAgentProposals({ snapshot: changed, generatedAt: GENERATED_AT }),
    ).toThrow("basis points between 0 and 10000");
  });
});
