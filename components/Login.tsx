
import React from 'react';
import { Camera, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { useAuth } from '../utils/auth';

interface LoginProps {
  onComplete: () => void;
}

export const Login: React.FC<LoginProps> = ({ onComplete }) => {
  const { colors } = useTheme();
  const { loginWithGoogle, continueAsGuest, isLoading } = useAuth();

  const handleGoogleLogin = async () => {
    await loginWithGoogle();
    onComplete();
  };

  const handleGuest = () => {
    continueAsGuest();
    onComplete();
  };

  return (
    <div className={`fixed inset-0 z-40 flex items-center justify-center p-6 ${colors.bg} animate-fade-enter`}>
      <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-xl p-8 flex flex-col items-center text-center relative overflow-hidden border border-white/60">
        
        {/* Decor */}
        <div className={`absolute top-0 inset-x-0 h-32 bg-gradient-to-b ${colors.accent} to-transparent opacity-20 pointer-events-none`}></div>
        
        <div className="w-20 h-20 bg-white rounded-3xl shadow-lg flex items-center justify-center mb-6 relative z-10">
          <Sparkles className="text-yellow-400 absolute -top-2 -right-2 animate-bounce-gentle" size={24} />
          <Camera size={40} className="text-gray-800" strokeWidth={1.5} />
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-2 font-serif italic">Welcome to PookieBoth</h2>
        <p className="text-gray-500 text-sm mb-10 leading-relaxed">
          Sign in to save your photos to the cloud and access them from any device.
        </p>

        <button 
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm mb-4"
        >
          {isLoading ? (
            <Loader2 size={20} className="animate-spin text-gray-400" />
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <button 
          onClick={handleGuest}
          className="text-gray-400 text-sm font-semibold hover:text-gray-600 transition-colors flex items-center gap-1"
        >
          Continue as Guest <ArrowRight size={14} />
        </button>

      </div>
    </div>
  );
};
