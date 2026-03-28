import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ClipboardCheck, Clock, X } from 'lucide-react';
import api from '../utils/api';

const POLL_INTERVAL = 60_000; // refresh every 60 s

export default function NotificationBell() {
  const [data, setData]       = useState(null); // { pending_applications, active_loas, total }
  const [open, setOpen]       = useState(false);
  const ref                   = useRef(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setData(res.data);
    } catch {
      // silently ignore — user may not be staff yet on mount
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetch_]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const total = data?.total ?? 0;
  const apps  = data?.pending_applications ?? 0;
  const loas  = data?.active_loas ?? [];

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => { setOpen(v => !v); if (!open) fetch_(); }}
        className="relative flex items-center justify-center w-7 h-7 text-[#4a6fa5] hover:text-[#93c5fd] transition-colors"
        aria-label="Notifications"
      >
        <Bell size={15} />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 bg-red-500 text-white text-[9px] font-bold font-mono rounded-full flex items-center justify-center leading-none">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-9 w-72 bg-[#04060f] border border-[#1e3364] rounded-sm shadow-2xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e3364]">
            <span className="text-[#dbeafe] font-mono text-xs font-bold tracking-wider">NOTIFICATIONS</span>
            <button onClick={() => setOpen(false)} className="text-[#2a4a80] hover:text-[#dbeafe] transition-colors">
              <X size={12} />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {/* Applications section */}
            <div className="px-4 py-3 border-b border-[#0d1833]">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <ClipboardCheck size={11} className="text-[#3b82f6]" />
                  <span className="text-[#4a6fa5] font-mono text-[10px] tracking-widest uppercase">Applications</span>
                </div>
                {apps > 0 && (
                  <span className="bg-red-500/20 text-red-400 font-mono text-[10px] px-1.5 py-0.5 rounded-sm">{apps} PENDING</span>
                )}
              </div>
              {apps > 0 ? (
                <Link
                  to="/applications"
                  onClick={() => setOpen(false)}
                  className="block text-[#dbeafe] text-xs hover:text-[#60a5fa] transition-colors mt-1"
                >
                  {apps} application{apps !== 1 ? 's' : ''} awaiting review →
                </Link>
              ) : (
                <p className="text-[#1e3364] text-[11px] font-mono mt-1">No pending applications</p>
              )}
            </div>

            {/* LOA section */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Clock size={11} className="text-amber-400" />
                  <span className="text-[#4a6fa5] font-mono text-[10px] tracking-widest uppercase">Leave of Absence</span>
                </div>
                {loas.length > 0 && (
                  <span className="bg-amber-500/20 text-amber-400 font-mono text-[10px] px-1.5 py-0.5 rounded-sm">{loas.length} ACTIVE</span>
                )}
              </div>
              {loas.length > 0 ? (
                <ul className="space-y-1.5 mt-1">
                  {loas.map(loa => (
                    <li key={loa.id}>
                      <Link
                        to={`/personnel/${loa.id}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between group"
                      >
                        <span className="text-[#dbeafe] text-xs group-hover:text-[#60a5fa] transition-colors truncate">
                          {loa.name}
                        </span>
                        <span className="text-[#1e3364] font-mono text-[9px] shrink-0 ml-2">{loa.rank}</span>
                      </Link>
                      {loa.loa_end_date && (
                        <span className="text-[#2a4a80] font-mono text-[9px]">
                          Returns {new Date(loa.loa_end_date).toLocaleDateString()}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[#1e3364] text-[11px] font-mono mt-1">No active LOAs</p>
              )}
            </div>
          </div>

          {total === 0 && (
            <div className="px-4 py-3 text-center border-t border-[#0d1833]">
              <p className="text-[#1e3364] font-mono text-[10px]">All clear — nothing pending</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
