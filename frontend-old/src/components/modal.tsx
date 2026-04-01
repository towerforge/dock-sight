import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const Modal: React.FC<{
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}> = ({ onClose, children, maxWidth = 'max-w-md' }) => createPortal(
  <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    <div
      className={`relative bg-card-bg border border-card-border rounded-2xl p-6 w-full ${maxWidth} mx-4 shadow-2xl`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
      >
        <X size={18} />
      </button>
      {children}
    </div>
  </div>,
  document.body
);
