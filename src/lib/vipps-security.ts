// src/lib/vipps-security.ts
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifies a webhook signature from Vipps MobilePay using HMAC-SHA256.
 * @param signature The signature from the 'Vipps-Webhook-Signature' header.
 * @param body The raw request body string.
 * @returns {Promise<boolean>} True if the signature is valid, false otherwise.
 */
export async function verifyVippsWebhook(signature: string | undefined, body: string): Promise<boolean> {
  const secret = process.env.VIPPS_WEBHOOK_SECRET;

  if (!secret) {
    console.error('Webhook security: VIPPS_WEBHOOK_SECRET is not set.');
    return false;
  }

  if (!signature) {
    console.error('Webhook security: Missing Vipps-Webhook-Signature header.');
    return false;
  }

  try {
    // 1. Create our own signature using the shared secret and the raw body
    const hmac = createHmac('sha256', secret);
    hmac.update(body);
    const expectedSignature = hmac.digest('hex');

    // 2. Compare our generated signature with the one from the webhook header
    // We use `timingSafeEqual` to prevent timing attacks, which is a security best practice.
    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedSignatureBuffer = Buffer.from(expectedSignature, 'utf8');
    
    if (signatureBuffer.length !== expectedSignatureBuffer.length) {
        return false;
    }

    const isValid = timingSafeEqual(signatureBuffer, expectedSignatureBuffer);

    if (!isValid) {
      console.warn('Webhook security: Signature mismatch.');
    }

    return isValid;

  } catch (err) {
    console.error('Webhook security: Error during signature verification.', err);
    return false;
  }
}