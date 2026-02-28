import { useState, useRef } from 'react';
import { Settings as SettingsIcon, Upload, Trash2, Loader2, Image, CheckCircle } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { logoUrl, setLogoUrl, adminAlias } = useAuth();
  const fileRef  = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving]   = useState(false);
  const [flash, setFlash]         = useState('');

  const showFlash = (msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(''), 3000);
  };

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

  return (
    <div className="space-y-5 max-w-xl">
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
            Upload a unit logo to replace the default shield icon in the sidebar and login screen.
            Recommended: PNG or SVG, square, at least 64×64px. Max 2 MB.
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
