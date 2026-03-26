import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Eye, CheckCircle2, XCircle, Flag,
  Loader2, AlertCircle, ChevronDown, X, User,
} from 'lucide-react';
import api from '../utils/api';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  pending:  { label: 'Pending',        bg: 'bg-amber-950/40',  border: 'border-amber-800/40',  text: 'text-amber-400',  dot: 'bg-amber-400' },
  accepted: { label: 'Accepted',       bg: 'bg-green-950/40',  border: 'border-green-800/40',  text: 'text-green-400',  dot: 'bg-green-400' },
  rejected: { label: 'Rejected',       bg: 'bg-red-950/40',    border: 'border-red-800/40',    text: 'text-red-400',    dot: 'bg-red-400' },
  review:   { label: 'Further Review', bg: 'bg-yellow-950/40', border: 'border-yellow-800/40', text: 'text-yellow-400', dot: 'bg-yellow-400' },
};

const TABS = ['all', 'pending', 'accepted', 'rejected', 'review'];
const TAB_LABELS = { all: 'All', pending: 'Pending', accepted: 'Accepted', rejected: 'Rejected', review: 'Further Review' };

function StatusBadge({ status }) {
  const cfg = STATUS[status] || STATUS.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-mono border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Full Application Detail Modal ─────────────────────────────────────────────
function AppModal({ app, onClose, onReview }) {
  const [view, setView]           = useState('detail'); // 'detail' | 'approve' | 'reject' | 'flag'
  const [denialReason, setDenial] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const avatarUrl = app.discord_avatar
    ? `https://cdn.discordapp.com/avatars/${app.discord_id}/${app.discord_avatar}.png?size=80`
    : null;

  const doReview = async (status, extra = {}) => {
    setLoading(true);
    setError('');
    try {
      await onReview(app.id, { status, ...extra });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Action failed. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#090f1e] border border-[#162448] rounded-sm w-full max-w-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#162448]">
          <div className="flex items-center gap-3">
            {avatarUrl
              ? <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full border border-[#1e3364]" />
              : <div className="w-10 h-10 rounded-full bg-[#1e3364]/50 border border-[#1e3364] flex items-center justify-center">
                  <User size={18} className="text-[#4a6fa5]" />
                </div>
            }
            <div>
              <div className="text-[#dbeafe] font-medium">{app.first_name} {app.last_name}</div>
              <div className="text-[#4a6fa5] font-mono text-[10px]">{app.discord_username} · #{app.id}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={app.status} />
            <button onClick={onClose} className="text-[#2a4a80] hover:text-[#dbeafe] transition-colors p-1">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
          {view === 'detail' && (
            <>
              {/* Two-column fields */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {[
                  ['Age', app.age],
                  ['Platform', app.platform],
                  ['Desired Role', app.desired_role],
                  ['Reforger Experience', app.reforger_experience],
                  ['How Heard', app.how_heard],
                  ['Referred By', app.referred_by || '—'],
                  ['Other Unit', app.other_unit || 'No'],
                  ['Unit Conflict', app.other_unit_conflict || '—'],
                  ['Long-term Commitment', app.long_term_commitment ? 'Yes' : 'No'],
                  ['NA Timezone Understood', app.na_timezone ? 'Yes' : 'No'],
                  ['Submitted', new Date(app.submitted_at).toLocaleString()],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-[#1a2f55] font-mono text-[9px] tracking-widest uppercase mb-0.5">{k}</div>
                    <div className="text-[#dbeafe] text-xs">{v}</div>
                  </div>
                ))}
              </div>

              {/* Why join */}
              <div>
                <div className="text-[#1a2f55] font-mono text-[9px] tracking-widest uppercase mb-1">Why Join</div>
                <div className="text-[#dbeafe] text-xs leading-relaxed bg-[#06091a] border border-[#162448] rounded-sm p-3 whitespace-pre-wrap">
                  {app.why_join}
                </div>
              </div>

              {app.denial_reason && (
                <div className="bg-red-950/20 border border-red-900/40 rounded-sm p-3">
                  <div className="text-red-400 font-mono text-[9px] tracking-widest mb-1">DENIAL REASON</div>
                  <div className="text-red-300 text-xs">{app.denial_reason}</div>
                </div>
              )}

              {app.reviewed_by_name && (
                <div className="text-[#4a6fa5] font-mono text-[10px]">
                  Reviewed by: {app.reviewed_by_name} · {app.reviewed_at ? new Date(app.reviewed_at).toLocaleString() : '—'}
                </div>
              )}
            </>
          )}

          {view === 'approve' && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 size={40} className="text-green-400 mx-auto" />
              <div className="text-[#dbeafe] font-mono text-sm font-bold">APPROVE APPLICATION?</div>
              <p className="text-[#4a6fa5] text-xs">
                This will create a Marine record for <strong className="text-[#dbeafe]">{app.first_name} {app.last_name}</strong> as <strong className="text-[#dbeafe]">E1 Recruit</strong> and assign Discord roles.
              </p>
              {error && (
                <div className="flex items-start gap-2 text-red-400 text-xs bg-red-950/30 border border-red-900/40 px-3 py-2 rounded-sm text-left">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <div className="flex gap-3 justify-center">
                <button onClick={() => setView('detail')} className="px-4 py-2 rounded-sm border border-[#162448] text-[#4a6fa5] hover:text-[#dbeafe] font-mono text-xs transition-all">
                  CANCEL
                </button>
                <button
                  onClick={() => doReview('accepted')}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 rounded-sm bg-green-700/30 border border-green-700/50 text-green-300 hover:bg-green-700/50 font-mono text-xs transition-all"
                >
                  {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                  APPROVE
                </button>
              </div>
            </div>
          )}

          {view === 'reject' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <XCircle size={18} className="text-red-400" />
                <span className="text-[#dbeafe] font-mono text-sm font-bold">REJECT APPLICATION</span>
              </div>
              <div>
                <label className="label">Denial Reason <span className="text-red-400">*</span></label>
                <textarea
                  rows={4}
                  className="input-field w-full resize-none"
                  placeholder="Explain why this application is being denied..."
                  value={denialReason}
                  onChange={e => setDenial(e.target.value)}
                />
              </div>
              {error && (
                <div className="flex items-start gap-2 text-red-400 text-xs bg-red-950/30 border border-red-900/40 px-3 py-2 rounded-sm">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setView('detail')} className="flex-1 px-4 py-2 rounded-sm border border-[#162448] text-[#4a6fa5] hover:text-[#dbeafe] font-mono text-xs transition-all">
                  CANCEL
                </button>
                <button
                  onClick={() => doReview('rejected', { denial_reason: denialReason })}
                  disabled={loading || !denialReason.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-sm bg-red-900/30 border border-red-800/50 text-red-300 hover:bg-red-900/50 font-mono text-xs transition-all"
                >
                  {loading ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                  REJECT
                </button>
              </div>
            </div>
          )}

          {view === 'flag' && (
            <div className="text-center space-y-4 py-4">
              <Flag size={36} className="text-yellow-400 mx-auto" />
              <div className="text-[#dbeafe] font-mono text-sm font-bold">FLAG FOR FURTHER REVIEW?</div>
              <p className="text-[#4a6fa5] text-xs">This will mark the application as requiring additional review by Command Staff.</p>
              {error && (
                <div className="flex items-start gap-2 text-red-400 text-xs bg-red-950/30 border border-red-900/40 px-3 py-2 rounded-sm text-left">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <div className="flex gap-3 justify-center">
                <button onClick={() => setView('detail')} className="px-4 py-2 rounded-sm border border-[#162448] text-[#4a6fa5] hover:text-[#dbeafe] font-mono text-xs transition-all">
                  CANCEL
                </button>
                <button
                  onClick={() => doReview('review')}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 rounded-sm bg-yellow-900/30 border border-yellow-800/50 text-yellow-300 hover:bg-yellow-900/50 font-mono text-xs transition-all"
                >
                  {loading ? <Loader2 size={12} className="animate-spin" /> : <Flag size={12} />}
                  FLAG
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions — only show on detail view */}
        {view === 'detail' && !['accepted'].includes(app.status) && (
          <div className="px-6 py-4 border-t border-[#162448] flex flex-wrap items-center gap-2">
            {app.status !== 'accepted' && (
              <button
                onClick={() => setView('approve')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-green-700/40 bg-green-950/20 text-green-400 hover:bg-green-950/40 font-mono text-xs transition-all"
              >
                <CheckCircle2 size={12} /> Approve
              </button>
            )}
            {!['rejected'].includes(app.status) && (
              <button
                onClick={() => setView('reject')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-red-800/40 bg-red-950/20 text-red-400 hover:bg-red-950/40 font-mono text-xs transition-all"
              >
                <XCircle size={12} /> Reject
              </button>
            )}
            {!['review'].includes(app.status) && (
              <button
                onClick={() => setView('flag')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-yellow-800/40 bg-yellow-950/20 text-yellow-400 hover:bg-yellow-950/40 font-mono text-xs transition-all"
              >
                <Flag size={12} /> Further Review
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Applications Page ─────────────────────────────────────────────────────
export default function Applications() {
  const { isAdmin, isMod } = useAuth();
  const navigate           = useNavigate();
  const [apps, setApps]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setTab]   = useState('all');
  const [selected, setSelected] = useState(null);
  const [error, setError]       = useState('');

  // Redirect non-staff
  useEffect(() => {
    if (!isAdmin && !isMod) navigate('/personnel', { replace: true });
  }, [isAdmin, isMod, navigate]);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = activeTab !== 'all' ? `?status=${activeTab}` : '';
      const res = await api.get(`/applications${params}`);
      setApps(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  // Count for each tab (fetch all for counts)
  const [allApps, setAllApps] = useState([]);
  useEffect(() => {
    api.get('/applications').then(r => setAllApps(r.data)).catch(() => {});
  }, []);

  const counts = TABS.reduce((acc, t) => {
    acc[t] = t === 'all' ? allApps.length : allApps.filter(a => a.status === t).length;
    return acc;
  }, {});

  const handleReview = async (id, payload) => {
    await api.patch(`/applications/${id}/review`, payload);
    await fetchApps();
    // Refresh counts
    const r = await api.get('/applications');
    setAllApps(r.data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#dbeafe] font-mono text-xl font-bold tracking-wide flex items-center gap-2">
            <ClipboardList size={20} className="text-[#3b82f6]" />
            APPLICATIONS
          </h1>
          <p className="text-[#1a2f55] font-mono text-[10px] tracking-widest mt-1">
            // RECRUITMENT MANAGEMENT — 26TH MEU (SOC)
          </p>
        </div>
        <button
          onClick={fetchApps}
          className="px-3 py-1.5 border border-[#162448] hover:border-[#3b82f6]/30 text-[#4a6fa5] hover:text-[#93c5fd] font-mono text-xs rounded-sm transition-all"
        >
          REFRESH
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setTab(tab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-mono text-xs border transition-all ${
              activeTab === tab
                ? 'bg-[#3b82f6]/15 border-[#3b82f6]/40 text-[#60a5fa]'
                : 'border-[#162448] text-[#4a6fa5] hover:border-[#1e3364] hover:text-[#93c5fd]'
            }`}
          >
            {TAB_LABELS[tab]}
            {counts[tab] > 0 && (
              <span className={`px-1.5 py-0.5 rounded-sm text-[9px] ${
                activeTab === tab ? 'bg-[#3b82f6]/30 text-[#93c5fd]' : 'bg-[#162448] text-[#4a6fa5]'
              }`}>{counts[tab]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-red-400 text-xs bg-red-950/30 border border-red-900/40 px-4 py-3 rounded-sm">
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#090f1e] border border-[#162448] rounded-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-[#3b82f6]" />
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-16 text-[#1a2f55] font-mono text-xs">
            NO APPLICATIONS FOUND
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#162448]">
                    {['Applicant', 'Age', 'Platform', 'Status', 'Submitted', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[#1a2f55] font-mono text-[9px] tracking-widest uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0d1830]">
                  {apps.map(app => {
                    const avatarUrl = app.discord_avatar
                      ? `https://cdn.discordapp.com/avatars/${app.discord_id}/${app.discord_avatar}.png?size=32`
                      : null;
                    return (
                      <tr key={app.id} className="hover:bg-[#0d1830]/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {avatarUrl
                              ? <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full border border-[#1e3364] shrink-0" />
                              : <div className="w-7 h-7 rounded-full bg-[#1e3364]/50 border border-[#1e3364] flex items-center justify-center shrink-0">
                                  <User size={13} className="text-[#4a6fa5]" />
                                </div>
                            }
                            <div>
                              <div className="text-[#dbeafe] font-medium text-xs">{app.first_name} {app.last_name}</div>
                              <div className="text-[#4a6fa5] font-mono text-[10px]">{app.discord_username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#4a6fa5] text-xs">{app.age}</td>
                        <td className="px-4 py-3 text-[#4a6fa5] text-xs">{app.platform}</td>
                        <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                        <td className="px-4 py-3 text-[#4a6fa5] font-mono text-[10px]">
                          {new Date(app.submitted_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelected(app)}
                              className="flex items-center gap-1 px-2 py-1 rounded-sm border border-[#162448] hover:border-[#3b82f6]/30 text-[#4a6fa5] hover:text-[#93c5fd] font-mono text-[10px] transition-all"
                            >
                              <Eye size={10} /> View
                            </button>
                            {!['accepted'].includes(app.status) && (
                              <button
                                onClick={() => setSelected({ ...app, _openView: 'approve' })}
                                className="flex items-center gap-1 px-2 py-1 rounded-sm border border-green-800/40 bg-green-950/20 text-green-400 hover:bg-green-950/40 font-mono text-[10px] transition-all"
                              >
                                <CheckCircle2 size={10} />
                              </button>
                            )}
                            {!['rejected'].includes(app.status) && (
                              <button
                                onClick={() => setSelected({ ...app, _openView: 'reject' })}
                                className="flex items-center gap-1 px-2 py-1 rounded-sm border border-red-800/40 bg-red-950/20 text-red-400 hover:bg-red-950/40 font-mono text-[10px] transition-all"
                              >
                                <XCircle size={10} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-[#0d1830]">
              {apps.map(app => {
                const avatarUrl = app.discord_avatar
                  ? `https://cdn.discordapp.com/avatars/${app.discord_id}/${app.discord_avatar}.png?size=32`
                  : null;
                return (
                  <div key={app.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {avatarUrl
                        ? <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full border border-[#1e3364]" />
                        : <div className="w-9 h-9 rounded-full bg-[#1e3364]/50 border border-[#1e3364] flex items-center justify-center">
                            <User size={15} className="text-[#4a6fa5]" />
                          </div>
                      }
                      <div>
                        <div className="text-[#dbeafe] text-sm font-medium">{app.first_name} {app.last_name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StatusBadge status={app.status} />
                          <span className="text-[#4a6fa5] font-mono text-[9px]">{new Date(app.submitted_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelected(app)}
                      className="p-2 text-[#4a6fa5] hover:text-[#93c5fd] transition-colors"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Application modal */}
      {selected && (
        <AppModal
          app={selected}
          onClose={() => setSelected(null)}
          onReview={handleReview}
        />
      )}
    </div>
  );
}
