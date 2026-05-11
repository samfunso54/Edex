import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

export interface TokenBalance {
  mint: string;
  amount: number;
  uiAmount: number;
  decimals: number;
}

export async function fetchSolBalance(connection: Connection, publicKey: PublicKey): Promise<number> {
  try {
    console.log("Fetching SOL balance from RPC...");
    const balance = await connection.getBalance(publicKey, 'confirmed');
    console.log(`Raw SOL balance for ${publicKey.toBase58()}: ${balance} lamports`);
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
    console.log("Fetching token balances from RPC...");
    const balances: Record<string, number> = {};
    
    // Get all token accounts for the public key
    const response = await connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: TOKEN_PROGRAM_ID,
    }, 'confirmed');

    console.log(`Found ${response.value.length} token accounts for ${publicKey.toBase58()}`);

    response.value.forEach((accountInfo) => {
      const parsedInfo = accountInfo.account.data.parsed.info;
      const mint = parsedInfo.mint;
      const tokenAmount = parsedInfo.tokenAmount;
      
      balances[mint] = tokenAmount.uiAmount || 0;
    });

    return balances;
  } catch (error) {
    console.error('Error fetching token balances:', error);
    return {};
  }
}
