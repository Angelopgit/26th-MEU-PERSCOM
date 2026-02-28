import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye } from 'lucide-react';

const PAGE_TITLES = {
  '/':            'Dashboard',
  '/personnel':   'Personnel Management',
  '/evaluations': 'Performance Evaluations',
  '/operations':  'Operations',
  '/roster':      'Order of Battle',
  '/eventlog':    'Event Log',
  '/settings':    'System Settings',
  '/documents':   'Unit Documents',
};

export default function TopBar() {
  const location = useLocation();
  const { adminAlias, isGuest } = useAuth();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const path = location.pathname;
  const title = PAGE_TITLES[path] ?? (path.startsWith('/personnel/') ? 'Marine Profile' : 'PERSCOM');
  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = time.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();

  return (
    <div className="h-11 bg-[#040810] border-b border-[#162448] flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-[#1a2f55] text-[10px] font-mono">SYS //</span>
        <span className="text-[#bfdbfe] text-sm font-medium tracking-wider">
          {title.toUpperCase()}
        </span>
      </div>
      <div className="flex items-center gap-4">
        {isGuest ? (
          <div className="flex items-center gap-1.5 text-amber-400/70 text-xs font-mono">
            <Eye size={11} />
            <span>GUEST VIEW</span>
          </div>
        ) : adminAlias ? (
          <span className="text-[#4a6fa5] text-xs font-mono hidden sm:block">{adminAlias}</span>
        ) : null}
        <span className="text-[#1a2f55] text-xs font-mono hidden sm:block">{dateStr}</span>
        <span className="text-[#3b82f6] text-xs font-mono glow-green">{timeStr}Z</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse" />
      </div>
    </div>
  );
}
