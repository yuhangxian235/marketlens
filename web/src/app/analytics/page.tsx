import Link from "next/link";

const SECTIONS = [
  { id: "overview", label: "Overview", href: "#overview" },
  { id: "markets", label: "Markets", href: "#markets" },
  { id: "wallets", label: "Wallets", href: "#wallets" },
  { id: "insights", label: "Insights", href: "#insights" },
  { id: "evidence", label: "Evidence", href: "#evidence" },
];

export default function AnalyticsPage() {
  return (
    <div className="pageWrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <span className="sectionLabel">Analytics</span>
      <h1 className="hero-title" style={{ fontSize: "clamp(28px, 4vw, 44px)", marginBottom: 8 }}>
        Evidence-Backed<br />Market Analytics
      </h1>
      <p style={{ fontSize: 15, color: "var(--text-muted)", maxWidth: 620, marginBottom: 40 }}>
        SQL-verifiable metrics from committed local snapshots. Every number traces to a reproducible data pipeline.
      </p>

      {/* Internal section nav */}
      <nav style={{ display: "flex", gap: 4, marginBottom: 40, flexWrap: "wrap", padding: 4, borderRadius: 10, background: "var(--surface-1)", border: "1px solid var(--border)", width: "fit-content" }}>
        {SECTIONS.map(s => (
          <a key={s.id} href={s.href} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textDecoration: "none", transition: "all .15s" }}>
            {s.label}
          </a>
        ))}
      </nav>

      {/* Section: Overview */}
      <section id="overview" style={{ marginBottom: 48, scrollMarginTop: 80 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 650, marginBottom: 16 }}>Overview</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[[8,"Unique Wallets","var(--accent-hover)"],[3,"Markets Created","var(--text-primary)"],[22,"Transactions","var(--text-primary)"],[26,"Logged Events","var(--text-primary)"]].map(([n,l,c]) => (
            <div key={l as string} className="card" style={{ textAlign: "center", padding: 24 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: c as string, marginBottom: 4 }}>{n}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 8, background: "var(--surface-2)", borderLeft: "3px solid var(--warning)", fontSize: 12, color: "var(--warning-text)" }}>
          ⚠️ DEMO SAMPLE — Local Anvil snapshot, not production data
        </div>
      </section>

      {/* Section: Markets */}
      <section id="markets" style={{ marginBottom: 48, scrollMarginTop: 80 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 650, marginBottom: 16 }}>Markets</h2>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {[
            ["#1","Will ETH be above $3,000 by end of Q3?","8","65% YES"],
            ["#2","Will BTC reach $100K this quarter?","5","40% YES"],
            ["#3","Will the Fed cut rates in September?","3","80% YES"],
          ].map(([id,q,w,s],i) => (
            <div key={id} style={{ display: "grid", gridTemplateColumns: "60px 1fr 100px 120px", alignItems: "center", padding: "14px 20px", borderBottom: i<2 ? "1px solid var(--border)" : "none", fontSize: 13 }}>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontWeight: 700 }}>{id}</span>
              <span style={{ fontWeight: 600 }}>{q}</span>
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{w} wallets</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>{s}</span>
            </div>
          ))}
        </div>
        <Link href="/markets" style={{ display: "inline-block", marginTop: 12, fontSize: 12, color: "var(--accent-hover)", textDecoration: "underline", textUnderlineOffset: 4 }}>
          View full market ledger →
        </Link>
      </section>

      {/* Section: Wallets */}
      <section id="wallets" style={{ marginBottom: 48, scrollMarginTop: 80 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 650, marginBottom: 16 }}>Wallet Behavior</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
          <div className="card">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 8 }}>First Touch Distribution</div>
            <div className="mini-bar-chart">
              {[100,60,40,75,30,50,80,45].map((h,i) => <div key={i} className="bar" style={{height:h+"%"}}/>)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>8 addresses observed · first_seen ≠ new user</div>
          </div>
          <div className="card">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 8 }}>Repeat Participation</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 700, color: "var(--accent-hover)" }}>3/8</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>wallets with ≥2 markets · sample-window repeat</div>
          </div>
        </div>
      </section>

      {/* Section: Insights */}
      <section id="insights" style={{ marginBottom: 48, scrollMarginTop: 80 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 650, marginBottom: 16 }}>Product Insights</h2>
        <div className="card">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--success-text)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Observed Signal</div>
              <p style={{ fontSize: 14, fontWeight: 600 }}>Market 1 leads participation in this demo sample.</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Higher wallet interaction count makes it a suitable scenario for action verification demo.</p>
            </div>
            <div style={{ padding: "12px 16px", borderRadius: 8, background: "var(--surface-2)", borderLeft: "3px solid var(--warning)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--warning-text)", textTransform: "uppercase", letterSpacing: ".06em" }}>Product observation only</span>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Not investment advice. Not a BUY recommendation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Evidence */}
      <section id="evidence" style={{ marginBottom: 48, scrollMarginTop: 80 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 650, marginBottom: 16 }}>Evidence</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {[
            ["global.unique_wallets","8","Unique wallet count"],
            ["global.multi_market_share","37.5%","Wallets in ≥2 markets"],
            ["global.d1_repeat_rate","Sample-window","D1 measurement"],
          ].map(([id,val,desc]) => (
            <Link key={id} href={`/evidence/${id}`} className="card" style={{ textDecoration: "none", padding: 20 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", marginBottom: 6 }}>{id}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>{val}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{desc}</div>
            </Link>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 16 }}>
          Evidence detail pages include SQL definitions, provenance, and sample limitations.
        </p>
      </section>
    </div>
  );
}
