// lib/vipps.ts (opret denne fil og mappe)

// En simpel in-memory cache for tokenet
let tokenCache = {
  accessToken: '',
  expiresAt: 0,
};

export async function getVippsAccessToken(): Promise<string> {
  // Genbrug tokenet hvis det stadig er gyldigt
  if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }

  const response = await fetch(`${process.env.VIPPS_API_BASE_URL}/accesstoken/get`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'client_id': process.env.VIPPS_CLIENT_ID!,
      'client_secret': process.env.VIPPS_CLIENT_SECRET!,
      'Ocp-Apim-Subscription-Key': process.env.VIPPS_RECURRING_SUB_KEY!,
    },
  });

  if (!response.ok) { 
    throw new Error('Failed to get Vipps access token');
  }

  const data = await response.json();
  
  // Cache tokenet i 50 minutter (det udløber typisk efter 60)
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + 50 * 60 * 1000,
  };

  return data.access_token;
}