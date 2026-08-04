import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  verifyPublishedBatchArtifacts,
  type PublishedBatchArtifactSet,
} from "../browser-integrity.js";

const publishedRoot = new URL(
  "../../../../web/public/data/batch-verification/",
  import.meta.url,
);

async function readJson<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(new URL(name, publishedRoot), "utf8")) as T;
}

async function loadPublishedArtifacts(): Promise<PublishedBatchArtifactSet> {
  return {
    proposals: await readJson("proposals.json"),
    policy: await readJson("policy.json"),
    simulations: await readJson("simulation-results.json"),
    receipt: await readJson("batch-receipt.json"),
    manifest: await readJson("manifest.json"),
  };
}

describe("browser Batch Receipt verification", () => {
  it("verifies the complete published artifact set with Web Crypto", async () => {
    const result = await verifyPublishedBatchArtifacts(
      await loadPublishedArtifacts(),
    );

    expect(result).toMatchObject({
      status: "VERIFIED",
      check_count: 62,
      proposal_count: 5,
      action_receipt_count: 5,
      simulation_count: 5,
    });
  });

  it("rejects a policy that no longer matches its published hash", async () => {
    const artifacts = await loadPublishedArtifacts();
    artifacts.policy.max_actions = 4;

    await expect(verifyPublishedBatchArtifacts(artifacts)).rejects.toThrow(
      "policy hash mismatch",
    );
  });

  it("rejects a modified Action Receipt before the workflow is unlocked", async () => {
    const artifacts = await loadPublishedArtifacts();
    artifacts.receipt.action_receipts[4] = {
      ...artifacts.receipt.action_receipts[4],
      batch_level_verdict: "PASS",
    };

    await expect(verifyPublishedBatchArtifacts(artifacts)).rejects.toThrow(
      "prop-005 Action Receipt hash mismatch",
    );
  });
});
