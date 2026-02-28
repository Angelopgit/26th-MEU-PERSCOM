import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, AlertTriangle, CheckCircle2, Clock, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import api from '../utils/api';
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

function EvalStatusBadge({ status, daysSince }) {
  if (status === 'CURRENT') {
    return (
      <div className="flex items-center gap-1.5">
        <CheckCircle2 size={12} className="text-[#3b82f6]" />
        <span className="badge-green">Current</span>
        {daysSince !== null && (
          <span className="text-[#1a2f55] text-xs font-mono">{daysSince}d ago</span>
        )}
      </div>
    );
  }
  if (status === 'OVERDUE') {
    return (
      <div className="flex items-center gap-1.5">
        <AlertTriangle size={12} className="text-red-400" />
        <span className="badge-red">Overdue</span>
        {daysSince !== null && (
          <span className="text-red-400/60 text-xs font-mono">{daysSince}d ago</span>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <Clock size={12} className="text-amber-400" />
      <span className="badge-amber">Due</span>
      <span className="text-[#1a2f55] text-xs font-mono">Never</span>
    </div>
  );
}

function EvalHistoryRow({ eval: ev }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 border-b border-[#162448]/40 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[#dbeafe] text-xs">
            {format(new Date(ev.evaluated_at), 'MMM dd, yyyy')}
          </span>
          <span className="text-[#1a2f55] text-xs font-mono">by {ev.evaluator_name}</span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className={`text-xs ${ev.behavior_meets ? 'text-[#60a5fa]' : 'text-red-400'}`}>
            Behavior: {ev.behavior_meets ? 'YES' : 'NO'}
          </span>
          <span className={`text-xs ${ev.attendance_met ? 'text-[#60a5fa]' : 'text-red-400'}`}>
            Attendance: {ev.attendance_met ? 'YES' : 'NO'}
          </span>
        </div>
        {ev.notes && (
          <p className="text-[#4a6fa5] text-xs mt-1 italic">{ev.notes}</p>
        )}
      </div>
    </div>
  );
}

function EvalModal({ person, onClose, onSaved }) {
  const [form, setForm] = useState({ behavior_meets: false, attendance_met: false, notes: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/evaluations', { personnel_id: person.id, ...form });
      onSaved();
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save evaluation');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (field) => setForm((f) => ({ ...f, [field]: !f[field] }));

  const yesno = (field, label) => (
    <div
      className="flex items-center justify-between bg-[#060918] border border-[#162448] px-4 py-3 rounded-sm cursor-pointer hover:border-[#3b82f6]/30 transition-colors"
      onClick={() => toggle(field)}
    >
      <span className="text-[#bfdbfe] text-sm">{label}</span>
      <div className="flex gap-2">
        <span className={`badge ${form[field] ? 'badge-green' : 'badge-muted'}`}>YES</span>
        <span className={`badge ${!form[field] ? 'badge-red' : 'badge-muted'}`}>NO</span>
      </div>
    </div>
  );

  return (
    <Modal title={`Evaluate — ${person.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-[#4a6fa5] text-xs font-mono mb-1">
          {RANK_ABBREV[person.rank] || person.rank || 'Marine'} · 30-Day Performance Review
        </div>

        <div className="space-y-2">
          {yesno('behavior_meets', 'Marine behavior meets expectations?')}
          {yesno('attendance_met', 'Attendance requirement met?')}
        </div>

        <div>
          <label className="label">Notes (optional)</label>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="Additional observations..."
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving && <Loader2 size={13} className="animate-spin" />}
            Submit Evaluation
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Evaluations() {
  const [marines, setMarines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [expanded, setExpanded] = useState(null);
  const [history, setHistory] = useState({});
  const [histLoading, setHistLoading] = useState({});
  const [evalModal, setEvalModal] = useState(null);

  const fetchMarines = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/evaluations/status');
      setMarines(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMarines(); }, [fetchMarines]);

  const loadHistory = async (id) => {
    if (history[id]) return;
    setHistLoading((h) => ({ ...h, [id]: true }));
    try {
      const res = await api.get('/evaluations', { params: { personnel_id: id } });
      setHistory((h) => ({ ...h, [id]: res.data }));
    } catch (e) {
      console.error(e);
    } finally {
      setHistLoading((h) => ({ ...h, [id]: false }));
    }
  };

  const toggleExpand = async (id) => {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      await loadHistory(id);
    }
  };

  const filtered = marines.filter((m) => {
    if (filter === 'All') return true;
    return m.eval_status === filter.toUpperCase();
  });

  const counts = {
    all: marines.length,
    current: marines.filter((m) => m.eval_status === 'CURRENT').length,
    due: marines.filter((m) => m.eval_status === 'DUE').length,
    overdue: marines.filter((m) => m.eval_status === 'OVERDUE').length,
  };

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Marines', val: counts.all,     color: 'text-[#dbeafe]'  },
          { label: 'Current',       val: counts.current, color: 'text-[#60a5fa]'  },
          { label: 'Due',           val: counts.due,     color: 'text-amber-400'  },
          { label: 'Overdue',       val: counts.overdue, color: 'text-red-400'    },
        ].map(({ label, val, color }) => (
          <div key={label} className="card p-3 text-center">
            <div className={`text-2xl font-mono font-bold ${color}`}>{val}</div>
            <div className="section-header mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="section-header mr-1">Filter:</span>
        {['All', 'Current', 'Due', 'Overdue'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-sm border transition-colors font-mono ${
              filter === f
                ? 'bg-[#3b82f6]/10 text-[#60a5fa] border-[#3b82f6]/40'
                : 'text-[#4a6fa5] border-[#162448] hover:border-[#3b82f6]/20 hover:text-[#93c5fd]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Marine list */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-2.5 border-b border-[#162448] bg-[#060918]">
          <div className="flex-1 section-header">Marine</div>
          <div className="w-48 section-header hidden sm:block">Eval Status</div>
          <div className="w-28 section-header text-right">Actions</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={18} className="animate-spin text-[#3b82f6]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-[#1a2f55] font-mono text-xs">
            NO MARINES FOUND
          </div>
        ) : (
          filtered.map((marine) => (
            <div key={marine.id}>
              {/* Main row */}
              <div className="flex items-center gap-4 px-4 py-3 border-b border-[#162448]/50 hover:bg-[#0f1c35]/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-[#dbeafe] text-sm font-medium">{marine.name}</div>
                  <div className="text-[#4a6fa5] text-xs font-mono">
                    {RANK_ABBREV[marine.rank] || marine.rank || '—'}
                  </div>
                </div>

                <div className="w-48 hidden sm:block">
                  <EvalStatusBadge status={marine.eval_status} daysSince={marine.days_since_eval} />
                </div>

                <div className="w-28 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setEvalModal(marine)}
                    className="btn-secondary py-1 px-2.5 text-xs"
                  >
                    Evaluate
                  </button>
                  <button
                    onClick={() => toggleExpand(marine.id)}
                    className="text-[#2a4a80] hover:text-[#dbeafe] transition-colors p-1"
                    title="View history"
                  >
                    {expanded === marine.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Expanded history */}
              {expanded === marine.id && (
                <div className="bg-[#060918] border-b border-[#162448]/50">
                  <div className="px-4 py-2 border-b border-[#162448]/40">
                    <span className="section-header">Evaluation History</span>
                  </div>
                  {histLoading[marine.id] ? (
                    <div className="flex justify-center py-4">
                      <Loader2 size={14} className="animate-spin text-[#3b82f6]" />
                    </div>
                  ) : !history[marine.id]?.length ? (
                    <div className="px-4 py-4 text-[#1a2f55] text-xs font-mono text-center">
                      NO EVALUATIONS ON RECORD
                    </div>
                  ) : (
                    <div>
                      {history[marine.id].map((ev) => (
                        <EvalHistoryRow key={ev.id} eval={ev} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Eval modal */}
      {evalModal && (
        <EvalModal
          person={evalModal}
          onClose={() => setEvalModal(null)}
          onSaved={() => {
            setHistory({});
            fetchMarines();
          }}
        />
      )}
    </div>
  );
}
