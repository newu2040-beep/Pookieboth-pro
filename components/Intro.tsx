import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface IntroProps {
  onComplete: () => void;
}

export const Intro: React.FC<IntroProps> = ({ onComplete }) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 500);
    const t2 = setTimeout(() => setStage(2), 2000);
    const t3 = setTimeout(() => onComplete(), 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-orange-100 via-white to-purple-100 overflow-hidden">
      <div className={`transition-all duration-1000 transform ${stage >= 1 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'}`}>
        <div className="flex flex-col items-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-pink-300 blur-2xl opacity-40 animate-pulse rounded-full"></div>
            <Sparkles className="w-16 h-16 text-pink-500 animate-float relative z-10" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-800 font-sans">
            PookieBoth
          </h1>
          <p className="mt-2 text-gray-500 text-sm tracking-widest uppercase opacity-75">
            Capture the Moment
          </p>
        </div>
      </div>
    </div>
  );
};