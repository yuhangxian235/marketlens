import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  verifyBatchArtifacts,
  type BatchArtifactSet,
} from "../integrity.js";

const packageRoot = new URL("../../", import.meta.url);
const publishedRoot = new URL(
  "../../../../web/public/data/batch-verification/",
  import.meta.url,
);

async function readJson<T>(url: URL): Promise<T> {
  return JSON.parse(await readFile(url, "utf8")) as T;
}

async function loadArtifacts(): Promise<BatchArtifactSet> {
  return {
    plannerSnapshot: await readJson(
      new URL("../agent-planner/fixtures/local-market-snapshot.json", packageRoot),
    ),
    fixturePolicy: await readJson(new URL("fixtures/policy.json", packageRoot)),
    publishedProposals: await readJson(new URL("proposals.json", publishedRoot)),
    publishedPolicy: await readJson(new URL("policy.json", publishedRoot)),
    simulations: await readJson(new URL("simulation-results.json", publishedRoot)),
    receipt: await readJson(new URL("batch-receipt.json", publishedRoot)),
    manifest: await readJson(new URL("manifest.json", publishedRoot)),
  };
}

describe("published Batch Policy artifacts", () => {
  it("verifies fixture, Moss evidence, Receipt hashes, counts, and safety boundaries", async () => {
    const result = verifyBatchArtifacts(await loadArtifacts());

    expect(result).toMatchObject({
      status: "VERIFIED",
      proposal_count: 5,
      action_receipt_count: 5,
      simulation_count: 5,
    });
    expect(result.check_count).toBeGreaterThanOrEqual(99);
  });

  it("fails closed when an Action Receipt is edited without recomputing its hash", async () => {
    const artifacts = await loadArtifacts();
    artifacts.receipt.action_receipts[0] = {
      ...artifacts.receipt.action_receipts[0],
      verdict_reason: "TAMPERED",
    };

    expect(() => verifyBatchArtifacts(artifacts)).toThrow(
      "prop-001 receipt hash mismatch",
    );
  });

  it("fails closed when published Moss evidence diverges from the Action Receipt", async () => {
    const artifacts = await loadArtifacts();
    artifacts.simulations["prop-003"] = {
      ...artifacts.simulations["prop-003"],
      state_unchanged: false,
    };

    expect(() => verifyBatchArtifacts(artifacts)).toThrow(
      "prop-003 published simulation differs from action receipt",
    );
  });
});
