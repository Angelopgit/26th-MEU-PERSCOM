import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Star, Shield, Clock, Calendar, Award,
  CheckSquare, Loader2, Plus, X, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { differenceInDays, format, formatDistanceToNow } from 'date-fns';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

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
      <div className={`flex items-center justify-center mb-2`}>
        {Icon && <Icon size={14} className="text-[#4a6fa5]" />}
      </div>
      <div className={`text-2xl font-mono font-bold ${color}`}>{value}</div>
      <div className="section-header mt-1">{label}</div>
    </div>
  );
}

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

export default function MarineProfile() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddQual, setShowAddQual] = useState(false);
  const [evalsExpanded, setEvalsExpanded] = useState(false);
  const [removingQual, setRemovingQual] = useState(null);

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
          <div className="w-16 h-16 bg-[#3b82f6]/10 border border-[#3b82f6]/25 rounded-sm flex items-center justify-center shrink-0">
            <Shield size={24} className="text-[#3b82f6]" />
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
            </div>
            {person.status === 'Marine' && person.rank && (
              <div className="text-[#4a6fa5] text-sm font-mono mt-1">{person.rank}</div>
            )}
            <div className="text-[#1a2f55] text-xs font-mono mt-1 tracking-widest">
              26TH MEU (SOC) — {person.status.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Time in Service" value={tis} icon={Clock} color="text-[#60a5fa]" />
        <MetricCard
          label="Time in Grade"
          value={person.status === 'Marine' ? tig : '—'}
          icon={Shield}
          color="text-[#60a5fa]"
        />
        <MetricCard label="Date Registered" value={person.date_of_entry} icon={Calendar} color="text-[#dbeafe]" />
        <MetricCard
          label="Eval Status"
          value={person.evaluations?.length > 0 ? `${person.evaluations.length} evals` : 'None'}
          icon={CheckSquare}
          color="text-[#4a6fa5]"
        />
      </div>

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
            {/* Both roles can add quals */}
            <button
              onClick={() => setShowAddQual(true)}
              className="ml-2 text-[#2a4a80] hover:text-[#60a5fa] transition-colors"
              title="Add qualification"
            >
              <Plus size={13} />
            </button>
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
                  <button
                    onClick={() => handleRemoveQual(q.id)}
                    disabled={removingQual === q.id}
                    className="text-[#2a4a80] hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
                  >
                    {removingQual === q.id ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                  </button>
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
