"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function shortAddr(a: string) { return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : ""; }

const SCENARIOS = [
  { key: "buy_yes", label: "Buy YES", sub: "Market #1 · 1,000,000,000 wei · Simulated", type: "success" as const },
  { key: "claim_reward", label: "Claim Reward", sub: "Market #3 · Winner claim · Simulated", type: "success" as const },
  { key: "losing_claim", label: "Losing Claim", sub: "Market #3 · Losing wallet · Blocked", type: "failure" as const },
];

const FLOW_STEPS = ["Evidence","Intent","Simulation","Verification"];

type DemoManifest = {
  dataFiles?: Record<string, { sha256?: string; status?: string }>;
};

function DemoContent() {
  const params = useSearchParams();
  const mode = params.get("mode") || "present";
  const isTechnical = mode === "technical";

  const [manifest, setManifest] = useState<DemoManifest | null>(null);
  const [scenarioKey, setScenarioKey] = useState("buy_yes");

  const scenario = SCENARIOS.find(s => s.key === scenarioKey) || SCENARIOS[0];
  const isFailure = scenario.type === "failure";
  const isClaim = scenarioKey === "claim_reward";

  useEffect(() => {
    fetch("/data/demo-manifest.json").then(r => r.json()).then(setManifest);
  }, []);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>

      {/* ====== HERO ====== */}
      <div className="pageWrap" style={{ paddingTop: 64, paddingBottom: 40 }}>
        <span className="sectionLabel">MARKETLENS DEMO</span>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(34px,4vw,52px)", fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.06, margin: "8px 0 12px", maxWidth: 780 }}>
          Know what the transaction will do<br />before anyone signs it.
        </h1>
        <p style={{ fontSize: 16, color: "var(--text-muted)", maxWidth: 640, lineHeight: 1.5, marginBottom: 20 }}>
          MarketLens connects prediction-market evidence to an unsigned Moss action, a local trace simulation, and a receipt checked against the user&apos;s constraints.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 40 }}>
          <span className="statusBadge statusBadge-neutral">LOCAL SNAPSHOT</span>
          <span className="statusBadge statusBadge-warning">UNSIGNED</span>
          <span className="statusBadge statusBadge-warning">NOT BROADCAST</span>
        </div>

        {/* Horizontal flow */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40, flexWrap: "wrap" }}>
          {FLOW_STEPS.map((s, i) => (
            <span key={s} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ padding: "6px 14px", borderRadius: 6, background: "var(--accent-soft)", color: "var(--accent-hover)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 650 }}>{s}</span>
              {i < 3 && <span style={{ color: "var(--text-dim)", fontSize: 14 }}>→</span>}
            </span>
          ))}
        </div>

        {/* Scene Switcher — 3 cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {SCENARIOS.map(s => {
            const active = scenarioKey === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setScenarioKey(s.key)}
                style={{
                  padding: "14px 16px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                  border: `1.5px solid ${active ? "var(--border-accent)" : "var(--border)"}`,
                  background: active ? "var(--accent-soft)" : "var(--surface-1)",
                  transition: "all .15s",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 2 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ====== SECTION 1: EVIDENCE ====== */}
      <div style={{ borderTop: "1px solid var(--border)" }}>
        <div className="pageWrap" style={{ paddingTop: 48, paddingBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 28 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>01</span>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px,2.5vw,30px)", fontWeight: 650, margin: 0, letterSpacing: "-.015em" }}>Evidence</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.15fr) minmax(300px,0.85fr)", gap: "clamp(24px,4vw,48px)" }}>
            {/* Market display */}
            <div>
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Market #1</span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 650, margin: "4px 0 16px", lineHeight: 1.25 }}>
                  Will ETH be above $3,000 by end of Q3?
                </h3>

                {/* YES/NO probability bar */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    <span style={{ color: "var(--success-text)" }}>YES 65%</span>
                    <span style={{ color: "var(--text-muted)" }}>NO 35%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "var(--surface-2)", overflow: "hidden" }}>
                    <div style={{ width: "65%", height: "100%", borderRadius: 3, background: "var(--success)" }} />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 18, marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
                  <span>8 observed wallets</span>
                  <span>22 transactions</span>
                  <span style={{ color: "var(--warning-text)", fontFamily: "var(--font-mono)", fontSize: 10 }}>DEMO SAMPLE</span>
                </div>
              </div>
            </div>

            {/* Product insight */}
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
                Product insight
              </div>
              <p style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.4, marginBottom: 12 }}>
                Participation is concentrated in Market #1.
              </p>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 20 }}>
                It has the largest observed wallet and transaction count in this local sample, making it the clearest scenario for demonstrating action verification.
              </p>
              <p style={{ fontSize: 11, color: "var(--text-dim)" }}>
                Product observation only · Not investment advice
              </p>

              {isTechnical && (
                <details style={{ marginTop: 20 }}>
                  <summary style={{ fontSize: 11, color: "var(--accent-hover)", cursor: "pointer", fontWeight: 600 }}>Evidence details ▸</summary>
                  <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
                    <p>Data: local Anvil snapshot (chain 143)</p>
                    <p>wallets = addresses, not persons</p>
                    <p>first_seen ≠ new platform user</p>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ====== SECTION 2: DEFINE ====== */}
      <div style={{ borderTop: "1px solid var(--border)" }}>
        <div className="pageWrap" style={{ paddingTop: 48, paddingBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 28 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>02</span>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px,2.5vw,30px)", fontWeight: 650, margin: 0, letterSpacing: "-.015em" }}>Define</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(24px,4vw,48px)" }}>
            {/* Action Intent — order confirmation style */}
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>
                Action intent
              </div>
              <div style={{ fontSize: 24, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
                {isFailure ? "CLAIM REWARD" : isClaim ? "CLAIM REWARD" : "BUY YES"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>
                User-selected action
              </div>

              <div style={{ borderTop: "1px solid var(--border)" }}>
                {(isFailure || isClaim) ? [
                  ["Market","#3 — Will the Fed cut rates?"],
                  ["Claimant",shortAddr("0x70997970C51812dc3A010C7d01b50e0d17dc79C8")],
                  ["Position",isFailure ? "NO (losing side)" : "YES (winning side)"],
                  ["Resolved","YES"],
                ].map(([k,v]) => (
                  <div key={k as string} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                    <span style={{ color: "var(--text-muted)" }}>{k}</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: isFailure && k === "Position" ? "var(--danger-text)" : "var(--text-primary)", fontWeight: isFailure && k === "Position" ? 600 : 400 }}>{v as string}</span>
                  </div>
                )) : [
                  ["Market","#1 — Will ETH be above $3,000?"],
                  ["Buyer",shortAddr("0x70997970C51812dc3A010C7d01b50e0d17dc79C8")],
                  ["Payment","1,000,000,000 wei"],
                  ["Maximum","1,000,000,000 wei"],
                  ["Minimum stake","1,000,000,000 wei"],
                ].map(([k,v]) => (
                  <div key={k as string} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                    <span style={{ color: "var(--text-muted)" }}>{k}</span>
                    <span style={{ fontFamily: "var(--font-mono)" }}>{v as string}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, padding: "8px 12px", borderRadius: 6, background: "rgba(245,158,11,.06)", fontSize: 11, color: "var(--warning-text)", textAlign: "center", fontWeight: 600 }}>
                This action has not been signed.
              </div>
            </div>

            {/* Action Construction */}
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 }}>
                Action construction
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 12, fontFamily: "var(--font-mono)" }}>
                <span style={{ padding: "5px 12px", borderRadius: 6, background: "var(--accent-soft)", color: "var(--accent-hover)", fontWeight: 650 }}>Intent</span>
                <span style={{ color: "var(--text-dim)" }}>→</span>
                <span style={{ padding: "5px 12px", borderRadius: 6, background: "var(--accent-soft)", color: "var(--accent-hover)", fontWeight: 650 }}>
                  {isFailure || isClaim ? "claimReward" : "buyPosition"}
                </span>
                <span style={{ color: "var(--text-dim)" }}>→</span>
                <span style={{ padding: "5px 12px", borderRadius: 6, background: "var(--surface-2)", color: "var(--text-muted)" }}>Unsigned tx</span>
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                {[
                  ["To",shortAddr("0x5fbdb2315678afecb367f032d93f642f64180aa3")],
                  ["Value",isFailure||isClaim ? "0 wei" : "1,000,000,000 wei"],
                  ["Function",isFailure ? "claimReward(3)" : isClaim ? "claimReward(3)" : "buyPosition(1, YES)"],
                ].map(([k,v]) => (
                  <div key={k as string} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                    <span style={{ color: "var(--text-dim)", textTransform: "uppercase", fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: ".06em" }}>{k}</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: k==="Function"?"var(--accent-hover)":"var(--text-primary)" }}>{v as string}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: "var(--success-text)", fontWeight: 650 }}>
                ✓ Exact match with independent builder
              </div>

              {isTechnical && (
                <details style={{ marginTop: 16 }}>
                  <summary style={{ fontSize: 11, color: "var(--text-dim)", cursor: "pointer" }}>Full calldata ▸</summary>
                  <pre style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                    {isFailure ? "claimReward(3)" : isClaim ? "claimReward(3)" : "buyPosition(1, YES) · value=1000000000"}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ====== SECTION 3: SIMULATE ====== */}
      <div style={{ borderTop: "1px solid var(--border)" }}>
        <div className="pageWrap" style={{ paddingTop: 48, paddingBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 28 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>03</span>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px,2.5vw,30px)", fontWeight: 650, margin: 0, letterSpacing: "-.015em" }}>Simulate</h2>
          </div>

          {/* Trace result banner */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, padding: "16px 20px", borderRadius: 10, background: isFailure ? "rgba(239,68,68,.06)" : "rgba(16,185,129,.06)", border: `1px solid ${isFailure ? "rgba(239,68,68,.15)" : "rgba(16,185,129,.15)"}` }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: isFailure ? "var(--danger-text)" : "var(--success-text)" }}>
              {isFailure ? "Simulation blocked" : "Simulation passed"}
            </span>
            <span style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: 10 }}>
              debug_traceCall · Local Anvil · Chain 143
            </span>
          </div>

          {/* Trace timeline */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 }}>
              Execution trace
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
              {[
                ["Contract Call","neutral"],
                ["Native Transfer","accent"],
                [isFailure ? "REVERTED" : (isClaim ? "RewardClaimed" : "PositionBought"),"event"],
                [isFailure ? " → Failure" : "Return","success"],
              ].map(([label,style],i) => (
                <span key={i} style={{ display: "flex", alignItems: "center" }}>
                  <span style={{
                    padding: "8px 16px", borderRadius: 6,
                    background: style==="accent"?"var(--accent-soft)":style==="event"?isFailure?"var(--danger-bg)":"var(--success-bg)":style==="success"?isFailure?"rgba(239,68,68,.08)":"rgba(16,185,129,.06)":"var(--surface-2)",
                    color: style==="accent"?"var(--accent-hover)":style==="event"?isFailure?"var(--danger-text)":"var(--success-text)":style==="success"?isFailure?"var(--danger-text)":"var(--success-text)":"var(--text-muted)",
                    fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 650,
                  }}>{label}</span>
                  {i < 3 && <span style={{ color: "var(--text-dim)", padding: "0 6px", fontSize: 14 }}>→</span>}
                </span>
              ))}
            </div>
          </div>

          {/* Stats — text only, no KPI boxes */}
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            <span>Reverted: <strong style={{ color: isFailure?"var(--danger-text)":"var(--success-text)", fontWeight: 700 }}>{String(isFailure)}</strong></span>
            <span>Warnings: <strong style={{ color: isFailure?"var(--danger-text)":"var(--text-primary)", fontWeight: 700 }}>{isFailure?"1":"0"}</strong></span>
            <span>State changed: <strong style={{ color: "var(--success-text)", fontWeight: 700 }}>No</strong></span>
            <span>Transaction sent: <strong style={{ color: "var(--text-primary)", fontWeight: 700 }}>No</strong></span>
          </div>

          {/* Receipt — document style */}
          {!isFailure && (
            <div style={{ marginTop: 40, border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", background: "var(--surface-2)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em" }}>Simulation receipt</span>
                <span className="statusBadge statusBadge-verified">VERIFIED</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                <div style={{ padding: 24 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 }}>
                    Observed changes
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", fontWeight: 700, marginRight: 8 }}>01</span>
                    <span style={{ fontSize: 13 }}>Native transfer</span>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, marginLeft: 24 }}>
                      {isClaim ? "contract → 0x7099…79C8 · payout" : "0x7099…79C8 → contract · 1,000,000,000 wei"}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", fontWeight: 700, marginRight: 8 }}>02</span>
                    <span style={{ fontSize: 13 }}>{isClaim ? "RewardClaimed event" : "PositionBought event"}</span>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, marginLeft: 24 }}>
                      {isClaim ? "M3" : "M1"} · {isClaim ? "Reward" : "YES"} · 1,000,000,000 wei
                    </div>
                  </div>
                </div>
                <div style={{ padding: 24, borderLeft: "1px solid var(--border)", background: "var(--surface-2)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 }}>
                    Outcome
                  </div>
                  {(isClaim ? [["Claimant","0x7099…79C8"],["Market","#3"],["Result","Reward"]] : [["Buyer","0x7099…79C8"],["Market","#1"],["Side","YES"],["Amount","1,000,000,000 wei"]]).map(([k,v]) => (
                    <div key={k as string} style={{ marginBottom: 10 }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 1 }}>{k}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{v as string}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border)", background: "rgba(16,185,129,.03)", fontSize: 11, color: "var(--success-text)", display: "flex", gap: 16 }}>
                <span>✓ All changes covered</span>
                <span>✓ Original order preserved</span>
                <span>✓ No duplicate coverage</span>
              </div>
            </div>
          )}
          {isFailure && (
            <div style={{ marginTop: 32, padding: 28, borderRadius: 10, border: "1px solid rgba(239,68,68,.15)", background: "rgba(239,68,68,.03)", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--danger-text)", marginBottom: 4 }}>No successful receipt</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Reverted transactions produce no structured outcome.</div>
            </div>
          )}
        </div>
      </div>

      {/* ====== SECTION 4: VERIFY ====== */}
      <div style={{ borderTop: "1px solid var(--border)" }}>
        <div className="pageWrap" style={{ paddingTop: 48, paddingBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 28 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>04</span>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px,2.5vw,30px)", fontWeight: 650, margin: 0, letterSpacing: "-.015em" }}>Verify</h2>
          </div>

          <p style={{ fontSize: 15, color: "var(--text-muted)", marginBottom: 28, maxWidth: 640 }}>
            The receipt shows what happened. Intent verification checks whether it was what the user asked for.
          </p>

          {/* Intent comparison table */}
          <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 28 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  <th style={{ padding: "11px 18px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", textAlign: "left", letterSpacing: ".05em" }}>Rule</th>
                  <th style={{ padding: "11px 18px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", textAlign: "left", letterSpacing: ".05em" }}>Expected</th>
                  <th style={{ padding: "11px 18px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", textAlign: "left", letterSpacing: ".05em" }}>Actual</th>
                  <th style={{ padding: "11px 18px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", textAlign: "left", letterSpacing: ".05em" }}>Result</th>
                </tr>
              </thead>
              <tbody>
                {isFailure ? [
                  ["simulation_passed","true","false","FAIL"],
                  ["receipt_exists","true","false","FAIL"],
                  ["claimant_eligible","true","false","FAIL"],
                ].map(([r,e,a,s]) => (
                  <tr key={r as string} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 18px", fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{r}</td>
                    <td style={{ padding: "10px 18px", fontSize: 12, fontFamily: "var(--font-mono)" }}>{e}</td>
                    <td style={{ padding: "10px 18px", fontSize: 12, fontFamily: "var(--font-mono)" }}>{a}</td>
                    <td style={{ padding: "10px 18px", fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--danger-text)" }}>{s}</td>
                  </tr>
                )) : [
                  ["buyer_matches","0x7099…79C8","0x7099…79C8","PASS"],
                  ["market_id_matches","1","1","PASS"],
                  ["outcome_matches","YES","YES","PASS"],
                  ["payment_within_limit","≤1,000,000,000","1,000,000,000","PASS"],
                  ["stake_meets_minimum","≥1,000,000,000","1,000,000,000","PASS"],
                  ["no_warnings","0","0","PASS"],
                  ["not_halted","false","false","PASS"],
                ].map(([r,e,a,s]) => (
                  <tr key={r as string} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 18px", fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{r}</td>
                    <td style={{ padding: "10px 18px", fontSize: 12, fontFamily: "var(--font-mono)" }}>{e}</td>
                    <td style={{ padding: "10px 18px", fontSize: 12, fontFamily: "var(--font-mono)" }}>{a}</td>
                    <td style={{ padding: "10px 18px", fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--success-text)" }}>{s}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ====== FINAL STATUS ====== */}
          {isFailure ? (
            <div style={{ padding: "32px 36px", borderRadius: 12, border: "1.5px solid rgba(239,68,68,.2)", background: "rgba(239,68,68,.03)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
                <div style={{ minWidth: 240 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "var(--danger-text)", marginBottom: 8, letterSpacing: "-.015em" }}>
                    Action blocked before signing
                  </div>
                  <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 20 }}>
                    MarketLens prevented an invalid claim from proceeding.
                  </div>
                  <div style={{ display: "flex", gap: "clamp(16px,3vw,28px)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                    <div><span style={{ color: "var(--danger-text)", fontWeight: 700 }}>✕</span> Simulation reverted<br /><span style={{ color: "var(--danger-text)", fontWeight: 700 }}>✕</span> No receipt<br /><span style={{ color: "var(--danger-text)", fontWeight: 700 }}>✕</span> Intent constraints failed<br /><span style={{ color: "var(--success-text)", fontWeight: 700 }}>✓</span> No transaction sent</div>
                  </div>
                </div>
                {/* Brand flow line for failure */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: 0.6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--text-dim)" }} />
                  <span style={{ width: 24, height: 1, background: "var(--danger)" }} />
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--danger)" }} />
                  <span style={{ width: 24, height: 1, background: "var(--danger)" }} />
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--danger)" }} />
                </div>
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <span className="statusBadge statusBadge-danger">DO NOT SIGN</span>
                <span className="statusBadge statusBadge-warning">EXECUTION BLOCKED</span>
              </div>
              <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 16 }}>
                Local Anvil · Chain 143 · Not Monad mainnet/testnet
              </div>
            </div>
          ) : (
            <div style={{ padding: "32px 36px", borderRadius: 12, border: "1.5px solid rgba(16,185,129,.2)", background: "rgba(16,185,129,.03)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
                <div style={{ minWidth: 240 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "var(--success-text)", marginBottom: 8, letterSpacing: "-.015em" }}>
                    Local simulation verified
                  </div>
                  <div style={{ display: "flex", gap: "clamp(16px,3vw,28px)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                    <div>
                      <span style={{ color: "var(--success-text)" }}>✓</span> Receipt verified<br />
                      <span style={{ color: "var(--success-text)" }}>✓</span> Intent matched<br />
                      <span style={{ color: "var(--success-text)" }}>✓</span> State unchanged
                    </div>
                    <div>
                      <span style={{ color: "var(--warning-text)" }}>○</span> Signing not performed<br />
                      <span style={{ color: "var(--warning-text)" }}>○</span> Broadcast not performed
                    </div>
                  </div>
                </div>
                {/* Brand flow line — MarketLens signature */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
                  <span style={{ width: 24, height: 1.5, background: "var(--accent)" }} />
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
                  <span style={{ width: 24, height: 1.5, background: "var(--success)" }} />
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)" }} />
                  <span style={{ width: 24, height: 1.5, background: "var(--success)" }} />
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", boxShadow: "0 0 0 3px rgba(16,185,129,.2)" }} />
                </div>
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <span className="statusBadge statusBadge-warning">UNSIGNED</span>
                <span className="statusBadge statusBadge-warning">NOT BROADCAST</span>
              </div>
              <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 16 }}>
                Local Anvil · Chain 143 · Not Monad mainnet/testnet
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Technical mode extras */}
      {isTechnical && manifest && (
        <div className="pageWrap" style={{ paddingBottom: 48 }}>
          <details style={{ cursor: "pointer" }}>
            <summary style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 600 }}>Snapshot integrity ▸</summary>
            <pre style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 6, fontFamily: "var(--font-mono)" }}>
              {Object.entries(manifest.dataFiles || {}).map(([f, item]) =>
                `${f}: ${item.sha256?.slice(0,16)||"?"}… (${item.status||"?"})`
              ).join(" | ")}
            </pre>
          </details>
        </div>
      )}

      {/* Mode footer */}
      <div style={{ borderTop: "1px solid var(--border)" }}>
        <div className="pageWrap" style={{ paddingTop: 24, paddingBottom: 64, display: "flex", gap: 12 }}>
          <a href="/demo?mode=present" className="btn-secondary" style={{ fontSize: 13, minHeight: 38, padding: "0 18px" }}>
            Presenter mode
          </a>
          <a href="/demo?mode=technical" className="btn-secondary" style={{ fontSize: 13, minHeight: 38, padding: "0 18px" }}>
            Technical mode
          </a>
        </div>
      </div>
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)", background: "var(--bg)", minHeight: "100vh" }}>
        Loading demo…
      </div>
    }>
      <DemoContent />
    </Suspense>
  );
}
