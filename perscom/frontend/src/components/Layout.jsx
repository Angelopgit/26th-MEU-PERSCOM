import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle } from 'lucide-react';

const DISCLAIMER =
  'Work In Progress — the purpose of PERSCOM is for 26th Command Staff to manage the unit in a fair and easy way. Guest access is read-only.';

export default function Layout() {
  const { isGuest } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  return (
    <div className="flex h-screen bg-[#06091a] overflow-hidden relative">

      {/* ── Animated HUD background ─────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Tactical grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(59,130,246,0.028) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(59,130,246,0.028) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Corner vignette — top right */}
        <div className="absolute" style={{
          top: '-20%', right: '-10%', width: 640, height: 640,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 65%)',
          animation: 'hudPulse 8s ease-in-out infinite',
        }} />
        {/* Corner vignette — bottom left */}
        <div className="absolute" style={{
          bottom: '-15%', left: '-5%', width: 520, height: 520,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(29,78,216,0.045) 0%, transparent 65%)',
          animation: 'hudPulse 12s ease-in-out infinite reverse',
        }} />
        {/* Slow scan line */}
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 1,
          background: 'linear-gradient(to right, transparent, rgba(59,130,246,0.14), transparent)',
          animation: 'hudScan 20s linear infinite',
        }} />
        {/* Corner bracket decorations on layout */}
        <div style={{ position:'absolute', top: 0, left: 0, width: 20, height: 20,
          borderTop: '1px solid rgba(59,130,246,0.2)', borderLeft: '1px solid rgba(59,130,246,0.2)' }} />
        <div style={{ position:'absolute', top: 0, right: 0, width: 20, height: 20,
          borderTop: '1px solid rgba(59,130,246,0.2)', borderRight: '1px solid rgba(59,130,246,0.2)' }} />
        <div style={{ position:'absolute', bottom: 0, left: 0, width: 20, height: 20,
          borderBottom: '1px solid rgba(59,130,246,0.2)', borderLeft: '1px solid rgba(59,130,246,0.2)' }} />
        <div style={{ position:'absolute', bottom: 0, right: 0, width: 20, height: 20,
          borderBottom: '1px solid rgba(59,130,246,0.2)', borderRight: '1px solid rgba(59,130,246,0.2)' }} />

        <style>{`
          @keyframes hudPulse { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
          @keyframes hudScan  { 0%{top:-2px} 100%{top:100%} }
        `}</style>
      </div>

      {/* ── Mobile backdrop ──────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="relative flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen((o) => !o)} />

        {isGuest && (
          <div className="shrink-0 flex items-start gap-2.5 px-4 md:px-6 py-2 bg-amber-950/20 border-b border-amber-900/25">
            <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-amber-400/80 text-xs font-mono leading-relaxed">{DISCLAIMER}</p>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
