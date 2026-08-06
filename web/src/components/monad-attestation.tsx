'use client';

// Static attestation data — from verified MarketLens batch artifacts
const ATTESTATION = {
  receipt_hash: "NOT_PUBLISHED",
  policy_hash: "NOT_PUBLISHED",
  allowlist_hash: "NOT_PUBLISHED",
  evidence_hash: "NOT_PUBLISHED",
  registry_address: null,
  chain: "Monad Testnet (10143)",
  explorer_url: "https://testnet.monadexplorer.com",
  attestation_tx: null,
  published_at: null,
  verified_contract: false,
};

export default function MonadAttestation() {
  const a = ATTESTATION;
  const isPublished = a.receipt_hash !== "NOT_PUBLISHED";

  return (
    <div style={styles.container}>
      <h3 style={styles.h3}>Monad Attestation Proof</h3>
      <div style={styles.badges}>
        <span style={styles.badgeBlue}>USER AGENT ACTIONS: UNSIGNED / NOT BROADCAST</span>
        <span style={styles.badgeYellow}>ATTESTATION: PROJECT-CONTROLLED MONAD TESTNET HASH PUBLICATION</span>
      </div>

      {!isPublished && (
        <div style={styles.unpublished}>Not published yet — attestation pending Monad Testnet deployment.</div>
      )}

      {isPublished && (
        <>
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
            <div>Verified: {a.verified_contract ? 'Yes' : 'No'}</div>
          </div>
        </>
      )}
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
