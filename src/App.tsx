import React, { useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { Header } from './components/Header';
import { SwapCard } from './components/SwapCard';
import { Footer } from './components/Footer';
import { fetchEcosystemStats, EcosystemStats } from './services/statsService';
import { motion, AnimatePresence } from 'motion/react';
import { Activity } from 'lucide-react';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

import { FirebaseProvider } from './lib/FirebaseProvider';

export default function App() {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => {
    // Prioritize Helius RPC for production-grade reliability
    return import.meta.env.VITE_HELIUS_RPC_URL || clusterApiUrl(network);
  }, [network]);
  
  const [stats, setStats] = useState<EcosystemStats>({
    volume24h: "$0",
    totalUsers: "0"
  });

  useEffect(() => {
    const loadStats = async () => {
      const data = await fetchEcosystemStats();
      setStats(data);
    };
    loadStats();
    
    // Refresh every 30 seconds for "real-time" feel
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <FirebaseProvider>
            <div className="min-h-screen bg-black text-white selection:bg-brand/30 flex flex-col">
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(20,241,149,0.05),transparent_50%)] pointer-events-none" />
            
            <Header />
            
            <main className="flex-1 flex items-center justify-center w-full max-w-7xl mx-auto px-4 py-8">
              <div className="w-full max-w-[440px] space-y-5">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-1 mb-6"
                >
                  <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent">
                    Swap Anytime.
                  </h1>
                  <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[0.2em] italic">The most powerful DEX aggregator on Solana.</p>
                </motion.div>

                <SwapCard />

                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center space-y-1 relative overflow-hidden group">
                    <div className="absolute top-2 right-2 flex items-center space-x-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[8px] font-bold text-green-500 uppercase tracking-tighter">Live</span>
                    </div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">24h Volume</span>
                    <AnimatePresence mode="wait">
                      <motion.span 
                        key={stats.volume24h}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm font-mono text-brand font-bold"
                      >
                        {stats.volume24h}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <div className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center space-y-1 relative overflow-hidden group">
                    <div className="absolute top-2 right-2 flex items-center space-x-1">
                      <Activity size={10} className="text-brand animate-pulse" />
                    </div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Total Users</span>
                    <AnimatePresence mode="wait">
                      <motion.span 
                        key={stats.totalUsers}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm font-mono text-brand font-bold"
                      >
                        {stats.totalUsers}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </main>

            <Footer />
          </div>
          </FirebaseProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
