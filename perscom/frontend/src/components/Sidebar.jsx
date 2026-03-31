import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Map, ClipboardList, LogOut,
  Target, ScrollText, Settings, Eye, BookOpen, X, ClipboardCheck, Shield,
} from 'lucide-react';
import MeuLogo from '../assets/MeuLogo';

const NAV_ITEMS = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard',      end: true,  guestHide: true,  marineHide: false },
  { to: '/personnel',   icon: Users,           label: 'Personnel',      end: false, guestHide: false, marineHide: false },
  { to: '/roster',      icon: Target,          label: 'Roster',         end: false, guestHide: false, marineHide: false },
  { to: '/documents',   icon: BookOpen,        label: 'Documents',      end: false, guestHide: false, marineHide: false },
  { to: '/operations',  icon: Map,             label: 'Ops / Training', end: false, guestHide: true,  marineHide: false },
  { to: '/evaluations',  icon: ClipboardList,  label: 'Evaluations',    end: false, guestHide: true,  marineHide: true  },
  { to: '/eventlog',     icon: ScrollText,     label: 'Event Log',      end: false, guestHide: true,  marineHide: true  },
  { to: '/applications', icon: ClipboardCheck, label: 'Applications',   end: false, guestHide: true,  marineHide: true  },
  { to: '/soi',          icon: Shield,          label: 'SOI',            end: false, guestHide: true,  marineHide: false, soiOnly: true },
  { to: '/settings',     icon: Settings,        label: 'Settings',       end: false, guestHide: true,  marineHide: true, adminOnly: true },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout, isAdmin, isGuest, isMarine, canSeeSoi, adminAlias, logoUrl } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (isGuest && item.guestHide) return false;
    if (isMarine && item.marineHide) return false;
    if (item.soiOnly && !canSeeSoi) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  const discordAvatarUrl = user?.discord_id && user?.discord_avatar
    ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.discord_avatar}.png?size=32`
    : null;

  return (
    <aside
      className={[
        'flex flex-col shrink-0 z-50',
        'bg-[#04060f] border-r border-[#1e3364]',
        // Desktop: static in flow
        'md:relative md:translate-x-0 md:w-52',
        // Mobile: fixed overlay drawer
        'fixed inset-y-0 left-0 w-72',
        'transition-transform duration-200 ease-out',
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      ].join(' ')}
    >
      {/* ── Unit header ───────────────────────────────────────────────── */}
      <div className="px-4 py-4 border-b border-[#1e3364] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#3b82f6]/10 border border-[#3b82f6]/30 flex items-center justify-center shrink-0 overflow-hidden">
            {logoUrl
              ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
              : <MeuLogo size={22} />
            }
          </div>
          <div className="min-w-0">
            <div className="text-[#60a5fa] font-mono text-sm font-bold tracking-wider glow-green">PERSCOM</div>
            <div className="text-[#1e3364] font-mono text-[9px] tracking-[0.2em] truncate">26TH MEU (SOC)</div>
          </div>
        </div>
        {/* Close — mobile only */}
        <button
          onClick={onClose}
          className="md:hidden p-1.5 text-[#2a4a80] hover:text-[#dbeafe] transition-colors rounded"
          aria-label="Close menu"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Role ribbon ───────────────────────────────────────────────── */}
      {isGuest && (
        <div className="px-4 py-1.5 bg-amber-950/25 border-b border-amber-900/25 flex items-center gap-2 shrink-0">
          <Eye size={10} className="text-amber-400 shrink-0" />
          <span className="text-amber-400 font-mono text-[9px] tracking-wider">GUEST — READ ONLY</span>
        </div>
      )}
      {isMarine && (
        <div className="px-4 py-1.5 bg-blue-950/25 border-b border-blue-900/25 flex items-center gap-2 shrink-0">
          <svg width="10" height="8" viewBox="0 0 71 55" fill="#5865F2" className="shrink-0">
            <path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37 37 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 4.9a.2.2 0 00-.1.1C1.5 18.7-.9 32.2.3 45.5v.1a58.8 58.8 0 0017.7 9 .2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.8 38.8 0 01-5.5-2.6.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 42 42 0 0035.5 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .4 36.4 36.4 0 01-5.5 2.6.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.2.1A58.6 58.6 0 0070.3 45.6v-.1C71.8 30.1 67.9 16.7 60.2 5a.2.2 0 00-.1-.1zM23.7 37.3c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2zm23.7 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2z"/>
          </svg>
          <span className="text-[#60a5fa] font-mono text-[9px] tracking-wider">MARINE — READ ONLY</span>
        </div>
      )}

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            data-sound="tab"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm transition-all relative overflow-hidden ${
                isActive
                  ? 'text-[#93c5fd] border-l-2 border-[#3b82f6]'
                  : 'text-[#4a6fa5] hover:text-[#93c5fd] border-l-2 border-transparent hover:border-[#1e3364]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(90deg, rgba(59,130,246,0.14) 0%, transparent 80%)' }}
                  />
                )}
                <item.icon size={15} className={`shrink-0 relative ${isActive ? 'text-[#60a5fa]' : ''}`} />
                <span className="font-medium relative">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── HUD divider ───────────────────────────────────────────────── */}
      <div className="hud-rule mx-4 shrink-0" />

      {/* ── User footer ───────────────────────────────────────────────── */}
      <div className="px-4 py-3.5 shrink-0">
        {isGuest ? (
          <>
            <div className="mb-2.5 flex items-center gap-1.5">
              <Eye size={11} className="text-amber-400" />
              <span className="text-amber-400 text-sm font-medium">Guest</span>
            </div>
            <button onClick={logout} className="flex items-center gap-1.5 text-[#2a4a80] hover:text-amber-400 text-xs transition-colors">
              <LogOut size={11} /><span>Exit Guest Mode</span>
            </button>
          </>
        ) : (
          <>
            <div className="mb-2.5 flex items-center gap-2">
              {discordAvatarUrl
                ? <img src={discordAvatarUrl} alt="" className="w-7 h-7 rounded-full border border-[#1e3364] shrink-0" />
                : <div className="w-7 h-7 rounded-full bg-[#1e3364]/50 border border-[#1e3364] flex items-center justify-center shrink-0">
                    <span className="text-[#4a6fa5] text-[9px] font-mono">
                      {(adminAlias || user?.display_name || '?')[0].toUpperCase()}
                    </span>
                  </div>
              }
              <div className="min-w-0">
                <div className="text-[#dbeafe] text-sm font-medium truncate">{adminAlias || user?.display_name}</div>
                <div className="text-[#1e3364] text-[9px] font-mono uppercase tracking-widest mt-0.5">
                  {user?.role === 'admin' ? 'Command Staff'
                    : user?.role === 'moderator' ? 'Drill Instructor'
                    : user?.role === 'marine' ? 'Marine' : 'Unknown'}
                </div>
              </div>
            </div>
            <button onClick={logout} className="flex items-center gap-1.5 text-[#2a4a80] hover:text-red-400 text-xs transition-colors">
              <LogOut size={11} /><span>Logout</span>
            </button>
          </>
        )}
      </div>

      {/* ── Status bar ────────────────────────────────────────────────── */}
      <div className="px-4 py-2 border-t border-[#1e3364] flex items-center justify-between shrink-0">
        <span className="text-[#1e3364] text-[8px] font-mono tracking-widest">SYS ONLINE</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
      </div>
    </aside>
  );
}
