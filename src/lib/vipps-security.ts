// src/lib/vipps-security.ts
import { createHash, createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifies a webhook signature from Vipps MobilePay using the complex HMAC-SHA256 scheme.
 * @param rawBody The raw request body string.
 * @param headers The headers from the incoming Next.js request.
 * @param pathAndQuery The path of the request URL (e.g., '/api/webhooks/vipps').
 * @returns {Promise<boolean>} True if the signature is valid, false otherwise.
 */
export async function verifyVippsWebhook(rawBody: string, headers: Headers, pathAndQuery: string): Promise<boolean> {
  const secret = process.env.VIPPS_WEBHOOK_SECRET;

  if (!secret) {
    console.error('Webhook security: VIPPS_WEBHOOK_SECRET is not set.');
    return false;
  }

  // Extract all required headers from the request
  const date = headers.get('x-ms-date');
  const contentHash = headers.get('x-ms-content-sha256');
  const host = headers.get('host');
  const authHeader = headers.get('authorization');

  if (!date || !contentHash || !host || !authHeader) {
    console.warn('Webhook security: Missing one or more required headers (x-ms-date, x-ms-content-sha256, host, authorization).');
    return false;
  }

  // --- Verification Step 1: Check that the content has not been modified ---
  const expectedContentHash = createHash('sha256')
    .update(rawBody)
    .digest('base64');

  if (contentHash !== expectedContentHash) {
    console.warn('Webhook security: Content hash (x-ms-content-sha256) does not match body.');
    return false;
  }

  // --- Verification Step 2: Verify the authentication header ---
  // A. Construct the string to sign, exactly as specified in the documentation.
  const stringToSign = 
    `POST\n` +
    `${pathAndQuery}\n` +
    `${date};${host};${contentHash}`;


  // Instead of decoding the secret from Base64, we will use the secret string directly,
  // to match the Vipps sample code's behavior.
  const expectedSignature = createHmac('sha256', secret) // Use the raw `secret` string
    .update(stringToSign)
    .digest('base64');

  // C. Extract the signature provided by Vipps from the Authorization header.
  const receivedSignatureMatch = authHeader.match(/Signature=([^&,]*)/);
  if (!receivedSignatureMatch || !receivedSignatureMatch[1]) {
    console.warn('Webhook security: Could not extract Signature from Authorization header.');
    return false;
  }
  const receivedSignature = receivedSignatureMatch[1];
  
  // D. Securely compare the signature we generated with the one Vipps sent.
  try {
    const receivedSignatureBuffer = Buffer.from(receivedSignature, 'base64');
    const expectedSignatureBuffer = Buffer.from(expectedSignature, 'base64');
    
    // Ensure buffers are the same length before comparing to prevent timing attacks
    if (receivedSignatureBuffer.length !== expectedSignatureBuffer.length) {
      console.warn('Webhook security: Signature length mismatch.');
      return false;
    }

    const isValid = timingSafeEqual(receivedSignatureBuffer, expectedSignatureBuffer);

    if (!isValid) {
      console.warn('Webhook security: Signature mismatch.');
    }
    
    return isValid;

  } catch (err) {
    console.error('Webhook security: Error during signature comparison.', err);
    return false;
  }
}