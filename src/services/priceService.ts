import { SUPPORTED_TOKENS } from '../constants';

const JUP_PRICE_API_V2 = 'https://api.jup.ag/price/v2';
const JUP_PRICE_API_V1 = 'https://price.jup.ag/v4/price'; // V1/V4 fallback

// Map devnet mints to mainnet mints for price tracking
const MINT_MAPPING: Record<string, string> = {
  'So11111111111111111111111111111111111111112': 'So11111111111111111111111111111111111111112', // SOL
  '4zMMC9srtvS2wkpY7fG12ziLTvfPAdP4Lq2sSpPZasq': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC (Devnet -> Mainnet)
};

export interface PriceData {
  id: string;
  type: string;
  price: string;
}

export interface PriceResponse {
  data: Record<string, PriceData>;
  timeTaken: number;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

export async function fetchTokenPrices(mints: string[]): Promise<Record<string, number>> {
  // Map devnet mints to mainnet for pricing
  const mainnetMints = mints.map(mint => MINT_MAPPING[mint] || mint);
  const ids = mainnetMints.join(',');
  
  const endpoints = [
    `${JUP_PRICE_API_V2}?ids=${ids}`,
    `${JUP_PRICE_API_V1}?ids=${ids}`,
  ];

  for (const url of endpoints) {
    try {
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) continue;
      
      const json: PriceResponse = await response.json();
      const result: Record<string, number> = {};
      
      // Map back from mainnet ID to original requested mint
      mints.forEach(originalMint => {
        const mappedMint = MINT_MAPPING[originalMint] || originalMint;
        if (json.data && json.data[mappedMint]) {
          result[originalMint] = parseFloat(json.data[mappedMint].price);
        }
      });
      
      if (Object.keys(result).length > 0) return result;
    } catch (error) {
      console.warn(`Failed to fetch from ${url}:`, error);
    }
  }
  
  return {};
}
