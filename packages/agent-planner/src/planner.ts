import type {
  GenerateAgentProposalsInput,
  GeneratedAgentProposal,
  LocalMarketSignal,
  LocalMarketSnapshot,
  MarketOutcome,
  PlannerStrategy,
} from "./types.js";

const PROPOSAL_THRESHOLD_BPS = 7_000;
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const UNSIGNED_INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

interface PlanDecision {
  actorAddress: `0x${string}`;
  capability: GeneratedAgentProposal["capability"];
  market: LocalMarketSignal;
  maxPayment: string;
  minStake: string;
  outcome: GeneratedAgentProposal["outcome"];
  rationale: string;
  requestedAmount: string;
  signalBps: number;
  strategy: PlannerStrategy;
}

export function generateAgentProposals(
  input: GenerateAgentProposalsInput,
): GeneratedAgentProposal[] {
  validateInput(input);

  const generatedAt = Date.parse(input.generatedAt);
  const decisions = input.snapshot.markets.flatMap((market) =>
    planMarket(input.snapshot, market),
  );

  return decisions.map((decision, index) => ({
    proposal_id: `prop-${String(index + 1).padStart(3, "0")}`,
    agent_id: input.snapshot.agent_id,
    actor_address: decision.actorAddress,
    generated_at: new Date(generatedAt + index * 1_000).toISOString(),
    market_id: decision.market.market_id,
    market_question: decision.market.question,
    capability: decision.capability,
    outcome: decision.outcome,
    requested_amount: decision.requestedAmount,
    max_payment: decision.maxPayment,
    min_stake: decision.minStake,
    rationale: decision.rationale,
    policy_reference: input.snapshot.policy_reference,
    source_type: "SYNTHETIC_AGENT_PROPOSAL",
    planner_evidence: {
      planner: "@marketlens/agent-planner",
      strategy: decision.strategy,
      snapshot_id: input.snapshot.snapshot_id,
      signal_bps: decision.signalBps,
      deterministic: true,
    },
  }));
}

function planMarket(
  snapshot: LocalMarketSnapshot,
  market: LocalMarketSignal,
): PlanDecision[] {
  if (market.status !== "OPEN") {
    return planClaim(snapshot, market);
  }

  const decisions: PlanDecision[] = [];
  if (market.momentum_signal_bps >= PROPOSAL_THRESHOLD_BPS) {
    decisions.push({
      actorAddress: snapshot.actors.momentum,
      capability: "buy_position",
      market,
      maxPayment: market.momentum_budget_wei,
      minStake: market.minimum_stake_wei,
      outcome: market.reference_outcome,
      rationale: `Momentum signal ${market.momentum_signal_bps} bps supports ${market.reference_outcome}; Moss will verify the unsigned call.`,
      requestedAmount: market.momentum_stake_wei,
      signalBps: market.momentum_signal_bps,
      strategy: "MOMENTUM",
    });
  }

  if (market.contrarian_signal_bps >= PROPOSAL_THRESHOLD_BPS) {
    const outcome = oppositeOutcome(market.reference_outcome);
    decisions.push({
      actorAddress: snapshot.actors.contrarian,
      capability: "buy_position",
      market,
      maxPayment: market.contrarian_budget_wei,
      minStake: market.minimum_stake_wei,
      outcome,
      rationale: `Contrarian signal ${market.contrarian_signal_bps} bps supports ${outcome} independently of other strategies.`,
      requestedAmount: market.contrarian_stake_wei,
      signalBps: market.contrarian_signal_bps,
      strategy: "CONTRARIAN",
    });
  }

  return decisions;
}

function planClaim(
  snapshot: LocalMarketSnapshot,
  market: LocalMarketSignal,
): PlanDecision[] {
  if (
    !market.claim_index?.candidate ||
    market.claim_index.confidence_bps < PROPOSAL_THRESHOLD_BPS
  ) {
    return [];
  }

  return [
    {
      actorAddress: snapshot.actors.claimant,
      capability: "claim_reward",
      market,
      maxPayment: "0",
      minStake: "0",
      outcome: "NOT_APPLICABLE",
      rationale: `Local reward index marks market ${market.market_id} as claimable; Moss will check execution truth.`,
      requestedAmount: "0",
      signalBps: market.claim_index.confidence_bps,
      strategy: "CLAIM_INDEX",
    },
  ];
}

function validateInput(input: GenerateAgentProposalsInput): void {
  if (!Number.isFinite(Date.parse(input.generatedAt))) {
    throw new Error("generatedAt must be a valid date-time string");
  }

  const { snapshot } = input;
  if (!snapshot.snapshot_id || !snapshot.agent_id || !snapshot.policy_reference) {
    throw new Error("snapshot metadata must be non-empty");
  }

  for (const [role, address] of Object.entries(snapshot.actors)) {
    if (!ADDRESS_PATTERN.test(address)) {
      throw new Error(`${role} actor must be a 20-byte hex address`);
    }
  }

  const seenMarketIds = new Set<string>();
  for (const market of snapshot.markets) {
    if (!market.market_id || seenMarketIds.has(market.market_id)) {
      throw new Error(`market_id must be non-empty and unique: ${market.market_id}`);
    }
    seenMarketIds.add(market.market_id);

    validateBasisPoints("momentum_signal_bps", market.momentum_signal_bps);
    validateBasisPoints("contrarian_signal_bps", market.contrarian_signal_bps);
    if (market.claim_index) {
      validateBasisPoints("claim_index.confidence_bps", market.claim_index.confidence_bps);
    }

    validateWei("momentum_stake_wei", market.momentum_stake_wei);
    validateWei("contrarian_stake_wei", market.contrarian_stake_wei);
    validateWei("momentum_budget_wei", market.momentum_budget_wei);
    validateWei("contrarian_budget_wei", market.contrarian_budget_wei);
    validateWei("minimum_stake_wei", market.minimum_stake_wei);

    if (BigInt(market.momentum_stake_wei) > BigInt(market.momentum_budget_wei)) {
      throw new Error(`market ${market.market_id} momentum stake exceeds its agent budget`);
    }
    if (BigInt(market.contrarian_stake_wei) > BigInt(market.contrarian_budget_wei)) {
      throw new Error(`market ${market.market_id} contrarian stake exceeds its agent budget`);
    }
  }
}

function validateBasisPoints(field: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 10_000) {
    throw new Error(`${field} must be safe-integer basis points between 0 and 10000`);
  }
}

function validateWei(field: string, value: string): void {
  if (!UNSIGNED_INTEGER_PATTERN.test(value)) {
    throw new Error(`${field} must be a base-10 unsigned integer string`);
  }
}

function oppositeOutcome(outcome: MarketOutcome): MarketOutcome {
  return outcome === "YES" ? "NO" : "YES";
}
