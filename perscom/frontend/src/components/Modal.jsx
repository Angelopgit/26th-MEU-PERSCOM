import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`${maxWidth} w-full bg-[#090f1e] border border-[#162448] rounded-sm shadow-2xl flex flex-col max-h-[90vh]`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#162448] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 bg-[#3b82f6] rounded-full opacity-60" />
            <span className="text-[#60a5fa] text-xs font-mono uppercase tracking-widest">
              {title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#2a4a80] hover:text-[#dbeafe] transition-colors p-0.5"
          >
            <X size={15} />
          </button>
        </div>
        {/* Body */}
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
