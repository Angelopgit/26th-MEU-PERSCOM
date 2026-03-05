import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Star, Shield, Clock, Calendar, Award,
  CheckSquare, Loader2, Plus, X, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, Target, TrendingUp,
} from 'lucide-react';
import { differenceInDays, format, formatDistanceToNow } from 'date-fns';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { imgUrl } from '../utils/imgUrl';

const RANK_ABBREV = {
  'Recruit': 'Rct', 'Private': 'Pvt', 'Private First Class': 'PFC',
  'Lance Corporal': 'LCpl', 'Corporal': 'Cpl', 'Sergeant': 'Sgt',
  'Staff Sergeant': 'SSgt', 'Gunnery Sergeant': 'GySgt',
  'Master Sergeant': 'MSgt', 'First Sergeant': '1stSgt',
  'Master Gunnery Sergeant': 'MGySgt', 'Sergeant Major': 'SgtMaj',
  'Second Lieutenant': '2ndLt', 'First Lieutenant': '1stLt',
  'Captain': 'Capt', 'Major': 'Maj', 'Lieutenant Colonel': 'LtCol', 'Colonel': 'Col',
};

const MEMBER_STATUS_STYLES = {
  'Active':           'badge-green',
  'Leave of Absence': 'badge-amber',
  'Inactive':         'badge-muted',
};

function calcDuration(from) {
  if (!from) return '—';
  const days = differenceInDays(new Date(), new Date(from));
  if (days < 1) return '0d';
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  const y = Math.floor(days / 365);
  const m = Math.floor((days % 365) / 30);
  return m > 0 ? `${y}y ${m}mo` : `${y}y`;
}

function MetricCard({ label, value, icon: Icon, color = 'text-[#dbeafe]' }) {
  return (
    <div className="card p-4 text-center">
      <div className="flex items-center justify-center mb-2">
        {Icon && <Icon size={14} className="text-[#4a6fa5]" />}
      </div>
      <div className={`text-2xl font-mono font-bold ${color}`}>{value}</div>
      <div className="section-header mt-1">{label}</div>
    </div>
  );
}

// ── Eligibility metric cell ───────────────────────────────────────────────────
function EligMetric({ label, current, required, met }) {
  if (required === 0) {
    return (
      <div className="text-center">
        <div className="text-[#1a2f55] text-[9px] font-mono">{label}</div>
        <div className="text-[#4a6fa5] text-xs font-mono">—</div>
      </div>
    );
  }
  return (
    <div className="text-center">
      <div className="text-[#1a2f55] text-[9px] font-mono">{label}</div>
      <div className={`text-xs font-mono font-bold ${met ? 'text-[#60a5fa]' : 'text-amber-400'}`}>
        {current}/{required}{met ? ' ✓' : ''}
      </div>
    </div>
  );
}

// ── Rank Progression Bar ──────────────────────────────────────────────────────
function RankProgressionBar({ person, ranks, attendance }) {
  const sorted = [...ranks].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  const curIdx = sorted.findIndex((r) => r.name === person.rank);
  if (curIdx === -1) return null;

  const currentRank = sorted[curIdx];
  const nextRank    = sorted[curIdx + 1] || null;

  if (!nextRank) {
    return (
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#162448]">
          <TrendingUp size={13} className="text-[#3b82f6]" />
          <span className="section-header">Rank Progression</span>
          <span className="ml-auto badge-green text-[9px]">MAX RANK ACHIEVED</span>
        </div>
        <div className="px-4 py-3 flex items-center gap-3">
          {currentRank.icon_url ? (
            <img src={imgUrl(currentRank.icon_url)} alt="" className="w-8 h-8 object-contain" />
          ) : (
            <Shield size={18} className="text-[#3b82f6]" />
          )}
          <span className="text-[#60a5fa] text-sm font-medium">{currentRank.name}</span>
        </div>
      </div>
    );
  }

  const ops      = attendance?.ops      || 0;
  const trainings = attendance?.trainings || 0;
  const total    = attendance?.total    || 0;

  const opsEligible      = nextRank.req_ops       === 0 || ops      >= nextRank.req_ops;
  const trainingsEligible = nextRank.req_trainings === 0 || trainings >= nextRank.req_trainings;
  const attendanceEligible = nextRank.req_attendance === 0 || total >= nextRank.req_attendance;
  const eligible = opsEligible && trainingsEligible && attendanceEligible;

  // Progress = min ratio across all non-zero requirements
  const ratios = [];
  if (nextRank.req_ops       > 0) ratios.push(ops       / nextRank.req_ops);
  if (nextRank.req_trainings > 0) ratios.push(trainings / nextRank.req_trainings);
  if (nextRank.req_attendance > 0) ratios.push(total    / nextRank.req_attendance);
  const progressPct = ratios.length > 0 ? Math.round(Math.min(...ratios) * 100) : 100;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#162448]">
        <TrendingUp size={13} className="text-[#3b82f6]" />
        <span className="section-header">Rank Progression</span>
        {eligible && (
          <span className="ml-auto badge-green text-[9px]">ELIGIBLE FOR PROMOTION</span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Current → bar → Next */}
        <div className="flex items-center gap-3">
          {/* Current rank */}
          <div className="flex flex-col items-center gap-1 shrink-0 w-14 text-center">
            {currentRank.icon_url ? (
              <img src={imgUrl(currentRank.icon_url)} alt="" className="w-9 h-9 object-contain mx-auto" />
            ) : (
              <Shield size={18} className="text-[#3b82f6] mx-auto" />
            )}
            <span className="text-[#4a6fa5] text-[9px] font-mono leading-tight">
              {RANK_ABBREV[currentRank.name] || currentRank.name}
            </span>
          </div>

          {/* Progress bar */}
          <div className="flex-1">
            <div className="h-2.5 bg-[#0c1428] rounded-full border border-[#162448] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(progressPct, 100)}%`,
                  background: eligible
                    ? 'linear-gradient(to right, #16a34a, #22c55e)'
                    : 'linear-gradient(to right, #1d4ed8, #3b82f6)',
                  boxShadow: eligible
                    ? '0 0 6px rgba(34,197,94,0.5)'
                    : '0 0 6px rgba(59,130,246,0.5)',
                }}
              />
            </div>
            <div className="text-center text-[#4a6fa5] text-[9px] font-mono mt-1">
              {Math.min(progressPct, 100)}%
            </div>
          </div>

          {/* Next rank */}
          <div className="flex flex-col items-center gap-1 shrink-0 w-14 text-center">
            {nextRank.icon_url ? (
              <img src={imgUrl(nextRank.icon_url)} alt="" className="w-9 h-9 object-contain mx-auto opacity-50" />
            ) : (
              <Shield size={18} className="text-[#2a4a80] mx-auto" />
            )}
            <span className="text-[#2a4a80] text-[9px] font-mono leading-tight">
              {RANK_ABBREV[nextRank.name] || nextRank.name}
            </span>
          </div>
        </div>

        {/* Eligibility threshold */}
        <div>
          <div className="text-[#1a2f55] text-[9px] font-mono tracking-widest mb-2">
            ELIGIBILITY THRESHOLD
          </div>
          <div className="grid grid-cols-3 gap-2">
            <EligMetric label="Operations"  current={ops}      required={nextRank.req_ops}        met={opsEligible} />
            <EligMetric label="Trainings"   current={trainings} required={nextRank.req_trainings}  met={trainingsEligible} />
            <EligMetric label="Attendance"  current={total}    required={nextRank.req_attendance} met={attendanceEligible} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add Qualification Modal ───────────────────────────────────────────────────
function AddQualModal({ person, onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', awarded_at: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post(`/personnel/${person.id}/qualifications`, form);
      onAdded(res.data);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add qualification');
    } finally { setSaving(false); }
  };

  return (
    <Modal title="Add Qualification" onClose={onClose} maxWidth="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Qualification Name</label>
          <input
            className="input-field"
            placeholder="e.g. Scout Sniper, Combat Diver"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            autoFocus
          />
        </div>
        <div>
          <label className="label">Date Awarded</label>
          <input
            type="date"
            className="input-field"
            value={form.awarded_at}
            onChange={(e) => setForm((f) => ({ ...f, awarded_at: e.target.value }))}
          />
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving && <Loader2 size={13} className="animate-spin" />}
            Add
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MarineProfile() {
  const { id } = useParams();
  const { isAdmin, canEdit } = useAuth();
  const [person, setPerson]             = useState(null);
  const [loading, setLoading]           = useState(true);
  const [showAddQual, setShowAddQual]   = useState(false);
  const [evalsExpanded, setEvalsExpanded] = useState(false);
  const [removingQual, setRemovingQual] = useState(null);
  const [discordRoles, setDiscordRoles] = useState([]);
  const [attendance, setAttendance]     = useState(null);
  const [ranks, setRanks]               = useState([]);
  const [rankProgressionEnabled, setRankProgressionEnabled] = useState(false);

  const fetchPerson = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/personnel/${id}`);
      setPerson(res.data);
    } catch {
      setPerson(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchPerson(); }, [fetchPerson]);

  // Fetch Discord roles once person is loaded and has a linked Discord account
  useEffect(() => {
    if (!person?.discord?.discord_id) return;
    api.get(`/personnel/${id}/discord-roles`)
      .then((res) => setDiscordRoles(res.data.roles || []))
      .catch(() => setDiscordRoles([]));
  }, [id, person?.discord?.discord_id]);

  // Fetch attendance stats
  useEffect(() => {
    if (!person) return;
    api.get(`/attendance/personnel/${id}`)
      .then((res) => setAttendance(res.data))
      .catch(() => setAttendance(null));
  }, [id, person]);

  // Fetch ranks + progression setting
  useEffect(() => {
    if (!person) return;
    Promise.all([
      api.get('/ranks'),
      api.get('/settings/rank-progression'),
    ]).then(([ranksRes, rpRes]) => {
      setRanks(ranksRes.data);
      setRankProgressionEnabled(rpRes.data.enabled);
    }).catch(() => {});
  }, [person]);

  const handleRemoveQual = async (qualId) => {
    setRemovingQual(qualId);
    try {
      await api.delete(`/personnel/${id}/qualifications/${qualId}`);
      setPerson((p) => ({ ...p, qualifications: p.qualifications.filter((q) => q.id !== qualId) }));
    } catch { alert('Failed to remove qualification'); }
    finally { setRemovingQual(null); }
  };

  const handleQualAdded = (qual) => {
    setPerson((p) => ({ ...p, qualifications: [qual, ...(p.qualifications || [])] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={18} className="animate-spin text-[#3b82f6]" />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="max-w-3xl space-y-4">
        <Link to="/personnel" className="flex items-center gap-2 text-[#4a6fa5] hover:text-[#dbeafe] transition-colors text-sm">
          <ArrowLeft size={14} /> Back to Personnel
        </Link>
        <div className="card py-16 text-center text-[#1a2f55] font-mono text-xs">PERSONNEL NOT FOUND</div>
      </div>
    );
  }

  const rankAbbr = person.status === 'Marine' ? (RANK_ABBREV[person.rank] || person.rank || '—') : 'CIV';
  const tis = calcDuration(person.date_of_entry);
  const tig = calcDuration(person.rank_since || person.date_of_entry);
  const memberStatus = person.member_status || 'Active';
  const memberStatusBadge = MEMBER_STATUS_STYLES[memberStatus] || 'badge-muted';
  const displayEvals = evalsExpanded ? person.evaluations : person.evaluations?.slice(0, 3);

  // Discord avatar URL
  const discordAvatarUrl = person.discord?.discord_avatar
    ? `https://cdn.discordapp.com/avatars/${person.discord.discord_id}/${person.discord.discord_avatar}.png?size=128`
    : null;

  // Find rank icon for this marine's current rank
  const currentRankData = ranks.find((r) => r.name === person.rank);

  return (
    <div className="max-w-4xl space-y-5">
      {/* Back nav */}
      <div className="flex items-center justify-between">
        <Link to="/personnel" className="flex items-center gap-2 text-[#4a6fa5] hover:text-[#dbeafe] transition-colors text-sm font-mono">
          <ArrowLeft size={14} /> Personnel
        </Link>
        <span className={memberStatusBadge}>{memberStatus}</span>
      </div>

      {/* Profile header */}
      <div className="card p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 bg-[#3b82f6]/10 border border-[#3b82f6]/25 rounded-sm flex items-center justify-center shrink-0 overflow-hidden">
            {discordAvatarUrl ? (
              <img src={discordAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <Shield size={24} className="text-[#3b82f6]" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-[#dbeafe] text-xl font-bold">{person.name}</h1>
              {person.status === 'Marine' && person.rank && (
                <span className="badge-green">{rankAbbr}</span>
              )}
              {person.status === 'Civilian' && (
                <span className="badge-muted">CIV</span>
              )}
              {/* Rank icon badge */}
              {currentRankData?.icon_url && (
                <img
                  src={imgUrl(currentRankData.icon_url)}
                  alt={currentRankData.name}
                  className="w-6 h-6 object-contain"
                  title={currentRankData.name}
                />
              )}
            </div>
            {person.status === 'Marine' && person.rank && (
              <div className="text-[#4a6fa5] text-sm font-mono mt-1">{person.rank}</div>
            )}
            <div className="text-[#1a2f55] text-xs font-mono mt-1 tracking-widest">
              26TH MEU (SOC) — {person.status.toUpperCase()}
            </div>

            {/* Discord profile section */}
            {person.discord && (
              <div className="mt-3 pt-3 border-t border-[#162448] space-y-2.5">
                <div className="flex items-center gap-3">
                  {discordAvatarUrl && (
                    <img
                      src={discordAvatarUrl}
                      alt="Discord avatar"
                      className="w-8 h-8 rounded-full border border-[#162448]"
                    />
                  )}
                  <div>
                    <div className="text-[#dbeafe] text-xs font-medium flex items-center gap-1.5">
                      <svg width="12" height="9" viewBox="0 0 71 55" fill="#5865F2">
                        <path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37 37 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 4.9a.2.2 0 00-.1.1C1.5 18.7-.9 32.2.3 45.5v.1a58.8 58.8 0 0017.7 9 .2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.8 38.8 0 01-5.5-2.6.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 42 42 0 0035.5 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .4 36.4 36.4 0 01-5.5 2.6.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.2.1A58.6 58.6 0 0070.3 45.6v-.1C71.8 30.1 67.9 16.7 60.2 5a.2.2 0 00-.1-.1zM23.7 37.3c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2zm23.7 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2z"/>
                      </svg>
                      {person.discord.discord_username}
                    </div>
                    <div className="text-[#1a2f55] text-[9px] font-mono">
                      ID: {person.discord.discord_id}
                    </div>
                  </div>
                </div>

                {/* Discord roles */}
                {discordRoles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {discordRoles.map((role) => (
                      <span
                        key={role.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-mono border"
                        style={{
                          borderColor: `${role.color}40`,
                          color: role.color,
                          background: `${role.color}12`,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: role.color }} />
                        {role.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard label="Time in Service" value={tis} icon={Clock} color="text-[#60a5fa]" />
        <MetricCard
          label="Time in Grade"
          value={person.status === 'Marine' ? tig : '—'}
          icon={Shield}
          color="text-[#60a5fa]"
        />
        <MetricCard label="Date Registered" value={person.date_of_entry} icon={Calendar} color="text-[#dbeafe]" />
        <MetricCard
          label="Evals"
          value={person.evaluations?.length ?? 0}
          icon={CheckSquare}
          color="text-[#4a6fa5]"
        />
        <MetricCard
          label="Operations"
          value={attendance ? attendance.ops : '—'}
          icon={Target}
          color="text-[#60a5fa]"
        />
        <MetricCard
          label="Trainings"
          value={attendance ? attendance.trainings : '—'}
          icon={Target}
          color="text-amber-400"
        />
      </div>

      {/* Rank Progression Bar (Marines only, when feature is enabled) */}
      {rankProgressionEnabled && person.status === 'Marine' && ranks.length > 0 && (
        <RankProgressionBar person={person} ranks={ranks} attendance={attendance} />
      )}

      {/* Awards + Qualifications row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Awards */}
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#162448]">
            <Award size={13} className="text-[#3b82f6]" />
            <span className="section-header">Awards</span>
            <span className="ml-auto text-[#1a2f55] text-xs font-mono">
              {person.awards?.length || 0}
            </span>
          </div>
          {!person.awards?.length ? (
            <div className="px-4 py-6 text-[#1a2f55] text-xs font-mono text-center">NO AWARDS ON RECORD</div>
          ) : (
            <div>
              {person.awards.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#162448]/40 last:border-0">
                  <Star size={10} className="text-amber-400 shrink-0" fill="currentColor" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[#dbeafe] text-sm truncate">{a.name}</div>
                    <div className="text-[#1a2f55] text-xs font-mono">
                      {format(new Date(a.awarded_at), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Qualifications */}
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#162448]">
            <CheckSquare size={13} className="text-[#3b82f6]" />
            <span className="section-header">Qualifications</span>
            <span className="ml-auto text-[#1a2f55] text-xs font-mono">
              {person.qualifications?.length || 0}
            </span>
            {canEdit && (
              <button
                onClick={() => setShowAddQual(true)}
                className="ml-2 text-[#2a4a80] hover:text-[#60a5fa] transition-colors"
                title="Add qualification"
              >
                <Plus size={13} />
              </button>
            )}
          </div>
          {!person.qualifications?.length ? (
            <div className="px-4 py-6 text-[#1a2f55] text-xs font-mono text-center">NO QUALIFICATIONS ON RECORD</div>
          ) : (
            <div>
              {person.qualifications.map((q) => (
                <div key={q.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#162448]/40 last:border-0 group">
                  <CheckSquare size={10} className="text-[#3b82f6] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[#dbeafe] text-sm truncate">{q.name}</div>
                    <div className="text-[#1a2f55] text-xs font-mono">
                      {format(new Date(q.awarded_at), 'MMM dd, yyyy')}
                      {q.awarded_by_name && ` · ${q.awarded_by_name}`}
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => handleRemoveQual(q.id)}
                      disabled={removingQual === q.id}
                      className="text-[#2a4a80] hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
                    >
                      {removingQual === q.id ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Evaluation History */}
      {person.status === 'Marine' && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#162448]">
            <CheckCircle2 size={13} className="text-[#3b82f6]" />
            <span className="section-header">Evaluation History</span>
            <span className="ml-auto text-[#1a2f55] text-xs font-mono">
              {person.evaluations?.length || 0} evals
            </span>
          </div>
          {!person.evaluations?.length ? (
            <div className="px-4 py-6 text-[#1a2f55] text-xs font-mono text-center">NO EVALUATIONS ON RECORD</div>
          ) : (
            <>
              {displayEvals.map((ev) => (
                <div key={ev.id} className="flex items-start gap-4 px-4 py-3 border-b border-[#162448]/40 last:border-0">
                  <div className="mt-0.5">
                    {ev.behavior_meets && ev.attendance_met
                      ? <CheckCircle2 size={13} className="text-[#3b82f6]" />
                      : <AlertTriangle size={13} className="text-amber-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[#dbeafe] text-xs font-medium">
                        {format(new Date(ev.evaluated_at), 'MMM dd, yyyy')}
                      </span>
                      <span className="text-[#1a2f55] text-xs font-mono">by {ev.evaluator_name}</span>
                      <span className={`text-xs ${ev.behavior_meets ? 'text-[#60a5fa]' : 'text-red-400'}`}>
                        Behavior: {ev.behavior_meets ? 'Pass' : 'Fail'}
                      </span>
                      <span className={`text-xs ${ev.attendance_met ? 'text-[#60a5fa]' : 'text-red-400'}`}>
                        Attendance: {ev.attendance_met ? 'Pass' : 'Fail'}
                      </span>
                    </div>
                    {ev.notes && (
                      <p className="text-[#4a6fa5] text-xs mt-1 italic">{ev.notes}</p>
                    )}
                  </div>
                </div>
              ))}
              {person.evaluations.length > 3 && (
                <button
                  onClick={() => setEvalsExpanded((e) => !e)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-[#4a6fa5] hover:text-[#dbeafe] transition-colors text-xs font-mono border-t border-[#162448]/40"
                >
                  {evalsExpanded
                    ? <><ChevronUp size={12} /> Show less</>
                    : <><ChevronDown size={12} /> Show {person.evaluations.length - 3} more</>
                  }
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Attendance History */}
      {attendance && attendance.total > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#162448]">
            <Target size={13} className="text-[#3b82f6]" />
            <span className="section-header">Attendance History</span>
            <span className="ml-auto text-[#1a2f55] text-xs font-mono">{attendance.total} events</span>
          </div>
          <div>
            {attendance.records.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#162448]/40 last:border-0">
                <span className="text-[9px]">{r.type === 'Training' ? '🎯' : '⚔️'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[#dbeafe] text-xs truncate">
                    <span className="text-[#1a2f55] font-mono mr-1">#{r.operation_id}</span>
                    {r.title}
                  </div>
                  <div className="text-[#1a2f55] text-[9px] font-mono">
                    {r.start_date} · marked by {r.marked_by_name}
                  </div>
                </div>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm border ${
                  r.type === 'Training'
                    ? 'text-amber-400/70 border-amber-900/40'
                    : 'text-[#60a5fa]/70 border-[#162448]'
                }`}>
                  {r.type?.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddQual && (
        <AddQualModal
          person={person}
          onClose={() => setShowAddQual(false)}
          onAdded={handleQualAdded}
        />
      )}
    </div>
  );
}
