"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  verifyPublishedBatchArtifacts,
  type BrowserArtifactVerification,
  type PublishedBatchArtifactSet,
} from "@marketlens/batch-policy/browser";

type Step = 1 | 2 | 3 | 4 | 5;
type Verdict = "PASS" | "BLOCKED" | "NOT_APPLICABLE";

type Proposal = {
  proposal_id: string;
  agent_id: string;
  actor_address: `0x${string}`;
  market_id: string;
  market_question: string;
  capability: "buy_position" | "claim_reward";
  outcome: "YES" | "NO" | "NOT_APPLICABLE";
  requested_amount: string;
  rationale: string;
  source_type: "SYNTHETIC_AGENT_PROPOSAL";
  planner_evidence: {
    planner: "@marketlens/agent-planner";
    strategy: "MOMENTUM" | "CONTRARIAN" | "CLAIM_INDEX";
    snapshot_id: string;
    signal_bps: number;
    deterministic: true;
  };
};

type Policy = {
  policy_id: string;
  max_actions: number;
  max_total_payment: string;
  max_payment_per_action: string;
  max_payment_per_market: string;
  allowed_capabilities: string[];
  allowed_outcomes: string[];
  block_conflicting_outcomes_same_market: boolean;
  require_simulation_success: boolean;
  require_receipt: boolean;
  require_intent_match: boolean;
  fail_closed_on_missing_data: boolean;
  execution_mode: string;
};

type Check = {
  rule: string;
  status: Verdict;
};

type MossEvidence = {
  engine: string;
  adapter: string;
  protocol: string;
  method: string;
  chain_id: number;
  trace_method: string;
  trace_call_count: number;
  moss_trace_call_count: number;
  block_number_before: string;
  block_number_after: string;
  state_unchanged: boolean;
  reverted: boolean;
  revert_reason?: string;
  warnings: { code: string; message: string }[];
  raw_revert_evidence?: {
    block_number: string;
    input: string;
    output: string;
    error: string;
    decoded_error?: { name: string; args: string[] };
  };
};

type ActionReceipt = {
  proposal_id: string;
  capability: string;
  market_id: string;
  outcome: string;
  simulation_success: boolean;
  moss_evidence: MossEvidence;
  intent_checks: Check[];
  action_policy_checks: Check[];
  action_level_verdict: Verdict;
  batch_level_verdict?: Verdict;
  final_verdict: Verdict;
  verdict_reason: string;
  receipt_hash: string;
};

type BatchReceipt = {
  batch_id: string;
  policy_hash: string;
  generated_at: string;
  execution_mode: string;
  proposed_count: number;
  action_pass_count: number;
  action_blocked_count: number;
  batch_blocked_count: number;
  eligible_count: number;
  final_blocked_count: number;
  signed_count: number;
  broadcast_count: number;
  eligible_proposal_ids: string[];
  blocked_proposal_ids: string[];
  action_receipts: ActionReceipt[];
  batch_policy_checks: Array<{
    rule: string;
    proposal_id?: string;
    expected: string;
    actual: string;
    status: Verdict;
    reason: string;
  }>;
  final_verdict: string;
  limitations: string[];
  receipt_hash: string;
};

type UnsignedAllowlist = {
  schema_version: "1.0.0";
  artifact_type: "UNSIGNED_ELIGIBLE_ACTION_ALLOWLIST";
  generated_at: string;
  batch_id: string;
  policy_id: string;
  policy_hash: string;
  policy_snapshot: Policy;
  source_batch_receipt_hash: string;
  eligible_count: number;
  blocked_count: number;
  signed_count: 0;
  broadcast_count: 0;
  eligible_actions: Array<{
    proposal_id: string;
    agent_id: string;
    capability: string;
    market_id: string;
    outcome: string;
    requested_amount: string;
    action_receipt_hash: string;
  }>;
  blocked_actions: Array<{
    proposal_id: string;
    action_level_verdict: Verdict;
    batch_level_verdict?: Verdict;
    verdict_reason: string;
    action_receipt_hash: string;
  }>;
  boundaries: ["UNSIGNED", "NOT BROADCAST", "NOT DEPLOYED ON MONAD"];
  allowlist_hash: string;
};

type PolicyControls = {
  max_payment_per_action: string;
  max_total_payment: string;
  block_conflicting_outcomes_same_market: boolean;
};
type BatchLoadState = "EMPTY" | "LOADING" | "LOADED" | "ERROR";
type VerificationPhase = "IDLE" | "RUNNING" | "COMPLETE" | "ERROR";

type EvaluationResponse = {
  policy: Policy;
  receipt: BatchReceipt;
  allowlist: UnsignedAllowlist;
};

const STEPS = [
  { number: 1, short: "Proposals" },
  { number: 2, short: "Policy" },
  { number: 3, short: "Simulate" },
  { number: 4, short: "Receipts" },
  { number: 5, short: "Verdict" },
] as const;

const POLICY_PRESETS = {
  strict: {
    max_payment_per_action: "100000000000000000",
    max_total_payment: "250000000000000000",
    block_conflicting_outcomes_same_market: true,
    label: "Strict",
  },
  default: {
    max_payment_per_action: "500000000000000000",
    max_total_payment: "500000000000000000",
    block_conflicting_outcomes_same_market: true,
    label: "Default",
  },
  permissive: {
    max_payment_per_action: "10000000000000000000",
    max_total_payment: "10000000000000000000",
    block_conflicting_outcomes_same_market: false,
    label: "Permissive",
  },
} as const;

const WEI_PER_MON = 1_000_000_000_000_000_000n;
const ACTION_LIMIT_OPTIONS = [
  ["100000000000000000", "0.10 MON · strict"],
  ["500000000000000000", "0.50 MON · demo default"],
  ["10000000000000000000", "10.00 MON · permissive"],
] as const;
const TOTAL_LIMIT_OPTIONS = [
  ["250000000000000000", "0.25 MON · strict"],
  ["500000000000000000", "0.50 MON · demo default"],
  ["10000000000000000000", "10.00 MON · permissive"],
] as const;

function formatWei(value: string): string {
  const wei = BigInt(value);
  const whole = wei / WEI_PER_MON;
  const fractional = wei % WEI_PER_MON;
  if (fractional === 0n) return `${whole} MON`;
  const decimals = fractional.toString().padStart(18, "0").replace(/0+$/, "");
  return `${whole}.${decimals} MON`;
}

function shorten(value: string, start = 10, end = 8): string {
  if (value.length <= start + end + 1) return value;
  return `${value.slice(0, start)}…${value.slice(-end)}`;
}

function tone(verdict: Verdict | undefined): string {
  if (verdict === "PASS") return "pass";
  if (verdict === "BLOCKED") return "blocked";
  return "neutral";
}

function StepHeading({
  index,
  title,
  description,
}: {
  index: number;
  title: string;
  description: string;
}) {
  return (
    <div className="workflowHeading">
      <div className="stepKicker" aria-label={`Step ${index} of 5`}>
        <strong>{String(index).padStart(2, "0")}</strong>
        <span>OF 05</span>
      </div>
      <h1 id="workflow-step-title" tabIndex={-1}>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

export default function BatchFirewallPage() {
  const [step, setStep] = useState<Step>(1);
  const [maxStep, setMaxStep] = useState<Step>(1);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [receipt, setReceipt] = useState<BatchReceipt | null>(null);
  const [allowlist, setAllowlist] = useState<UnsignedAllowlist | null>(null);
  const [policyControls, setPolicyControls] = useState<PolicyControls>({
    max_payment_per_action: "500000000000000000",
    max_total_payment: "500000000000000000",
    block_conflicting_outcomes_same_market: true,
  });
  const [policySubmitting, setPolicySubmitting] = useState(false);
  const [policyError, setPolicyError] = useState("");
  const [downloadMessage, setDownloadMessage] = useState("");
  const [integrity, setIntegrity] =
    useState<BrowserArtifactVerification | null>(null);
  const [loadPhase, setLoadPhase] = useState<"LOADING" | "VERIFYING">("LOADING");
  const [batchState, setBatchState] = useState<BatchLoadState>("EMPTY");
  const [verificationPhase, setVerificationPhase] = useState<VerificationPhase>("IDLE");
  const [appliedPreset, setAppliedPreset] = useState<keyof typeof POLICY_PRESETS | null>(null);
  const [error, setError] = useState("");
  const [simulatedCount, setSimulatedCount] = useState(0);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState("prop-001");
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const technicalTriggerRef = useRef<HTMLButtonElement>(null);
  const technicalCloseRef = useRef<HTMLButtonElement>(null);

  const loadVerifiedDemoBatch = async () => {
    setBatchState("LOADING");
    setError("");
    try {
      const [
        proposalResponse,
        policyResponse,
        simulationResponse,
        receiptResponse,
        manifestResponse,
      ] =
        await Promise.all([
          fetch("/data/batch-verification/proposals.json"),
          fetch("/data/batch-verification/policy.json"),
          fetch("/data/batch-verification/simulation-results.json"),
          fetch("/data/batch-verification/batch-receipt.json"),
          fetch("/data/batch-verification/manifest.json"),
        ]);
      for (const response of [
        proposalResponse,
        policyResponse,
        simulationResponse,
        receiptResponse,
        manifestResponse,
      ]) {
        if (!response.ok) throw new Error(`${response.url}: HTTP ${response.status}`);
      }
      const [nextProposals, nextPolicy, nextSimulations, nextReceipt, nextManifest] =
        await Promise.all([
          proposalResponse.json(),
          policyResponse.json(),
          simulationResponse.json(),
          receiptResponse.json(),
          manifestResponse.json(),
        ]);
      setLoadPhase("VERIFYING");
      const artifacts = {
        proposals: nextProposals,
        policy: nextPolicy,
        simulations: nextSimulations,
        receipt: nextReceipt,
        manifest: nextManifest,
      } as PublishedBatchArtifactSet;
      const verification = await verifyPublishedBatchArtifacts(artifacts);
      setProposals(artifacts.proposals as Proposal[]);
      setPolicy(artifacts.policy as Policy);
      setReceipt(artifacts.receipt as BatchReceipt);
      setPolicyControls({
        max_payment_per_action: (artifacts.policy as Policy).max_payment_per_action,
        max_total_payment: (artifacts.policy as Policy).max_total_payment,
        block_conflicting_outcomes_same_market:
          (artifacts.policy as Policy).block_conflicting_outcomes_same_market,
      });
      setIntegrity(verification);
      setBatchState("LOADED");
      setStep(1);
      setMaxStep(1);
    } catch (caught) {
      setBatchState("ERROR");
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  const resetDemo = () => {
    setBatchState("EMPTY");
    setStep(1);
    setMaxStep(1);
    setProposals([]);
    setPolicy(null);
    setReceipt(null);
    setAllowlist(null);
    setIntegrity(null);
    setError("");
    setPolicyError("");
    setDownloadMessage("");
    setSimulationComplete(false);
    setSimulatedCount(0);
    setVerificationPhase("IDLE");
    setAppliedPreset(null);
  };

  const receiptsById = useMemo(
    () =>
      new Map(
        receipt?.action_receipts.map((action) => [
          action.proposal_id,
          action,
        ]) ?? [],
      ),
    [receipt],
  );
  const allowlistDownload = useMemo(
    () =>
      allowlist
        ? {
            href: `/api/evaluate-batch?${new URLSearchParams({
              max_payment_per_action:
                allowlist.policy_snapshot.max_payment_per_action,
              max_total_payment: allowlist.policy_snapshot.max_total_payment,
              block_conflicting_outcomes_same_market: String(
                allowlist.policy_snapshot
                  .block_conflicting_outcomes_same_market,
              ),
              generated_at: allowlist.generated_at,
              expected_allowlist_hash: allowlist.allowlist_hash,
            }).toString()}`,
            filename: `marketlens-unsigned-allowlist-${allowlist.batch_id.slice(2, 10)}.json`,
          }
        : null,
    [allowlist],
  );
  const activeReceipt = receiptsById.get(selectedReceipt);
  const activeBatchFailure = receipt?.batch_policy_checks.find(
    (check) =>
      check.proposal_id === activeReceipt?.proposal_id &&
      check.status === "BLOCKED",
  );
  const batchConflictCheck = receipt?.batch_policy_checks.find(
    (check) => check.status === "BLOCKED" && check.reason === "BATCH_POLICY_CONFLICT",
  );
  const mossCallCount =
    receipt?.action_receipts.reduce(
      (total, action) => total + action.moss_evidence.moss_trace_call_count,
      0,
    ) ?? 0;
  const plannerEvidence = proposals[0]?.planner_evidence;

  const focusCurrentStep = () => {
    window.requestAnimationFrame(() => {
      document.getElementById("workflow-step-title")?.focus({ preventScroll: true });
    });
  };

  const scrollToTop = () => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  };

  const goTo = (next: Step) => {
    setStep(next);
    setMaxStep((current) => Math.max(current, next) as Step);
    scrollToTop();
    focusCurrentStep();
  };

  const revealSimulation = async (nextReceipt: BatchReceipt) => {
    if (simulationRunning) return;
    setStep(3);
    setMaxStep((current) => Math.max(current, 3) as Step);
    setSimulatedCount(0);
    setSimulationComplete(false);
    setSimulationRunning(true);
    scrollToTop();
    focusCurrentStep();
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    for (let index = 1; index <= nextReceipt.proposed_count; index += 1) {
      if (!reducedMotion) {
        await new Promise((resolve) => window.setTimeout(resolve, 260));
      }
      setSimulatedCount(index);
    }
    setSimulationRunning(false);
    setSimulationComplete(true);
  };

  const updatePolicyControls = (next: Partial<PolicyControls>) => {
    setPolicyControls((current) => ({ ...current, ...next }));
    setMaxStep((current) => (current > 2 ? 2 : current) as Step);
    setSimulationComplete(false);
    setSimulatedCount(0);
    setAllowlist(null);
    setPolicyError("");
    setDownloadMessage("");
  };

  const applyPolicy = async () => {
    if (policySubmitting || simulationRunning) return;
    setPolicySubmitting(true);
    setPolicyError("");
    try {
      const response = await fetch("/api/evaluate-batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(policyControls),
      });
      const result = (await response.json()) as EvaluationResponse & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(result.error ?? `Policy evaluation failed: HTTP ${response.status}`);
      }
      setPolicy(result.policy);
      setReceipt(result.receipt);
      setAllowlist(result.allowlist);
      setSelectedReceipt("prop-001");
      await revealSimulation(result.receipt);
    } catch (caught) {
      setPolicyError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setPolicySubmitting(false);
    }
  };

  const closeTechnicalEvidence = () => {
    setTechnicalOpen(false);
    window.requestAnimationFrame(() => technicalTriggerRef.current?.focus());
  };

  useEffect(() => {
    if (!technicalOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTechnicalOpen(false);
        window.requestAnimationFrame(() => technicalTriggerRef.current?.focus());
      }
      if (event.key === "Tab") {
        event.preventDefault();
        technicalCloseRef.current?.focus();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => technicalCloseRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [technicalOpen]);

  if (error) {
    return (
      <main className="firewallPage">
        <div className="loadState errorState">
          <span>RECEIPT CHAIN REJECTED</span>
          <h1>The policy firewall stayed locked.</h1>
          <p>{error}</p>
          <button className="primaryCta" type="button" onClick={resetDemo}>
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (batchState === "EMPTY") {
    return (
      <main className="firewallPage">
        <div className="loadState">
          <span>INCOMING AGENT BATCH</span>
          <h1>No batch has been loaded for pre-sign review.</h1>
          <p>
            Load a verified synthetic Agent batch to inspect proposals, set policy,
            and run pre-sign verification.
          </p>
          <button className="primaryCta" type="button" onClick={loadVerifiedDemoBatch}>
            Load verified demo batch <span>→</span>
          </button>
          <div className="batchMeta" style={{ marginTop: "1.5rem" }}>
            <span>SYNTHETIC AGENT PROPOSALS</span>
            <span>VERIFIED LOCAL EVIDENCE</span>
            <span>UNSIGNED</span>
            <span>NO TRANSACTION WILL BE SENT</span>
          </div>
        </div>
      </main>
    );
  }

  if (batchState === "LOADING") {
    return (
      <main className="firewallPage">
        <div className="loadState">
          <span>{loadPhase === "LOADING" ? "LOADING VERIFIED DEMO BATCH" : "VERIFYING PUBLISHED ARTIFACT HASHES"}</span>
          <div className="loadingBar" />
          {loadPhase === "LOADING" ? (
            <div className="loadingSteps">
              <p>Validating proposal schema</p>
              <p>Verifying published artifact hashes</p>
            </div>
          ) : (
            <p>Batch ready for review</p>
          )}
        </div>
      </main>
    );
  }

  if (!policy || !receipt || !integrity || proposals.length === 0) {
    return (
      <main className="firewallPage">
        <div className="loadState">
          <span>LOADING RUNTIME RECEIPT</span>
          <div className="loadingBar" />
        </div>
      </main>
    );
  }

  return (
    <main className="firewallPage">
      <section className="workflowMasthead">
        <div>
          <div className="eyebrow">MOSS ONCHAIN AGENT · PRE-SIGN CONTROL</div>
          <h2>Agent batch firewall</h2>
          <p>Stop unsafe onchain agent batches before a wallet ever signs.</p>
        </div>
        <div className="mastheadControls">
          <div
            className="integritySeal"
            data-artifact-integrity="verified"
            aria-label={`Published runtime receipts re-verified in this browser with ${integrity.check_count} checks`}
          >
            <i aria-hidden="true" />
            <span>RECEIPTS VERIFIED</span>
            <strong>{integrity.check_count} BROWSER CHECKS</strong>
          </div>
          <button
            ref={technicalTriggerRef}
            className="technicalTrigger"
            type="button"
            aria-label="Open technical evidence"
            onClick={() => setTechnicalOpen(true)}
          >
            <span className="technicalLabelFull">Technical evidence</span>
            <span className="technicalLabelShort">Evidence</span>
          </button>
        </div>
      </section>

      <div className="boundaryStrip" aria-label="Safety boundaries">
        <span>SYNTHETIC AGENT PROPOSAL</span>
        <span>REAL LOCAL</span>
        <span>UNSIGNED</span>
        <span>NOT BROADCAST</span>
        <span>NOT DEPLOYED ON MONAD</span>
      </div>

      <nav className="stepRail" aria-label="Verification steps">
        {STEPS.map((item) => {
          const available = item.number <= maxStep;
          const current = item.number === step;
          const complete = item.number < maxStep;
          return (
            <button
              key={item.number}
              type="button"
              className={`${current ? "current" : ""} ${complete ? "complete" : ""}`}
              disabled={!available}
              aria-current={current ? "step" : undefined}
              onClick={() => available && goTo(item.number as Step)}
            >
              <span className="stepIndex">
                {complete && !current ? "✓" : String(item.number).padStart(2, "0")}
              </span>
              <span className="stepName">{item.short}</span>
            </button>
          );
        })}
      </nav>

      <section className="stepStage">
        {step === 1 && (
          <div className="stepPanel">
            <StepHeading
              index={1}
              title="Inspect what the agent wants to do"
              description="A deterministic, policy-blind planner produced five unsigned intents from one local market snapshot. The firewall has not approved or sent any of them."
            />
            <div className="proposalList">
              {proposals.map((proposal, index) => (
                <article className="proposalCard" key={proposal.proposal_id}>
                  <div className="proposalOrdinal">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="proposalBody">
                    <div className="cardTopline">
                      <span className="monoLabel">{proposal.proposal_id}</span>
                      <span className="proposalTags">
                        <span className="plannerPill">
                          {proposal.planner_evidence.strategy.replaceAll("_", " ")} · {proposal.planner_evidence.signal_bps / 100}%
                        </span>
                        <span className="sourcePill">SYNTHETIC AGENT PROPOSAL</span>
                      </span>
                    </div>
                    <h3>{proposal.market_question}</h3>
                    <div className="proposalFacts">
                      <span>{proposal.capability}</span>
                      <span>MARKET {proposal.market_id}</span>
                      <span className={`outcome outcome-${proposal.outcome.toLowerCase()}`}>
                        {proposal.outcome}
                      </span>
                      <strong>{formatWei(proposal.requested_amount)}</strong>
                    </div>
                    <p>{proposal.rationale}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="stageActions">
              <button className="primaryCta" type="button" onClick={() => goTo(2)}>
                Review user policy <span>→</span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="stepPanel policyPanel">
            <StepHeading
              index={2}
              title="Apply the user’s safety policy"
              description="The user—not the agent—sets payment limits, allowed actions, required evidence, and batch conflict rules."
            />
            <div className="policyPresetStrip">
              <span>POLICY PRESETS</span>
              {(Object.keys(POLICY_PRESETS) as Array<keyof typeof POLICY_PRESETS>).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={appliedPreset === key ? "presetActive" : ""}
                  onClick={() => {
                    const { label: _label, ...controls } = POLICY_PRESETS[key];
                    setPolicyControls(controls);
                    setAppliedPreset(key);
                    setMaxStep((current) => (current > 2 ? 2 : current) as Step);
                    setSimulationComplete(false);
                    setSimulatedCount(0);
                    setAllowlist(null);
                    setPolicyError("");
                    setDownloadMessage("");
                  }}
                >
                  {POLICY_PRESETS[key].label}
                </button>
              ))}
            </div>
            <div className="policyLayout">
              <div className="policyHero">
                <span className="policyId">USER CONTROL · PRE-SIGN</span>
                <strong>Set the agent’s operating boundary.</strong>
                <p>
                  Choose how much value the batch may expose and whether
                  opposing positions may coexist. The agent cannot edit these
                  controls.
                </p>
                <div className="policyLockline">
                  <span>LOCKED</span>
                  <strong>{policy.execution_mode.replaceAll("_", " ")}</strong>
                </div>
              </div>
              <div className="policyControlStack">
                <label className="policyControl">
                  <span><strong>01</strong> Action + market cap</span>
                  <small>Maximum native value for one action and one market.</small>
                  <select
                    aria-label="Maximum payment per action and market"
                    value={policyControls.max_payment_per_action}
                    onChange={(event) => updatePolicyControls({
                      max_payment_per_action: event.target.value,
                    })}
                  >
                    {ACTION_LIMIT_OPTIONS.map(([value, label]) => (
                      <option value={value} key={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <label className="policyControl">
                  <span><strong>02</strong> Total batch cap</span>
                  <small>Maximum combined native value kept by the firewall.</small>
                  <select
                    aria-label="Maximum total batch payment"
                    value={policyControls.max_total_payment}
                    onChange={(event) => updatePolicyControls({
                      max_total_payment: event.target.value,
                    })}
                  >
                    {TOTAL_LIMIT_OPTIONS.map(([value, label]) => (
                      <option value={value} key={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <div className="policyControl conflictControl">
                  <span><strong>03</strong> Opposing outcomes</span>
                  <small>Stop a later YES/NO action when the same market is already eligible.</small>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={policyControls.block_conflicting_outcomes_same_market}
                    className={policyControls.block_conflicting_outcomes_same_market ? "active" : ""}
                    onClick={() => updatePolicyControls({
                      block_conflicting_outcomes_same_market:
                        !policyControls.block_conflicting_outcomes_same_market,
                    })}
                  >
                    <i aria-hidden="true" />
                    {policyControls.block_conflicting_outcomes_same_market
                      ? "BLOCK CONFLICTS"
                      : "ALLOW CONFLICTS"}
                  </button>
                </div>
              </div>
            </div>
            <div className="policyGuardrails" aria-label="Locked policy guardrails">
              <span>LOCKED GUARDRAILS</span>
              <strong>{policy.max_actions} ACTION MAX</strong>
              <strong>MOSS RECEIPT REQUIRED</strong>
              <strong>INTENT MATCH REQUIRED</strong>
              <strong>FAIL CLOSED</strong>
            </div>
            <p className="policyEvidenceNote">
              Changing this policy re-runs the real Batch Policy Engine over the
              verified Moss evidence. It does not trigger a new Anvil simulation or
              send a transaction.
            </p>
            {policyError && <p className="policyError" role="alert">{policyError}</p>}
            <div className="stageActions withBack">
              <button className="quietAction" type="button" onClick={() => setStep(1)}>← Back</button>
              <button className="primaryCta" type="button" onClick={applyPolicy} disabled={policySubmitting}>
                {policySubmitting ? "Running verification…" : "Run pre-sign verification"} <span>→</span>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="stepPanel simulationPanel">
            <StepHeading
              index={3}
              title="Verify execution truth with Moss"
              description="Replay and verify pre-generated local Moss simulation evidence. The firewall recomputes every rule and Receipt for your policy. No new simulation or transaction was sent."
            />
            <div className="engineBanner">
              <div className="enginePulse" aria-hidden="true" />
              <div><span>REAL LOCAL EXECUTION EVIDENCE</span><strong>@themoss/simulator · chain 143</strong></div>
              <code>{shorten(receipt.batch_id, 14, 10)}</code>
            </div>
            <div className="evidenceRoute" aria-label="Runtime evidence route">
              <div><span>INPUT</span><strong>{receipt.proposed_count} agent-planned</strong></div>
              <i aria-hidden="true">→</i>
              <div><span>ADAPTER</span><strong>MarketLens Moss</strong></div>
              <i aria-hidden="true">→</i>
              <div><span>EXECUTION EVIDENCE</span><strong>{mossCallCount} Moss calls</strong></div>
              <i aria-hidden="true">→</i>
              <div><span>OUTPUT</span><strong>{receipt.action_receipts.length} verified receipts</strong></div>
            </div>
            <div className="simulationLedger">
              {proposals.map((proposal, index) => {
                const action = receiptsById.get(proposal.proposal_id);
                const processed = index < simulatedCount;
                const active = simulationRunning && index === simulatedCount;
                const reverted = processed && action?.moss_evidence.reverted;
                return (
                  <div className={`simulationRow ${processed ? "processed" : ""} ${active ? "active" : ""}`} key={proposal.proposal_id}>
                    <span className="ledgerNode" />
                    <div><strong>{proposal.proposal_id}</strong><small>{action?.moss_evidence.method} · market {proposal.market_id}</small></div>
                    <code>{action?.moss_evidence.trace_method}</code>
                    <span className={`simulationState ${reverted ? "reverted" : processed ? "passed" : ""}`}>
                      {reverted ? "REVERTED" : processed ? "TRACE PASS" : active ? "TRACING" : "QUEUED"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="simulationFoot" role="status" aria-live="polite" aria-atomic="true">
              <span>{simulatedCount} / {receipt.proposed_count} execution receipts revealed</span>
              <span>Evidence replay · chain state unchanged</span>
            </div>
            {simulationComplete && (
              <div className="stageActions">
                <button className="primaryCta" type="button" onClick={() => goTo(4)}>
                  Inspect action receipts <span>→</span>
                </button>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="stepPanel receiptPanel">
            <StepHeading
              index={4}
              title="Inspect action receipts"
              description="Compare a clean pass, the real losing-claim revert, and an action that only fails at batch level."
            />
            <div className="receiptWorkspace">
              <div className="receiptIndex">
                {receipt.action_receipts.map((action) => (
                  <button
                    type="button"
                    data-proposal={action.proposal_id}
                    key={action.proposal_id}
                    className={selectedReceipt === action.proposal_id ? "selected" : ""}
                    aria-pressed={selectedReceipt === action.proposal_id}
                    onClick={() => setSelectedReceipt(action.proposal_id)}
                  >
                    <div><strong>{action.proposal_id}</strong><small>{action.moss_evidence.method} · market {action.market_id}</small></div>
                    <div className="receiptBadges">
                      {action.moss_evidence.reverted && <span className="caseTag">REAL REVERT</span>}
                      {action.action_level_verdict === "PASS" && action.batch_level_verdict === "BLOCKED" && <span className="caseTag signature">CORE CASE</span>}
                      <span className={`verdictTag ${action.moss_evidence.reverted ? "blocked" : "pass"}`}>{action.moss_evidence.reverted ? "REVERT" : "SIM PASS"}</span>
                      <span className={`verdictTag ${tone(action.final_verdict)}`}>{action.final_verdict}</span>
                    </div>
                  </button>
                ))}
              </div>

              {activeReceipt && (
                <article
                  className="receiptDetail"
                  data-active-receipt={activeReceipt.proposal_id}
                  aria-live="polite"
                  aria-label={`Action receipt ${activeReceipt.proposal_id}`}
                >
                  <header>
                    <div><span>ACTION RECEIPT</span><h3>{activeReceipt.proposal_id}</h3></div>
                    <span className={`finalStamp ${tone(activeReceipt.final_verdict)}`}>{activeReceipt.final_verdict}</span>
                  </header>
                  <div className="verdictLanes">
                    <div><span>SIMULATION</span><strong className={activeReceipt.simulation_success ? "passText" : "blockedText"}>{activeReceipt.simulation_success ? "PASS" : "REVERTED"}</strong></div>
                    <div><span>ACTION LEVEL</span><strong className={activeReceipt.action_level_verdict === "PASS" ? "passText" : "blockedText"}>{activeReceipt.action_level_verdict}</strong></div>
                    <div><span>BATCH LEVEL</span><strong className={activeReceipt.batch_level_verdict === "BLOCKED" ? "blockedText" : "passText"}>{activeReceipt.batch_level_verdict ?? "—"}</strong></div>
                  </div>
                  {activeReceipt.action_level_verdict === "PASS" &&
                    activeReceipt.batch_level_verdict === "BLOCKED" &&
                    activeBatchFailure && (
                      <div className="batchConflictProof">
                        <header>
                          <span>WHY A PASS BECAME BLOCKED</span>
                          <strong>Batch context changed the answer</strong>
                        </header>
                        <div className="conflictSequence">
                          <div>
                            <span>ALONE</span>
                            <strong>PASS</strong>
                            <small>Moss trace and action rules succeeded</small>
                          </div>
                          <i aria-hidden="true">+</i>
                          <div>
                            <span>WITH BATCH</span>
                            <strong>{activeBatchFailure.actual}</strong>
                            <small>{activeBatchFailure.rule.replaceAll("_", " ")}</small>
                          </div>
                          <i aria-hidden="true">=</i>
                          <div className="conflictResult">
                            <span>FINAL</span>
                            <strong>BLOCKED</strong>
                            <small>{activeBatchFailure.reason}</small>
                          </div>
                        </div>
                      </div>
                    )}
                  <div className={`reasonCallout ${activeReceipt.final_verdict === "BLOCKED" ? "blocked" : "pass"}`}>
                    <span>VERDICT REASON</span>
                    <strong>{activeReceipt.verdict_reason}</strong>
                    {activeReceipt.action_level_verdict === "PASS" && activeReceipt.batch_level_verdict === "BLOCKED" && <p>Action-level PASS · batch-level BLOCKED</p>}
                  </div>
                  {activeReceipt.moss_evidence.raw_revert_evidence && (
                    <div className="revertEvidence">
                      <div className="evidenceTitle"><span>RAW debug_traceCall REVERT</span><strong>REAL LOCAL</strong></div>
                      <dl>
                        <div>
                          <dt>Decoded error</dt>
                          <dd>{activeReceipt.moss_evidence.raw_revert_evidence.decoded_error?.name ?? "Unknown"}({activeReceipt.moss_evidence.raw_revert_evidence.decoded_error?.args.join(", ")})</dd>
                        </div>
                        <div><dt>Raw output</dt><dd>{activeReceipt.moss_evidence.raw_revert_evidence.output}</dd></div>
                      </dl>
                    </div>
                  )}
                  <div className="checkColumns">
                    <div>
                      <h4>Action policy</h4>
                      {activeReceipt.action_policy_checks.map((check) => (
                        <div className="checkRow" key={check.rule}><span>{check.rule.replaceAll("_", " ")}</span><strong className={check.status === "PASS" ? "passText" : "blockedText"}>{check.status}</strong></div>
                      ))}
                    </div>
                    <div>
                      <h4>Moss intent</h4>
                      {activeReceipt.intent_checks.slice(0, 6).map((check) => (
                        <div className="checkRow" key={check.rule}><span>{check.rule.replaceAll("_", " ")}</span><strong className={check.status === "PASS" ? "passText" : "blockedText"}>{check.status}</strong></div>
                      ))}
                    </div>
                  </div>
                  <footer><span>SHA-256 · CANONICAL JSON</span><code>{activeReceipt.receipt_hash}</code></footer>
                </article>
              )}
            </div>
            <div className="stageActions">
              <button className="primaryCta" type="button" onClick={() => goTo(5)}>
                Review batch verdict <span>→</span>
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="stepPanel verdictPanel">
            <div className="verdictLead">
              <div className="verdictHero">
                <span>BATCH VERDICT · {receipt.final_verdict.replaceAll("_", " ")}</span>
                <h1 id="workflow-step-title" tabIndex={-1}><strong>{receipt.eligible_count}</strong> OF <strong>{receipt.proposed_count}</strong></h1>
                <h2>ACTIONS ELIGIBLE FOR REVIEW</h2>
                <p>The firewall preserved {receipt.eligible_count} policy-eligible actions and stopped {receipt.final_blocked_count} before signing. Nothing was signed or broadcast.</p>
              </div>
              <div className="decisionStory">
                <div className="decisionNarrowing" aria-label={`${receipt.proposed_count} proposed, ${receipt.action_pass_count} passed action checks, ${receipt.batch_blocked_count} blocked at batch level, ${receipt.eligible_count} eligible`}>
                  <div><span>PROPOSED</span><strong>{receipt.proposed_count}</strong><small>agent intents</small></div>
                  <i aria-hidden="true">→</i>
                  <div><span>ACTION PASS</span><strong>{receipt.action_pass_count}</strong><small>safe in isolation</small></div>
                  <i aria-hidden="true">−</i>
                  <div className="removed"><span>BATCH BLOCK</span><strong>{receipt.batch_blocked_count}</strong><small>unsafe together</small></div>
                  <i aria-hidden="true">=</i>
                  <div className="eligible"><span>ELIGIBLE</span><strong>{receipt.eligible_count}</strong><small>preserved actions</small></div>
                </div>
                <p className="decisionNote">
                  <strong>{batchConflictCheck?.proposal_id ?? "One action"}</strong> passed Moss and action rules in isolation, then the batch policy blocked the conflict.
                </p>
              </div>
            </div>
            <div className="summaryGrid">
              {[
                ["Proposed", receipt.proposed_count, "neutral"],
                ["Eligible", receipt.eligible_count, "pass"],
                ["Blocked", receipt.final_blocked_count, "blocked"],
                ["Signed", receipt.signed_count, "neutral"],
                ["Broadcast", receipt.broadcast_count, "neutral"],
              ].map(([label, count, summaryTone]) => (
                <div className={`summaryCell ${summaryTone}`} key={String(label)}><strong>{count}</strong><span>{label}</span></div>
              ))}
            </div>
            <div className="verdictLists">
              <section>
                <header><span className="passDot" /><h3>Unsigned allowlist</h3><strong>{receipt.eligible_count}</strong></header>
                {receipt.eligible_proposal_ids.map((proposalId) => {
                  const action = receiptsById.get(proposalId);
                  return <div className="verdictItem" key={proposalId}><strong>{proposalId}</strong><span>{action?.capability} · {action?.outcome}</span><em>ELIGIBLE</em></div>;
                })}
              </section>
              <section>
                <header><span className="blockedDot" /><h3>Blocked</h3><strong>{receipt.final_blocked_count}</strong></header>
                {receipt.blocked_proposal_ids.map((proposalId) => {
                  const action = receiptsById.get(proposalId);
                  return <div className="verdictItem" key={proposalId}><strong>{proposalId}</strong><span>{action?.verdict_reason}</span><em>BLOCKED</em></div>;
                })}
              </section>
            </div>
            {allowlist && (
              <div className="allowlistReady">
                <div className="allowlistMark" aria-hidden="true">
                  {String(allowlist.eligible_count).padStart(2, "0")}
                </div>
                <div>
                  <span>UNSIGNED ALLOWLIST READY</span>
                  <strong>{allowlist.eligible_count} actions preserved for human review</strong>
                  <p>This JSON is evidence, not an executable transaction.</p>
                </div>
                <code title={allowlist.allowlist_hash}>{shorten(allowlist.allowlist_hash, 12, 10)}</code>
              </div>
            )}
            <div className="safetySeal">
              <div>PRE-SIGN VERIFICATION COMPLETE</div>
              <span>UNSIGNED</span><span>NOT BROADCAST</span><span>NOT DEPLOYED ON MONAD</span>
            </div>
            <p className="downloadStatus" aria-live="polite">{downloadMessage}</p>
            <div className="stageActions withBack">
              <button className="quietAction" type="button" onClick={() => {
                setStep(4);
                scrollToTop();
                focusCurrentStep();
              }}>
                ← Back to receipts
              </button>
              <button className="quietAction" type="button" onClick={() => {
                setStep(2);
                setMaxStep((current) => Math.max(current, 2) as Step);
                setSimulatedCount(0);
                setSimulationComplete(false);
                setAllowlist(null);
                setDownloadMessage("");
                scrollToTop();
                focusCurrentStep();
              }}>
                Run again with another policy
              </button>
              {allowlistDownload && (
                <a
                  className="primaryCta"
                  href={allowlistDownload.href}
                  download={allowlistDownload.filename}
                  onClick={() => setDownloadMessage(
                    "Unsigned allowlist downloaded · no signing or broadcast occurred.",
                  )}
                >
                  Download unsigned allowlist <span>↓</span>
                </a>
              )}
            </div>
            <div className="stageActions" style={{ marginTop: "1rem" }}>
              <button className="quietAction" type="button" onClick={resetDemo}>
                Reset demo
              </button>
            </div>
          </div>
        )}
      </section>

      {technicalOpen && (
        <div className="drawerBackdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeTechnicalEvidence(); }}>
          <aside className="technicalDrawer" role="dialog" aria-modal="true" aria-labelledby="technical-title" aria-describedby="technical-boundary-note">
            <header>
              <div><span>TECHNICAL EVIDENCE</span><h2 id="technical-title">Runtime receipt</h2></div>
              <button ref={technicalCloseRef} type="button" aria-label="Close technical evidence" onClick={closeTechnicalEvidence}>×</button>
            </header>
            <div className="drawerSection">
              <span>ENGINE CHAIN</span>
              <div className="engineChain">
                <strong>@marketlens/agent-planner</strong><i>→</i>
                <strong>@marketlens/batch-policy</strong><i>→</i>
                <strong>@marketlens/moss-prediction-market</strong><i>→</i>
                <strong>@themoss/simulator</strong><i>→</i>
                <strong>debug_traceCall · Anvil 143</strong>
              </div>
            </div>
            <dl className="technicalFacts">
              <div><dt>Planner</dt><dd>{plannerEvidence?.planner ?? "UNAVAILABLE"}</dd></div>
              <div><dt>Snapshot</dt><dd>{plannerEvidence?.snapshot_id ?? "UNAVAILABLE"}</dd></div>
              <div><dt>Generated at</dt><dd>{receipt.generated_at}</dd></div>
              <div><dt>Artifact integrity</dt><dd>{integrity.check_count} CHECKS · VERIFIED</dd></div>
              <div><dt>Moss calls</dt><dd>{mossCallCount}/{receipt.proposed_count}</dd></div>
              <div><dt>State changed</dt><dd>{receipt.action_receipts.every((action) => action.moss_evidence.state_unchanged) ? "NO" : "YES"}</dd></div>
              <div><dt>Signed</dt><dd>{receipt.signed_count}</dd></div>
              <div><dt>Broadcast</dt><dd>{receipt.broadcast_count}</dd></div>
            </dl>
            <div className="environmentBoundary" id="technical-boundary-note">
              <div><span>TARGET CONTEXT</span><strong>Monad agent batches</strong></div>
              <i aria-hidden="true">≠</i>
              <div><span>EVIDENCE RUNTIME</span><strong>Local Anvil · chain 143 fixture</strong></div>
            </div>
            <div className="hashBlock"><span>POLICY HASH</span><code>{receipt.policy_hash}</code></div>
            <div className="hashBlock"><span>BATCH RECEIPT HASH</span><code>{receipt.receipt_hash}</code></div>
            <div className="drawerSection">
              <span>SOURCE BOUNDARIES</span>
              <ul>{receipt.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
