import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Settings as SettingsIcon, Upload, Trash2, Loader2, Image, CheckCircle,
  Users, RefreshCw, Shield, TrendingUp, Plus, X,
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ASSET_BASE } from '../utils/imgUrl';

const ROLE_LABELS = {
  admin: 'Administrator',
  moderator: 'Moderator',
  marine: 'Marine',
};

const ROLE_OPTIONS = ['admin', 'moderator', 'marine'];

// ── Rank Row ──────────────────────────────────────────────────────────────────
function RankRow({ rank, onUpdate, onDelete }) {
  const iconRef = useRef(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [name, setName]                   = useState(rank.name);
  const [sortOrder, setSortOrder]         = useState(rank.sort_order);
  const [reqOps, setReqOps]               = useState(rank.req_ops);
  const [reqTrn, setReqTrn]               = useState(rank.req_trainings);
  const [reqAtn, setReqAtn]               = useState(rank.req_attendance);
  const [deleting, setDeleting]           = useState(false);

  const save = useCallback(async (overrides = {}) => {
    try {
      const res = await api.put(`/ranks/${rank.id}`, {
        name,
        sort_order: sortOrder,
        req_ops: reqOps,
        req_trainings: reqTrn,
        req_attendance: reqAtn,
        ...overrides,
      });
      onUpdate(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save rank');
    }
  }, [rank.id, name, sortOrder, reqOps, reqTrn, reqAtn, onUpdate]);

  const handleIconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIcon(true);
    const fd = new FormData();
    fd.append('icon', file);
    try {
      const res = await api.post(`/ranks/${rank.id}/icon`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUpdate({ ...rank, icon_url: res.data.icon_url });
    } catch { alert('Icon upload failed'); }
    finally { setUploadingIcon(false); e.target.value = ''; }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete rank "${rank.name}"?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/ranks/${rank.id}`);
      onDelete(rank.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete rank');
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[#162448]/40 last:border-0">
      {/* Icon upload */}
      <button
        onClick={() => iconRef.current?.click()}
        title="Upload rank icon"
        className="shrink-0 hover:opacity-80 transition-opacity"
      >
        {uploadingIcon ? (
          <Loader2 size={12} className="animate-spin text-[#3b82f6]" />
        ) : rank.icon_url ? (
          <img
            src={`${ASSET_BASE}${rank.icon_url}`}
            alt={rank.name}
            className="w-7 h-7 object-contain rounded-sm"
          />
        ) : (
          <div className="w-7 h-7 border border-dashed border-[#162448] rounded-sm flex items-center justify-center">
            <Image size={10} className="text-[#2a4a80]" />
          </div>
        )}
      </button>
      <input ref={iconRef} type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />

      {/* Name */}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => save({ name })}
        className="input-field flex-1 py-1 text-xs"
        placeholder="Rank name"
      />

      {/* Sort order */}
      <div className="flex flex-col items-center shrink-0">
        <span className="text-[#1a2f55] text-[9px] font-mono mb-0.5">ORDER</span>
        <input
          type="number" min="0"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
          onBlur={() => save({ sort_order: sortOrder })}
          className="input-field w-12 py-1 text-xs text-center"
        />
      </div>

      {/* Requirements */}
      <div className="flex gap-2 shrink-0">
        <div className="flex flex-col items-center">
          <span className="text-[#1a2f55] text-[9px] font-mono mb-0.5">OPS</span>
          <input
            type="number" min="0"
            value={reqOps}
            onChange={(e) => setReqOps(Number(e.target.value) || 0)}
            onBlur={() => save({ req_ops: reqOps })}
            className="input-field w-12 py-1 text-xs text-center"
          />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[#1a2f55] text-[9px] font-mono mb-0.5">TRN</span>
          <input
            type="number" min="0"
            value={reqTrn}
            onChange={(e) => setReqTrn(Number(e.target.value) || 0)}
            onBlur={() => save({ req_trainings: reqTrn })}
            className="input-field w-12 py-1 text-xs text-center"
          />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[#1a2f55] text-[9px] font-mono mb-0.5">ATN</span>
          <input
            type="number" min="0"
            value={reqAtn}
            onChange={(e) => setReqAtn(Number(e.target.value) || 0)}
            onBlur={() => save({ req_attendance: reqAtn })}
            className="input-field w-12 py-1 text-xs text-center"
          />
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="text-[#2a4a80] hover:text-red-400 transition-colors shrink-0"
        title="Delete rank"
      >
        {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
      </button>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Settings() {
  const { logoUrl, setLogoUrl, adminAlias, user: currentUser } = useAuth();
  const fileRef  = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving]   = useState(false);
  const [flash, setFlash]         = useState('');

  // User management
  const [users, setUsers]               = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [changingRole, setChangingRole] = useState(null);
  const [syncing, setSyncing]           = useState(false);

  // Ranks
  const [ranks, setRanks]                           = useState([]);
  const [ranksLoading, setRanksLoading]             = useState(true);
  const [rankProgressionEnabled, setRankProgressionEnabled] = useState(false);
  const [togglingProgression, setTogglingProgression]       = useState(false);
  const [newRankName, setNewRankName]               = useState('');
  const [addingRank, setAddingRank]                 = useState(false);

  const showFlash = (msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(''), 3000);
  };

  useEffect(() => {
    api.get('/users')
      .then((res) => setUsers(res.data))
      .catch(() => {})
      .finally(() => setUsersLoading(false));

    Promise.all([
      api.get('/ranks'),
      api.get('/settings/rank-progression'),
    ]).then(([ranksRes, rpRes]) => {
      setRanks(ranksRes.data);
      setRankProgressionEnabled(rpRes.data.enabled);
    }).catch(() => {})
      .finally(() => setRanksLoading(false));
  }, []);

  // ── Logo handlers ──────────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await api.post('/settings/logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLogoUrl(res.data.logo_url);
      showFlash('Logo updated successfully.');
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemove = async () => {
    if (!confirm('Remove the current logo?')) return;
    setRemoving(true);
    try {
      await api.delete('/settings/logo');
      setLogoUrl(null);
      showFlash('Logo removed.');
    } catch {
      alert('Failed to remove logo');
    } finally {
      setRemoving(false);
    }
  };

  // ── User management handlers ───────────────────────────────────────────────
  const handleRoleChange = async (userId, newRole) => {
    setChangingRole(userId);
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
      showFlash('User role updated.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to change role');
    } finally {
      setChangingRole(null);
    }
  };

  const handleSyncRoles = async () => {
    setSyncing(true);
    try {
      const res = await api.post('/settings/sync-roles');
      showFlash(`Role sync complete: ${res.data.synced} synced, ${res.data.errors} errors.`);
    } catch (err) {
      alert(err.response?.data?.error || 'Role sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const getDiscordAvatarUrl = (u) => {
    if (u.discord_id && u.discord_avatar) {
      return `https://cdn.discordapp.com/avatars/${u.discord_id}/${u.discord_avatar}.png?size=32`;
    }
    return null;
  };

  // ── Rank handlers ──────────────────────────────────────────────────────────
  const handleToggleProgression = async () => {
    setTogglingProgression(true);
    try {
      const res = await api.patch('/settings/rank-progression', { enabled: !rankProgressionEnabled });
      setRankProgressionEnabled(res.data.enabled);
      showFlash(`Rank progression ${res.data.enabled ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update setting');
    } finally {
      setTogglingProgression(false);
    }
  };

  const handleAddRank = async (e) => {
    e.preventDefault();
    if (!newRankName.trim()) return;
    setAddingRank(true);
    try {
      const maxOrder = ranks.length > 0 ? Math.max(...ranks.map((r) => r.sort_order)) + 1 : 0;
      const res = await api.post('/ranks', { name: newRankName.trim(), sort_order: maxOrder });
      setRanks((prev) => [...prev, res.data].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id));
      setNewRankName('');
      showFlash(`Rank "${res.data.name}" added.`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add rank');
    } finally {
      setAddingRank(false);
    }
  };

  const handleRankUpdated = (updated) => {
    setRanks((prev) =>
      prev.map((r) => r.id === updated.id ? updated : r)
        .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    );
  };

  const handleRankDeleted = (id) => {
    setRanks((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-2">
        <SettingsIcon size={14} className="text-[#3b82f6]" />
        <span className="section-header text-sm">System Settings</span>
        {adminAlias && (
          <span className="ml-auto text-[#1a2f55] font-mono text-xs">{adminAlias}</span>
        )}
      </div>

      {flash && (
        <div className="flex items-center gap-2 text-[#60a5fa] text-xs bg-[#3b82f6]/5 border border-[#3b82f6]/20 px-3 py-2.5 rounded-sm">
          <CheckCircle size={12} />
          {flash}
        </div>
      )}

      {/* Logo section */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#162448]">
          <Image size={13} className="text-[#3b82f6]" />
          <span className="section-header">Unit Logo</span>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-[#4a6fa5] text-xs leading-relaxed">
            Upload a unit logo to replace the default icon in the sidebar and login screen.
            Recommended: PNG or SVG, square, at least 64×64px. Max 2 MB.
          </p>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#0c1428] border border-[#162448] rounded-sm flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Unit logo" className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-[#1a2f55] text-[9px] font-mono text-center">NO LOGO</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="btn-primary flex items-center gap-2 text-xs py-1.5"
              >
                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                {logoUrl ? 'Replace Logo' : 'Upload Logo'}
              </button>
              {logoUrl && (
                <button
                  onClick={handleRemove}
                  disabled={removing}
                  className="btn-danger flex items-center gap-2 text-xs py-1.5"
                >
                  {removing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Remove Logo
                </button>
              )}
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {/* User Management */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#162448]">
          <Users size={13} className="text-[#3b82f6]" />
          <span className="section-header">User Management</span>
          <span className="ml-auto text-[#1a2f55] text-xs font-mono">{users.length} users</span>
        </div>
        <div className="p-4">
          {usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={18} className="animate-spin text-[#3b82f6]" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-[#1a2f55] text-xs font-mono text-center py-6">NO USERS FOUND</div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => {
                const avatarUrl = getDiscordAvatarUrl(u);
                const isSelf = u.id === currentUser?.id;
                return (
                  <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 rounded-sm border border-[#162448]/40 hover:border-[#162448]">
                    <div className="w-8 h-8 rounded-full bg-[#0c1428] border border-[#162448] flex items-center justify-center shrink-0 overflow-hidden">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Shield size={12} className="text-[#3b82f6]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[#dbeafe] text-sm font-medium truncate">
                        {u.display_name}
                        {isSelf && <span className="text-[#3b82f6] text-[10px] ml-1">(you)</span>}
                      </div>
                      <div className="text-[#1a2f55] text-[10px] font-mono truncate">
                        {u.discord_username ? `Discord: ${u.discord_username}` : u.username || 'N/A'}
                        {u.personnel_rank && ` · ${u.personnel_rank}`}
                      </div>
                    </div>
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      disabled={isSelf || changingRole === u.id}
                      className="bg-[#0c1428] border border-[#162448] text-[#dbeafe] text-xs font-mono rounded-sm px-2 py-1.5 focus:border-[#3b82f6] outline-none disabled:opacity-50"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Ranks & Progression */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#162448]">
          <TrendingUp size={13} className="text-[#3b82f6]" />
          <span className="section-header">Ranks &amp; Progression</span>
          <div className="ml-auto flex items-center gap-2.5">
            <span className="text-[#4a6fa5] text-[10px] font-mono">
              {rankProgressionEnabled ? 'BARS ON' : 'BARS OFF'}
            </span>
            <button
              onClick={handleToggleProgression}
              disabled={togglingProgression}
              title="Toggle rank progression bars for all marines"
              className={`relative inline-flex w-9 h-5 items-center rounded-full transition-colors ${
                rankProgressionEnabled ? 'bg-[#3b82f6]' : 'bg-[#162448]'
              } disabled:opacity-50`}
            >
              <span className={`absolute w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${
                rankProgressionEnabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
              }`} />
            </button>
          </div>
        </div>

        {/* Column headers */}
        <div className="flex items-center gap-2.5 px-4 py-1.5 bg-[#060918]/50">
          <div className="w-7 shrink-0" />
          <span className="text-[#1a2f55] text-[9px] font-mono flex-1">NAME</span>
          <div className="flex gap-2 shrink-0">
            <span className="text-[#1a2f55] text-[9px] font-mono w-12 text-center">ORDER</span>
            <span className="text-[#1a2f55] text-[9px] font-mono w-12 text-center">OPS REQ</span>
            <span className="text-[#1a2f55] text-[9px] font-mono w-12 text-center">TRN REQ</span>
            <span className="text-[#1a2f55] text-[9px] font-mono w-12 text-center">ATN REQ</span>
          </div>
          <div className="w-4 shrink-0" />
        </div>

        {ranksLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={18} className="animate-spin text-[#3b82f6]" />
          </div>
        ) : ranks.length === 0 ? (
          <div className="px-4 py-6 text-[#1a2f55] text-xs font-mono text-center">NO RANKS DEFINED</div>
        ) : (
          <div>
            {ranks.map((rank) => (
              <RankRow
                key={rank.id}
                rank={rank}
                onUpdate={handleRankUpdated}
                onDelete={handleRankDeleted}
              />
            ))}
          </div>
        )}

        {/* Add rank */}
        <div className="px-4 py-3 border-t border-[#162448]">
          <form onSubmit={handleAddRank} className="flex gap-2">
            <input
              className="input-field flex-1 text-xs py-1.5"
              placeholder="New rank name (e.g. Master Sergeant)"
              value={newRankName}
              onChange={(e) => setNewRankName(e.target.value)}
            />
            <button
              type="submit"
              disabled={addingRank || !newRankName.trim()}
              className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3"
            >
              {addingRank ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Add
            </button>
          </form>
          <p className="text-[#1a2f55] text-[9px] font-mono mt-2">
            OPS REQ / TRN REQ / ATN REQ — minimum ops, trainings, total attendance to reach that rank.
            Click the icon area to upload a rank insignia (2 MB max).
          </p>
        </div>
      </div>

      {/* Discord Sync */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#162448]">
          <RefreshCw size={13} className="text-[#3b82f6]" />
          <span className="section-header">Discord Sync</span>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-[#4a6fa5] text-xs leading-relaxed">
            Sync all PERSCOM rank assignments to Discord roles. This will update Discord roles
            to match the current PERSCOM rank for all linked Marines.
          </p>
          <button
            onClick={handleSyncRoles}
            disabled={syncing}
            className="btn-primary flex items-center gap-2 text-xs py-1.5"
          >
            {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {syncing ? 'Syncing...' : 'Sync Roles Now'}
          </button>
        </div>
      </div>

      {/* Credentials reminder */}
      <div className="card p-4">
        <div className="text-[#1a2f55] font-mono text-[10px] tracking-widest mb-3">SYSTEM ACCOUNTS</div>
        <div className="space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-[#4a6fa5]">Admin login</span>
            <span className="text-[#dbeafe]">command</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#4a6fa5]">Moderator login</span>
            <span className="text-[#dbeafe]">drillsgt</span>
          </div>
        </div>
        <p className="text-[#1a2f55] text-[9px] font-mono mt-3">
          To reset all data, run: <code className="text-[#3b82f6]">npm run seed</code> in the backend directory.
        </p>
      </div>
    </div>
  );
}
