import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "80px 16px", fontFamily: "system-ui, sans-serif", color: "#e2e8f0", background: "#0f1117", minHeight: "100vh" }}>
      <p style={{ color: "#fbbf24", fontSize: 12, fontWeight: 700, marginBottom: 8, letterSpacing: "0.5px" }}>
        ⚠️ REAL LOCAL DEMO — NOT A LIVE TRADING SYSTEM
      </p>
      <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.15, marginBottom: 16 }}>
        Evidence-backed prediction market analytics<br />
        <span style={{ color: "#7c3aed" }}>with verifiable onchain action simulation.</span>
      </h1>
      <p style={{ fontSize: 16, color: "#94a3b8", marginBottom: 32, maxWidth: 560, lineHeight: 1.5 }}>
        MarketLens connects prediction market insights with Moss-powered transaction simulation,
        structured receipts, and transparent intent verification — all without signing or broadcasting.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 48 }}>
        <Link href="/demo?mode=present" style={{ padding: "14px 32px", borderRadius: 8, background: "#7c3aed", color: "#fff", fontWeight: 700, fontSize: 16, textDecoration: "none", display: "inline-block" }}>
          Open 3-Minute Demo →
        </Link>
        <Link href="/demo?mode=technical" style={{ padding: "14px 32px", borderRadius: 8, background: "#1a1d2e", color: "#94a3b8", fontWeight: 600, fontSize: 16, textDecoration: "none", border: "1px solid #2d3148", display: "inline-block" }}>
          View Technical Evidence
        </Link>
      </div>
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {[
          ["Local analytics", "REAL"],
          ["Moss trace simulation", "REAL LOCAL"],
          ["Receipt + Intent", "VERIFIED"],
          ["Wallet signing", "DISABLED"],
          ["Broadcasting", "DISABLED"],
          ["Monad deployment", "NOT DEPLOYED"],
        ].map(([l, s]) => (
          <div key={l} style={{ padding: "10px 14px", borderRadius: 8, background: s === "REAL" || s === "REAL LOCAL" || s === "VERIFIED" ? "#065f46" : "#78350f", fontSize: 13 }}>
            <div style={{ fontWeight: 700, color: s.includes("REAL") || s === "VERIFIED" ? "#6ee7b7" : "#fbbf24", marginBottom: 2 }}>{s}</div>
            <div style={{ color: "#94a3b8" }}>{l}</div>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 48, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
        Evidence before recommendation. Simulation before signing. Receipt before trust.
      </p>
    </main>
  );
}

