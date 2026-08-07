'use client';

// Static attestation data — from verified MarketLens batch artifacts
const ATTESTATION = {
  receipt_hash: "0xc4d63e36cc55f237dc715d478e0f48d48b5995e151c21166287530ed73a9d0be",
  policy_hash: "0xb457c3bd4ede5a988e4c21f0d58c30fa5e74ad818db12e6b8a20c002d274ccc6",
  allowlist_hash: "0x01decf7f76428b8903e89e10f6dd8e7a275e48541beed4eb3e3482da8988c4ef",
  evidence_hash: "0xae16a1b6e80400246b2de8298c2ea53f37072ad31f9e66ebbd9fa851b2720dee",
  registry_address: "0x85AD7b41DC64d8E191A9Dc56B398068341c54203",
  chain: "Monad Testnet (10143)",
  explorer_url: "https://testnet.monadexplorer.com",
  attestation_tx: "0x6ab6de991889f88fe5906fc0e679ca53eeb55e0369a34772c519a62ff477fe52",
  published_at: "2026-08-07",
  verified_contract: "bytecode_confirmed",
};

export default function MonadAttestation() {
  const a = ATTESTATION;
  const isPublished = a.receipt_hash !== "NOT_PUBLISHED";

  return (
    <div style={styles.container}>
      <h3 style={styles.h3}>Monad Attestation Proof</h3>
      <div style={styles.badges}>
        <span style={styles.badgeGreen}>REAL MONAD TESTNET ATTESTATION</span>
        <span style={styles.badgeBlue}>USER AGENT ACTIONS: UNSIGNED / NOT BROADCAST</span>
      </div>

      <div style={styles.grid}>
            <Field label="Receipt hash" value={a.receipt_hash} />
            <Field label="Policy hash" value={a.policy_hash} />
            <Field label="Allowlist hash" value={a.allowlist_hash} />
            <Field label="Evidence hash" value={a.evidence_hash} />
          </div>
          <div style={styles.meta}>
            <div>Chain: {a.chain}</div>
            {a.registry_address && <div>Registry: {a.registry_address}</div>}
            {a.attestation_tx && (
              <div>
                TX: <a href={`${a.explorer_url}/tx/${a.attestation_tx}`} target="_blank" rel="noopener noreferrer" style={{ color: '#6ee7b7' }}>{a.attestation_tx}</a>
              </div>
            )}
            {a.published_at && <div>Published: {a.published_at}</div>}
            <div>Contract: bytecode deployed and confirmed on-chain. Explorer source verification pending.</div>
          </div>
      <div style={styles.note}>
        Zero user Agent actions are signed or broadcast. A project-controlled Monad Testnet attestation transaction records only the verified receipt hashes.
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.field}>
      <div style={styles.fieldLabel}>{label}</div>
      <div style={styles.fieldValue}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 900, margin: '0 auto', padding: '24px 16px',
    fontFamily: 'system-ui, sans-serif', color: '#e2e8f0',
  },
  h3: { fontSize: 16, fontWeight: 700, marginBottom: 12 },
  badges: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 },
  badgeGreen: {
    padding: '2px 10px', borderRadius: 3, fontSize: 10, fontWeight: 600,
    background: 'rgba(110, 231, 183, 0.08)', color: '#6ee7b7', border: '1px solid rgba(110, 231, 183, 0.3)',
  },
  badgeBlue: {
    padding: '2px 10px', borderRadius: 3, fontSize: 10, fontWeight: 600,
    background: '#1a1d2e', color: '#7c3aed',
  },
  badgeYellow: {
    padding: '2px 10px', borderRadius: 3, fontSize: 10, fontWeight: 600,
    background: '#2d1a00', color: '#fbbf24',
  },
  unpublished: {
    padding: '12px 16px', background: '#1a1d2e', borderRadius: 8,
    color: '#94a3b8', fontSize: 13, fontStyle: 'italic',
  },
  grid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16,
  },
  field: {
    padding: '8px 12px', background: '#1a1d2e', borderRadius: 6,
    border: '1px solid #2d3148',
  },
  fieldLabel: { fontSize: 10, color: '#64748b', marginBottom: 2 },
  fieldValue: { fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all', color: '#e2e8f0' },
  meta: { fontSize: 12, color: '#94a3b8', lineHeight: 1.8 },
  note: {
    marginTop: 16, padding: '10px 14px', background: '#1a1d2e',
    borderRadius: 8, borderLeft: '3px solid #7c3aed',
    fontSize: 12, color: '#94a3b8', lineHeight: 1.6,
  },
};
