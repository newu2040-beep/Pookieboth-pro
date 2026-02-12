
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { auth, isConfigured } from '../firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isGuest: boolean;
  continueAsGuest: () => void;
  configError: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    if (!isConfigured || !auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`
        });
        setIsGuest(false);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    if (!isConfigured || !auth) {
      alert("Please configure firebase.ts with your API keys first!");
      return;
    }

    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // The onAuthStateChanged hook will handle the state update
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed. Check console for details (often requires enabling Google Auth in Firebase Console).");
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (auth) {
      await signOut(auth);
      // State is handled by onAuthStateChanged
      setUser(null);
      setIsGuest(false);
    }
  };

  const continueAsGuest = () => {
    setIsGuest(true);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      loginWithGoogle, 
      logout, 
      isGuest, 
      continueAsGuest,
      configError: !isConfigured
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
