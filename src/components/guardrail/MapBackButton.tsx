'use client';

import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface MapBackButtonProps {
  isRevealed: boolean;
  onToggle: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function MapBackButton({
  isRevealed,
  onToggle,
  className = '',
  style,
}: MapBackButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors focus-ring border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 ${className}`.trim()}
      style={style}
    >
      {isRevealed ? (
        <>
          <EyeOff size={12} />
          Hide my data
        </>
      ) : (
        <>
          <Eye size={12} />
          Map back to my data
        </>
      )}
    </button>
  );
}
