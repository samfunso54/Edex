import React from 'react';
import { Github, Twitter, MessageCircle, ShieldCheck } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-white/5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-brand/20 rounded flex items-center justify-center">
              <ShieldCheck size={14} className="text-brand" />
            </div>
            <span className="font-bold tracking-tighter text-white">Edexchange</span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
            The next generation of decentralised trading on Solana. Fast, secure, and aggregated liquidity for the best prices.
          </p>
        </div>

        <div className="md:text-center">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Support</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            <li><a href="#" className="hover:text-brand transition-smooth">Documentation</a></li>
            <li><a href="#" className="hover:text-brand transition-smooth">Settings</a></li>
            <li><a href="#" className="hover:text-brand transition-smooth">Audit</a></li>
          </ul>
        </div>

        <div className="md:text-right">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Community</h4>
          <div className="flex space-x-3 md:justify-end">
            <a href="#" className="p-2 bg-white/5 rounded-lg hover:bg-brand/10 hover:text-brand transition-smooth"><Twitter size={16} /></a>
            <a href="#" className="p-2 bg-white/5 rounded-lg hover:bg-brand/10 hover:text-brand transition-smooth"><MessageCircle size={16} /></a>
            <a href="#" className="p-2 bg-white/5 rounded-lg hover:bg-brand/10 hover:text-brand transition-smooth"><Github size={16} /></a>
          </div>
        </div>
      </div>
      
      <div className="mt-12 flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/5 space-y-4 md:space-y-0">
        <p className="text-[10px] text-gray-600 font-mono tracking-widest uppercase">2026 Audited by SamFunso</p>
        <div className="flex items-center space-x-6 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
          <span className="flex items-center"><div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse" /> Solana Devnet</span>
          <span className="hidden sm:inline opacity-50">|</span>
          <span className="text-brand/50">RPC by Helius</span>
          <span>Terms</span>
          <span>Privacy</span>
        </div>
      </div>
    </footer>
  );
};
