export interface TokenInfo {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  logoURI?: string;
  balance?: string;
}

export const SUPPORTED_TOKENS: TokenInfo[] = [
  {
    symbol: 'SOL',
    name: 'Solana',
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    mint: '4zMMC9srtvS2wkpY7fG12ziLTvfPAdP4Lq2sSpPZasq',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  },
  {
    symbol: 'JUP',
    name: 'Jupiter',
    mint: 'JUPyiK9fUcbzS7CgqNfbwySJW8Y8pSpxwywU62z9nE3',
    decimals: 6,
    logoURI: 'https://static.jup.ag/jup/icon.png',
  },
  {
    symbol: 'BONK',
    name: 'Bonk',
    mint: 'DezXAZ8z7PnrnMcjzrtA2WNvRPYWZ9WssCy4fJJ2ZFY3',
    decimals: 5,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnMcjzrtA2WNvRPYWZ9WssCy4fJJ2ZFY3/logo.png',
  },
  {
    symbol: 'RENDER',
    name: 'Render Token',
    mint: 'rndrizKT3MK1iimdxRdWJYCkzksGYE64zK1679N26Yq',
    decimals: 8,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/rndrizKT3MK1iimdxRdWJYCkzksGYE64zK1679N26Yq/logo.png',
  },
];
