import { readFile } from "node:fs/promises";
import { verifyBatchArtifacts } from "../dist/index.js";

const packageRoot = new URL("../", import.meta.url);
const projectRoot = new URL("../../../", import.meta.url);
const publishedRoot = new URL("web/public/data/batch-verification/", projectRoot);

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

const result = verifyBatchArtifacts({
  plannerSnapshot: await readJson(
    new URL("../agent-planner/fixtures/local-market-snapshot.json", packageRoot),
  ),
  fixturePolicy: await readJson(new URL("fixtures/policy.json", packageRoot)),
  publishedProposals: await readJson(new URL("proposals.json", publishedRoot)),
  publishedPolicy: await readJson(new URL("policy.json", publishedRoot)),
  simulations: await readJson(new URL("simulation-results.json", publishedRoot)),
  receipt: await readJson(new URL("batch-receipt.json", publishedRoot)),
  manifest: await readJson(new URL("manifest.json", publishedRoot)),
});

process.stdout.write(`${JSON.stringify(result)}\n`);
