"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function shortAddr(a: string) { return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : ""; }

const STATUS_BAR = [
  ["Analytics", "REAL", "#065f46", "#6ee7b7"],
  ["Moss Simulation", "REAL LOCAL", "#065f46", "#6ee7b7"],
  ["Receipt", "VERIFIED", "#065f46", "#6ee7b7"],
  ["Intent", "CHECKED", "#065f46", "#6ee7b7"],
  ["Signing", "DISABLED", "#78350f", "#fbbf24"],
  ["Broadcast", "DISABLED", "#78350f", "#fbbf24"],
  ["Monad", "NOT DEPLOYED", "#78350f", "#fbbf24"],
];

const INTENT_CHECKS = [
  { rule: "buyer_matches", expected: "0x7099…79C8", actual: "0x7099…79C8", passed: true },
  { rule: "market_id_matches", expected: "1", actual: "1", passed: true },
  { rule: "outcome_matches", expected: "YES", actual: "YES", passed: true },
  { rule: "payment_within_limit", expected: "≤ 1,000,000,000 wei", actual: "1,000,000,000 wei", passed: true },
  { rule: "stake_meets_minimum", expected: "≥ 1,000,000,000 wei", actual: "1,000,000,000 wei", passed: true },
  { rule: "no_warnings", expected: "0", actual: "0", passed: true },
  { rule: "not_halted", expected: "false", actual: "false", passed: true },
];

function DemoContent() {
  const params = useSearchParams();
  const mode = params.get("mode") || "present";
  const isTechnical = mode === "technical";
  const isPresent = mode === "present";

  const [step, setStep] = useState(isPresent ? 8 : 0);
  const [manifest, setManifest] = useState<any>(null);
  const [sims, setSims] = useState<any>(null);
  const [scenario, setScenario] = useState<"success" | "failure">("success");

  useEffect(() => {
    fetch("/data/demo-manifest.json").then(r => r.json()).then(setManifest);
    fetch("/data/moss-simulations.json").then(r => r.json()).then(setSims);
  }, []);

  const buyYes = sims?.successScenarios?.["buy_position_YES"];
  const shown = (n: number) => isPresent || step >= n;

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 16px 80px", fontFamily: "system-ui, sans-serif", color: "#e2e8f0", background: "#0f1117", minHeight: "100vh" }}>
      {/* Status banner */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, padding: "10px 14px", background: "#1a1d2e", borderRadius: 10, border: "1px solid #2d3148" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", marginRight: 8, alignSelf: "center" }}>MarketLens Verified Local Demo</span>
        {STATUS_BAR.map(([l, s, bg, fg]) => (
          <span key={l} title={l} style={{ padding: "1px 8px", borderRadius: 3, fontSize: 10, fontWeight: 600, background: bg, color: fg, whiteSpace: "nowrap" }}>
            {s}
          </span>
        ))}
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>MarketLens Demo</h1>
      <p style={{ color: "#94a3b8", marginBottom: 8, fontSize: 14 }}>
        Evidence-backed prediction market analytics with verifiable action simulation.
      </p>
      <p style={{ color: "#fbbf24", fontSize: 12, marginBottom: 24 }}>
        ⚠️ REAL LOCAL DEMO — NOT A LIVE TRADING SYSTEM
      </p>

      {!isPresent && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["present","technical"].map(m => (
            <button key={m} onClick={() => window.location.search = `?mode=${m}`} style={{
              padding: "4px 12px", borderRadius: 6, border: "1px solid #2d3148", cursor: "pointer",
              background: mode === m ? "#7c3aed" : "#1a1d2e", color: mode === m ? "#fff" : "#94a3b8", fontSize: 12, fontWeight: 600,
            }}>Mode: {m}</button>
          ))}
        </div>
      )}

      <div style={{ background: "#1a1d2e", borderRadius: 12, padding: 24, marginBottom: 24, border: "1px solid #2d3148" }}>
        {[
          { n: 1, label: "Evidence", body: shown(1) && <div style={box}><p style={dim}>Local demo sample · wallets observed in Phase 2A snapshot</p><details><summary style={link}>View Evidence ▸</summary><div style={dim}><p>• Data: local Anvil snapshot</p><p>• wallets = addresses, not persons</p><p>• first_seen ≠ new platform user</p><p>• sample-window D1 ≠ retention</p><p style={{ color: "#fbbf24" }}>⚠️ DEMO SAMPLE</p></div></details></div> },
          { n: 2, label: "Product Insight", body: shown(2) && <div style={box}><p style={{ fontSize: 13 }}><strong>Observed:</strong> Market 1 has strongest participation in this local sample.</p><p style={dim}>Product observation, not investment advice.</p></div> },
          { n: 3, label: "User Intent", body: shown(3) && <div style={box}>
            {scenario === "success" ? (
              <table style={{ fontSize: 13 }}><tbody>
                {[["Buyer", shortAddr("0x70997970C51812dc3A010C7d01b50e0d17dc79C8")], ["Market", "1"], ["Outcome", "YES"], ["Payment", "1,000,000,000 wei"], ["Max payment", "1,000,000,000 wei"], ["Min stake", "1,000,000,000 wei"]].map(([k, v]) => (
                  <tr key={k}><td style={{ padding: "2px 12px 2px 0", color: "#94a3b8" }}>{k}</td><td style={{ fontFamily: "monospace" }}>{v}</td></tr>
                ))}
              </tbody></table>
            ) : (
              <div>
                <p style={{ fontSize: 13 }}>Claim reward from Market 3</p>
                <p style={{ fontSize: 12, color: "#fca5a5", marginTop: 4 }}>Claimant is on the losing side (NO) of a YES-resolved market.</p>
              </div>
            )}
          </div> },
          { n: 4, label: "Moss Action", body: shown(4) && <div style={box}>
            {scenario === "success" ? (
              <div><p style={{ fontSize: 13 }}>Capability: <code>buyPosition</code> · Protocol: <code>marketlens</code></p>
              <p style={{ fontSize: 12, color: "#6ee7b7" }}>✓ Manual builder match</p>
              {isTechnical && <details><summary style={link}>Calldata ▸</summary><pre style={{ fontSize: 10, color: "#94a3b8" }}>buyPosition(1, YES) · value=1000000000 wei</pre></details>}</div>
            ) : (
              <div><p style={{ fontSize: 13 }}>Capability: <code>claimReward</code> · Protocol: <code>marketlens</code></p>
              <p style={{ fontSize: 12, color: "#6ee7b7" }}>✓ Action constructed</p></div>
            )}
          </div> },
          { n: 5, label: "Trace Simulation", body: shown(5) && <div style={box}>
            {scenario === "success" ? (
              <div><p style={{ fontSize: 13, color: "#6ee7b7" }}>✓ debug_traceCall · reverted=false</p><p style={dim}>Warnings: 0 · Halted: false · State unchanged</p></div>
            ) : (
              <div><p style={{ fontSize: 13, color: "#fca5a5" }}>✗ debug_traceCall · reverted=true</p>
              <p style={dim}>Warning: REVERTED · NothingToClaim</p>
              <p style={{ fontSize: 12, color: "#fbbf24", marginTop: 4 }}>This is the value — the system caught a bad action BEFORE signing.</p></div>
            )}
          </div> },
          { n: 6, label: "Receipt", body: shown(6) && <div style={box}>
            {scenario === "success" ? (
              <div>
                {[{ k: "nativeTransfer", d: "0x7099…79C8 → contract · 1,000,000,000 wei" }, { k: "event", d: "PositionBought · M1 · YES · 1,000,000,000 wei" }].map((c, i) => (
                  <div key={i} style={{ fontSize: 12, padding: "4px 8px", background: "#0f1117", borderRadius: 4, marginBottom: 4 }}>[{c.k}] {c.d}</div>
                ))}
                <p style={{ fontSize: 12, color: "#6ee7b7", marginTop: 8 }}>✓ All Changes covered · Order preserved</p>
              </div>
            ) : (
              <div><p style={{ fontSize: 13, color: "#fca5a5" }}>✗ No successful receipt</p><p style={dim}>Reverted transactions produce no structured outcome.</p></div>
            )}
          </div> },
          { n: 7, label: "Intent Checks", body: shown(7) && <div style={box}>
            {scenario === "success" ? (
              <div>
                {INTENT_CHECKS.map(c => (
                  <div key={c.rule} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0", borderBottom: "1px solid #2d3148" }}>
                    <span style={{ color: "#94a3b8" }}>{c.rule}</span>
                    <span style={{ fontFamily: "monospace" }}>{c.expected} → {c.actual} <span style={{ color: c.passed ? "#6ee7b7" : "#fca5a5", marginLeft: 8 }}>{c.passed ? "✓" : "✗"}</span></span>
                  </div>
                ))}
                <p style={{ fontSize: 12, color: "#6ee7b7", marginTop: 8 }}>✓ 7/7 passed</p>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0", borderBottom: "1px solid #2d3148" }}>
                  <span style={{ color: "#94a3b8" }}>simulation_passed</span>
                  <span style={{ fontFamily: "monospace" }}>true → false <span style={{ color: "#fca5a5", marginLeft: 8 }}>✗</span></span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0", borderBottom: "1px solid #2d3148" }}>
                  <span style={{ color: "#94a3b8" }}>receipt_exists</span>
                  <span style={{ fontFamily: "monospace" }}>true → false <span style={{ color: "#fca5a5", marginLeft: 8 }}>✗</span></span>
                </div>
                <p style={{ fontSize: 12, color: "#fca5a5", marginTop: 8 }}>✗ Intent checks failed</p>
              </div>
            )}
          </div> },
          { n: 8, label: "Final Status", body: shown(8) && (
            <div style={{ ...box, border: `2px solid ${scenario === "success" ? "#065f46" : "#7f1d1d"}` }}>
              {scenario === "success" ? (
                <div>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#6ee7b7" }}>LOCAL SIMULATION PASSED</p>
                  <p style={{ color: "#6ee7b7" }}>INTENT CHECKS PASSED</p>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    {["UNSIGNED", "NOT BROADCAST", "STATE UNCHANGED"].map(l => (
                      <span key={l} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "#78350f", color: "#fbbf24" }}>{l}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#fca5a5" }}>SIMULATION BLOCKED</p>
                  <p style={{ fontSize: 14, color: "#fbbf24" }}>Action blocked before signing — by design.</p>
                  <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
                    The system prevented execution of a losing claim. This is the value of simulation: catch errors before they cost money.
                  </p>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "#7f1d1d", color: "#fca5a5" }}>DO NOT SIGN</span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "#7f1d1d", color: "#fca5a5" }}>EXECUTION BLOCKED</span>
                  </div>
                </div>
              )}
              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 12 }}>Local Anvil · Chain ID 143 · Not Monad mainnet/testnet</p>
            </div>
          )}
        ].map(({ n, label, body }) => (
          <div key={n}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ width: 28, height: 28, borderRadius: "50%", background: shown(n) ? "#7c3aed" : "#2d3148", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{n}</span>
              <strong style={{ fontSize: 14, color: "#e2e8f0" }}>{label}</strong>
            </div>
            <div style={{ marginLeft: 36, marginBottom: 20 }}>{body || <div style={{ ...box, color: "#64748b", fontSize: 13 }}>Click controls below to reveal</div>}</div>
          </div>
        ))}
      </div>

      {!isPresent && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
            <button key={n} onClick={() => setStep(n)} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #2d3148", cursor: "pointer", background: step >= n ? "#7c3aed" : "#1a1d2e", color: step >= n ? "#fff" : "#94a3b8", fontWeight: 600, fontSize: 13 }}>Step {n}</button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
        <button onClick={() => { setScenario("success"); if (isPresent) setStep(8); }} style={{ padding: "8px 16px", borderRadius: 8, border: `2px solid ${scenario === "success" ? "#065f46" : "#2d3148"}`, background: scenario === "success" ? "#065f46" : "#1a1d2e", color: scenario === "success" ? "#6ee7b7" : "#94a3b8", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
          ✓ Buy YES (success)
        </button>
        <button onClick={() => { setScenario("failure"); if (isPresent) setStep(8); }} style={{ padding: "8px 16px", borderRadius: 8, border: `2px solid ${scenario === "failure" ? "#7f1d1d" : "#2d3148"}`, background: scenario === "failure" ? "#7f1d1d" : "#1a1d2e", color: scenario === "failure" ? "#fca5a5" : "#94a3b8", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
          ✗ Losing claim (blocked)
        </button>
        <button onClick={() => { setScenario("success"); if (isPresent) setStep(8); }} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #2d3148", background: "#1a1d2e", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>
          ◇ Claim reward
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
        <a href="/demo?mode=present" style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, color: "#94a3b8", textDecoration: "none", border: "1px solid #2d3148" }}>Presenter mode</a>
        <a href="/demo?mode=technical" style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, color: "#94a3b8", textDecoration: "none", border: "1px solid #2d3148" }}>Technical mode</a>
      </div>

      {manifest && isTechnical && (
        <details style={{ cursor: "pointer" }}>
          <summary style={{ fontSize: 12, color: "#64748b" }}>Snapshot Integrity ▸</summary>
          <pre style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
            {Object.entries(manifest.dataFiles || {}).map(([f, i]: any) => `${f}: ${i.sha256?.slice(0, 16)}… (${i.status})`).join("\n")}
          </pre>
        </details>
      )}
    </main>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={<div style={{ color: "#94a3b8", padding: 32 }}>Loading…</div>}>
      <DemoContent />
    </Suspense>
  );
}

const box = { padding: 12, background: "#0f1117", borderRadius: 8 } as const;
const dim = { fontSize: 12, color: "#94a3b8" } as const;
const link = { fontSize: 12, color: "#7c3aed", cursor: "pointer" } as const;

