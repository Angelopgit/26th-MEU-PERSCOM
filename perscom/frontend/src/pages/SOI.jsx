import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Shield, Users, Clock, Calendar, CheckCircle2, XCircle, Plus,
  ChevronDown, ChevronUp, Repeat, Loader2, X, Star,
  AlertTriangle, BookOpen, Target, Award, GraduationCap,
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
  return `${((hr % 12) || 12)}:${m} ${hr >= 12 ? 'PM' : 'AM'} EST`;
}

// ── Status badge (matches PERSCOM badge system) ───────────────────────────────
function StatusBadge({ status }) {
  const map = {
    open:      'badge-green',
    full:      'badge-amber',
    completed: 'badge-blue',
    cancelled: 'badge-red',
    enrolled:  'badge-green',
    no_show:   'badge-red',
  };
  return <span className={map[status] || 'badge-muted'}>{status?.replace('_', ' ')}</span>;
}

// ── Class capacity bar ────────────────────────────────────────────────────────
function CapacityBar({ enrolled, max }) {
  const pct = Math.min(Math.round((enrolled / max) * 100), 100);
  const color = pct >= 100 ? '#f59e0b' : pct >= 70 ? '#3b82f6' : '#1d4ed8';
  return (
    <div>
      <div className="flex justify-between text-[9px] font-mono text-[#4a6fa5] mb-1">
        <span>CAPACITY</span>
        <span className={pct >= 100 ? 'text-amber-400' : 'text-[#4a6fa5]'}>{enrolled}/{max}</span>
      </div>
      <div className="h-1.5 bg-[#0c1428] rounded-full border border-[#1e3364] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}60` }}
        />
      </div>
    </div>
  );
}

// ── SOI Module header ─────────────────────────────────────────────────────────
function SOIHeader() {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-amber-900/20 border border-amber-900/40 flex items-center justify-center shrink-0">
          <Shield size={20} className="text-amber-400" />
        </div>
        <div>
          <div className="text-[#dbeafe] font-bold text-lg tracking-wide">School of Infantry</div>
          <div className="text-[#4a6fa5] font-mono text-[10px] tracking-[0.2em] mt-0.5">
            26TH MEU (SOC) — MOS 0300 · INFANTRY TRAINING
          </div>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-4 text-[9px] font-mono text-[#1a2f55] tracking-widest">
          <span>ACTIVE PROGRAM</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
        </div>
      </div>
      <div
        className="px-5 py-2.5 border-t border-[#1e3364] flex flex-wrap gap-4"
        style={{ background: 'rgba(6,9,26,0.6)' }}
      >
        {[
          { icon: Target,   label: 'Weapons & Tactics' },
          { icon: BookOpen, label: 'Doctrine & SOPS'  },
          { icon: Users,    label: 'Team Cohesion'    },
          { icon: Award,    label: 'Certification'    },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-[#1a2f55] text-[9px] font-mono">
            <Icon size={9} className="text-[#2a4a80]" />{label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Recruit status card ───────────────────────────────────────────────────────
function RecruitStatusCard({ myStatus }) {
  if (!myStatus) return null;
  const complete = myStatus.soi_complete;
  const active   = myStatus.enrollments?.filter(e => e.status === 'enrolled') || [];

  return (
    <div className={`card overflow-hidden ${complete ? 'border-[#22c55e]/30' : ''}`}>
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[#162448] bg-[#060918]/60">
        <GraduationCap size={12} className={complete ? 'text-[#22c55e]' : 'text-amber-400'} />
        <span className="section-header">Your SOI Status</span>
        {complete && (
          <span className="ml-auto badge-green text-[9px]">✓ COMPLETE</span>
        )}
      </div>
      <div className="px-4 py-4">
        {complete ? (
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-[#22c55e] shrink-0" />
            <div>
              <div className="text-[#dbeafe] text-sm font-medium">SOI Graduation Complete</div>
              <div className="text-[#4a6fa5] text-xs font-mono mt-0.5">Basic training requirement fulfilled</div>
            </div>
          </div>
        ) : active.length > 0 ? (
          <div className="space-y-2">
            <div className="section-header mb-2">Enrolled Classes</div>
            {active.map(e => (
              <div key={e.id} className="flex items-center justify-between bg-[#060918] border border-[#1e3364] px-3 py-2">
                <div>
                  <div className="text-[#dbeafe] text-xs font-medium">{e.title}</div>
                  <div className="text-[#4a6fa5] text-[9px] font-mono mt-0.5">
                    {e.is_recurring ? `Recurring · ${fmtTime(e.scheduled_time)}` : `${fmtDate(e.scheduled_date)} · ${fmtTime(e.scheduled_time)}`}
                  </div>
                </div>
                <StatusBadge status="enrolled" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 text-[#4a6fa5]">
            <AlertTriangle size={15} className="text-amber-400/60 shrink-0" />
            <div>
              <div className="text-amber-400/80 text-sm font-medium">SOI Pending</div>
              <div className="text-[#4a6fa5] text-xs font-mono mt-0.5">
                Select a class below to begin your training
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Class card (recruit view) ─────────────────────────────────────────────────
function ClassCard({ cls, myEnrollment, onEnroll, onWithdraw, enrolling, idx }) {
  const [expanded, setExpanded] = useState(false);
  const occurrences = cls.is_recurring ? nextOccurrences(cls.recur_days) : null;
  const isFull = cls.status === 'full' || cls.enrolled_count >= cls.max_capacity;

  const avatarUrl = cls.instructor_discord_id && cls.instructor_avatar
    ? `https://cdn.discordapp.com/avatars/${cls.instructor_discord_id}/${cls.instructor_avatar}.png?size=32`
    : null;

  return (
    <div
      className="card overflow-hidden"
      style={{ animation: `pageIn 0.2s ease-out ${idx * 60}ms both` }}
    >
      {/* Header strip */}
      <div
        className="h-0.5 w-full"
        style={{ background: myEnrollment?.status === 'completed' ? '#22c55e' : isFull ? '#f59e0b' : '#1d4ed8' }}
      />

      <div className="p-4 space-y-3">
        {/* Title row */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {cls.is_recurring
                ? <span className="badge-amber flex items-center gap-1"><Repeat size={8} />RECURRING</span>
                : <span className="badge-blue flex items-center gap-1"><Calendar size={8} />ONE-TIME</span>
              }
              <StatusBadge status={cls.status} />
              {myEnrollment && <StatusBadge status={myEnrollment.status} />}
            </div>
            <div className="text-[#dbeafe] font-semibold text-sm leading-tight">{cls.title}</div>
          </div>
          <button
            onClick={() => setExpanded(x => !x)}
            className="text-[#2a4a80] hover:text-[#dbeafe] transition-colors shrink-0 p-1"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        {/* Instructor */}
        <div className="flex items-center gap-2">
          {avatarUrl
            ? <img src={avatarUrl} className="w-5 h-5 rounded-full border border-[#1e3364] shrink-0" alt="" />
            : <div className="w-5 h-5 rounded-full bg-[#1e3364]/50 border border-[#1e3364] flex items-center justify-center shrink-0">
                <span className="text-[#4a6fa5] text-[8px] font-mono">DI</span>
              </div>
          }
          <span className="text-[#4a6fa5] text-xs font-mono">{cls.instructor_name || 'Unassigned'}</span>
        </div>

        {/* Schedule */}
        {cls.is_recurring ? (
          <div>
            <div className="flex flex-wrap gap-1 mb-1">
              {DAY_LABELS.map((d, i) => (
                <span key={i} className={`text-[9px] font-mono px-1.5 py-0.5 border ${
                  cls.recur_days?.includes(i) || cls.recur_days?.includes(String(i))
                    ? 'badge-amber'
                    : 'text-[#1a2f55] border-[#1e3364]'
                }`}>{d}</span>
              ))}
            </div>
            {occurrences?.[0] && (
              <div className="text-[#4a6fa5] text-[9px] font-mono">Next: {fmtDate(occurrences[0])}</div>
            )}
          </div>
        ) : (
          <div className="text-[#dbeafe] text-xs font-mono">{fmtDate(cls.scheduled_date)}</div>
        )}

        <div className="flex items-center gap-3 text-[9px] font-mono text-[#4a6fa5]">
          <span className="flex items-center gap-1"><Clock size={9} />{fmtTime(cls.scheduled_time)}</span>
          <span>{cls.duration_minutes} min</span>
        </div>

        <CapacityBar enrolled={cls.enrolled_count} max={cls.max_capacity} />

        {/* Expanded content */}
        {expanded && (
          <>
            {cls.description && (
              <div className="border-t border-[#1e3364] pt-3 text-[#4a6fa5] text-xs leading-relaxed">
                {cls.description}
              </div>
            )}
            {cls.is_recurring && occurrences?.length > 1 && (
              <div className="border-t border-[#1e3364] pt-3 space-y-1">
                <div className="section-header mb-1.5">Upcoming Sessions</div>
                {occurrences.map(d => (
                  <div key={d} className="text-[#4a6fa5] text-[9px] font-mono">
                    {fmtDate(d)} @ {fmtTime(cls.scheduled_time)}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Action */}
        {myEnrollment?.status === 'completed' ? (
          <div className="flex items-center gap-2 pt-1 text-[#22c55e] text-xs font-mono">
            <CheckCircle2 size={12} />SOI Complete — Graduation Recorded
          </div>
        ) : myEnrollment ? (
          <button
            onClick={() => onWithdraw(cls.id)}
            disabled={enrolling}
            className="btn-danger w-full flex items-center justify-center gap-2 text-xs mt-1"
          >
            {enrolling ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
            Withdraw Enrollment
          </button>
        ) : (
          <button
            onClick={() => onEnroll(cls.id)}
            disabled={enrolling || isFull || cls.status === 'cancelled'}
            className="btn-primary w-full flex items-center justify-center gap-2 text-xs mt-1"
          >
            {enrolling ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
            {isFull ? 'Class Full' : 'Enroll'}
          </button>
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
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <div>
        <label className="label">Class Title *</label>
        <input className="input-field" placeholder="e.g. Wednesday with LCpl. T. Tyler"
          value={form.title} onChange={e => set('title', e.target.value)} required autoFocus />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input-field resize-none" rows={2}
          placeholder="Class objectives and curriculum overview..."
          value={form.description} onChange={e => set('description', e.target.value)} />
      </div>

      <div className="flex items-center gap-3">
        <input type="checkbox" id="recurring" className="accent-blue-500"
          checked={form.is_recurring} onChange={e => set('is_recurring', e.target.checked)} />
        <label htmlFor="recurring" className="text-[#93c5fd] text-sm cursor-pointer">
          Recurring class (repeats weekly)
        </label>
      </div>

      {form.is_recurring ? (
        <div>
          <label className="label">Days of Week *</label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {DAY_LABELS.map((d, i) => (
              <button key={i} type="button" onClick={() => toggleDay(i)}
                className={`px-3 py-1.5 text-xs font-mono border transition-colors ${
                  form.recur_days?.includes(i)
                    ? 'bg-[#1d4ed8] text-white border-[#3b82f6]/50'
                    : 'text-[#4a6fa5] border-[#1e3364] hover:border-[#3b82f6]/30 hover:text-[#93c5fd]'
                }`}>{d}</button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <label className="label">Date *</label>
          <input type="date" className="input-field"
            value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} required />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Time (EST) *</label>
          <input type="time" className="input-field"
            value={form.scheduled_time} onChange={e => set('scheduled_time', e.target.value)} required />
        </div>
        <div>
          <label className="label">Duration (min)</label>
          <input type="number" className="input-field" min={15} max={480} step={15}
            value={form.duration_minutes} onChange={e => set('duration_minutes', +e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label">Max Capacity</label>
        <input type="number" className="input-field" min={1} max={50}
          value={form.max_capacity} onChange={e => set('max_capacity', +e.target.value)} />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          {saving && <Loader2 size={12} className="animate-spin" />}
          {initial?.id ? 'Save Changes' : 'Create Class'}
        </button>
      </div>
    </form>
  );
}

// ── DI Roster Panel ───────────────────────────────────────────────────────────
function RosterPanel({ cls, onClose }) {
  const [roster, setRoster]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing]   = useState(null);

  const fetchRoster = useCallback(() => {
    api.get(`/soi/classes/${cls.id}/roster`)
      .then(r => setRoster(r.data.roster))
      .catch(() => setRoster([]))
      .finally(() => setLoading(false));
  }, [cls.id]);

  useEffect(() => { fetchRoster(); }, [fetchRoster]);

  const handle = async (action, userId, userName) => {
    if (action === 'graduate') {
      if (!confirm(`Graduate ${userName} from "${cls.title}"?\n\nThis will be recorded on their personnel profile.`)) return;
    }
    setActing(userId + action);
    try {
      await api.post(`/soi/classes/${cls.id}/${action}/${userId}`);
      setRoster(prev => prev.map(r =>
        r.user_id === parseInt(userId)
          ? { ...r, status: action === 'graduate' ? 'completed' : 'no_show' }
          : r
      ));
    } catch (err) {
      alert(err.response?.data?.error || `Failed`);
    } finally { setActing(null); }
  };

  const enrolled  = roster?.filter(r => r.status === 'enrolled') || [];
  const graduated = roster?.filter(r => r.status === 'completed') || [];
  const noShows   = roster?.filter(r => r.status === 'no_show') || [];

  return (
    <Modal title={`Class Roster — ${cls.title}`} onClose={onClose} maxWidth="max-w-lg">
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-[#3b82f6]" /></div>
      ) : !roster?.length ? (
        <div className="text-center py-10 text-[#1a2f55] font-mono text-xs">NO RECRUITS ENROLLED</div>
      ) : (
        <div className="space-y-4">
          {/* Enrolled recruits — primary graduation action */}
          {enrolled.length > 0 && (
            <div>
              <div className="section-header mb-2">Enrolled ({enrolled.length})</div>
              <div className="space-y-1.5">
                {enrolled.map(r => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 bg-[#060918] border border-[#1e3364] px-3 py-2.5 group hover:border-[#3b82f6]/30 transition-colors"
                  >
                    {r.discord_id && r.discord_avatar
                      ? <img src={`https://cdn.discordapp.com/avatars/${r.discord_id}/${r.discord_avatar}.png?size=32`}
                          className="w-7 h-7 rounded-full border border-[#1e3364] shrink-0" alt="" />
                      : <div className="w-7 h-7 rounded-full bg-[#1e3364]/50 border border-[#1e3364] flex items-center justify-center text-[#4a6fa5] text-[9px] font-mono shrink-0">
                          {r.display_name?.[0]?.toUpperCase() || '?'}
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <div className="text-[#dbeafe] text-sm font-medium truncate">{r.display_name}</div>
                      {r.rank && <div className="text-[#4a6fa5] text-[9px] font-mono">{r.rank}</div>}
                    </div>
                    {/* Graduation action — prominent, requires confirm */}
                    <button
                      onClick={() => handle('graduate', r.user_id, r.display_name)}
                      disabled={!!acting}
                      title="Graduate this recruit"
                      className="flex items-center gap-1.5 px-3 py-1.5 btn-primary text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {acting === r.user_id + 'graduate'
                        ? <Loader2 size={10} className="animate-spin" />
                        : <GraduationCap size={11} />
                      }
                      Graduate
                    </button>
                    <button
                      onClick={() => handle('no-show', r.user_id, r.display_name)}
                      disabled={!!acting}
                      title="Mark no-show"
                      className="p-1.5 text-[#2a4a80] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      {acting === r.user_id + 'no-show'
                        ? <Loader2 size={10} className="animate-spin" />
                        : <XCircle size={13} />
                      }
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Graduated */}
          {graduated.length > 0 && (
            <div>
              <div className="section-header mb-2">Graduated ({graduated.length})</div>
              <div className="space-y-1">
                {graduated.map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-2 border-b border-[#1e3364]/40 last:border-0">
                    <Star size={10} className="text-amber-400 shrink-0" fill="currentColor" />
                    <span className="text-[#4a6fa5] text-xs flex-1">{r.display_name}</span>
                    <StatusBadge status="completed" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No-shows */}
          {noShows.length > 0 && (
            <div>
              <div className="section-header mb-2">No-Show ({noShows.length})</div>
              <div className="space-y-1">
                {noShows.map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-2 border-b border-[#1e3364]/40 last:border-0">
                    <span className="text-[#2a4a80] text-xs flex-1">{r.display_name}</span>
                    <StatusBadge status="no_show" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── DI Management row ─────────────────────────────────────────────────────────
function DIClassRow({ cls, onEdit, onDelete, onViewRoster, idx }) {
  const occurrences = cls.is_recurring ? nextOccurrences(cls.recur_days) : null;

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-b border-[#1e3364]/50 last:border-0 hover:bg-[#0f1c35]/40 transition-colors group"
      style={{ animation: `pageIn 0.2s ease-out ${idx * 50}ms both` }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <StatusBadge status={cls.status} />
          {cls.is_recurring && (
            <span className="badge-amber flex items-center gap-1 text-[9px]"><Repeat size={7} />RECURRING</span>
          )}
        </div>
        <div className="text-[#dbeafe] text-sm font-medium">{cls.title}</div>
        <div className="text-[#4a6fa5] text-[9px] font-mono mt-0.5">
          {cls.is_recurring
            ? `${(cls.recur_days || []).map(d => DAY_LABELS[d]).join(' · ')} @ ${fmtTime(cls.scheduled_time)}`
            : `${fmtDate(cls.scheduled_date)} @ ${fmtTime(cls.scheduled_time)}`}
          {cls.is_recurring && occurrences?.[0] && ` · Next: ${fmtDate(occurrences[0])}`}
        </div>
      </div>
      <div className="flex items-center gap-3 text-[9px] font-mono text-[#4a6fa5]">
        <span className="flex items-center gap-1"><Users size={9} />{cls.enrolled_count}/{cls.max_capacity}</span>
      </div>
      <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onViewRoster(cls)}
          className="btn-secondary flex items-center gap-1.5 text-xs px-2.5 py-1.5"
        >
          <Users size={10} />Roster
        </button>
        <button onClick={() => onEdit(cls)} className="p-1.5 text-[#2a4a80] hover:text-[#dbeafe] transition-colors border border-[#1e3364] hover:border-[#3b82f6]/30">
          <BookOpen size={11} />
        </button>
        <button onClick={() => onDelete(cls)} className="p-1.5 text-[#2a4a80] hover:text-red-400 transition-colors border border-[#1e3364] hover:border-red-900/40">
          <X size={11} />
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SOI() {
  const { user, isDI, isGuest } = useAuth();
  const [classes, setClasses]     = useState([]);
  const [myStatus, setMyStatus]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [enrolling, setEnrolling] = useState(null);
  const [modal, setModal]         = useState(null);
  const [selected, setSelected]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const [diFilter, setDiFilter]   = useState('active');

  const fetchClasses = useCallback(async () => {
    try { const r = await api.get('/soi/classes'); setClasses(r.data); } catch {}
  }, []);

  const fetchMyStatus = useCallback(async () => {
    if (isGuest) return;
    try { const r = await api.get('/soi/my'); setMyStatus(r.data); } catch {}
  }, [isGuest]);

  useEffect(() => {
    Promise.all([fetchClasses(), fetchMyStatus()]).finally(() => setLoading(false));
  }, [fetchClasses, fetchMyStatus]);

  const handleEnroll = async (classId) => {
    setEnrolling(classId);
    try {
      await api.post(`/soi/classes/${classId}/enroll`);
      await Promise.all([fetchClasses(), fetchMyStatus()]);
    } catch (err) { alert(err.response?.data?.error || 'Enrollment failed'); }
    finally { setEnrolling(null); }
  };

  const handleWithdraw = async (classId) => {
    if (!confirm('Withdraw from this class?')) return;
    setEnrolling(classId);
    try {
      await api.delete(`/soi/classes/${classId}/enroll`);
      await Promise.all([fetchClasses(), fetchMyStatus()]);
    } catch (err) { alert(err.response?.data?.error || 'Failed to withdraw'); }
    finally { setEnrolling(null); }
  };

  const handleSaveClass = async (form) => {
    setSaving(true);
    try {
      if (selected?.id) { await api.put(`/soi/classes/${selected.id}`, form); }
      else              { await api.post('/soi/classes', form); }
      setModal(null); setSelected(null);
      fetchClasses();
    } catch (err) { alert(err.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDeleteClass = async () => {
    setSaving(true);
    try {
      await api.delete(`/soi/classes/${selected.id}`);
      setModal(null); setSelected(null);
      fetchClasses();
    } catch (err) { alert(err.response?.data?.error || 'Failed to delete'); }
    finally { setSaving(false); }
  };

  const enrollmentMap = {};
  (myStatus?.enrollments || []).forEach(e => { enrollmentMap[e.class_id] = e; });

  const activeClasses = classes.filter(c => c.status !== 'completed' && c.status !== 'cancelled');
  const diMyClasses = isDI
    ? classes.filter(c => c.instructor_id === user?.id && (diFilter === 'all' || c.status !== 'cancelled'))
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={18} className="animate-spin text-[#3b82f6]" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Module header */}
      <SOIHeader />

      {/* Recruit status */}
      {!isGuest && !isDI && <RecruitStatusCard myStatus={myStatus} />}

      {/* DI Command Panel */}
      {isDI && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e3364] bg-[#060918]/60">
            <Shield size={12} className="text-[#3b82f6]" />
            <span className="section-header">Instructor Panel</span>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex gap-1">
                {['active', 'all'].map(f => (
                  <button key={f} onClick={() => setDiFilter(f)}
                    className={`px-2.5 py-1 text-[9px] font-mono border transition-colors ${
                      diFilter === f
                        ? 'bg-[#1d4ed8] text-white border-[#3b82f6]/50'
                        : 'text-[#4a6fa5] border-[#1e3364] hover:border-[#3b82f6]/30'
                    }`}>{f.toUpperCase()}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setSelected(null); setModal('create'); }}
                className="btn-primary flex items-center gap-1.5 text-xs"
              >
                <Plus size={11} />New Class
              </button>
            </div>
          </div>
          {diMyClasses.length === 0 ? (
            <div className="py-10 text-center text-[#1a2f55] font-mono text-xs">
              No classes — create your first SOI class above
            </div>
          ) : (
            <div>
              {diMyClasses.map((cls, i) => (
                <DIClassRow key={cls.id} cls={cls} idx={i}
                  onEdit={c => { setSelected(c); setModal('edit'); }}
                  onDelete={c => { setSelected(c); setModal('delete'); }}
                  onViewRoster={c => { setSelected(c); setModal('roster'); }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Available classes */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#1e3364] bg-[#060918]/60">
          <Target size={12} className="text-[#3b82f6]" />
          <span className="section-header">Available Classes</span>
          <span className="ml-auto text-[#1a2f55] text-xs font-mono">{activeClasses.length} available</span>
        </div>
        {activeClasses.length === 0 ? (
          <div className="py-12 text-center">
            <Shield size={24} className="text-[#1e3364] mx-auto mb-3" />
            <div className="text-[#1a2f55] font-mono text-xs">No classes currently scheduled</div>
            <div className="text-[#0f1c35] font-mono text-[9px] mt-1">Check back soon — instructors will post upcoming sessions</div>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeClasses.map((cls, i) => (
              <ClassCard key={cls.id} cls={cls} idx={i}
                myEnrollment={enrollmentMap[cls.id]}
                onEnroll={handleEnroll}
                onWithdraw={handleWithdraw}
                enrolling={enrolling === cls.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Training history */}
      {!isGuest && myStatus?.enrollments?.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#1e3364] bg-[#060918]/60">
            <CheckCircle2 size={12} className="text-[#3b82f6]" />
            <span className="section-header">Training History</span>
            <span className="ml-auto text-[#1a2f55] text-xs font-mono">{myStatus.enrollments.length}</span>
          </div>
          <div>
            {myStatus.enrollments.map(e => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#1e3364]/40 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-[#dbeafe] text-xs font-medium truncate">{e.title}</div>
                  <div className="text-[#4a6fa5] text-[9px] font-mono mt-0.5">
                    {e.instructor_name && `DI: ${e.instructor_name} · `}
                    {e.is_recurring ? fmtTime(e.scheduled_time) : `${fmtDate(e.scheduled_date)} · ${fmtTime(e.scheduled_time)}`}
                  </div>
                </div>
                <StatusBadge status={e.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal
          title={modal === 'edit' ? `Edit — ${selected?.title}` : 'New SOI Class'}
          onClose={() => { setModal(null); setSelected(null); }}
        >
          <ClassForm
            initial={modal === 'edit' ? { ...selected, recur_days: selected?.recur_days || [] } : BLANK_CLASS}
            onSave={handleSaveClass}
            onCancel={() => { setModal(null); setSelected(null); }}
            saving={saving}
          />
        </Modal>
      )}

      {modal === 'roster' && selected && (
        <RosterPanel cls={selected} onClose={() => { setModal(null); setSelected(null); }} />
      )}

      {modal === 'delete' && selected && (
        <Modal title="Delete Class" onClose={() => { setModal(null); setSelected(null); }} maxWidth="max-w-sm">
          <div className="space-y-4">
            <p className="text-[#93c5fd] text-sm">
              Delete <span className="text-[#dbeafe] font-medium">{selected.title}</span>?
              All enrollments will be removed.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setModal(null); setSelected(null); }} className="btn-ghost">Cancel</button>
              <button onClick={handleDeleteClass} disabled={saving} className="btn-danger flex items-center gap-2">
                {saving && <Loader2 size={11} className="animate-spin" />}Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
