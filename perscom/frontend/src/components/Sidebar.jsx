import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Map,
  ClipboardList,
  LogOut,
  Target,
  ScrollText,
  Settings,
  Eye,
  BookOpen,
} from 'lucide-react';
import MeuLogo from '../assets/MeuLogo';

const NAV_ITEMS = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard',   end: true,  guestHide: true,  marineHide: false },
  { to: '/personnel',   icon: Users,           label: 'Personnel',   end: false, guestHide: false, marineHide: false },
  { to: '/roster',      icon: Target,          label: 'Roster',      end: false, guestHide: false, marineHide: false },
  { to: '/documents',   icon: BookOpen,        label: 'Documents',   end: false, guestHide: false, marineHide: false },
  { to: '/operations',  icon: Map,             label: 'Ops / Training', end: false, guestHide: true,  marineHide: false },
  { to: '/evaluations', icon: ClipboardList,   label: 'Evaluations', end: false, guestHide: true,  marineHide: true  },
  { to: '/eventlog',    icon: ScrollText,      label: 'Event Log',   end: false, guestHide: true,  marineHide: true  },
  { to: '/settings',    icon: Settings,        label: 'Settings',    end: false, guestHide: true,  marineHide: true, adminOnly: true },
];

export default function Sidebar() {
  const { user, logout, isAdmin, isGuest, isMarine, adminAlias, logoUrl } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (isGuest && item.guestHide) return false;
    if (isMarine && item.marineHide) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  const discordAvatarUrl = user?.discord_id && user?.discord_avatar
    ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.discord_avatar}.png?size=32`
    : null;

  return (
    <div className="w-52 shrink-0 bg-[#040810] border-r border-[#162448] flex flex-col">

      {/* Unit header / logo */}
      <div className="px-4 py-4 border-b border-[#162448]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#3b82f6]/10 border border-[#3b82f6]/25 rounded-sm flex items-center justify-center shrink-0 overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
            ) : (
              <MeuLogo size={20} />
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

      {/* Marine indicator ribbon */}
      {isMarine && (
        <div className="px-3 py-2 bg-blue-950/30 border-b border-blue-900/30">
          <div className="flex items-center gap-1.5">
            <svg width="10" height="8" viewBox="0 0 71 55" fill="#5865F2" className="shrink-0">
              <path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37 37 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 4.9a.2.2 0 00-.1.1C1.5 18.7-.9 32.2.3 45.5v.1a58.8 58.8 0 0017.7 9 .2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.8 38.8 0 01-5.5-2.6.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 42 42 0 0035.5 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .4 36.4 36.4 0 01-5.5 2.6.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.2.1A58.6 58.6 0 0070.3 45.6v-.1C71.8 30.1 67.9 16.7 60.2 5a.2.2 0 00-.1-.1zM23.7 37.3c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2zm23.7 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2z"/>
            </svg>
            <span className="text-[#60a5fa] font-mono text-[9px] tracking-wider">MARINE — READ ONLY</span>
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
              <div className="flex items-center gap-2">
                {discordAvatarUrl && (
                  <img src={discordAvatarUrl} alt="" className="w-6 h-6 rounded-full border border-[#162448] shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-[#dbeafe] text-sm font-medium truncate">
                    {adminAlias || user?.display_name}
                  </div>
                  {adminAlias && (
                    <div className="text-[#4a6fa5] text-[10px] font-mono truncate mt-0.5">
                      {user?.display_name}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-[#1a2f55] text-[10px] font-mono uppercase tracking-widest mt-1">
                {user?.role === 'admin' ? 'Command Staff'
                  : user?.role === 'moderator' ? 'Drill Instructor'
                  : user?.role === 'marine' ? 'Marine'
                  : 'Unknown'}
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
