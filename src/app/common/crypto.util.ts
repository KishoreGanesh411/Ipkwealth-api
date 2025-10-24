import crypto from 'crypto';

// Simple AES-256-GCM helpers for sensitive fields (PAN/Aadhaar)
// FIELD_ENCRYPTION_KEY should be a 32-byte key (base64 or hex accepted)

function getKey(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY || '';
  if (!raw) throw new Error('FIELD_ENCRYPTION_KEY not configured');
  // Auto-detect base64 vs hex vs utf8
  if (/^[A-Fa-f0-9]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  try {
    const b = Buffer.from(raw, 'base64');
    if (b.length === 32) return b;
  } catch {}
  const utf = Buffer.from(raw, 'utf8');
  if (utf.length === 32) return utf;
  throw new Error('FIELD_ENCRYPTION_KEY must be 32 bytes (hex/base64/utf8)');
}

export function encryptField(plaintext?: string | null): string | null {
  if (!plaintext) return null;
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, ciphertext]).toString('base64');
  return payload;
}

export function decryptField(payload?: string | null): string | null {
  if (!payload) return null;
  const key = getKey();
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  return plaintext;
}
