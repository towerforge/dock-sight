import React, { useState, useEffect } from 'react';
import { List, ChevronDown } from 'lucide-react';

interface Props {
  value: number;
  onChange: (val: number) => void;
  options?: number[];
}

const defaultOptions = [10, 20, 30, 50, 100, 200];

export const PointCountSelector: React.FC<Props> = ({ value, onChange, options = defaultOptions }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const close = () => setIsOpen(false);
    if(isOpen) window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [isOpen]);

  return (
    <div className="relative z-50">
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="flex items-center justify-between gap-2 bg-card-bg border border-card-border text-slate-300 text-sm font-medium px-3 py-2 rounded-lg shadow-sm h-[38px] hover:bg-card-border/50 transition-colors w-24"
      >
        <div className="flex items-center gap-2">
          <List size={14} className="text-slate-500" />
          {value}
        </div>
        <ChevronDown size={14} className="text-slate-500" />
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-32 bg-card-bg border border-card-border rounded-lg shadow-xl overflow-hidden py-1">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setIsOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${
                value === opt 
                  ? 'bg-blue-500/10 text-blue-400 font-medium' 
                  : 'text-slate-400 hover:bg-card-border hover:text-slate-200'
              }`}
            >
              {opt}
              {value === opt && <List size={12} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
