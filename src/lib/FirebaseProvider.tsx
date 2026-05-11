import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { useWallet } from '@solana/wallet-adapter-react';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  profile: any | null;
}

const FirebaseContext = createContext<FirebaseContextType>({ user: null, loading: true, profile: null });

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Ensure user profile exists in Firestore
        const userRef = doc(db, 'users', user.uid);
        try {
          const snapshot = await getDoc(userRef);
          if (!snapshot.exists()) {
            const initialData = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              createdAt: serverTimestamp(),
              lastLoginAt: serverTimestamp(),
            };
            await setDoc(userRef, initialData);
            setProfile(initialData);
          } else {
            const data = snapshot.data();
            setProfile(data);
            // Update last login
            await updateDoc(userRef, { lastLoginAt: serverTimestamp() });
          }
        } catch (error) {
          console.error("Error fetching/creating profile:", error);
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <FirebaseContext.Provider value={{ user, loading, profile }}>
      <WalletSync user={user} profile={profile} setProfile={setProfile} />
      {children}
    </FirebaseContext.Provider>
  );
};

// Internal component to sync wallet, ensures useWallet is only called within the provider tree
const WalletSync: React.FC<{ user: User | null, profile: any, setProfile: (p: any) => void }> = ({ user, profile, setProfile }) => {
  const { publicKey } = useWallet();

  useEffect(() => {
    if (user && publicKey && profile) {
      const walletStr = publicKey.toBase58();
      if (profile.walletAddress !== walletStr) {
        const userRef = doc(db, 'users', user.uid);
        updateDoc(userRef, { walletAddress: walletStr }).catch(console.error);
        setProfile((prev: any) => (prev ? { ...prev, walletAddress: walletStr } : prev));
      }
    }
  }, [user, publicKey, profile, setProfile]);

  return null;
};

export const useFirebase = () => useContext(FirebaseContext);
