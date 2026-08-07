#!/usr/bin/env node
// prepare-monad-attestation.mjs
// Reads existing MarketLens batch artifacts and computes attestation hashes.
// Offline only — no network, no signing, no broadcast.

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { createHash } from "crypto";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(__dirname, "../demo/generated");
const OUT_FILE = resolve(OUT_DIR, "monad-attestation-input.json");

function sha256Hex(data) {
  return "0x" + createHash("sha256").update(data).digest("hex");
}

function loadJson(path) {
  return JSON.parse(readFileSync(resolve(REPO_ROOT, path), "utf-8"));
}

function canonicalJson(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

try {
  // Load existing verified artifacts
  const proposals = loadJson("packages/batch-policy/fixtures/proposals.json");
  const receipt = loadJson("demo/generated/moss-simulations-provenance.json");
  const evidenceSets = loadJson("web/public/data/batch-verification/simulation-results.json");

  // Compute hashes using same canonical rules as the engine
  const receiptHash = sha256Hex(canonicalJson({simulationResults: receipt.simulationResults, statusMatrix: receipt.statusMatrix}));
  const policyConfig = loadJson("packages/batch-policy/fixtures/policy.json");
  const policyHash = sha256Hex(canonicalJson(policyConfig));
  const allowlistHash = sha256Hex(canonicalJson({
    eligible_proposal_ids: proposals.map(p => p.proposal_id),
    blocked_proposal_ids: [],
    unsigned: true,
    not_broadcast: true
  }));
  const evidenceHash = sha256Hex(canonicalJson(evidenceSets));

  const output = {
    schema_version: "1.0.0",
    receipt_hash: receiptHash,
    policy_hash: policyHash,
    allowlist_hash: allowlistHash,
    evidence_hash: evidenceHash,
    source_artifact_paths: [
      "packages/batch-policy/fixtures/proposals.json",
      "demo/generated/moss-simulations-provenance.json",
      "web/public/data/batch-verification/simulation-results.json"
    ],
    generated_at: new Date().toISOString(),
    data_status: "FROM_VERIFIED_ARTIFACTS"
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(output, null, 2) + "\n");
  console.log("Attestation input written to:", OUT_FILE);
  console.log("Receipt hash:", receiptHash);
} catch (err) {
  console.error("Failed to prepare attestation data:", err.message);
  process.exit(1);
}
