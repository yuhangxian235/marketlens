import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { generateAgentProposals } from "@marketlens/agent-planner";
import { verifyBatch } from "../dist/index.js";

const packageRoot = new URL("../", import.meta.url);
const projectRoot = new URL("../../../", import.meta.url);
const outputDirectory = new URL(
  "web/public/data/batch-verification/",
  projectRoot,
);
const plannerSnapshotUrl = new URL(
  "../agent-planner/fixtures/local-market-snapshot.json",
  packageRoot,
);
const policyUrl = new URL("fixtures/policy.json", packageRoot);
const plannerSnapshot = JSON.parse(await readFile(plannerSnapshotUrl, "utf8"));
const proposals = generateAgentProposals({
  snapshot: plannerSnapshot,
  generatedAt: plannerSnapshot.observed_at,
});
const policy = JSON.parse(await readFile(policyUrl, "utf8"));
const generatedAt = new Date().toISOString();
const receipt = await verifyBatch(proposals, policy, { generatedAt });

if (
  receipt.proposed_count !== 5 ||
  receipt.eligible_count !== 2 ||
  receipt.final_blocked_count !== 3 ||
  receipt.signed_count !== 0 ||
  receipt.broadcast_count !== 0
) {
  throw new Error(
    `Unexpected batch result: ${receipt.proposed_count} proposed, ` +
      `${receipt.eligible_count} eligible, ${receipt.final_blocked_count} blocked`,
  );
}

const simulations = Object.fromEntries(
  receipt.action_receipts.map((action) => [
    action.proposal_id,
    action.moss_evidence,
  ]),
);
const manifest = {
  schema_version: "1.0.0",
  generated_at: generatedAt,
  generator: "@marketlens/batch-policy",
  proposal_generator: "@marketlens/agent-planner",
  proposal_source: "RUNTIME_LOCAL_AGENT",
  planner_snapshot_id: plannerSnapshot.snapshot_id,
  planner_deterministic: true,
  engine: "REAL_RUNTIME",
  moss_adapter: "@marketlens/moss-prediction-market",
  moss_simulator: "@themoss/simulator",
  environment: "local_anvil",
  chain_id: 143,
  trace_method: "debug_traceCall",
  proposed_count: receipt.proposed_count,
  eligible_count: receipt.eligible_count,
  blocked_count: receipt.final_blocked_count,
  signed_count: receipt.signed_count,
  broadcast_count: receipt.broadcast_count,
  policy_hash: receipt.policy_hash,
  receipt_hash: receipt.receipt_hash,
  unsigned: receipt.unsigned,
  not_broadcast: receipt.not_broadcast,
  not_deployed_on_monad: receipt.not_deployed_on_monad,
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(
  new URL("proposals.json", outputDirectory),
  `${JSON.stringify(proposals, null, 2)}\n`,
  "utf8",
);
await writeFile(
  new URL("agent-snapshot.json", outputDirectory),
  `${JSON.stringify(plannerSnapshot, null, 2)}\n`,
  "utf8",
);
await copyFile(policyUrl, new URL("policy.json", outputDirectory));
await writeFile(
  new URL("simulation-results.json", outputDirectory),
  `${JSON.stringify(simulations, null, 2)}\n`,
  "utf8",
);
await writeFile(
  new URL("batch-receipt.json", outputDirectory),
  `${JSON.stringify(receipt, null, 2)}\n`,
  "utf8",
);
await writeFile(
  new URL("manifest.json", outputDirectory),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
process.stdout.write(`${JSON.stringify(manifest)}\n`);
