// src/lib/vipps-security.ts
import { createHash, createHmac, timingSafeEqual } from 'crypto';

export async function verifyVippsWebhook(rawBody: string, headers: Headers, pathAndQuery: string): Promise<boolean> {
  const secret = process.env.VIPPS_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[DEBUG] Webhook security: VIPPS_WEBHOOK_SECRET is not set.');
    return false;
  }

  const date = headers.get('x-ms-date');
  const contentHash = headers.get('x-ms-content-sha256');
  const host = headers.get('host');
  const authHeader = headers.get('authorization');

  if (!date || !contentHash || !host || !authHeader) {
    console.warn('[DEBUG] Webhook security: Missing headers.');
    // Log præcis hvilke headers der mangler
    if (!date) console.log('[DEBUG] Missing header: x-ms-date');
    if (!contentHash) console.log('[DEBUG] Missing header: x-ms-content-sha256');
    if (!host) console.log('[DEBUG] Missing header: host');
    if (!authHeader) console.log('[DEBUG] Missing header: authorization');
    return false;
  }

  // --- Step 1: Content Hash Check ---
  const expectedContentHash = createHash('sha256').update(rawBody).digest('base64');
  if (contentHash !== expectedContentHash) {
    console.warn('[DEBUG] Webhook security: Content hash (x-ms-content-sha256) mismatch.');
    console.log(`[DEBUG] Received Hash: ${contentHash}`);
    console.log(`[DEBUG] Expected Hash: ${expectedContentHash}`);
    return false;
  }

  // --- Step 2: Signature Verification ---
  const stringToSign = 
    `POST\n` +
    `${pathAndQuery}\n` +
    `${date};${host};${contentHash}`;
  
  // LOG THE CRITICAL DATA
  console.log('--- VIPPS WEBHOOK DEBUG START ---');
  console.log(`[DEBUG] Host: ${host}`);
  console.log(`[DEBUG] PathAndQuery: ${pathAndQuery}`);
  console.log(`[DEBUG] String to Sign (kopier alt mellem linjerne):\n----------------\n${stringToSign}\n----------------`);

  const expectedSignature = createHmac('sha256', secret).update(stringToSign).digest('base64');
  
  const receivedSignatureMatch = authHeader.match(/Signature=([^&,]*)/);
  if (!receivedSignatureMatch || !receivedSignatureMatch[1]) {
    console.warn('[DEBUG] Webhook security: Could not extract Signature from Authorization header.');
    console.log('--- VIPPS WEBHOOK DEBUG END ---');
    return false;
  }
  const receivedSignature = receivedSignatureMatch[1];

  console.log(`[DEBUG] My Generated Signature: ${expectedSignature}`);
  console.log(`[DEBUG] Vipps Received Signature: ${receivedSignature}`);
  
  try {
    const receivedSigBuffer = Buffer.from(receivedSignature, 'base64');
    const expectedSigBuffer = Buffer.from(expectedSignature, 'base64');

    if (receivedSigBuffer.length !== expectedSigBuffer.length) {
      console.warn('[DEBUG] Signature length mismatch.');
      console.log('--- VIPPS WEBHOOK DEBUG END ---');
      return false;
    }
    
    const isValid = timingSafeEqual(receivedSigBuffer, expectedSigBuffer);
    console.log(`[DEBUG] Signature validation result: ${isValid}`);
    console.log('--- VIPPS WEBHOOK DEBUG END ---');
    
    return isValid;
  } catch (err) {
    console.error('[DEBUG] Error during signature comparison.', err);
    console.log('--- VIPPS WEBHOOK DEBUG END ---');
    return false;
  }
}