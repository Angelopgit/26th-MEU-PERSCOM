import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Map,
  ClipboardList,
  LogOut,
  Shield,
  Target,
  ScrollText,
  Settings,
  Eye,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard',   end: true,  guestHide: true },
  { to: '/personnel',   icon: Users,           label: 'Personnel',   end: false, guestHide: false },
  { to: '/roster',      icon: Target,          label: 'Roster',      end: false, guestHide: false },
  { to: '/evaluations', icon: ClipboardList,   label: 'Evaluations', end: false, guestHide: true },
  { to: '/eventlog',    icon: ScrollText,      label: 'Event Log',   end: false, guestHide: true },
  { to: '/operations',  icon: Map,             label: 'Operations',  end: false, guestHide: true, adminOnly: true },
  { to: '/settings',    icon: Settings,        label: 'Settings',    end: false, guestHide: true, adminOnly: true },
];

export default function Sidebar() {
  const { user, logout, isAdmin, isGuest, adminAlias, logoUrl } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (isGuest && item.guestHide) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  return (
    <div className="w-52 shrink-0 bg-[#040810] border-r border-[#162448] flex flex-col">

      {/* Unit header / logo */}
      <div className="px-4 py-4 border-b border-[#162448]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#3b82f6]/10 border border-[#3b82f6]/25 rounded-sm flex items-center justify-center shrink-0 overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
            ) : (
              <Shield size={14} className="text-[#3b82f6]" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[#60a5fa] font-mono text-xs font-bold tracking-wider glow-green">
              PERSCOM
            </div>
            <div className="text-[#1a2f55] font-mono text-[9px] tracking-[0.2em] truncate">
              26TH MEU (SOC)
            </div>
          </div>
        </div>
      </div>

      {/* Guest indicator ribbon */}
      {isGuest && (
        <div className="px-3 py-2 bg-amber-950/30 border-b border-amber-900/30">
          <div className="flex items-center gap-1.5">
            <Eye size={10} className="text-amber-400 shrink-0" />
            <span className="text-amber-400 font-mono text-[9px] tracking-wider">GUEST — READ ONLY</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            data-sound="tab"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-all ${
                isActive
                  ? 'bg-[#3b82f6]/10 text-[#60a5fa] border-l-2 border-[#3b82f6]'
                  : 'text-[#4a6fa5] hover:text-[#93c5fd] hover:bg-[#162448]/30 border-l-2 border-transparent'
              }`
            }
          >
            <item.icon size={15} />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-[#162448]">
        {isGuest ? (
          <>
            <div className="mb-3">
              <div className="flex items-center gap-1.5">
                <Eye size={11} className="text-amber-400" />
                <span className="text-amber-400 text-sm font-medium">Guest</span>
              </div>
              <div className="text-[#1a2f55] text-[10px] font-mono uppercase tracking-widest mt-0.5">
                Read-Only Access
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-[#2a4a80] hover:text-amber-400 text-xs transition-colors"
            >
              <LogOut size={11} />
              <span>Exit Guest Mode</span>
            </button>
          </>
        ) : (
          <>
            <div className="mb-3">
              <div className="text-[#dbeafe] text-sm font-medium truncate">
                {adminAlias || user?.display_name}
              </div>
              {adminAlias && (
                <div className="text-[#4a6fa5] text-[10px] font-mono truncate mt-0.5">
                  {user?.display_name}
                </div>
              )}
              <div className="text-[#1a2f55] text-[10px] font-mono uppercase tracking-widest mt-0.5">
                {user?.role === 'admin' ? 'Command Staff' : 'Drill Instructor'}
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-[#2a4a80] hover:text-red-400 text-xs transition-colors"
            >
              <LogOut size={11} />
              <span>Logout</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
