import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Loader2, Eye, User } from 'lucide-react';
import Modal from '../components/Modal';

// ── Admin alias selector — shown after admin login ────────────────────────────
const ADMIN_ALIASES = ['A. Achilles', 'C. Shelby'];

const DISCORD_ERRORS = {
  no_code: 'Discord authorization was cancelled.',
  token_failed: 'Failed to authenticate with Discord. Try again.',
  user_fetch_failed: 'Failed to fetch Discord profile. Try again.',
  not_in_server: 'You must be a member of the 26th MEU Discord server.',
  no_personnel_role: 'You must have the 26th Marine Personnel role on Discord.',
  server_error: 'Server error during Discord authentication. Try again.',
};

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
  const { login, enterGuest, selectAlias, logoUrl } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [showAlias, setShowAlias] = useState(false);

  // Check for Discord OAuth errors in URL params
  useEffect(() => {
    const errCode = searchParams.get('error');
    if (errCode && DISCORD_ERRORS[errCode]) {
      setError(DISCORD_ERRORS[errCode]);
    }
  }, [searchParams]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await login(form.username.trim(), form.password);
      if (u.role === 'admin') {
        setShowAlias(true);
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
      {/* YouTube video background — muted, looping, no controls */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <iframe
          src="https://www.youtube.com/embed/TlgtY4ZvDbE?autoplay=1&mute=1&loop=1&playlist=TlgtY4ZvDbE&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&disablekb=1&fs=0&iv_load_policy=3&start=60"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            width: '177.78vh',  /* 16:9 ratio — always covers viewport */
            height: '100vh',
            minWidth: '100vw',
            minHeight: '56.25vw',
          }}
          allow="autoplay; encrypted-media"
          frameBorder="0"
          tabIndex={-1}
          title="Background"
        />
        {/* Dark blue dimming overlay */}
        <div className="absolute inset-0 bg-[#06091a]/75" />
        {/* Extra blue tint for theme matching */}
        <div className="absolute inset-0 bg-[#0a1628]/40 mix-blend-multiply" />
      </div>

      {/* Corner decorations */}
      <div className="absolute top-6 left-6 text-[#162448] font-mono text-[10px] tracking-widest z-10">
        CLASS: RESTRICTED
      </div>
      <div className="absolute top-6 right-6 text-[#162448] font-mono text-[10px] tracking-widest z-10">
        26TH MEU (SOC)
      </div>
      <div className="absolute bottom-6 left-6 text-[#162448] font-mono text-[10px] z-10">
        PERSCOM v1.0
      </div>
      <div className="absolute bottom-6 right-6 text-[#162448] font-mono text-[10px] z-10">
        ALL ACCESS LOGGED
      </div>

      <div className="relative w-full max-w-sm z-10">
        {/* Logo — 26th MEU Insignia */}
        <div className="text-center mb-10">
          <div className="inline-flex flex-col items-center">
            <div className="w-36 h-36 rounded-full flex items-center justify-center mb-5 overflow-hidden drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              <img
                src={logoUrl || '/meu-logo.png'}
                alt="26th MEU"
                className="w-full h-full object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            <div className="text-[#60a5fa] font-mono text-3xl font-bold tracking-[0.3em] glow-green">
              PERSCOM
            </div>
            <div className="text-[#1a2f55] font-mono text-xs tracking-[0.4em] mt-1.5">
              26TH MEU (SOC)
            </div>
            <div className="mt-5 w-full h-px bg-gradient-to-r from-transparent via-[#3b82f6]/30 to-transparent" />
          </div>
        </div>

        {/* Auth card */}
        <div className="bg-[#090f1e]/90 backdrop-blur-sm border border-[#162448] rounded-sm p-8">
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

          {/* Discord OAuth */}
          <a
            href={`${import.meta.env.VITE_API_URL || '/api'}/auth/discord`}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm bg-[#5865F2] hover:bg-[#4752C4] text-white transition-all text-sm font-medium"
            data-sound="boot"
          >
            <svg width="16" height="12" viewBox="0 0 71 55" fill="currentColor">
              <path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37 37 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 4.9a.2.2 0 00-.1.1C1.5 18.7-.9 32.2.3 45.5v.1a58.8 58.8 0 0017.7 9 .2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.8 38.8 0 01-5.5-2.6.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 42 42 0 0035.5 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .4 36.4 36.4 0 01-5.5 2.6.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.2.1A58.6 58.6 0 0070.3 45.6v-.1C71.8 30.1 67.9 16.7 60.2 5a.2.2 0 00-.1-.1zM23.7 37.3c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2zm23.7 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2z"/>
            </svg>
            SIGN IN WITH DISCORD
          </a>

          <p className="text-[#1a2f55] text-[9px] font-mono text-center mt-2 leading-relaxed">
            Requires 26th Marine Personnel Discord role
          </p>

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
