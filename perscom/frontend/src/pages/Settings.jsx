import { useState, useRef, useEffect } from 'react';
import {
  Settings as SettingsIcon, Upload, Trash2, Loader2, Image, CheckCircle,
  Users, RefreshCw, Shield,
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = {
  admin: 'Administrator',
  moderator: 'Moderator',
  marine: 'Marine',
};

const ROLE_OPTIONS = ['admin', 'moderator', 'marine'];

export default function Settings() {
  const { logoUrl, setLogoUrl, adminAlias, user: currentUser } = useAuth();
  const fileRef  = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving]   = useState(false);
  const [flash, setFlash]         = useState('');

  // User management state
  const [users, setUsers]         = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [changingRole, setChangingRole] = useState(null);
  const [syncing, setSyncing]     = useState(false);

  const showFlash = (msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(''), 3000);
  };

  // Fetch all users on mount
  useEffect(() => {
    api.get('/users')
      .then((res) => setUsers(res.data))
      .catch(() => {})
      .finally(() => setUsersLoading(false));
  }, []);

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
            Recommended: PNG or SVG, square, at least 64x64px. Max 2 MB.
          </p>

          {/* Preview */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#0c1428] border border-[#162448] rounded-sm flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Unit logo"
                  className="w-full h-full object-contain p-1"
                />
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

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
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
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-[#0c1428] border border-[#162448] flex items-center justify-center shrink-0 overflow-hidden">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Shield size={12} className="text-[#3b82f6]" />
                      )}
                    </div>

                    {/* User info */}
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

                    {/* Role selector */}
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
