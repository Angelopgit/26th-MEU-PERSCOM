import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, UserPlus } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import MeuLogo from '../assets/MeuLogo';

export default function Register() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [discordInfo, setDiscordInfo] = useState(null);
  const [name, setName]   = useState('');
  const [error, setError]  = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // If already logged in, redirect
  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  // Fetch Discord info from registration session
  useEffect(() => {
    api.get('/auth/discord/register-info')
      .then((res) => setDiscordInfo(res.data))
      .catch(() => {
        setError('Registration session expired. Please sign in with Discord again.');
      })
      .finally(() => setFetching(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/discord/register', { name: name.trim() });
      localStorage.setItem('perscom_user', JSON.stringify(res.data.user));
      // Force a page reload to re-validate session
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const avatarUrl = discordInfo?.discord_avatar
    ? `https://cdn.discordapp.com/avatars/${discordInfo.discord_id}/${discordInfo.discord_avatar}.png?size=128`
    : null;

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
        REGISTRATION
      </div>
      <div className="absolute top-6 right-6 text-[#162448] font-mono text-[10px] tracking-widest">
        26TH MEU (SOC)
      </div>

      <div className="relative w-full max-w-xs">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center">
            <div className="w-14 h-14 bg-[#0c1428] border border-[#3b82f6]/30 rounded-sm flex items-center justify-center mb-4 overflow-hidden">
              <MeuLogo size={32} />
            </div>
            <div className="text-[#60a5fa] font-mono text-2xl font-bold tracking-[0.3em] glow-green">
              PERSCOM
            </div>
            <div className="text-[#1a2f55] font-mono text-[10px] tracking-[0.4em] mt-1">
              MARINE REGISTRATION
            </div>
            <div className="mt-4 w-full h-px bg-gradient-to-r from-transparent via-[#3b82f6]/30 to-transparent" />
          </div>
        </div>

        <div className="bg-[#090f1e] border border-[#162448] rounded-sm p-6">
          {fetching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={18} className="animate-spin text-[#3b82f6]" />
            </div>
          ) : !discordInfo && error ? (
            <div className="text-center space-y-4">
              <div className="flex items-start gap-2 text-red-400 text-xs bg-red-950/30 border border-red-900/40 px-3 py-2.5 rounded-sm">
                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              <a
                href="/api/auth/discord"
                className="btn-primary w-full inline-flex items-center justify-center gap-2 py-2.5"
              >
                Try Again
              </a>
            </div>
          ) : (
            <>
              {/* Discord profile display */}
              {discordInfo && (
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#162448]">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full border border-[#162448]" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center text-white text-sm font-bold">
                      {discordInfo.discord_username?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div>
                    <div className="text-[#dbeafe] text-sm font-medium flex items-center gap-2">
                      <svg width="14" height="11" viewBox="0 0 71 55" fill="#5865F2"><path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37 37 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 4.9a.2.2 0 00-.1.1C1.5 18.7-.9 32.2.3 45.5v.1a58.8 58.8 0 0017.7 9 .2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.8 38.8 0 01-5.5-2.6.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 42 42 0 0035.5 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .4 36.4 36.4 0 01-5.5 2.6.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.2.1A58.6 58.6 0 0070.3 45.6v-.1C71.8 30.1 67.9 16.7 60.2 5a.2.2 0 00-.1-.1zM23.7 37.3c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2zm23.7 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2z"/></svg>
                      {discordInfo.discord_username}
                    </div>
                    <div className="text-[#1a2f55] text-[10px] font-mono">DISCORD VERIFIED</div>
                  </div>
                </div>
              )}

              <p className="text-[#1a2f55] font-mono text-[10px] uppercase tracking-widest mb-5">
                // REGISTER YOUR MARINE
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Marine Name</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Last, First (e.g., Smith, John)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    required
                    minLength={3}
                  />
                  <p className="text-[#1a2f55] text-[9px] font-mono mt-1">
                    Enter your name as Last, First
                  </p>
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-red-400 text-xs bg-red-950/30 border border-red-900/40 px-3 py-2.5 rounded-sm">
                    <AlertCircle size={12} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || name.trim().length < 3}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-2"
                  data-sound="confirm"
                >
                  {loading ? (
                    <><Loader2 size={13} className="animate-spin" />REGISTERING...</>
                  ) : (
                    <><UserPlus size={13} />REGISTER MARINE</>
                  )}
                </button>
              </form>

              <p className="text-[#1a2f55] text-[9px] font-mono text-center mt-4 leading-relaxed">
                You will be registered as a Recruit.
                <br />Your rank can be updated by Command Staff.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
