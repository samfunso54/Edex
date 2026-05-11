import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

export interface TokenBalance {
  mint: string;
  amount: number;
  uiAmount: number;
  decimals: number;
}

export async function fetchSolBalance(connection: Connection, publicKey: PublicKey): Promise<number> {
  try {
    const balance = await connection.getBalance(publicKey, 'confirmed');
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error fetching SOL balance:', error);
    return 0;
  }
}

export async function fetchTokenBalances(
  connection: Connection,
  publicKey: PublicKey
): Promise<Record<string, number>> {
  try {
    const balances: Record<string, number> = {};
    
    // Fetch accounts from both legacy Token Program and Token-2022 Program
    const [tokenResponse, token2022Response] = await Promise.all([
      connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID }, 'confirmed'),
      connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_2022_PROGRAM_ID }, 'confirmed')
    ]);

    const allAccounts = [...tokenResponse.value, ...token2022Response.value];
    
    if (allAccounts.length > 0) {
      console.log(`Detected ${allAccounts.length} token accounts total.`);
    }

    allAccounts.forEach((accountInfo) => {
      const parsedInfo = accountInfo.account.data.parsed.info;
      const mint = parsedInfo.mint;
      const tokenAmount = parsedInfo.tokenAmount;
      
      balances[mint] = tokenAmount.uiAmount || 0;
      if (tokenAmount.uiAmount > 0) {
        console.log(`Token Balance Detected: ${mint} = ${tokenAmount.uiAmount}`);
      }
    });

    return balances;
  } catch (error) {
    console.warn('Error fetching token balances (some tokens may be unreachable):', error);
    return {};
  }
}
