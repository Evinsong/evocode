import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Generate a random 32-byte AES-256 key as a hex string.
 * @returns 64-character hex string representing the encryption key
 */
export function generateKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * @param text - Plaintext string to encrypt
 * @param key - 32-byte hex key string (64 hex characters)
 * @returns Base64-encoded string containing IV + auth tag + ciphertext
 */
export function encrypt(text: string, key: string): string {
  const keyBuffer = Buffer.from(key, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Combine: IV (12 bytes) + AuthTag (16 bytes) + ciphertext
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'base64'),
  ]);

  return combined.toString('base64');
}

/**
 * Decrypt a base64-encoded ciphertext that was encrypted with encrypt().
 * @param encrypted - Base64-encoded encrypted string
 * @param key - 32-byte hex key string (must match the encryption key)
 * @returns Decrypted plaintext string
 * @throws Error if decryption fails (wrong key, corrupted data, etc.)
 */
export function decrypt(encrypted: string, key: string): string {
  const keyBuffer = Buffer.from(key, 'hex');
  const combined = Buffer.from(encrypted, 'base64');

  // Extract components: IV (12 bytes) + AuthTag (16 bytes) + ciphertext
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encryptedData = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
