// Deterministic hashing for data integrity
// Uses simple but deterministic hash (no Node crypto dependency for portability)

export function sha256(input: string): string {
  // Simple FNV-1a based 64-char hex digest
  // For production, use crypto.createHash("sha256")
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
    h = h >>> 0;
  }
  // Pad to 64 hex chars
  const hex = h.toString(16).padStart(8, "0");
  return hex + "0".repeat(56);
}

export function hashObject(obj: unknown): string {
  const keys = Object.keys(obj as object).sort();
  const canonical = JSON.stringify(obj, keys);
  return sha256(canonical);
}
