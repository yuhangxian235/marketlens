import Link from "next/link";

const REAL = [
  ["Analytics","SQL-verified metrics from local snapshots","REAL"],
  ["Moss Simulation","debug_traceCall on local Anvil (chain 143)","REAL LOCAL"],
  ["Receipt","Ordered change capture + structured outcome","VERIFIED"],
  ["Intent Checks","Expected-vs-actual constraint verification","CHECKED"],
  ["State Audit","Post-simulation state unchanged verification","VERIFIED"],
  ["Reproduction","Two clean runs, deterministic output","VERIFIED"],
];

const NOT_ENABLED = [
  ["Wallet Signing","No eth_sign or personal_sign calls","DISABLED"],
  ["Transaction Broadcast","No eth_sendTransaction or sendRawTransaction","DISABLED"],
  ["Monad Deployment","Not deployed to Monad mainnet or testnet","NOT DEPLOYED"],
];

export default function ArchitecturePage() {
  return (
    <div className="pageWrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <span className="sectionLabel">Architecture</span>
      <h1 className="hero-title" style={{ fontSize: "clamp(28px, 4vw, 44px)", marginBottom: 8 }}>
        System Architecture<br />& Capability Boundaries
      </h1>
      <p style={{ fontSize: 15, color: "var(--text-muted)", maxWidth: 620, marginBottom: 40 }}>
        What this prototype does — and what remains not implemented.
      </p>

      {/* Pipeline diagram */}
      <div className="card" style={{ marginBottom: 48, padding: 32 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 650, marginBottom: 24 }}>Verification Pipeline</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center", fontSize: 13, fontWeight: 600 }}>
          {["Onchain Events","Analytics","User Intent","Moss Capability","Trace Simulation","Receipt","Intent Verification"].map((s,i) => (
            <span key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ padding: "10px 16px", borderRadius: 8, background: i<6?"var(--accent-soft)":"var(--success-bg)", color: i<6?"var(--accent-hover)":"var(--success-text)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{s}</span>
              {i<6 && <span style={{ color: "var(--text-dim)", fontSize: 16 }}>→</span>}
            </span>
          ))}
        </div>
      </div>

      {/* REAL capabilities */}
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 650, marginBottom: 16 }}>Real Capabilities</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 48 }}>
        {REAL.map(([n,d,s]) => (
          <div key={n} className="card" style={{ padding: 20 }}>
            <span className="statusBadge statusBadge-verified" style={{ marginBottom: 10, display: "inline-flex" }}>{s}</span>
            <h3 style={{ fontSize: 15, fontWeight: 650, marginBottom: 4 }}>{n}</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{d}</p>
          </div>
        ))}
      </div>

      {/* NOT ENABLED */}
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 650, marginBottom: 16 }}>Not Implemented</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 48 }}>
        {NOT_ENABLED.map(([n,d,s]) => (
          <div key={n} className="card" style={{ padding: 20, borderColor: "rgba(245,158,11,.15)" }}>
            <span className="statusBadge statusBadge-warning" style={{ marginBottom: 10, display: "inline-flex" }}>{s}</span>
            <h3 style={{ fontSize: 15, fontWeight: 650, marginBottom: 4 }}>{n}</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{d}</p>
          </div>
        ))}
      </div>

      {/* Tech stack */}
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 650, marginBottom: 16 }}>Tech Stack</h2>
      <div className="card">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
          {[
            ["Solidity","Foundry","Prediction market contracts"],
            ["Moss","TypeScript","Action capability + simulator"],
            ["Analytics","Python/SQL","Data pipeline + metrics"],
            ["Frontend","Next.js 16","Static export, dark theme"],
          ].map(([t,f,d]) => (
            <div key={t} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", fontWeight: 700, marginBottom: 2 }}>{t}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{f}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 48, padding: 20, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-2)", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, marginBottom: 16 }}>
          This is a verified local prototype. All data comes from committed snapshots.
          No transactions have been broadcast. No funds are at risk.
        </p>
        <Link href="/demo" className="btn-secondary" style={{ fontSize: 13, minHeight: 40 }}>
          ← Back to Demo
        </Link>
      </div>
    </div>
  );
}
