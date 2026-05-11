import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Settings, ShieldCheck, LogIn, LogOut, User } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useFirebase } from '../lib/FirebaseProvider';
import { signInWithGoogle, logOut } from '../lib/firebase';

export const Header = () => {
  const { user } = useFirebase();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center space-x-1.5 group cursor-pointer sm:space-x-2"
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 bg-brand border border-white/20 rounded-lg flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-[0_0_20px_rgba(0,243,255,0.4)] overflow-hidden">
              <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 text-black" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m18 6-6 6-6-6M18 18l-6-6-6 6" />
                <path d="M12 6v12" className="opacity-50" />
              </svg>
            </div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-white/90">Edexchange</span>
          </motion.div>

          <nav className="hidden md:flex items-center space-x-1" />
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button className="p-1 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-smooth sm:p-1.5">
            <Settings size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>

          {user ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="flex items-center gap-1 sm:gap-2 px-1.5 py-0.5 sm:px-2.5 sm:py-1 bg-white/5 rounded-lg border border-white/10">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full" />
                ) : (
                  <User size={12} className="text-brand sm:w-3.5 sm:h-3.5" />
                )}
                <span className="text-[10px] sm:text-xs font-semibold text-gray-300 hidden lg:inline-block">
                  {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                </span>
              </div>
              <button 
                onClick={logOut}
                className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all sm:p-1.5"
                title="Logout"
              >
                <LogOut size={14} className="sm:w-4 sm:h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className="flex items-center gap-1 px-2 py-1 sm:gap-2 sm:px-3 sm:py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[11px] sm:text-[13px] font-semibold transition-all text-white"
            >
              <LogIn size={14} />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
          
          <WalletMultiButton className="!m-0 !bg-brand !text-black !font-bold !rounded-lg !h-7 sm:!h-8 !text-[10px] sm:!text-xs !px-2 sm:!px-3 hover:!opacity-90 transition-all !min-w-0" />
        </div>
      </div>
    </header>
  );
};

const NavItem = ({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) => (
  <button className={cn(
    "flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-smooth",
    active ? "text-brand bg-brand/10" : "text-gray-400 hover:text-white hover:bg-white/5"
  )}>
    {icon}
    <span>{label}</span>
  </button>
);
