import Link from "next/link";

const SECTIONS = [
  { id: "action", label: "Action", href: "#action" },
  { id: "simulation", label: "Simulation", href: "#simulation" },
  { id: "receipt", label: "Receipt", href: "#receipt" },
  { id: "intent", label: "Intent", href: "#intent" },
  { id: "provenance", label: "Provenance", href: "#provenance" },
];

export default function VerificationPage() {
  return (
    <div className="pageWrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <span className="sectionLabel">Verification</span>
      <h1 className="hero-title" style={{ fontSize: "clamp(28px, 4vw, 44px)", marginBottom: 8 }}>
        Transparent<br />Action Verification
      </h1>
      <p style={{ fontSize: 15, color: "var(--text-muted)", maxWidth: 620, marginBottom: 40 }}>
        Every action goes through Moss simulation, structured receipt generation, and intent constraint checks — all before signing.
      </p>

      <nav style={{ display: "flex", gap: 4, marginBottom: 40, flexWrap: "wrap", padding: 4, borderRadius: 10, background: "var(--surface-1)", border: "1px solid var(--border)", width: "fit-content" }}>
        {SECTIONS.map(s => (
          <a key={s.id} href={s.href} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textDecoration: "none" }}>
            {s.label}
          </a>
        ))}
      </nav>

      {/* Action section */}
      <section id="action" style={{ marginBottom: 48, scrollMarginTop: 80 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 650, marginBottom: 16 }}>Moss Action Construction</h2>
        <div className="card">
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>
            User intent is translated into unsigned calldata using the Moss Capability framework.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ padding: 14, borderRadius: 8, background: "var(--surface-2)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
              <div className="field"><span style={{ display: "block", color: "var(--text-dim)", fontSize: 9, textTransform: "uppercase", marginBottom: 2 }}>Capability</span><code style={{ color: "var(--accent-hover)" }}>buyPosition</code></div>
              <div className="field" style={{ marginTop: 10 }}><span style={{ display: "block", color: "var(--text-dim)", fontSize: 9, textTransform: "uppercase", marginBottom: 2 }}>Protocol</span><code style={{ color: "var(--accent-hover)" }}>marketlens</code></div>
              <div className="field" style={{ marginTop: 10 }}><span style={{ display: "block", color: "var(--text-dim)", fontSize: 9, textTransform: "uppercase", marginBottom: 2 }}>Value</span><code style={{ color: "var(--text-primary)" }}>1,000,000,000 wei</code></div>
            </div>
            <div style={{ padding: 14, borderRadius: 8, background: "var(--surface-2)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ padding: "4px 10px", borderRadius: 4, background: "var(--accent-soft)", color: "var(--accent-hover)", fontFamily: "var(--font-mono)", fontSize: 10 }}>Intent</span>
                <span style={{ color: "var(--text-dim)" }}>→</span>
                <span style={{ padding: "4px 10px", borderRadius: 4, background: "var(--accent-soft)", color: "var(--accent-hover)", fontFamily: "var(--font-mono)", fontSize: 10 }}>Capability</span>
                <span style={{ color: "var(--text-dim)" }}>→</span>
                <span style={{ padding: "4px 10px", borderRadius: 4, background: "var(--accent-soft)", color: "var(--accent-hover)", fontFamily: "var(--font-mono)", fontSize: 10 }}>Unsigned Tx</span>
              </div>
              <div style={{ marginTop: 12, color: "var(--success-text)", fontWeight: 700, fontSize: 13 }}>✓ Manual Builder Match</div>
            </div>
          </div>
        </div>
      </section>

      {/* Simulation section */}
      <section id="simulation" style={{ marginBottom: 48, scrollMarginTop: 80 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 650, marginBottom: 16 }}>Trace Simulation</h2>
        <div className="card" style={{ borderColor: "rgba(16,185,129,.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, margin: 0 }}>Simulation Console</h3>
            <span className="statusBadge statusBadge-verified" style={{ fontSize: 10 }}>SIMULATION PASSED</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
            {[["Method","debug_traceCall"],["Reverted","false"],["Warnings","0"],["Halted","false"]].map(([l,v]) => (
              <div key={l} style={{ padding: 12, borderRadius: 8, background: "var(--surface-2)", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 4 }}>{l}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--success-text)" }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: 14, borderRadius: 8, background: "var(--bg)", border: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
            CALL → native transfer → <span style={{ color: "var(--success-text)" }}>PositionBought</span> → return success
          </div>
          <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 12 }}>
            Local Anvil · Chain ID 143 · Snapshot generated offline · No transaction sent
          </p>
        </div>
      </section>

      {/* Receipt section */}
      <section id="receipt" style={{ marginBottom: 48, scrollMarginTop: 80 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 650, marginBottom: 16 }}>Ordered Receipt</h2>
        <div className="card">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 12 }}>Ordered Changes</div>
              {[
                ["Native Transfer","0x7099…79C8 → contract · 1,000,000,000 wei"],
                ["Event","PositionBought · M1 · YES · 1,000,000,000 wei"],
              ].map(([t,d]) => (
                <div key={t} style={{ padding: "12px 16px", borderRadius: 8, background: "var(--surface-2)", marginBottom: 8 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--accent)", textTransform: "uppercase", marginBottom: 4 }}>{t}</div>
                  <div style={{ fontSize: 12, color: "var(--text-primary)" }}>{d}</div>
                </div>
              ))}
              <div style={{ fontSize: 12, color: "var(--success-text)", marginTop: 8 }}>✓ All changes covered · Order preserved</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 12 }}>Structured Outcome</div>
              {[["Buyer","0x7099…79C8"],["Market","#1"],["Outcome","YES"],["Amount","1,000,000,000 wei"]].map(([k,v]) => (
                <div key={k} style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 2 }}>{k}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-primary)" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 16 }}>
            The Receipt describes what the simulation produced — before signing or broadcasting.
          </p>
        </div>
      </section>

      {/* Intent section */}
      <section id="intent" style={{ marginBottom: 48, scrollMarginTop: 80 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 650, marginBottom: 16 }}>Intent Constraint Checks</h2>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface-2)" }}>
                {["Rule","Expected","Actual","Result"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", textAlign: "left", borderBottom: "1px solid var(--border)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["buyer_matches","0x7099…79C8","0x7099…79C8","PASS"],
                ["market_id_matches","1","1","PASS"],
                ["outcome_matches","YES","YES","PASS"],
                ["payment_within_limit","≤ 1,000,000,000","1,000,000,000","PASS"],
                ["stake_meets_minimum","≥ 1,000,000,000","1,000,000,000","PASS"],
              ].map(([r,e,a,s]) => (
                <tr key={r} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "11px 16px", fontWeight: 600, color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{r}</td>
                  <td style={{ padding: "11px 16px", fontFamily: "var(--font-mono)", fontSize: 11 }}>{e}</td>
                  <td style={{ padding: "11px 16px", fontFamily: "var(--font-mono)", fontSize: 11 }}>{a}</td>
                  <td style={{ padding: "11px 16px", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: s==="PASS"?"var(--success-text)":"var(--danger-text)" }}>{s}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
          Receipt proves what happened. Intent checks prove whether it matched the user request.
        </p>
      </section>

      {/* Provenance section */}
      <section id="provenance" style={{ marginBottom: 48, scrollMarginTop: 80 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 650, marginBottom: 16 }}>Provenance</h2>
        <div className="card">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            {[
              ["Data Source","Local Anvil snapshot","Chain 143"],
              ["Simulation","Moss debug_traceCall","Fixed commit d09b38c"],
              ["Reproduction","2 clean runs","Deterministic"],
              ["State","Unchanged after simulation","No side effects"],
            ].map(([l,v,d]) => (
              <div key={l} style={{ padding: 16, borderRadius: 8, background: "var(--surface-2)", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 6 }}>{l}</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{v}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ marginTop: 32, textAlign: "center" }}>
        <Link href="/demo" className="btn-primary">View Full Demo →</Link>
      </div>
    </div>
  );
}
