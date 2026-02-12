
import React from 'react';
import { Camera, Image as ImageIcon, Volume2, VolumeX, Heart } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { ViewState, AppTheme } from '../types';
import { THEME_CONFIGS } from '../constants';
import { playSound } from '../utils/audio';
import { triggerHaptic } from '../utils/haptics';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ViewState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNavigate }) => {
  const { theme, setTheme, soundEnabled, toggleSound } = useTheme();

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity animate-fade-enter" onClick={onClose} />
      )}
      <div className={`fixed inset-y-0 left-0 w-72 bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex flex-col h-full">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 font-serif italic">PookieBoth</h2>
          
          <div className="flex flex-col gap-2 flex-1">
            <button onClick={() => { triggerHaptic('light'); onNavigate(ViewState.Home); onClose(); }} className="flex items-center gap-3 text-gray-600 hover:text-gray-900 font-medium p-3 rounded-xl hover:bg-gray-50 transition-colors btn-bouncy">
                <Camera size={20} /> Create Booth
            </button>
            <button onClick={() => { triggerHaptic('light'); onNavigate(ViewState.Gallery); onClose(); }} className="flex items-center gap-3 text-gray-600 hover:text-gray-900 font-medium p-3 rounded-xl hover:bg-gray-50 transition-colors btn-bouncy">
                <ImageIcon size={20} /> Gallery
            </button>
             <button onClick={() => { triggerHaptic('light'); playSound('pop'); toggleSound(); }} className="flex items-center gap-3 text-gray-600 hover:text-gray-900 font-medium p-3 rounded-xl hover:bg-gray-50 transition-colors justify-between group btn-bouncy">
                <div className="flex items-center gap-3">
                    {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    Sounds
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${soundEnabled ? 'bg-green-400' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${soundEnabled ? 'left-5' : 'left-0.5'}`}></div>
                </div>
            </button>
          </div>

          <div className="mt-8 border-t border-gray-100 pt-6">
            <p className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">Aesthetic</p>
            <div className="grid grid-cols-4 gap-3">
               {Object.keys(THEME_CONFIGS).map((t) => (
                   <button 
                    key={t} 
                    onClick={() => { triggerHaptic('selection'); playSound('pop'); setTheme(t as AppTheme); }}
                    className={`w-10 h-10 rounded-full border-[3px] transition-transform btn-bouncy ${theme === t ? 'border-gray-800 scale-110 shadow-md' : 'border-transparent'} ${THEME_CONFIGS[t as AppTheme].bg}`}
                    title={t}
                   />
               ))}
            </div>
          </div>

          <div className="mt-6 pt-4 flex items-center justify-center gap-2 text-gray-400 text-[10px] uppercase tracking-wide">
            <span>Made with</span> <Heart size={10} fill="currentColor" className="text-pink-300" /> <span>by Pookie</span>
          </div>
        </div>
      </div>
    </>
  );
};
