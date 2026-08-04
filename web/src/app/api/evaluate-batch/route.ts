import {
  createUnsignedAllowlist,
  evaluateBatchWithEvidence,
  hashCanonical,
  verifyBatchArtifacts,
  type AgentProposal,
  type BatchArtifactManifest,
  type BatchArtifactSet,
  type BatchPolicy,
  type BatchVerificationReceipt,
  type MossSimulationEvidence,
} from "@marketlens/batch-policy";
import { NextResponse } from "next/server";
import plannerSnapshotJson from "../../../../public/data/batch-verification/agent-snapshot.json";
import publishedProposalsJson from "../../../../public/data/batch-verification/proposals.json";
import publishedPolicyJson from "../../../../public/data/batch-verification/policy.json";
import simulationsJson from "../../../../public/data/batch-verification/simulation-results.json";
import publishedReceiptJson from "../../../../public/data/batch-verification/batch-receipt.json";
import manifestJson from "../../../../public/data/batch-verification/manifest.json";
import fixturePolicyJson from "../../../../../packages/batch-policy/fixtures/policy.json";

const ACTION_LIMITS = new Set([
  "100000000000000000",
  "500000000000000000",
  "10000000000000000000",
]);
const TOTAL_LIMITS = new Set([
  "250000000000000000",
  "500000000000000000",
  "10000000000000000000",
]);

type EvaluationRequest = {
  max_payment_per_action: string;
  max_total_payment: string;
  block_conflicting_outcomes_same_market: boolean;
};

function isEvaluationRequest(value: unknown): value is EvaluationRequest {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.max_payment_per_action === "string" &&
    ACTION_LIMITS.has(input.max_payment_per_action) &&
    typeof input.max_total_payment === "string" &&
    TOTAL_LIMITS.has(input.max_total_payment) &&
    typeof input.block_conflicting_outcomes_same_market === "boolean" &&
    Object.keys(input).length === 3
  );
}

const proposals = publishedProposalsJson as unknown as AgentProposal[];
const publishedPolicy = publishedPolicyJson as unknown as BatchPolicy;
const simulations = simulationsJson as unknown as Record<
  string,
  MossSimulationEvidence
>;

function verifySourceArtifacts(): void {
  verifyBatchArtifacts({
    plannerSnapshot:
      plannerSnapshotJson as unknown as BatchArtifactSet["plannerSnapshot"],
    fixturePolicy: fixturePolicyJson as unknown as BatchPolicy,
    publishedProposals: proposals,
    publishedPolicy,
    simulations,
    receipt: publishedReceiptJson as unknown as BatchVerificationReceipt,
    manifest: manifestJson as unknown as BatchArtifactManifest,
  });
}

async function evaluatePolicy(
  input: EvaluationRequest,
  generatedAt?: string,
) {
  verifySourceArtifacts();

  const policyControls = {
    max_payment_per_action: input.max_payment_per_action,
    max_total_payment: input.max_total_payment,
    block_conflicting_outcomes_same_market:
      input.block_conflicting_outcomes_same_market,
  };
  const policy: BatchPolicy = {
    ...publishedPolicy,
    policy_id: `interactive-user-policy-${hashCanonical(policyControls).slice(2, 10)}`,
    max_payment_per_action: input.max_payment_per_action,
    max_payment_per_market: input.max_payment_per_action,
    max_total_payment: input.max_total_payment,
    block_conflicting_outcomes_same_market:
      input.block_conflicting_outcomes_same_market,
  };
  const receipt = await evaluateBatchWithEvidence(
    proposals,
    policy,
    simulations,
    { generatedAt },
  );
  const allowlist = createUnsignedAllowlist(receipt, policy);

  return { policy, receipt, allowlist };
}

export async function POST(request: Request) {
  try {
    const input: unknown = await request.json();
    if (!isEvaluationRequest(input)) {
      return NextResponse.json(
        { error: "Unsupported policy controls" },
        { status: 400 },
      );
    }

    const { policy, receipt, allowlist } = await evaluatePolicy(input);

    return NextResponse.json({
      policy,
      receipt,
      allowlist,
      evidence: {
        source: "VERIFIED_PUBLISHED_MOSS_EVIDENCE",
        moss_receipt_count: Object.keys(simulations).length,
        trace_method: "debug_traceCall",
        state_changed: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Batch evaluation failed",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const conflictControl = url.searchParams.get(
      "block_conflicting_outcomes_same_market",
    );
    const input = {
      max_payment_per_action:
        url.searchParams.get("max_payment_per_action") ?? "",
      max_total_payment: url.searchParams.get("max_total_payment") ?? "",
      block_conflicting_outcomes_same_market:
        conflictControl === "true",
    };
    const generatedAt = url.searchParams.get("generated_at") ?? "";
    const expectedHash = url.searchParams.get("expected_allowlist_hash") ?? "";
    if (
      !isEvaluationRequest(input) ||
      (conflictControl !== "true" && conflictControl !== "false") ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(generatedAt) ||
      Number.isNaN(Date.parse(generatedAt)) ||
      !/^0x[0-9a-f]{64}$/.test(expectedHash)
    ) {
      return NextResponse.json(
        { error: "Unsupported allowlist download request" },
        { status: 400 },
      );
    }

    const { allowlist } = await evaluatePolicy(input, generatedAt);
    if (allowlist.allowlist_hash !== expectedHash) {
      return NextResponse.json(
        { error: "Allowlist hash does not match the active Batch Receipt" },
        { status: 409 },
      );
    }

    return new Response(`${JSON.stringify(allowlist, null, 2)}\n`, {
      headers: {
        "cache-control": "no-store",
        "content-disposition": `attachment; filename="marketlens-unsigned-allowlist-${allowlist.batch_id.slice(2, 10)}.json"`,
        "content-type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Allowlist download failed",
      },
      { status: 500 },
    );
  }
}
