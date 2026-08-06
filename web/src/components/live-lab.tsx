"use client";

import { useState } from "react";

// ─── Conflict example: two YES/NO buys on same market ───
const CONFLICT_EXAMPLE = [
  {
    proposal_id: "live-conflict-1",
    agent_id: "live-lab-agent",
    actor_address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    market_id: "4",
    market_question: "Will Solana flip Ethereum in TVL by 2027?",
    capability: "buy_position",
    outcome: "YES",
    requested_amount: "150000000000000000",
    max_payment: "200000000000000000",
    min_stake: "50000000000000000",
    rationale: "Conflict example: YES on market 4",
    policy_reference: "live-lab",
    source_type: "SYNTHETIC_AGENT_PROPOSAL",
  },
  {
    proposal_id: "live-conflict-2",
    agent_id: "live-lab-agent",
    actor_address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    market_id: "4",
    market_question: "Will Solana flip Ethereum in TVL by 2027?",
    capability: "buy_position",
    outcome: "NO",
    requested_amount: "150000000000000000",
    max_payment: "200000000000000000",
    min_stake: "50000000000000000",
    rationale: "Conflict example: NO on market 4",
    policy_reference: "live-lab",
    source_type: "SYNTHETIC_AGENT_PROPOSAL",
  },
];

const DEFAULT_POLICY = {
  max_payment_per_action: "500000000000000000",
  max_total_payment: "500000000000000000",
  block_conflicting_outcomes_same_market: true,
};

interface VerdictResult {
  proposals: unknown[];
  policy: Record<string, unknown>;
  receipt: {
    eligible_count: number;
    final_blocked_count: number;
    eligible_proposal_ids: string[];
    blocked_proposal_ids: string[];
    per_proposal_verdicts: Array<{
      proposal_id: string;
      action_verdict: string;
      batch_verdict: string;
      reason_code?: string;
    }>;
  };
  generated_at: string;
  evidence_mode: string;
  error?: string;
  detail?: string;
}

function shortAddr(a: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

export default function LiveLab() {
  const [proposals, setProposals] = useState(CONFLICT_EXAMPLE);
  const [policy] = useState(DEFAULT_POLICY);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerdictResult | null>(null);
  const [error, setError] = useState("");

  function loadConflict() {
    setProposals(JSON.parse(JSON.stringify(CONFLICT_EXAMPLE)));
    setResult(null);
    setError("");
  }

  function resolveConflict() {
    const copy = JSON.parse(JSON.stringify(proposals));
    // Change the second proposal's outcome to match the first
    if (copy.length >= 2) {
      copy[1].outcome = copy[0].outcome;
      copy[1].rationale = "Resolved: same outcome as proposal 1";
    }
    setProposals(copy);
    setResult(null);
    setError("");
  }

  function updateProposal(index: number, field: string, value: string) {
    const copy = JSON.parse(JSON.stringify(proposals));
    copy[index][field] = value;
    setProposals(copy);
    setResult(null);
  }

  async function runVerification() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const r = await fetch("/api/verify-live-batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ proposals, policy }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || `HTTP ${r.status}`);
        // Still show result for structured errors
        if (data.receipt) setResult(data);
        return;
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  const verdicts = result?.receipt?.per_proposal_verdicts ?? [];
  const receipt = result?.receipt;

  return (
    <div style={styles.container}>
      {/* Status banner */}
      <div style={styles.banner}>
        <span style={styles.bannerLabel}>Live Local Lab</span>
        {[
          ["FRESH LOCAL ANVIL EVIDENCE", "#065f46", "#6ee7b7"],
          ["SYNTHETIC / USER-EDITED", "#1a1d2e", "#94a3b8"],
          ["UNSIGNED", "#78350f", "#fbbf24"],
          ["NOT BROADCAST", "#78350f", "#fbbf24"],
          ["NOT DEPLOYED ON MONAD", "#78350f", "#fbbf24"],
        ].map(([l, bg, fg]) => (
          <span key={l} style={{ ...styles.badge, background: bg, color: fg }}>
            {l}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        <button style={styles.btn} onClick={loadConflict}>
          Load conflict example
        </button>
        <button style={styles.btn} onClick={resolveConflict}>
          Resolve conflict
        </button>
        <button
          style={{ ...styles.btn, ...styles.primary }}
          onClick={runVerification}
          disabled={loading}
        >
          {loading ? "Verifying..." : "Run fresh verification"}
        </button>
      </div>

      {/* Proposals */}
      <div style={styles.section}>
        <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 12 }}>
          The Live Local Lab verifies a focused two-action batch for a reliable fresh-evidence demonstration.
        </p>
        <h3 style={styles.h3}>Proposals ({proposals.length})</h3>
        {proposals.map((p, i) => (
          <div key={p.proposal_id} style={styles.proposalCard}>
            <div style={styles.propHeader}>
              <strong>{p.proposal_id}</strong>
              <span style={styles.mono}>{shortAddr(p.actor_address)}</span>
            </div>
            <div style={styles.propFields}>
              <label style={styles.label}>
                Market
                <select
                  value={p.market_id}
                  onChange={(e) => updateProposal(i, "market_id", e.target.value)}
                  style={styles.select}
                >
                  {["1", "2", "3", "4"].map((m) => (
                    <option key={m} value={m}>Market {m}</option>
                  ))}
                </select>
              </label>
              <label style={styles.label}>
                Outcome
                <select
                  value={p.outcome}
                  onChange={(e) => updateProposal(i, "outcome", e.target.value)}
                  style={styles.select}
                >
                  {["YES", "NO"].map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </label>
              <label style={styles.label}>
                Amount (wei)
                <input
                  type="text"
                  value={p.requested_amount}
                  onChange={(e) => updateProposal(i, "requested_amount", e.target.value)}
                  style={styles.input}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={styles.errorBox}>
          {error.includes("unavailable") ? "⚠️ Live local fixture unavailable" : `❌ ${error}`}
          {result?.detail && <div style={{ fontSize: 12, marginTop: 4 }}>{result.detail}</div>}
        </div>
      )}

      {/* Results */}
      {result && receipt && (
        <div style={styles.section}>
          <h3 style={styles.h3}>
            Verdict: {receipt.eligible_count} eligible / {receipt.final_blocked_count} blocked
          </h3>
          <div style={styles.meta}>
            <span>Generated: {result.generated_at}</span>
            <span>Mode: {result.evidence_mode}</span>
          </div>

          {verdicts.map((v) => {
            const isBlocked = v.batch_verdict !== "PASS";
            return (
              <div
                key={v.proposal_id}
                style={{
                  ...styles.verdictCard,
                  borderColor: isBlocked ? "#fca5a5" : "#6ee7b7",
                }}
              >
                <strong>{v.proposal_id}</strong>
                <div style={styles.verdictRow}>
                  <span style={{ color: "#94a3b8" }}>Simulation: </span>
                  <span style={{ color: v.action_verdict === "PASS" ? "#6ee7b7" : "#fca5a5" }}>
                    {v.action_verdict}
                  </span>
                </div>
                <div style={styles.verdictRow}>
                  <span style={{ color: "#94a3b8" }}>Action policy: </span>
                  <span style={{ color: v.action_verdict === "PASS" ? "#6ee7b7" : "#fca5a5" }}>
                    {v.action_verdict === "PASS" ? "PASSED" : "BLOCKED"}
                  </span>
                </div>
                <div style={styles.verdictRow}>
                  <span style={{ color: "#94a3b8" }}>Batch policy: </span>
                  <span style={{ color: isBlocked ? "#fca5a5" : "#6ee7b7" }}>
                    {isBlocked ? "BLOCKED" : "PASSED"}
                  </span>
                </div>
                {v.reason_code && (
                  <div style={styles.reasonCode}>{v.reason_code}</div>
                )}
              </div>
            );
          })}

          <div style={styles.counts}>
            <span>✅ {receipt.eligible_count} eligible</span>
            <span>🚫 {receipt.final_blocked_count} blocked</span>
            <span>✍️ 0 signed</span>
            <span>📡 0 broadcast</span>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "24px 16px",
    fontFamily: "system-ui, sans-serif",
    color: "#e2e8f0",
  },
  banner: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 16,
    padding: "10px 14px",
    background: "#1a1d2e",
    borderRadius: 10,
    border: "1px solid #2d3148",
    alignItems: "center",
  },
  bannerLabel: { fontSize: 11, fontWeight: 700, color: "#7c3aed", marginRight: 8 },
  badge: { padding: "1px 8px", borderRadius: 3, fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" as const },
  actions: { display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" as const },
  btn: {
    padding: "8px 16px",
    borderRadius: 6,
    border: "1px solid #2d3148",
    background: "#1a1d2e",
    color: "#e2e8f0",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  primary: { background: "#7c3aed", color: "#fff", borderColor: "#7c3aed" },
  section: { marginTop: 24 },
  h3: { fontSize: 16, fontWeight: 700, marginBottom: 12 },
  proposalCard: {
    padding: "10px 14px",
    background: "#1a1d2e",
    borderRadius: 8,
    border: "1px solid #2d3148",
    marginBottom: 8,
  },
  propHeader: { display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 },
  mono: { fontFamily: "monospace", fontSize: 12, color: "#94a3b8" },
  propFields: { display: "flex", gap: 12, flexWrap: "wrap" as const },
  label: { display: "flex", flexDirection: "column" as const, gap: 3, fontSize: 12, color: "#94a3b8" },
  select: {
    padding: "4px 8px",
    borderRadius: 4,
    border: "1px solid #2d3148",
    background: "#0f1117",
    color: "#e2e8f0",
    fontSize: 12,
  },
  input: {
    padding: "4px 8px",
    borderRadius: 4,
    border: "1px solid #2d3148",
    background: "#0f1117",
    color: "#e2e8f0",
    fontSize: 12,
    width: 180,
  },
  errorBox: {
    marginTop: 16,
    padding: "12px 16px",
    background: "#451a1a",
    borderRadius: 8,
    color: "#fca5a5",
    fontSize: 14,
    fontWeight: 600,
  },
  meta: { display: "flex", gap: 16, fontSize: 11, color: "#64748b", marginBottom: 12 },
  verdictCard: {
    padding: "10px 14px",
    background: "#1a1d2e",
    borderRadius: 8,
    border: "1px solid",
    marginBottom: 8,
  },
  verdictRow: { fontSize: 13, marginTop: 2 },
  reasonCode: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: "monospace",
    color: "#fbbf24",
    background: "#2d1a00",
    padding: "2px 8px",
    borderRadius: 4,
    display: "inline-block",
  },
  counts: {
    display: "flex",
    gap: 16,
    marginTop: 12,
    fontSize: 13,
    fontWeight: 600,
    flexWrap: "wrap" as const,
  },
};
