import { useState, useEffect, useCallback, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Shield, Users, Clock, Calendar, CheckCircle, XCircle, Plus,
  ChevronDown, ChevronUp, Repeat, Loader2, X, Star, AlertTriangle,
  BookOpen, Target, Crosshair, Radio,
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

// ── Inline animation styles ───────────────────────────────────────────────────
const SOI_STYLES = `
  @keyframes soi-scan {
    0%   { transform: translateY(-100%); }
    100% { transform: translateY(200%); }
  }
  @keyframes soi-fade-in {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes soi-blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }
  @keyframes soi-pulse-green {
    0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
    50%       { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
  }
  @keyframes soi-glitch {
    0%,100% { text-shadow: 2px 0 #4ade80, -2px 0 #16a34a; }
    25%      { text-shadow: -2px 0 #4ade80, 2px 0 #16a34a; }
    50%      { text-shadow: 2px 2px #4ade80, -2px -2px #16a34a; }
    75%      { text-shadow: -2px 2px #4ade80, 2px -2px #16a34a; }
  }
  @keyframes soi-march {
    0%   { background-position: 0 0; }
    100% { background-position: 40px 40px; }
  }
  .soi-card-enter { animation: soi-fade-in 0.4s ease both; }
  .soi-blink      { animation: soi-blink 1s step-end infinite; }
  .soi-pulse-btn  { animation: soi-pulse-green 2s ease infinite; }
  .soi-glitch     { animation: soi-glitch 4s ease-in-out infinite; }
`;

const DAY_LABELS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL    = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function nextOccurrences(recurDays, count = 4) {
  if (!recurDays?.length) return [];
  const out = [];
  const now = new Date();
  for (let i = 0; i <= 28 && out.length < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    if (recurDays.includes(d.getDay()) || recurDays.includes(String(d.getDay()))) {
      out.push(d.toISOString().split('T')[0]);
    }
  }
  return out;
}

function fmtDate(str) {
  if (!str) return '—';
  try { return format(parseISO(str), 'EEE, MMM d, yyyy'); } catch { return str; }
}

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h, 10);
  const ampm = hr >= 12 ? 'PM' : 'AM';
  const h12  = ((hr % 12) || 12);
  return `${h12}:${m} ${ampm} EST`;
}

// ── Hero banner ───────────────────────────────────────────────────────────────
function HeroBanner() {
  const [typed, setTyped] = useState('');
  const full = 'SCHOOL OF INFANTRY';

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      setTyped(full.slice(0, i + 1));
      i++;
      if (i >= full.length) clearInterval(id);
    }, 65);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-sm border border-[#1a4a1a]"
      style={{ background: 'linear-gradient(135deg, #020b02 0%, #071407 50%, #020b02 100%)' }}
    >
      {/* Diagonal stripe texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #22c55e 0px, #22c55e 1px, transparent 1px, transparent 20px)',
          animation: 'soi-march 3s linear infinite',
        }}
      />
      {/* Scanline sweep */}
      <div
        className="absolute inset-x-0 h-16 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent, rgba(34,197,94,0.06), transparent)',
          animation: 'soi-scan 4s linear infinite',
        }}
      />
      <div className="relative px-6 py-8 md:py-10">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex flex-col items-center gap-1 mt-1">
            <Shield size={32} className="text-[#22c55e]" style={{ filter: 'drop-shadow(0 0 10px rgba(34,197,94,0.7))' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[#166534] text-[9px] font-mono tracking-[0.4em] mb-1 uppercase">
              26th Marine Expeditionary Unit (SOC) — Personnel Command
            </div>
            <h1
              className="text-[#4ade80] font-mono font-black text-2xl sm:text-4xl tracking-[0.15em] leading-none soi-glitch"
              style={{ textShadow: '0 0 20px rgba(74,222,128,0.4)' }}
            >
              {typed}<span className="soi-blink">_</span>
            </h1>
            <div className="text-[#22c55e]/60 font-mono text-xs tracking-[0.3em] mt-2 uppercase">
              // MOS 0300 · Infantry Training Program · Active Enrollment
            </div>
            <div className="flex flex-wrap gap-4 mt-4">
              {[
                { icon: Target,   label: 'Combat Training' },
                { icon: Radio,    label: 'Communications' },
                { icon: Crosshair, label: 'Marksmanship' },
                { icon: BookOpen, label: 'Doctrine' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-[#166534] text-[10px] font-mono">
                  <Icon size={10} className="text-[#22c55e]/50" />{label}
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:block text-right">
            <div className="text-[#166534] font-mono text-[9px] tracking-widest">CLASSIFICATION</div>
            <div className="text-[#22c55e]/40 font-mono text-[10px] font-bold tracking-wider mt-0.5">UNCLASSIFIED</div>
            <div className="mt-3 text-[#166534] font-mono text-[9px] tracking-widest">UNIT</div>
            <div className="text-[#22c55e]/40 font-mono text-[10px] font-bold mt-0.5">26TH MEU</div>
          </div>
        </div>
      </div>
      {/* Bottom HUD bar */}
      <div className="border-t border-[#1a4a1a] px-6 py-2 flex items-center justify-between bg-[#020b02]/60">
        <span className="text-[#166534] font-mono text-[9px] tracking-widest">SOI // INTEGRATED TRAINING COMMAND</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
      </div>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    open:      'text-[#4ade80] bg-[#052e16] border-[#166534]',
    full:      'text-amber-400 bg-amber-950/30 border-amber-900/40',
    completed: 'text-[#86efac] bg-[#052e16]/50 border-[#166534]/50',
    cancelled: 'text-red-400 bg-red-950/20 border-red-900/30',
    enrolled:  'text-[#4ade80] bg-[#052e16] border-[#166534]',
    no_show:   'text-red-400 bg-red-950/20 border-red-900/30',
  };
  return (
    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm border uppercase tracking-wider ${map[status] || 'text-[#4ade80] bg-[#052e16] border-[#166534]'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}

// ── Class card (recruit view) ─────────────────────────────────────────────────
function ClassCard({ cls, myEnrollment, onEnroll, onWithdraw, enrolling, style }) {
  const [expanded, setExpanded] = useState(false);
  const occurrences = cls.is_recurring ? nextOccurrences(cls.recur_days) : null;
  const isFull = cls.status === 'full' || cls.enrolled_count >= cls.max_capacity;
  const pct    = Math.round((cls.enrolled_count / cls.max_capacity) * 100);

  const avatarUrl = cls.instructor_discord_id && cls.instructor_avatar
    ? `https://cdn.discordapp.com/avatars/${cls.instructor_discord_id}/${cls.instructor_avatar}.png?size=32`
    : null;

  return (
    <div
      className="soi-card-enter border border-[#1a4a1a] rounded-sm overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #061406 0%, #0a1e0a 100%)', ...style }}
    >
      {/* Card header */}
      <div className="px-4 py-3 border-b border-[#1a4a1a] flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {cls.is_recurring
              ? <span className="text-[9px] font-mono text-[#22c55e]/60 border border-[#166534]/40 px-1.5 py-0.5 rounded-sm flex items-center gap-1"><Repeat size={8} />RECURRING</span>
              : <span className="text-[9px] font-mono text-[#4ade80]/60 border border-[#166534]/40 px-1.5 py-0.5 rounded-sm flex items-center gap-1"><Calendar size={8} />ONE-TIME</span>
            }
            <StatusBadge status={cls.status} />
            {myEnrollment && <StatusBadge status={myEnrollment.status === 'enrolled' ? 'enrolled' : myEnrollment.status} />}
          </div>
          <div className="text-[#86efac] font-mono font-bold text-sm mt-1.5 leading-tight">{cls.title}</div>
        </div>
        <button onClick={() => setExpanded(x => !x)} className="text-[#166534] hover:text-[#4ade80] transition-colors mt-1 shrink-0">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Card body */}
      <div className="px-4 py-3 space-y-2.5">
        {/* DI info */}
        <div className="flex items-center gap-2">
          {avatarUrl
            ? <img src={avatarUrl} className="w-6 h-6 rounded-full border border-[#1a4a1a]" alt="" />
            : <div className="w-6 h-6 rounded-full bg-[#052e16] border border-[#1a4a1a] flex items-center justify-center text-[#22c55e] text-[9px] font-mono">DI</div>
          }
          <span className="text-[#4ade80]/70 text-xs font-mono">{cls.instructor_name || 'Unassigned'}</span>
        </div>

        {/* Schedule */}
        {cls.is_recurring ? (
          <div>
            <div className="text-[#166534] text-[9px] font-mono tracking-wider mb-1">SCHEDULE</div>
            <div className="flex flex-wrap gap-1">
              {DAY_FULL.map((d, i) => (
                <span key={i} className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm border ${
                  cls.recur_days?.includes(i) || cls.recur_days?.includes(String(i))
                    ? 'text-[#4ade80] border-[#166534] bg-[#052e16]'
                    : 'text-[#1a4a1a] border-[#1a4a1a]'
                }`}>{DAY_LABELS[i]}</span>
              ))}
            </div>
            {occurrences?.length > 0 && (
              <div className="text-[#166534] text-[9px] font-mono mt-1.5">
                Next: {fmtDate(occurrences[0])}
              </div>
            )}
          </div>
        ) : (
          <div className="text-[#4ade80]/70 text-xs font-mono">{fmtDate(cls.scheduled_date)}</div>
        )}

        <div className="flex items-center gap-3 text-[9px] font-mono text-[#166534]">
          <span className="flex items-center gap-1"><Clock size={9} />{fmtTime(cls.scheduled_time)}</span>
          <span>{cls.duration_minutes} min</span>
        </div>

        {/* Capacity bar */}
        <div>
          <div className="flex items-center justify-between text-[9px] font-mono text-[#166534] mb-1">
            <span>CAPACITY</span>
            <span className={isFull ? 'text-amber-400' : 'text-[#4ade80]/60'}>{cls.enrolled_count}/{cls.max_capacity}</span>
          </div>
          <div className="h-1 bg-[#052e16] rounded-full overflow-hidden border border-[#1a4a1a]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: pct >= 100 ? '#f59e0b' : pct >= 70 ? '#22c55e' : '#16a34a',
              }}
            />
          </div>
        </div>

        {/* Expanded description */}
        {expanded && cls.description && (
          <div className="border-t border-[#1a4a1a] pt-2.5 text-[#4ade80]/60 text-xs font-mono leading-relaxed">
            {cls.description}
          </div>
        )}

        {/* Recurring upcoming dates */}
        {expanded && cls.is_recurring && occurrences?.length > 1 && (
          <div className="border-t border-[#1a4a1a] pt-2.5">
            <div className="text-[#166534] text-[9px] font-mono tracking-wider mb-1.5">UPCOMING SESSIONS</div>
            <div className="space-y-0.5">
              {occurrences.map(d => (
                <div key={d} className="text-[#4ade80]/50 text-[9px] font-mono">{fmtDate(d)} @ {fmtTime(cls.scheduled_time)}</div>
              ))}
            </div>
          </div>
        )}

        {/* Enroll/Withdraw button */}
        {myEnrollment?.status === 'completed' ? (
          <div className="flex items-center gap-2 text-[#4ade80] text-xs font-mono pt-1">
            <CheckCircle size={13} className="text-[#22c55e]" />
            <span>SOI COMPLETE — MISSION ACCOMPLISHED</span>
          </div>
        ) : myEnrollment ? (
          <button
            onClick={() => onWithdraw(cls.id)}
            disabled={enrolling}
            className="w-full mt-1 border border-red-900/40 text-red-400 hover:bg-red-950/20 text-xs font-mono py-1.5 rounded-sm transition-colors flex items-center justify-center gap-2"
          >
            {enrolling ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
            WITHDRAW ENROLLMENT
          </button>
        ) : (
          <button
            onClick={() => onEnroll(cls.id)}
            disabled={enrolling || isFull || cls.status === 'cancelled'}
            className="w-full mt-1 border text-xs font-mono py-1.5 rounded-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={!enrolling && !isFull && cls.status !== 'cancelled' ? {
              borderColor: '#166534',
              color: '#4ade80',
              background: 'transparent',
              boxShadow: '0 0 0 0 rgba(34,197,94,0.4)',
              animation: 'soi-pulse-green 2.5s ease infinite',
            } : { borderColor: '#1a4a1a', color: '#166534' }}
          >
            {enrolling ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
            {isFull ? 'CLASS FULL' : 'ENROLL IN CLASS'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── My Enrollment status card ─────────────────────────────────────────────────
function MyStatusCard({ status }) {
  if (!status) return null;
  const completed = status.soi_complete;
  const active    = status.enrollments?.filter(e => e.status === 'enrolled') || [];

  return (
    <div
      className="soi-card-enter border rounded-sm overflow-hidden"
      style={{
        borderColor: completed ? '#166534' : '#1a4a1a',
        background: completed
          ? 'linear-gradient(135deg, #052e16 0%, #071407 100%)'
          : 'linear-gradient(135deg, #061406 0%, #0a1e0a 100%)',
      }}
    >
      <div className="px-4 py-2.5 border-b border-[#1a4a1a] flex items-center gap-2">
        <Shield size={11} className={completed ? 'text-[#22c55e]' : 'text-[#166534]'} />
        <span className="text-[9px] font-mono tracking-widest text-[#166534] uppercase">
          SOI Status — Your Record
        </span>
      </div>
      <div className="px-4 py-4">
        {completed ? (
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full bg-[#052e16] border-2 border-[#22c55e] flex items-center justify-center"
              style={{ boxShadow: '0 0 12px rgba(34,197,94,0.4)' }}
            >
              <CheckCircle size={18} className="text-[#22c55e]" />
            </div>
            <div>
              <div className="text-[#4ade80] font-mono font-bold text-sm">SOI COMPLETE</div>
              <div className="text-[#166534] font-mono text-[10px] mt-0.5">BASIC TRAINING REQUIREMENT FULFILLED</div>
            </div>
          </div>
        ) : active.length > 0 ? (
          <div className="space-y-2">
            <div className="text-[#166534] font-mono text-[9px] tracking-wider mb-2">ACTIVE ENROLLMENTS</div>
            {active.map(e => (
              <div key={e.id} className="flex items-center justify-between bg-[#052e16]/50 border border-[#1a4a1a] px-3 py-2 rounded-sm">
                <div>
                  <div className="text-[#86efac] text-xs font-mono font-medium">{e.title}</div>
                  <div className="text-[#166534] text-[9px] font-mono mt-0.5">
                    {e.is_recurring
                      ? `Recurring · ${fmtTime(e.scheduled_time)}`
                      : `${fmtDate(e.scheduled_date)} · ${fmtTime(e.scheduled_time)}`
                    }
                  </div>
                </div>
                <StatusBadge status="enrolled" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-400/60 shrink-0" />
            <div>
              <div className="text-amber-400/80 font-mono text-sm font-medium">SOI PENDING</div>
              <div className="text-[#166534] font-mono text-[10px] mt-0.5">
                Select a class below to begin your training
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── DI Class Form ─────────────────────────────────────────────────────────────
const BLANK_CLASS = {
  title: '', description: '', scheduled_date: '', scheduled_time: '20:00',
  duration_minutes: 90, max_capacity: 10, is_recurring: false, recur_days: [],
};

function ClassForm({ initial = BLANK_CLASS, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ ...BLANK_CLASS, ...initial });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleDay = (idx) => {
    const days = form.recur_days || [];
    set('recur_days', days.includes(idx) ? days.filter(d => d !== idx) : [...days, idx]);
  };

  return (
    <form
      onSubmit={e => { e.preventDefault(); onSave(form); }}
      className="space-y-4"
      style={{ fontFamily: 'monospace' }}
    >
      <div>
        <label className="label text-[#4ade80]">Class Title *</label>
        <input className="input-field" placeholder="e.g. Weapons Fundamentals Block I"
          value={form.title} onChange={e => set('title', e.target.value)} required autoFocus />
      </div>
      <div>
        <label className="label text-[#4ade80]">Description</label>
        <textarea className="input-field resize-none" rows={2}
          placeholder="Brief description of class objectives..."
          value={form.description} onChange={e => set('description', e.target.value)} />
      </div>

      <div className="flex items-center gap-3">
        <input type="checkbox" id="recurring" className="accent-green-500"
          checked={form.is_recurring} onChange={e => set('is_recurring', e.target.checked)} />
        <label htmlFor="recurring" className="text-[#4ade80]/80 text-sm font-mono cursor-pointer">
          Recurring class (repeats weekly)
        </label>
      </div>

      {form.is_recurring ? (
        <div>
          <label className="label text-[#4ade80]">Days of Week *</label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {DAY_LABELS.map((d, i) => (
              <button key={i} type="button"
                onClick={() => toggleDay(i)}
                className={`px-2.5 py-1 text-xs font-mono rounded-sm border transition-colors ${
                  form.recur_days?.includes(i)
                    ? 'text-[#052e16] bg-[#22c55e] border-[#22c55e]'
                    : 'text-[#166534] border-[#1a4a1a] hover:border-[#166534]'
                }`}>{d}</button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <label className="label text-[#4ade80]">Date *</label>
          <input type="date" className="input-field"
            value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} required />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label text-[#4ade80]">Time (EST) *</label>
          <input type="time" className="input-field"
            value={form.scheduled_time} onChange={e => set('scheduled_time', e.target.value)} required />
        </div>
        <div>
          <label className="label text-[#4ade80]">Duration (min)</label>
          <input type="number" className="input-field" min={15} max={480} step={15}
            value={form.duration_minutes} onChange={e => set('duration_minutes', +e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label text-[#4ade80]">Max Capacity</label>
        <input type="number" className="input-field" min={1} max={50}
          value={form.max_capacity} onChange={e => set('max_capacity', +e.target.value)} />
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t border-[#1a4a1a]">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] text-[#052e16] font-mono text-xs font-bold rounded-sm transition-colors disabled:opacity-50">
          {saving && <Loader2 size={12} className="animate-spin" />}
          {initial?.id ? 'SAVE CHANGES' : 'CREATE CLASS'}
        </button>
      </div>
    </form>
  );
}

// ── DI Roster Panel ───────────────────────────────────────────────────────────
function RosterPanel({ cls, onClose, onGraduate, onNoShow }) {
  const [roster, setRoster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  useEffect(() => {
    api.get(`/soi/classes/${cls.id}/roster`)
      .then(r => setRoster(r.data.roster))
      .catch(() => setRoster([]))
      .finally(() => setLoading(false));
  }, [cls.id]);

  const handle = async (action, userId) => {
    setActing(userId + action);
    try {
      await api.post(`/soi/classes/${cls.id}/${action}/${userId}`);
      setRoster(prev => prev.map(r =>
        r.user_id === parseInt(userId) ? { ...r, status: action === 'graduate' ? 'completed' : 'no_show' } : r
      ));
    } catch (err) {
      alert(err.response?.data?.error || `Failed to mark ${action}`);
    } finally {
      setActing(null);
    }
  };

  return (
    <Modal title={`Roster — ${cls.title}`} onClose={onClose} maxWidth="max-w-lg">
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-[#22c55e]" />
          </div>
        ) : !roster?.length ? (
          <div className="text-center py-8 text-[#166534] font-mono text-xs">NO RECRUITS ENROLLED</div>
        ) : (
          roster.map(r => (
            <div key={r.id} className="flex items-center justify-between bg-[#061406] border border-[#1a4a1a] px-3 py-2.5 rounded-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                {r.discord_id && r.discord_avatar
                  ? <img src={`https://cdn.discordapp.com/avatars/${r.discord_id}/${r.discord_avatar}.png?size=32`} className="w-7 h-7 rounded-full border border-[#1a4a1a] shrink-0" alt="" />
                  : <div className="w-7 h-7 rounded-full bg-[#052e16] border border-[#1a4a1a] flex items-center justify-center text-[#22c55e] text-[9px] font-mono shrink-0">
                      {r.display_name?.[0]?.toUpperCase() || '?'}
                    </div>
                }
                <div className="min-w-0">
                  <div className="text-[#86efac] text-sm font-mono font-medium truncate">{r.display_name}</div>
                  {r.rank && <div className="text-[#166534] text-[9px] font-mono">{r.rank}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={r.status} />
                {r.status === 'enrolled' && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handle('graduate', r.user_id)}
                      disabled={!!acting}
                      title="Graduate"
                      className="p-1.5 border border-[#166534] text-[#22c55e] hover:bg-[#052e16] rounded-sm transition-colors disabled:opacity-40"
                    >
                      {acting === r.user_id + 'graduate' ? <Loader2 size={10} className="animate-spin" /> : <Star size={10} />}
                    </button>
                    <button
                      onClick={() => handle('no-show', r.user_id)}
                      disabled={!!acting}
                      title="No Show"
                      className="p-1.5 border border-red-900/40 text-red-400/60 hover:bg-red-950/20 rounded-sm transition-colors disabled:opacity-40"
                    >
                      {acting === r.user_id + 'no-show' ? <Loader2 size={10} className="animate-spin" /> : <XCircle size={10} />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

// ── DI Class Management Row ───────────────────────────────────────────────────
function DIClassRow({ cls, onEdit, onDelete, onViewRoster, style }) {
  const occurrences = cls.is_recurring ? nextOccurrences(cls.recur_days) : null;

  return (
    <div
      className="soi-card-enter flex flex-col sm:flex-row sm:items-center gap-3 border border-[#1a4a1a] rounded-sm px-4 py-3"
      style={{ background: 'linear-gradient(135deg, #061406 0%, #0a1e0a 100%)', ...style }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <StatusBadge status={cls.status} />
          {cls.is_recurring && (
            <span className="text-[9px] font-mono text-[#22c55e]/50 border border-[#166534]/30 px-1 py-0.5 rounded-sm flex items-center gap-1">
              <Repeat size={7} />RECURRING
            </span>
          )}
        </div>
        <div className="text-[#86efac] font-mono text-sm font-medium">{cls.title}</div>
        <div className="text-[#166534] text-[9px] font-mono mt-0.5">
          {cls.is_recurring
            ? `${(cls.recur_days||[]).map(d => DAY_LABELS[d]).join(' · ')} @ ${fmtTime(cls.scheduled_time)}`
            : `${fmtDate(cls.scheduled_date)} @ ${fmtTime(cls.scheduled_time)}`
          }
          {cls.is_recurring && occurrences?.[0] && ` · Next: ${fmtDate(occurrences[0])}`}
        </div>
      </div>
      <div className="flex items-center gap-2 text-[9px] font-mono text-[#166534]">
        <span className="flex items-center gap-1 text-[#4ade80]/60">
          <Users size={9} />{cls.enrolled_count}/{cls.max_capacity}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onViewRoster(cls)}
          className="flex items-center gap-1 px-2.5 py-1.5 border border-[#166534] text-[#4ade80]/80 hover:text-[#4ade80] hover:bg-[#052e16] text-[9px] font-mono rounded-sm transition-colors"
        >
          <Users size={9} />ROSTER
        </button>
        <button
          onClick={() => onEdit(cls)}
          className="p-1.5 border border-[#1a4a1a] text-[#166534] hover:text-[#4ade80] hover:border-[#166534] rounded-sm transition-colors"
        >
          <BookOpen size={11} />
        </button>
        <button
          onClick={() => onDelete(cls)}
          className="p-1.5 border border-[#1a4a1a] text-[#166534] hover:text-red-400 hover:border-red-900/40 rounded-sm transition-colors"
        >
          <X size={11} />
        </button>
      </div>
    </div>
  );
}

// ── Main SOI page ─────────────────────────────────────────────────────────────
export default function SOI() {
  const { user, isDI, isGuest } = useAuth();
  const [classes, setClasses]     = useState([]);
  const [myStatus, setMyStatus]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [enrolling, setEnrolling] = useState(null);
  const [modal, setModal]         = useState(null); // 'create' | 'edit' | 'roster' | 'delete'
  const [selected, setSelected]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const [diFilter, setDiFilter]   = useState('active'); // 'active' | 'all'

  const fetchClasses = useCallback(async () => {
    try {
      const r = await api.get('/soi/classes');
      setClasses(r.data);
    } catch {}
  }, []);

  const fetchMyStatus = useCallback(async () => {
    if (isGuest) return;
    try {
      const r = await api.get('/soi/my');
      setMyStatus(r.data);
    } catch {}
  }, [isGuest]);

  useEffect(() => {
    Promise.all([fetchClasses(), fetchMyStatus()]).finally(() => setLoading(false));
  }, [fetchClasses, fetchMyStatus]);

  const handleEnroll = async (classId) => {
    setEnrolling(classId);
    try {
      await api.post(`/soi/classes/${classId}/enroll`);
      await Promise.all([fetchClasses(), fetchMyStatus()]);
    } catch (err) {
      alert(err.response?.data?.error || 'Enrollment failed');
    } finally { setEnrolling(null); }
  };

  const handleWithdraw = async (classId) => {
    if (!confirm('Withdraw from this class?')) return;
    setEnrolling(classId);
    try {
      await api.delete(`/soi/classes/${classId}/enroll`);
      await Promise.all([fetchClasses(), fetchMyStatus()]);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to withdraw');
    } finally { setEnrolling(null); }
  };

  const handleSaveClass = async (form) => {
    setSaving(true);
    try {
      if (selected?.id) {
        await api.put(`/soi/classes/${selected.id}`, form);
      } else {
        await api.post('/soi/classes', form);
      }
      setModal(null); setSelected(null);
      fetchClasses();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save class');
    } finally { setSaving(false); }
  };

  const handleDeleteClass = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.delete(`/soi/classes/${selected.id}`);
      setModal(null); setSelected(null);
      fetchClasses();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete class');
    } finally { setSaving(false); }
  };

  // Build enrollment map for current user
  const enrollmentMap = {};
  (myStatus?.enrollments || []).forEach(e => { enrollmentMap[e.class_id] = e; });

  const activeClasses = classes.filter(c => c.status !== 'completed' && c.status !== 'cancelled');
  const diMyClasses   = isDI
    ? (diFilter === 'active'
        ? classes.filter(c => c.instructor_id === user?.id && c.status !== 'cancelled')
        : classes.filter(c => c.instructor_id === user?.id))
    : [];

  return (
    <>
      <style>{SOI_STYLES}</style>
      <div
        className="min-h-screen space-y-5 max-w-5xl"
        style={{ background: 'transparent' }}
      >
        {/* Hero */}
        <HeroBanner />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={28} className="animate-spin text-[#22c55e]" />
              <div className="text-[#166534] font-mono text-xs tracking-widest animate-pulse">
                LOADING TRAINING DATA...
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ── My Status (recruits / non-DI) ── */}
            {!isGuest && !isDI && (
              <MyStatusCard status={myStatus} />
            )}

            {/* ── DI Management Panel ── */}
            {isDI && (
              <div
                className="soi-card-enter border border-[#1a4a1a] rounded-sm overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #020b02 0%, #071407 100%)' }}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a4a1a] bg-[#052e16]/20">
                  <div className="flex items-center gap-2">
                    <Crosshair size={12} className="text-[#22c55e]" />
                    <span className="text-[9px] font-mono tracking-widest text-[#4ade80]/80 uppercase">
                      Drill Instructor Command Panel
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {['active', 'all'].map(f => (
                        <button key={f} onClick={() => setDiFilter(f)}
                          className={`px-2 py-1 text-[9px] font-mono rounded-sm border transition-colors ${
                            diFilter === f
                              ? 'text-[#052e16] bg-[#22c55e] border-[#22c55e]'
                              : 'text-[#166534] border-[#1a4a1a] hover:border-[#166534]'
                          }`}>
                          {f.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => { setSelected(null); setModal('create'); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#16a34a] hover:bg-[#15803d] text-[#052e16] font-mono text-[9px] font-bold rounded-sm transition-colors"
                      style={{ boxShadow: '0 0 12px rgba(22,163,74,0.3)' }}
                    >
                      <Plus size={10} />CREATE CLASS
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  {diMyClasses.length === 0 ? (
                    <div className="text-center py-8 text-[#166534] font-mono text-xs">
                      NO CLASSES — CREATE YOUR FIRST SOI CLASS ABOVE
                    </div>
                  ) : (
                    diMyClasses.map((cls, i) => (
                      <DIClassRow
                        key={cls.id}
                        cls={cls}
                        style={{ animationDelay: `${i * 60}ms` }}
                        onEdit={c => { setSelected(c); setModal('edit'); }}
                        onDelete={c => { setSelected(c); setModal('delete'); }}
                        onViewRoster={c => { setSelected(c); setModal('roster'); }}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── Available Classes ── */}
            <div>
              <div
                className="soi-card-enter flex items-center gap-3 px-4 py-2.5 border border-[#1a4a1a] rounded-sm mb-3"
                style={{ background: 'linear-gradient(90deg, #052e16/40 0%, transparent 100%)' }}
              >
                <Target size={11} className="text-[#22c55e]" />
                <span className="text-[9px] font-mono tracking-widest text-[#4ade80]/70 uppercase">
                  Available SOI Classes — Select &amp; Enroll
                </span>
                <span className="ml-auto text-[9px] font-mono text-[#166534]">
                  {activeClasses.length} CLASS{activeClasses.length !== 1 ? 'ES' : ''} AVAILABLE
                </span>
              </div>

              {activeClasses.length === 0 ? (
                <div
                  className="soi-card-enter border border-[#1a4a1a] rounded-sm py-12 text-center"
                  style={{ background: 'linear-gradient(135deg, #061406 0%, #0a1e0a 100%)' }}
                >
                  <Shield size={28} className="text-[#1a4a1a] mx-auto mb-3" />
                  <div className="text-[#166534] font-mono text-xs tracking-widest">
                    NO CLASSES CURRENTLY SCHEDULED
                  </div>
                  <div className="text-[#1a4a1a] font-mono text-[9px] mt-1">
                    Check back soon — DIs will post upcoming sessions
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeClasses.map((cls, i) => (
                    <ClassCard
                      key={cls.id}
                      cls={cls}
                      myEnrollment={enrollmentMap[cls.id]}
                      onEnroll={handleEnroll}
                      onWithdraw={handleWithdraw}
                      enrolling={enrolling === cls.id}
                      style={{ animationDelay: `${i * 70}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── My Enrollments history (non-guest) ── */}
            {!isGuest && myStatus?.enrollments?.length > 0 && (
              <div>
                <div
                  className="soi-card-enter flex items-center gap-3 px-4 py-2.5 border border-[#1a4a1a] rounded-sm mb-3"
                  style={{ background: 'linear-gradient(90deg, #052e16/40 0%, transparent 100%)' }}
                >
                  <CheckCircle size={11} className="text-[#22c55e]" />
                  <span className="text-[9px] font-mono tracking-widest text-[#4ade80]/70 uppercase">
                    Training History
                  </span>
                </div>
                <div
                  className="soi-card-enter border border-[#1a4a1a] rounded-sm overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #061406 0%, #0a1e0a 100%)' }}
                >
                  {myStatus.enrollments.map((e, i) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between px-4 py-3 border-b border-[#1a4a1a]/50 last:border-0"
                    >
                      <div className="min-w-0">
                        <div className="text-[#86efac] text-xs font-mono font-medium truncate">{e.title}</div>
                        <div className="text-[#166534] text-[9px] font-mono mt-0.5">
                          {e.instructor_name && `DI: ${e.instructor_name} · `}
                          {e.is_recurring
                            ? fmtTime(e.scheduled_time)
                            : `${fmtDate(e.scheduled_date)} · ${fmtTime(e.scheduled_time)}`
                          }
                        </div>
                      </div>
                      <StatusBadge status={e.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal
          title={modal === 'edit' ? `Edit — ${selected?.title}` : 'Create SOI Class'}
          onClose={() => { setModal(null); setSelected(null); }}
        >
          <ClassForm
            initial={modal === 'edit' ? {
              ...selected,
              recur_days: selected?.recur_days || [],
            } : BLANK_CLASS}
            onSave={handleSaveClass}
            onCancel={() => { setModal(null); setSelected(null); }}
            saving={saving}
          />
        </Modal>
      )}

      {modal === 'roster' && selected && (
        <RosterPanel
          cls={selected}
          onClose={() => { setModal(null); setSelected(null); }}
          onGraduate={() => {}}
          onNoShow={() => {}}
        />
      )}

      {modal === 'delete' && selected && (
        <Modal title="Delete Class" onClose={() => { setModal(null); setSelected(null); }} maxWidth="max-w-sm">
          <div className="space-y-4">
            <p className="text-[#93c5fd] text-sm font-mono">
              Delete <span className="text-[#dbeafe] font-bold">{selected.title}</span>?
              All enrollments will be removed. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setModal(null); setSelected(null); }} className="btn-ghost">Cancel</button>
              <button
                onClick={handleDeleteClass}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-red-900/40 hover:bg-red-900/60 border border-red-900/50 text-red-400 font-mono text-xs rounded-sm transition-colors"
              >
                {saving && <Loader2 size={11} className="animate-spin" />}
                DELETE CLASS
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
