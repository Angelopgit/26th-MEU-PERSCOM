import { useState, useEffect, useCallback } from 'react';
import { Users, UserCheck, AlertTriangle, Map, Activity, Megaphone, Plus, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const ACTION_LABELS = {
  PERSONNEL_ADDED:      'Added',
  PERSONNEL_REMOVED:    'Removed',
  PROMOTED:             'Promoted',
  DEMOTED:              'Demoted',
  AWARD_GRANTED:        'Award',
  EVALUATION_CONDUCTED: 'Evaluation',
  OPERATION_CREATED:    'Operation',
};

function StatCard({ label, value, icon: Icon, color = 'green', sub }) {
  const styles = {
    green: { wrap: 'text-[#60a5fa] bg-[#3b82f6]/10 border-[#3b82f6]/25', val: 'text-[#60a5fa]' },
    amber: { wrap: 'text-amber-400 bg-amber-900/15 border-amber-900/30', val: 'text-amber-400' },
    blue:  { wrap: 'text-sky-400 bg-sky-900/15 border-sky-900/30',       val: 'text-sky-400'   },
    red:   { wrap: 'text-red-400 bg-red-900/15 border-red-900/30',       val: 'text-red-400'   },
  };
  const s = styles[color] || styles.green;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="section-header">{label}</span>
        <div className={`w-8 h-8 flex items-center justify-center rounded-sm border ${s.wrap}`}>
          <Icon size={14} />
        </div>
      </div>
      <div className={`text-3xl font-mono font-bold ${s.val}`}>{value ?? '—'}</div>
      {sub && <div className="text-[#4a6fa5] text-xs mt-1">{sub}</div>}
    </div>
  );
}

function AnnouncementBanner({ ann, isAdmin, onDelete, onNew }) {
  if (!ann && !isAdmin) return null;

  if (!ann) {
    return (
      <div className="flex justify-end">
        <button onClick={onNew} className="btn-secondary flex items-center gap-2">
          <Plus size={13} /> Post Announcement
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#091830] border border-[#3b82f6]/35 rounded-sm p-4">
      <div className="flex items-start gap-3">
        <Megaphone size={15} className="text-[#3b82f6] mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-3 mb-1.5">
            <span className="text-[#60a5fa] font-mono text-sm font-bold uppercase tracking-wide">
              {ann.title}
            </span>
            <span className="text-[#1a2f55] text-xs font-mono">
              {formatDistanceToNow(new Date(ann.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-[#93c5fd] text-sm leading-relaxed">{ann.message}</p>
          <div className="text-[#1a2f55] text-xs font-mono mt-2">— {ann.created_by_name}</div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onNew} title="New announcement" className="btn-ghost px-2 py-1">
              <Plus size={13} />
            </button>
            <button onClick={() => onDelete(ann.id)} title="Delete" className="text-[#2a4a80] hover:text-red-400 transition-colors p-1">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annForm, setAnnForm] = useState({ title: '', message: '' });
  const [annSaving, setAnnSaving] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleDeleteAnn = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    await api.delete(`/announcements/${id}`);
    fetchStats();
  };

  const handlePostAnn = async (e) => {
    e.preventDefault();
    setAnnSaving(true);
    try {
      await api.post('/announcements', annForm);
      setShowAnnModal(false);
      setAnnForm({ title: '', message: '' });
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to post announcement');
    } finally {
      setAnnSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#3b82f6] font-mono text-xs animate-pulse tracking-widest">
          LOADING DATA...
        </div>
      </div>
    );
  }

  const pendingColor = stats?.pendingEvals > 0 ? 'amber' : 'green';

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Announcement */}
      <AnnouncementBanner
        ann={stats?.latestAnnouncement}
        isAdmin={isAdmin}
        onDelete={handleDeleteAnn}
        onNew={() => setShowAnnModal(true)}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Personnel"
          value={stats?.totalPersonnel}
          icon={Users}
          color="green"
        />
        <StatCard
          label="Marines"
          value={stats?.marines}
          icon={UserCheck}
          color="blue"
          sub={`${stats?.civilians ?? 0} civilians`}
        />
        <StatCard
          label="Pending Evals"
          value={stats?.pendingEvals}
          icon={AlertTriangle}
          color={pendingColor}
          sub="30-day cycle"
        />
        <StatCard
          label="Active Ops"
          value={stats?.activeOps}
          icon={Map}
          color="blue"
        />
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#162448]">
          <Activity size={13} className="text-[#3b82f6]" />
          <span className="section-header">Recent Activity</span>
        </div>

        {!stats?.recentActivity?.length ? (
          <div className="px-4 py-8 text-[#1a2f55] text-sm text-center font-mono">
            NO ACTIVITY RECORDED
          </div>
        ) : (
          <div>
            {stats.recentActivity.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-2.5 border-b border-[#162448]/50 last:border-0 hover:bg-[#0f1c35]/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-1 h-1 rounded-full bg-[#3b82f6]/60 shrink-0" />
                  <span className="badge-muted shrink-0">
                    {ACTION_LABELS[item.action] || item.action}
                  </span>
                  <span className="text-[#bfdbfe] text-sm truncate">{item.details}</span>
                </div>
                <span className="text-[#1a2f55] text-xs font-mono shrink-0 ml-4">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Announcement Modal */}
      {showAnnModal && (
        <Modal title="Post Announcement" onClose={() => setShowAnnModal(false)}>
          <form onSubmit={handlePostAnn} className="space-y-4">
            <div>
              <label className="label">Title</label>
              <input
                className="input-field"
                placeholder="Announcement title"
                value={annForm.title}
                onChange={(e) => setAnnForm((f) => ({ ...f, title: e.target.value }))}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea
                className="input-field resize-none"
                rows={4}
                placeholder="Announcement message..."
                value={annForm.message}
                onChange={(e) => setAnnForm((f) => ({ ...f, message: e.target.value }))}
                required
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setShowAnnModal(false)} className="btn-ghost">
                Cancel
              </button>
              <button type="submit" disabled={annSaving} className="btn-primary flex items-center gap-2">
                {annSaving && <Loader2 size={13} className="animate-spin" />}
                Post
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
