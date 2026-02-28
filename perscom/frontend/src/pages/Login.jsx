import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, AlertCircle, Loader2, Eye, User } from 'lucide-react';
import Modal from '../components/Modal';

// ── Admin alias selector — shown after admin login ────────────────────────────
const ADMIN_ALIASES = ['A. Achilles', 'C. Shelby'];

function AliasSelectorModal({ onSelect }) {
  return (
    <Modal title="Select Operator" onClose={null} maxWidth="max-w-xs">
      <div className="space-y-3">
        <p className="text-[#4a6fa5] text-xs font-mono">
          // IDENTIFY CURRENT OPERATOR
        </p>
        {ADMIN_ALIASES.map((alias) => (
          <button
            key={alias}
            onClick={() => onSelect(alias)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-sm border border-[#162448] hover:border-[#3b82f6]/50 hover:bg-[#3b82f6]/5 transition-all text-left group"
          >
            <div className="w-8 h-8 bg-[#3b82f6]/10 border border-[#3b82f6]/25 rounded-sm flex items-center justify-center shrink-0">
              <User size={14} className="text-[#3b82f6]" />
            </div>
            <div>
              <div className="text-[#dbeafe] text-sm font-medium">{alias}</div>
              <div className="text-[#1a2f55] text-[10px] font-mono tracking-wider">COMMAND STAFF</div>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

export default function Login() {
  const { login, enterGuest, selectAlias } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [showAlias, setShowAlias] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await login(form.username.trim(), form.password);
      if (u.role === 'admin') {
        setShowAlias(true); // ask admin which operator before navigating
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleAliasSelect = (alias) => {
    selectAlias(alias);
    setShowAlias(false);
    navigate('/');
  };

  const handleGuest = async () => {
    setGuestLoading(true);
    try {
      await enterGuest();
      navigate('/personnel');
    } catch {
      setError('Unable to enter guest mode. Try again.');
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06091a] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Corner decorations */}
      <div className="absolute top-6 left-6 text-[#162448] font-mono text-[10px] tracking-widest">
        CLASS: RESTRICTED
      </div>
      <div className="absolute top-6 right-6 text-[#162448] font-mono text-[10px] tracking-widest">
        26TH MEU (SOC)
      </div>
      <div className="absolute bottom-6 left-6 text-[#162448] font-mono text-[10px]">
        PERSCOM v1.0
      </div>
      <div className="absolute bottom-6 right-6 text-[#162448] font-mono text-[10px]">
        ALL ACCESS LOGGED
      </div>

      <div className="relative w-full max-w-xs">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center">
            <div className="w-14 h-14 bg-[#0c1428] border border-[#3b82f6]/30 rounded-sm flex items-center justify-center mb-4">
              <Shield className="text-[#3b82f6]" size={26} />
            </div>
            <div className="text-[#60a5fa] font-mono text-2xl font-bold tracking-[0.3em] glow-green">
              PERSCOM
            </div>
            <div className="text-[#1a2f55] font-mono text-[10px] tracking-[0.4em] mt-1">
              26TH MEU (SOC)
            </div>
            <div className="mt-4 w-full h-px bg-gradient-to-r from-transparent via-[#3b82f6]/30 to-transparent" />
          </div>
        </div>

        {/* Auth card */}
        <div className="bg-[#090f1e] border border-[#162448] rounded-sm p-6">
          <p className="text-[#1a2f55] font-mono text-[10px] uppercase tracking-widest mb-5">
            // AUTHENTICATION REQUIRED
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Identifier</label>
              <input
                name="username"
                type="text"
                className="input-field"
                placeholder="username"
                value={form.username}
                onChange={handleChange}
                autoFocus
                autoComplete="username"
              />
            </div>

            <div>
              <label className="label">Authentication Key</label>
              <input
                name="password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-red-400 text-xs bg-red-950/30 border border-red-900/40 px-3 py-2.5 rounded-sm">
                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !form.username || !form.password}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-2"
              data-sound="login"
            >
              {loading ? (
                <><Loader2 size={13} className="animate-spin" />AUTHENTICATING...</>
              ) : (
                'AUTHENTICATE'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[#162448]" />
            <span className="text-[#1a2f55] font-mono text-[10px]">OR</span>
            <div className="flex-1 h-px bg-[#162448]" />
          </div>

          {/* Guest access */}
          <button
            onClick={handleGuest}
            disabled={guestLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm border border-[#162448] hover:border-[#3b82f6]/30 text-[#4a6fa5] hover:text-[#93c5fd] transition-all text-sm font-mono"
            data-sound="boot"
          >
            {guestLoading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Eye size={13} />
            )}
            VIEW AS GUEST
          </button>

          <p className="text-[#1a2f55] text-[9px] font-mono text-center mt-2 leading-relaxed">
            Read-only access · Personnel &amp; Roster only
          </p>
        </div>
      </div>

      {/* Admin alias selector modal */}
      {showAlias && <AliasSelectorModal onSelect={handleAliasSelect} />}
    </div>
  );
}
