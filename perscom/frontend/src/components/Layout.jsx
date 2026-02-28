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
    <div className="flex h-screen bg-[#06091a] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
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
