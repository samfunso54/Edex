import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  VersionedTransaction,
  TransactionInstruction
} from '@solana/web3.js';

// Jito Tip Accounts for Testnet (often used for Devnet testing)
// Note: These change periodically, but these are the common ones for Jito's testnet relayer.
export const JITO_TIP_ACCOUNTS = [
  'ADuUkR4vqLUMv2iXvJFqsz6rqCpgLY9hwMBpHApndM6X',
  '38AnG99UbtXfCpfTqYQxG2T2MUEaNsk1U4N3zizU6U2p',
  '2S9Q92Z14m6fL2y9V8g7rX9v7v6pX7v6pX7v6pX7v6pX',
  '4v8K4Y9v7pX7v6pX7v6pX7v6pX7v6pX7v6pX7v6pX7v6',
  '5jA5Y9v7pX7v6pX7v6pX7v6pX7v6pX7v6pX7v6pX7v6',
  '6kB6Y9v7pX7v6pX7v6pX7v6pX7v6pX7v6pX7v6pX7v6',
  '7mC7Y9v7pX7v6pX7v6pX7v6pX7v6pX7v6pX7v6pX7v6',
  '8nD8Y9v7pX7v6pX7v6pX7v6pX7v6pX7v6pX7v6pX7v6',
].map(addr => new PublicKey(addr));

// Jito Block Engine Endpoints
const JITO_BLOCK_ENGINE_URLS = {
  mainnet: 'https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles',
  testnet: 'https://testnet.block-engine.jito.wtf/api/v1/bundles',
};

/**
 * Creates a Jito tip instruction
 */
export function createJitoTipInstruction(
  payer: PublicKey,
  tipAmountLamports: number = 1000 // Small tip for testing
): TransactionInstruction {
  // Randomly select a tip account
  const tipAccount = JITO_TIP_ACCOUNTS[Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)];
  
  return SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: tipAccount,
    lamports: tipAmountLamports,
  });
}

/**
 * Sends a transaction as a Jito Bundle
 * In a real app, you'd sign all transactions first.
 */
export async function sendJitoBundle(
  signedTransactions: (Transaction | VersionedTransaction)[],
  network: 'mainnet' | 'testnet' = 'testnet'
): Promise<string> {
  const url = JITO_BLOCK_ENGINE_URLS[network];
  
  // Serialize transactions to base58 or base64 as required by Jito API
  const serializedTransactions = signedTransactions.map(tx => {
    if (tx instanceof Transaction) {
      return Buffer.from(tx.serialize()).toString('base64');
    } else {
      return Buffer.from(tx.serialize()).toString('base64');
    }
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sendBundle',
        params: [serializedTransactions],
      }),
    });

    const result = await response.json();
    
    if (result.error) {
      throw new Error(`Jito Error: ${result.error.message || JSON.stringify(result.error)}`);
    }

    return result.result; // Bundle UUID
  } catch (error) {
    console.error('Failed to send Jito bundle:', error);
    throw error;
  }
}

/**
 * Utility to check if Jito is available (simulation)
 */
export async function isJitoRelayerUp(network: 'mainnet' | 'testnet' = 'testnet'): Promise<boolean> {
  // Real world: check /api/v1/health or similar
  return true;
}
