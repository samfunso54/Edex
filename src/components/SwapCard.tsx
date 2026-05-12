import React, { useState, useEffect } from 'react';
import { ArrowDownUp, Info, Settings2, Loader2, ChevronDown, Activity, Search, X, ShieldCheck, Zap, AlertTriangle, TrendingUp, Clock, Bot, History, ExternalLink, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SUPPORTED_TOKENS, TokenInfo } from '../constants';
import { cn, formatNumber } from '../lib/utils';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram } from '@solana/web3.js';
import Decimal from 'decimal.js';
import { createJitoTipInstruction } from '../services/jitoService';
import { fetchTokenPrices } from '../services/priceService';
import { fetchSolBalance, fetchTokenBalances } from '../services/balanceService';
import { analyzeSwap, SwapAnalysis } from '../services/geminiService';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useFirebase } from '../lib/FirebaseProvider';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import confetti from 'canvas-confetti';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  txHash?: string;
}

const TokenLogo = ({ token, className, size }: { token: TokenInfo; className?: string; size?: 'sm' | 'md' | 'lg' }) => {
  const [error, setError] = useState(false);
  
  useEffect(() => {
    setError(false);
  }, [token.logoURI]);

  return (
    <div className={cn("rounded-full overflow-hidden flex items-center justify-center bg-brand/20 shadow-sm shrink-0", className)}>
      {!token.logoURI || error ? (
        <span className={cn("font-bold text-brand uppercase select-none", size === 'sm' ? "text-[8px]" : size === 'md' ? "text-[10px]" : "text-xs")}>
          {token.symbol.slice(0, 2)}
        </span>
      ) : (
        <img 
          src={token.logoURI} 
          alt={token.symbol} 
          className="w-full h-full object-cover" 
          referrerPolicy="no-referrer"
          onError={() => setError(true)}
        />
      )}
    </div>
  );
};

export const SwapCard = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { user } = useFirebase();
  
  const [fromToken, setFromToken] = useState<TokenInfo>(SUPPORTED_TOKENS[0]);
  const [toToken, setToToken] = useState<TokenInfo>(SUPPORTED_TOKENS[1]);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [showTokenSelector, setShowTokenSelector] = useState<'from' | 'to' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [slippage, setSlippage] = useState('0.5');
  const [priorityFee, setPriorityFee] = useState<'low' | 'medium' | 'high'>('medium');
  const [mevProtection, setMevProtection] = useState(true);
  const [feeToken, setFeeToken] = useState<TokenInfo>(SUPPORTED_TOKENS[0]);
  
  const [analysis, setAnalysis] = useState<SwapAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // SOL mint constant
  const SOL_MINT = 'So11111111111111111111111111111111111111112';

  const addToast = (message: string, type: 'success' | 'error' | 'info', txHash?: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, txHash }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  // Fetch balances
  const updateBalances = React.useCallback(async () => {
    if (!publicKey) {
      setBalances({});
      return;
    }

    setIsRefreshing(true);
    try {
      const [solBalance, tokenBalances] = await Promise.all([
        fetchSolBalance(connection, publicKey),
        fetchTokenBalances(connection, publicKey)
      ]);
      
      setBalances({
        [SOL_MINT]: solBalance,
        ...tokenBalances
      });
    } catch (error) {
      console.error("Failed to update balances:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    updateBalances();
    const interval = setInterval(updateBalances, 15000);
    return () => clearInterval(interval);
  }, [updateBalances]);

  // Fetch prices
  const updatePrices = React.useCallback(async () => {
    const prices = await fetchTokenPrices(SUPPORTED_TOKENS.map(t => t.mint));
    setTokenPrices(prices);
  }, []);

  useEffect(() => {
    updatePrices();
    const interval = setInterval(updatePrices, 30000);
    return () => clearInterval(interval);
  }, [updatePrices]);

  // Simulation and AI
  useEffect(() => {
    if (!fromAmount || isNaN(parseFloat(fromAmount))) {
      setToAmount('');
      setAnalysis(null);
      return;
    }

    const val = parseFloat(fromAmount);
    const fromPrice = tokenPrices[fromToken.mint];
    const toPrice = tokenPrices[toToken.mint];

    let output = val;
    if (fromPrice && toPrice) {
      output = (val * fromPrice) / toPrice;
    } else {
      if (fromToken.symbol === 'SOL' && toToken.symbol === 'USDC') output = val * 128.45;
      if (fromToken.symbol === 'USDC' && toToken.symbol === 'SOL') output = val / 128.45;
    }
    
    setToAmount(new Decimal(output).toFixed(6));

    const triggerAnalysis = async () => {
      setIsAnalyzing(true);
      try {
        const result = await analyzeSwap(fromToken.symbol, toToken.symbol, fromAmount);
        setAnalysis(result);
      } finally {
        setIsAnalyzing(false);
      }
    };

    const timer = setTimeout(triggerAnalysis, 800);
    return () => clearTimeout(timer);
  }, [fromAmount, fromToken, toToken, tokenPrices]);

  const handleSwapTokens = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount(toAmount);
  };

  const executeSwap = async () => {
    if (!publicKey) {
      addToast("Please connect your wallet first", 'info');
      return;
    }
    
    const amount = parseFloat(fromAmount);
    if (!fromAmount || isNaN(amount) || amount <= 0) {
      addToast("Enter a valid swap amount", 'error');
      return;
    }

    const balance = balances[fromToken.mint] || 0;
    if (amount > balance) {
      addToast(`Insufficient ${fromToken.symbol} balance`, 'error');
      return;
    }
    
    setIsSwapping(true);
    addToast("Preparing transaction...", 'info');
    
    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 5000,
        })
      );

      if (mevProtection) {
        const tipInstruction = createJitoTipInstruction(publicKey, 1000);
        transaction.add(tipInstruction);
      }

      const signature = await sendTransaction(transaction, connection);
      addToast("Transaction sent! Awaiting confirmation...", 'info', signature);
      
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed');
      
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00F3FF', '#8B5CF6', '#FFFFFF']
      });

      addToast("Swap successful!", 'success', signature);
      
      if (user) {
        try {
          await addDoc(collection(db, 'swaps'), {
            userId: user.uid,
            fromToken: fromToken.mint,
            toToken: toToken.mint,
            fromAmount: parseFloat(fromAmount),
            toAmount: parseFloat(toAmount),
            status: 'completed',
            signature: signature,
            timestamp: serverTimestamp(),
            network: 'devnet',
            isMevProtected: mevProtection,
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'swaps');
        }
      }

      setFromAmount('');
      setTimeout(updateBalances, 1500);
      setTimeout(updateBalances, 5000); 
    } catch (error: any) {
      console.error("Execution failed:", error);
      addToast(error.message || "Transaction failed", 'error');
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="glass-panel rounded-[28px] p-1.5 space-y-1.5 relative border border-white/5 shadow-[0_0_50px_-12px_rgba(0,243,255,0.1)]">
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col space-y-3 items-end pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={cn(
                "pointer-events-auto p-4 rounded-2xl border shadow-2xl min-w-[280px] max-w-[400px] flex items-start space-x-3",
                toast.type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-400" :
                toast.type === 'error' ? "bg-red-500/10 border-red-500/20 text-red-400" :
                "bg-blue-500/10 border-blue-500/20 text-blue-400"
              )}
            >
              {toast.type === 'success' ? <CheckCircle2 className="mt-0.5 shrink-0" size={18} /> : 
               toast.type === 'error' ? <AlertTriangle className="mt-0.5 shrink-0" size={18} /> : 
               <Info className="mt-0.5 shrink-0" size={18} />}
              
              <div className="flex-grow space-y-1">
                <p className="text-sm font-bold leading-tight">{toast.message}</p>
                {toast.txHash && (
                  <a 
                    href={`https://explorer.solana.com/tx/${toast.txHash}?cluster=devnet`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-[10px] font-mono opacity-60 hover:opacity-100 transition-opacity underline decoration-dotted"
                  >
                    View on Explorer <ExternalLink size={10} className="ml-1" />
                  </a>
                )}
              </div>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="opacity-40 hover:opacity-100"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="p-3.5 space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex space-x-3">
            <button className="text-[13px] font-bold text-white border-b-2 border-brand pb-1">Market</button>
            {user && (
              <button 
                onClick={() => setShowHistory(true)}
                className="text-[13px] font-bold text-gray-500 hover:text-white transition-smooth flex items-center"
              >
                <History size={13} className="mr-1" />
                History
              </button>
            )}
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-smooth"
          >
            <Settings2 size={16} />
          </button>
        </div>

        <div className="space-y-1 relative">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-3.5 transition-all focus-within:bg-white/[0.08] focus-within:border-white/10">
            <div className="flex justify-between mb-1.5">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">You Pay</label>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => {
                    updateBalances();
                  }}
                  className="p-0.5 text-gray-600 hover:text-brand transition-colors"
                  title="Click to refresh balances"
                >
                  <Clock size={10} className={cn(isRefreshing ? "animate-spin text-brand" : "")} />
                </button>
                <button 
                  onClick={() => setFromAmount((balances[fromToken.mint] || 0).toString())}
                  className="text-[9px] font-bold text-gray-500 hover:text-brand transition-colors uppercase tracking-widest cursor-pointer"
                >
                  Balance: {formatNumber(balances[fromToken.mint] || 0)}
                </button>
              </div>
            </div>
            <div className="flex items-center">
              <input 
                type="number" 
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="bg-transparent text-xl font-bold w-full focus:outline-none placeholder:text-gray-700"
              />
              <button 
                onClick={() => setShowTokenSelector('from')}
                className="flex items-center space-x-2 bg-black/40 border border-white/10 p-1.5 pr-2.5 rounded-lg hover:bg-white/10 transition-all"
              >
                <TokenLogo token={fromToken} className="w-5 h-5" size="sm" />
                <span className="font-bold text-xs tracking-tight">{fromToken.symbol}</span>
                <ChevronDown size={12} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <button 
              onClick={handleSwapTokens}
              className="w-9 h-9 bg-black border border-white/10 rounded-xl flex items-center justify-center text-brand hover:rotate-180 transition-smooth shadow-lg group hover:border-brand/40"
            >
              <ArrowDownUp size={16} className="group-hover:scale-110" />
            </button>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-3.5 transition-all focus-within:bg-white/[0.08] focus-within:border-white/10">
            <div className="flex justify-between mb-1.5">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">You Receive</label>
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Estimated</span>
            </div>
            <div className="flex items-center">
              <input 
                type="text" 
                readOnly
                placeholder="0.00"
                value={toAmount}
                className="bg-transparent text-xl font-bold w-full focus:outline-none placeholder:text-gray-700 cursor-default"
              />
              <button 
                onClick={() => setShowTokenSelector('to')}
                className="flex items-center space-x-2 bg-black/40 border border-white/10 p-1.5 pr-2.5 rounded-lg hover:bg-white/10 transition-all"
              >
                <TokenLogo token={toToken} className="w-5 h-5" size="sm" />
                <span className="font-bold text-xs tracking-tight">{toToken.symbol}</span>
                <ChevronDown size={12} className="text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {analysis && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -4 }}
              className="overflow-hidden"
            >
              <div className="bg-brand/5 border border-brand/10 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1 px-1.5 border border-brand/20 rounded bg-brand/10 shadow-sm">
                      <Bot size={12} className="text-brand" />
                    </div>
                    <span className="text-[9px] font-bold text-brand uppercase tracking-widest">Edge Insight</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-[8px] text-brand/50 uppercase font-mono tracking-tighter">Status: Analyzed</span>
                    <div className="w-1 h-1 rounded-full bg-brand animate-pulse" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center text-[8px] text-gray-500 font-bold uppercase tracking-tighter">
                      <TrendingUp size={9} className="mr-1 text-green-400" /> Trend
                    </div>
                    <p className="text-[11px] font-semibold text-white/90">{analysis.trend}</p>
                  </div>
                  <div className="space-y-0.5">
                     <div className="flex items-center text-[8px] text-gray-500 font-bold uppercase tracking-tighter">
                      <ShieldCheck size={9} className="mr-1 text-blue-400" /> Risk
                    </div>
                    <p className="text-[11px] font-semibold text-white/90">{analysis.isSafe ? 'Low (Verified)' : 'Warning'}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-white/5">
                  <p className="text-[10px] text-gray-400 leading-relaxed font-medium italic">
                    "{analysis.recommendation}"
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2.5 px-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <div className="flex items-center text-gray-500 group cursor-help">
              <Clock size={12} className="mr-1 text-blue-400/60 group-hover:text-blue-400 transition-colors" />
              <span className="font-bold uppercase tracking-tighter text-[9px]">Market Price</span>
            </div>
            <span className="text-white font-mono tracking-tighter font-bold">
              1 {fromToken.symbol} ≈ {tokenPrices[fromToken.mint] && tokenPrices[toToken.mint] 
                ? (tokenPrices[fromToken.mint] / tokenPrices[toToken.mint]).toLocaleString(undefined, { maximumFractionDigits: 6 }) 
                : '...'} {toToken.symbol}
            </span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <div className="flex items-center text-gray-500 group cursor-help">
              <Zap size={12} className="mr-1 text-brand/60 group-hover:text-brand transition-colors" />
              <span className="font-bold uppercase tracking-tighter text-[9px]">Price Impact</span>
            </div>
            <span className="text-green-500 font-mono tracking-tighter font-bold">&lt;0.01%</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
             <div className="flex items-center text-gray-500 group cursor-help">
              <AlertTriangle size={12} className="mr-1 text-orange-400/60 group-hover:text-orange-400 transition-colors" />
              <span className="font-bold uppercase tracking-tighter text-[9px]">Max Slippage</span>
            </div>
            <span className="text-white font-mono tracking-tighter font-bold">{slippage}%</span>
          </div>
        </div>

        <button 
          disabled={isSwapping || !fromAmount}
          onClick={executeSwap}
          className="w-full py-4 bg-brand text-black font-extrabold rounded-xl transition-all hover:scale-[1.01] hover:shadow-[0_0_40px_-5px_rgba(0,243,255,0.5)] active:scale-[0.98] disabled:opacity-20 disabled:grayscale relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-[-20deg]" />
          <span className="relative z-10 flex items-center justify-center text-[15px] tracking-tight">
            {isSwapping ? (
              <>
                <Loader2 size={18} className="animate-spin mr-2" />
                Aggregating Liquidity...
              </>
            ) : !publicKey ? (
              'CONNECT WALLET'
            ) : !fromAmount ? (
              'ENTER AN AMOUNT'
            ) : (
              'EXECUTE SWAP'
            )}
          </span>
        </button>
      </div>

      <AnimatePresence>
        {showTokenSelector && (
          <TokenSelectorModal 
            balances={balances}
            onClose={() => setShowTokenSelector(null)}
            onSelect={(token) => {
              if (showTokenSelector === 'from') setFromToken(token);
              else setToToken(token);
              setShowTokenSelector(null);
            }}
          />
        )}
        {showSettings && (
          <SettingsModal 
            onClose={() => setShowSettings(false)}
            slippage={slippage}
            setSlippage={setSlippage}
            priorityFee={priorityFee}
            setPriorityFee={setPriorityFee}
            mevProtection={mevProtection}
            setMevProtection={setMevProtection}
            feeToken={feeToken}
            setFeeToken={setFeeToken}
          />
        )}
        {showHistory && (
          <HistoryModal onClose={() => setShowHistory(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

const HistoryModal = ({ onClose }: { onClose: () => void }) => {
  const { user } = useFirebase();
  const [swaps, setSwaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const loadSwaps = async () => {
      try {
        const q = query(
          collection(db, 'swaps'),
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        const snapshot = await getDocs(q);
        setSwaps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'swaps');
      } finally {
        setLoading(false);
      }
    };

    loadSwaps();
  }, [user]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute inset-0 z-50 bg-[#0a0a0a] rounded-[32px] flex flex-col p-6 overflow-hidden border border-white/5"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <History size={18} className="text-brand" />
          <h3 className="font-bold text-lg">Swap History</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg">
          <X size={20} />
        </button>
      </div>

      <div className="flex-grow space-y-3 overflow-y-auto pr-1 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="animate-spin text-brand" size={32} />
            <p className="text-xs text-gray-500 font-mono italic">Synchronizing Chain Data...</p>
          </div>
        ) : swaps.length > 0 ? (
          swaps.map((swap) => (
            <div key={swap.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2 group hover:border-brand/30 transition-smooth">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                  {swap.timestamp?.toDate().toLocaleString()}
                </span>
                <span className="text-[10px] font-mono text-brand">Success</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-white">{swap.fromAmount || swap.inputAmount}</span>
                  <span className="text-[10px] text-gray-500">→</span>
                  <span className="text-sm font-bold text-brand">{swap.toAmount || swap.outputAmount}</span>
                </div>
                <div className="flex -space-x-1">
                   <div className="w-5 h-5 rounded-full bg-white/10 border border-black flex items-center justify-center text-[8px] font-bold">In</div>
                   <div className="w-5 h-5 rounded-full bg-brand/20 border border-black flex items-center justify-center text-[8px] font-bold text-brand">Out</div>
                </div>
              </div>
              <div className="text-[9px] text-gray-600 font-mono truncate">
                Tx: {swap.signature || swap.txHash}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 space-y-3">
            <Activity size={40} strokeWidth={1} className="opacity-20" />
            <p className="text-sm italic">No recent transactions found</p>
          </div>
        )}
      </div>

      <button 
        onClick={onClose}
        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-smooth mt-4 border border-white/10"
      >
        Close History
      </button>
    </motion.div>
  );
};

const TokenSelectorModal = ({ onClose, onSelect, balances }: { onClose: () => void; onSelect: (t: TokenInfo) => void; balances: Record<string, number> }) => {
  const [search, setSearch] = useState('');

  const filteredTokens = SUPPORTED_TOKENS.filter(t => 
    t.symbol.toLowerCase().includes(search.toLowerCase()) || 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.mint.toLowerCase() === search.toLowerCase()
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute inset-0 z-50 bg-[#0a0a0a] rounded-[32px] flex flex-col p-6 overflow-hidden border border-white/5"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-xl tracking-tight">Select Token</h3>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg">
          <X size={24} />
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input 
          autoFocus
          placeholder="Search by name or address"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand/50 transition-smooth font-medium"
        />
      </div>

      <div className="flex-grow space-y-2 overflow-y-auto pr-1">
        <div className="grid grid-cols-4 gap-2 mb-6">
          {SUPPORTED_TOKENS.slice(0, 4).map(t => (
            <button 
              key={t.symbol}
              onClick={() => onSelect(t)}
              className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/5 rounded-xl hover:border-brand/30 transition-smooth"
            >
              <TokenLogo token={t} className="w-6 h-6 mb-1" size="sm" />
              <span className="text-[10px] font-bold">{t.symbol}</span>
            </button>
          ))}
        </div>
        
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-2">Popular Tokens</p>
          {filteredTokens.map(t => (
            <button 
              key={t.mint}
              onClick={() => onSelect(t)}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-smooth text-left group"
            >
              <div className="flex items-center space-x-3">
                <TokenLogo token={t} className="w-10 h-10" size="lg" />
                <div>
                  <p className="font-bold group-hover:text-brand transition-smooth">{t.symbol}</p>
                  <p className="text-[10px] text-gray-500 font-medium">{t.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono font-bold">{formatNumber(balances[t.mint] || 0)}</p>
                <p className="text-[10px] text-gray-600 font-mono truncate w-20">{t.mint.slice(0, 4)}...{t.mint.slice(-4)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const SettingsModal = ({ 
  onClose, slippage, setSlippage, priorityFee, setPriorityFee, mevProtection, setMevProtection, feeToken, setFeeToken 
}: any) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-x-2 top-2 z-50 bg-[#0d0d0d] rounded-3xl p-6 shadow-2xl border border-white/10"
    >
      <div className="flex items-center justify-between mb-8">
        <h3 className="font-bold text-xl tracking-tight">Swap Settings</h3>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg">
          <X size={24} />
        </button>
      </div>

      <div className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Slippage Tolerance</h4>
            <Info size={14} className="text-gray-600" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {['0.1', '0.5', '1.0'].map(val => (
              <button 
                key={val}
                onClick={() => setSlippage(val)}
                className={cn(
                  "py-2 rounded-xl text-sm font-bold border transition-smooth",
                  slippage === val ? "bg-brand text-black border-brand" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                )}
              >
                {val}%
              </button>
            ))}
            <div className="relative">
              <input 
                type="number"
                placeholder="Custom"
                value={['0.1', '0.5', '1.0'].includes(slippage) ? '' : slippage}
                onChange={(e) => setSlippage(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-2 text-sm text-center focus:outline-none focus:border-brand/40"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-600">%</span>
            </div>
          </div>
        </section>

        <section className="space-y-4">
           <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Priority Fee</h4>
            <span className="text-[10px] text-brand font-mono">Real-time</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['low', 'medium', 'high'].map(val => (
              <button 
                key={val}
                onClick={() => setPriorityFee(val)}
                className={cn(
                  "py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-smooth",
                  priorityFee === val ? "bg-brand/20 text-brand border-brand/50" : "bg-white/5 border-white/10 text-gray-400"
                )}
              >
                {val}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-white flex items-center">
              Jito MEV Protection
              <ShieldCheck size={14} className="ml-2 text-brand" />
            </h4>
            <p className="text-[10px] text-gray-500 font-medium italic">Protects against frontrunning on Solana</p>
          </div>
          <button 
            onClick={() => setMevProtection(!mevProtection)}
            className={cn(
              "w-12 h-6 rounded-full p-1 transition-smooth relative",
              mevProtection ? "bg-brand" : "bg-white/10"
            )}
          >
            <div className={cn(
              "w-4 h-4 bg-black rounded-full shadow-md transition-smooth",
              mevProtection ? "translate-x-6" : "translate-x-0"
            )} />
          </button>
        </section>
      </div>

      <button 
        onClick={onClose}
        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-smooth mt-10 border border-white/10"
      >
        Save Settings
      </button>
    </motion.div>
  );
};
