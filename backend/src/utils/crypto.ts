import CryptoJS from 'crypto-js';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';

export function generateSecureToken(): string {
  return uuidv4();
}

export function signToken(token: string, expiresAt?: Date): string {
  const payload = expiresAt ? `${token}:${expiresAt.toISOString()}` : token;
  return createHmac('sha256', config.jwt.secret).update(payload).digest('hex');
}

export function verifyTokenSignature(token: string, signature: string, expiresAt?: Date): boolean {
  const expected = signToken(token, expiresAt);
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, config.encryption.key, {
    iv: CryptoJS.enc.Utf8.parse(config.encryption.iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
}

export function decrypt(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, config.encryption.key, {
    iv: CryptoJS.enc.Utf8.parse(config.encryption.iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function generateRandomString(length = 32): string {
  return randomBytes(length).toString('hex');
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

export function hashData(data: string): string {
  return createHmac('sha256', config.encryption.key).update(data).digest('hex');
}
