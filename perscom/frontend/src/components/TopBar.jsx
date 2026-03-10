import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, Menu } from 'lucide-react';

const PAGE_TITLES = {
  '/':            'Dashboard',
  '/personnel':   'Personnel',
  '/evaluations': 'Evaluations',
  '/operations':  'Ops / Training',
  '/roster':      'Roster',
  '/eventlog':    'Event Log',
  '/settings':    'Settings',
  '/documents':   'Documents',
};

const UNIT_TZ = 'America/New_York';

function getTzAbbr(date, tz) {
  return new Intl.DateTimeFormat('en-US', { timeZoneName: 'short', timeZone: tz })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName')?.value ?? '';
}

function fmtTime(date, tz) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: tz,
  });
}

export default function TopBar({ onMenuClick }) {
  const location = useLocation();
  const { adminAlias, isGuest } = useAuth();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const path  = location.pathname;
  const title = PAGE_TITLES[path] ?? (path.startsWith('/personnel/') ? 'Marine Profile' : 'PERSCOM');

  const dateStr    = time.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: '2-digit', timeZone: UNIT_TZ,
  }).toUpperCase();

  const unitTime   = fmtTime(time, UNIT_TZ);
  const unitTzAbbr = getTzAbbr(time, UNIT_TZ);

  const userTz      = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const isSameZone  = userTz === UNIT_TZ;
  const localTime   = isSameZone ? null : fmtTime(time, userTz);
  const localTzAbbr = isSameZone ? null : getTzAbbr(time, userTz);

  return (
    <div
      className="h-12 bg-[#04060f] border-b border-[#1e3364] flex items-center justify-between px-4 shrink-0"
      style={{ boxShadow: 'inset 0 -1px 0 rgba(59,130,246,0.07)' }}
    >
      {/* Left — hamburger (mobile) + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 -ml-1 text-[#4a6fa5] hover:text-[#dbeafe] transition-colors"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[#1e3364] text-[10px] font-mono hidden sm:inline">SYS //</span>
          <span className="text-[#bfdbfe] text-sm font-semibold tracking-wider">{title.toUpperCase()}</span>
        </div>
      </div>

      {/* Right — guest badge, alias, clocks, dot */}
      <div className="flex items-center gap-3">
        {isGuest ? (
          <div className="flex items-center gap-1.5 text-amber-400/70 text-xs font-mono">
            <Eye size={11} /><span className="hidden sm:inline">GUEST</span>
          </div>
        ) : adminAlias ? (
          <span className="text-[#2a4a80] text-xs font-mono hidden lg:block">{adminAlias}</span>
        ) : null}

        {/* Date — hidden on small mobile */}
        <span className="text-[#2a4a80] text-[10px] font-mono hidden md:block">{dateStr}</span>

        <div className="w-px h-5 bg-[#1e3364] hidden sm:block" />

        {/* Unit time (Eastern) — always shown */}
        <div className="flex flex-col items-end leading-none gap-0.5">
          <span className="text-[#1e3364] text-[8px] font-mono tracking-widest hidden sm:block">UNIT</span>
          <span className="text-[#3b82f6] text-xs font-mono tabular-nums glow-green">
            {unitTime} <span className="text-[#2a4a80] text-[9px]">{unitTzAbbr}</span>
          </span>
        </div>

        {/* User local time — large screens only, shown when different TZ */}
        {!isSameZone && (
          <>
            <div className="w-px h-5 bg-[#1e3364] hidden lg:block" />
            <div className="hidden lg:flex flex-col items-end leading-none gap-0.5">
              <span className="text-[#1e3364] text-[8px] font-mono tracking-widest">YOUR TIME</span>
              <span className="text-[#4a6fa5] text-xs font-mono tabular-nums">
                {localTime} <span className="text-[#1e3364] text-[9px]">{localTzAbbr}</span>
              </span>
            </div>
          </>
        )}

        {/* Online indicator */}
        <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
      </div>
    </div>
  );
}
