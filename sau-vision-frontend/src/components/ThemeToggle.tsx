import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-full bg-slate-100 dark:bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-border text-slate-500 dark:text-slate-500 dark:text-gray-400 hover:text-navy-900 dark:hover:text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-electric-500"
      aria-label="Toggle theme"
    >
      <div className="relative w-4 h-4">
        <Sun className={`absolute inset-0 w-4 h-4 transition-all duration-300 transform ${theme === 'dark' ? 'opacity-0 scale-50 rotate-90' : 'opacity-100 scale-100 rotate-0'}`} />
        <Moon className={`absolute inset-0 w-4 h-4 transition-all duration-300 transform ${theme === 'light' ? 'opacity-0 scale-50 -rotate-90' : 'opacity-100 scale-100 rotate-0'}`} />
      </div>
    </button>
  );
}
