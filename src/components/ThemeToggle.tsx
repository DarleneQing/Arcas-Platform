'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative flex items-center rounded-lg text-sm font-medium transition-all duration-200 focus-ring
        border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800
        text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700
        ${collapsed ? 'justify-center p-2' : 'gap-2 px-3 py-2'}
      `}
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
      {!collapsed && (
        <span className="text-xs">{theme === 'light' ? 'Dark' : 'Light'}</span>
      )}
    </button>
  );
}
