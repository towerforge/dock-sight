import React, { useState, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';

interface Props {
  value: number;
  onChange: (val: number) => void;
}

const options = [
  { label: '1s', value: 1000 },
  { label: '3s', value: 3000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '30s', value: 30000 },
  { label: '60s', value: 60000 },
];

export const TimeSelector: React.FC<Props> = ({ value, onChange }) => {
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
          <Clock size={14} className="text-slate-500" />
          {value / 1000}s
        </div>
        <ChevronDown size={14} className="text-slate-500" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-32 bg-card-bg border border-card-border rounded-lg shadow-xl overflow-hidden py-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${
                value === opt.value 
                  ? 'bg-blue-500/10 text-blue-400 font-medium' 
                  : 'text-slate-400 hover:bg-card-border hover:text-slate-200'
              }`}
            >
              {opt.label}
              {value === opt.value && <Clock size={12} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};