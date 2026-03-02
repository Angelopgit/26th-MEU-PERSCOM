import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, UserCheck, AlertTriangle, Map, Activity, Megaphone,
  Plus, Trash2, Loader2, Camera, X, ChevronLeft, ChevronRight, Clock,
} from 'lucide-react';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const BACKEND = import.meta.env.BASE_URL.replace(/\/$/, '');

const ACTION_LABELS = {
  PERSONNEL_ADDED:      'Added',
  PERSONNEL_REMOVED:    'Removed',
  PROMOTED:             'Promoted',
  DEMOTED:              'Demoted',
  AWARD_GRANTED:        'Award',
  EVALUATION_CONDUCTED: 'Evaluation',
  OPERATION_CREATED:    'Operation',
  MEMBER_REMOVED:       'Deactivated',
  DOCUMENT_CREATED:     'Document',
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

// ── Countdown Widget ──────────────────────────────────────────────────────────
function CountdownWidget({ nextOp }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!nextOp) return;
    const target = new Date(nextOp.start_date + 'T00:00:00');
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setTimeLeft({ d: 0, h: 0, m: 0, s: 0 }); return; }
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextOp]);

  const pad = (n) => String(n).padStart(2, '0');
  const isTraining = nextOp?.type === 'Training';

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#162448] bg-[#060918]/80">
        <Clock size={11} className="text-[#3b82f6]" />
        <span className="section-header text-[10px]">
          {nextOp ? (isTraining ? 'NEXT TRAINING' : 'NEXT OPERATION') : 'NEXT EVENT'}
        </span>
      </div>
      {!nextOp ? (
        <div className="px-4 py-6 text-center text-[#1a2f55] font-mono text-xs">
          NO UPCOMING EVENTS SCHEDULED
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {nextOp.image_url && (
            <img
              src={`${BACKEND}${nextOp.image_url}`}
              alt={nextOp.title}
              className="w-full h-28 object-cover rounded-sm border border-[#162448]"
            />
          )}
          <div>
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm border ${
              isTraining
                ? 'text-amber-400/70 border-amber-900/40 bg-amber-950/20'
                : 'text-[#60a5fa]/70 border-[#162448] bg-[#162448]/40'
            }`}>
              {isTraining ? '🎯 TRAINING' : '⚔️ OPERATION'}
            </span>
            <div className="text-[#dbeafe] text-sm font-medium leading-tight mt-1.5">{nextOp.title}</div>
            <div className="text-[#4a6fa5] text-[10px] font-mono mt-0.5">
              {format(parseISO(nextOp.start_date), 'MMM dd, yyyy')}
            </div>
          </div>
          {timeLeft && (
            <div className="grid grid-cols-4 gap-1.5">
              {[['d', 'DAYS'], ['h', 'HRS'], ['m', 'MIN'], ['s', 'SEC']].map(([k, lbl]) => (
                <div key={k} className="bg-[#060918] border border-[#162448] rounded-sm p-2 text-center">
                  <div
                    className="text-[#3b82f6] font-mono text-lg font-bold leading-none"
                    style={{ textShadow: '0 0 8px rgba(59,130,246,0.8)' }}
                  >
                    {pad(timeLeft[k])}
                  </div>
                  <div className="text-[#1a2f55] text-[8px] font-mono mt-0.5">{lbl}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Monthly Spotlight Slideshow ───────────────────────────────────────────────
function SpotlightWidget({ isAdmin }) {
  const [images, setImages] = useState([]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const fetchImages = useCallback(async () => {
    try { const r = await api.get('/spotlight'); setImages(r.data); } catch {}
  }, []);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  useEffect(() => {
    if (images.length <= 1 || paused) return;
    const id = setInterval(() => setIdx(i => (i + 1) % images.length), 5000);
    return () => clearInterval(id);
  }, [images.length, paused]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('image', file);
    try {
      await api.post('/spotlight', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      fetchImages();
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed');
    } finally { setUploading(false); e.target.value = ''; }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this spotlight image?')) return;
    try {
      await api.delete(`/spotlight/${id}`);
      setImages(prev => {
        const next = prev.filter(i => i.id !== id);
        setIdx(i => Math.min(i, Math.max(0, next.length - 1)));
        return next;
      });
    } catch { alert('Failed to delete'); }
  };

  const current = images[idx];

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#162448] bg-[#060918]/80">
        <div className="flex items-center gap-2">
          <Camera size={11} className="text-[#3b82f6]" />
          <span className="section-header text-[10px]">MONTHLY SPOTLIGHT</span>
        </div>
        {isAdmin && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="text-[#2a4a80] hover:text-[#dbeafe] transition-colors"
            title="Upload spotlight image"
          >
            {uploading ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
          </button>
        )}
      </div>

      {images.length === 0 ? (
        <div className="h-44 flex flex-col items-center justify-center gap-2 text-[#1a2f55] font-mono text-xs">
          <Camera size={20} className="opacity-20" />
          {isAdmin ? 'Click + to add images' : 'NO SPOTLIGHT IMAGES'}
        </div>
      ) : (
        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <img
              key={current?.id}
              src={`${BACKEND}${current?.image_url}`}
              alt={current?.title || ''}
              className="w-full h-full object-cover"
            />
            {isAdmin && (
              <button
                onClick={() => handleDelete(current.id)}
                className="absolute top-2 right-2 bg-black/60 border border-red-900/50 rounded-sm p-1 text-red-400 hover:text-red-300 transition-colors"
              >
                <X size={10} />
              </button>
            )}
            {current?.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                <div className="text-white text-xs font-medium">{current.title}</div>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <>
              <button
                onClick={() => setIdx(i => (i - 1 + images.length) % images.length)}
                className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 rounded-sm p-1 text-white/70 hover:text-white"
              >
                <ChevronLeft size={12} />
              </button>
              <button
                onClick={() => setIdx(i => (i + 1) % images.length)}
                className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 rounded-sm p-1 text-white/70 hover:text-white"
              >
                <ChevronRight size={12} />
              </button>
              <div className="flex justify-center gap-1 py-2 bg-[#06091a]">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIdx(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? 'bg-[#3b82f6]' : 'bg-[#162448]'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
  );
}

// ── Personnel Growth Chart ────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#090f1e] border border-[#162448] rounded-sm px-3 py-2 text-xs font-mono shadow-xl">
      <div className="text-[#4a6fa5] mb-0.5">{label}</div>
      <div className="text-[#60a5fa] font-bold">{payload[0].value} personnel</div>
    </div>
  );
};

function PersonnelChart({ data }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#162448] bg-[#060918]/80">
        <Users size={11} className="text-[#3b82f6]" />
        <span className="section-header text-[10px]">PERSONNEL GROWTH</span>
      </div>
      {!data?.length ? (
        <div className="py-8 text-center text-[#1a2f55] font-mono text-xs">NO DATA</div>
      ) : (
        <div className="p-2 pt-3" style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#162448" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#1a2f55', fontSize: 9, fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={d => d?.slice(5) || ''}
              />
              <YAxis
                tick={{ fill: '#1a2f55', fontSize: 9, fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeOpacity: 0.3 }} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#blueGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#3b82f6', stroke: '#060918', strokeWidth: 2 }}
                animationDuration={1500}
                style={{ filter: 'drop-shadow(0 0 4px rgba(59,130,246,0.5))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
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
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
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
    } finally { setAnnSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#3b82f6] font-mono text-xs animate-pulse tracking-widest">LOADING DATA...</div>
      </div>
    );
  }

  const pendingColor = stats?.pendingEvals > 0 ? 'amber' : 'green';
  const ann = stats?.latestAnnouncement;

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Stats — full width */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Personnel" value={stats?.totalPersonnel} icon={Users} color="green" />
        <StatCard label="Marines" value={stats?.marines} icon={UserCheck} color="blue" sub={`${stats?.civilians ?? 0} civilians`} />
        <StatCard label="Pending Evals" value={stats?.pendingEvals} icon={AlertTriangle} color={pendingColor} sub="30-day cycle" />
        <StatCard label="Active Ops" value={stats?.activeOps} icon={Map} color="blue" />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        {/* Left col — 3/5 */}
        <div className="lg:col-span-3 space-y-4">
          {/* Announcement */}
          {(ann || isAdmin) && (
            <div className="bg-[#091830] border border-[#3b82f6]/35 rounded-sm p-4">
              {!ann ? (
                <div className="flex justify-end">
                  <button onClick={() => setShowAnnModal(true)} className="btn-secondary flex items-center gap-2">
                    <Plus size={13} /> Post Announcement
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <Megaphone size={15} className="text-[#3b82f6] mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-3 mb-1.5">
                      <span className="text-[#60a5fa] font-mono text-sm font-bold uppercase tracking-wide">{ann.title}</span>
                      <span className="text-[#1a2f55] text-xs font-mono">
                        {formatDistanceToNow(new Date(ann.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-[#93c5fd] text-sm leading-relaxed">{ann.message}</p>
                    <div className="text-[#1a2f55] text-xs font-mono mt-2">— {ann.created_by_name}</div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setShowAnnModal(true)} className="btn-ghost px-2 py-1" title="New announcement">
                        <Plus size={13} />
                      </button>
                      <button onClick={() => handleDeleteAnn(ann.id)} className="text-[#2a4a80] hover:text-red-400 transition-colors p-1">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Recent Activity */}
          <div className="card">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#162448]">
              <Activity size={13} className="text-[#3b82f6]" />
              <span className="section-header">Recent Activity</span>
            </div>
            {!stats?.recentActivity?.length ? (
              <div className="px-4 py-8 text-[#1a2f55] text-sm text-center font-mono">NO ACTIVITY RECORDED</div>
            ) : (
              <div>
                {stats.recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-4 py-2.5 border-b border-[#162448]/50 last:border-0 hover:bg-[#0f1c35]/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-1 h-1 rounded-full bg-[#3b82f6]/60 shrink-0" />
                      <span className="badge-muted shrink-0">{ACTION_LABELS[item.action] || item.action}</span>
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
        </div>

        {/* Right col — 2/5 */}
        <div className="lg:col-span-2 space-y-4">
          <CountdownWidget nextOp={stats?.nextOp} />
          <SpotlightWidget isAdmin={isAdmin} />
          <PersonnelChart data={stats?.personnelGrowth} />
        </div>
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
                required autoFocus
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
              <button type="button" onClick={() => setShowAnnModal(false)} className="btn-ghost">Cancel</button>
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
