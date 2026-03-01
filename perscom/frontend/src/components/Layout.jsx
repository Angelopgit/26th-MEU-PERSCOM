import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle } from 'lucide-react';

const DISCLAIMER =
  'Work In Progress — the purpose of PERSCOM is for 26th Command Staff to manage the unit in a fair and easy way. Guest access is read-only.';

export default function Layout() {
  const { isGuest } = useAuth();

  return (
    <div className="flex h-screen bg-[#06091a] overflow-hidden relative">
      {/* Animated Military Blue HUD background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Subtle tactical grid */}
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage:
              'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        {/* Radial vignette glow — top right */}
        <div
          className="absolute"
          style={{
            top: '-20%', right: '-10%',
            width: '600px', height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.055) 0%, transparent 65%)',
            animation: 'hudPulse 8s ease-in-out infinite',
          }}
        />
        {/* Radial vignette glow — bottom left */}
        <div
          className="absolute"
          style={{
            bottom: '-15%', left: '-5%',
            width: '500px', height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(29,78,216,0.04) 0%, transparent 65%)',
            animation: 'hudPulse 12s ease-in-out infinite reverse',
          }}
        />
        {/* Slow horizontal scan line */}
        <div
          style={{
            position: 'absolute',
            left: 0, right: 0,
            height: '1px',
            background: 'linear-gradient(to right, transparent, rgba(59,130,246,0.12), transparent)',
            animation: 'hudScan 18s linear infinite',
          }}
        />
        <style>{`
          @keyframes hudPulse {
            0%, 100% { opacity: 0.5; transform: scale(1); }
            50%       { opacity: 1;   transform: scale(1.08); }
          }
          @keyframes hudScan {
            0%   { top: -2px; }
            100% { top: 100%; }
          }
        `}</style>
      </div>

      <Sidebar />
      <div className="relative flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />

        {/* Guest disclaimer banner */}
        {isGuest && (
          <div className="shrink-0 flex items-start gap-2.5 px-6 py-2.5 bg-amber-950/25 border-b border-amber-900/30">
            <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-amber-400/80 text-xs font-mono leading-relaxed">
              {DISCLAIMER}
            </p>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
