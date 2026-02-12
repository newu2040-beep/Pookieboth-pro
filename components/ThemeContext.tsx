import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppTheme } from '../types';
import { THEME_CONFIGS } from '../constants';
import { setSoundEnabled as setGlobalSoundEnabled, isSoundEnabled as getGlobalSoundEnabled } from '../utils/audio';

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  colors: typeof THEME_CONFIGS[AppTheme];
  soundEnabled: boolean;
  toggleSound: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<AppTheme>(AppTheme.Peach);
  const [colors, setColors] = useState(THEME_CONFIGS[AppTheme.Peach]);
  const [soundEnabled, setSoundEnabled] = useState(getGlobalSoundEnabled());

  useEffect(() => {
    setColors(THEME_CONFIGS[theme]);
  }, [theme]);

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    setGlobalSoundEnabled(newState);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colors, soundEnabled, toggleSound }}>
      <div className={`transition-colors duration-500 ease-in-out ${colors.bg} ${colors.text} w-full h-full font-sans`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};