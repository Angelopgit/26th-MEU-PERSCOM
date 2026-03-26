import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, Loader2, CheckCircle2, ExternalLink, ChevronLeft,
  ClipboardList, Search,
} from 'lucide-react';
import api from '../utils/api';

// ── Inline styles for animations ─────────────────────────────────────────────
const ANIM_CSS = `
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulseGreen {
  0%, 100% { box-shadow: 0 0 18px rgba(34,197,94,0.3), 0 0 50px rgba(34,197,94,0.1); }
  50%       { box-shadow: 0 0 32px rgba(34,197,94,0.55), 0 0 80px rgba(34,197,94,0.2); }
}
.anim-fadeslide  { animation: fadeSlideIn 0.35s ease both; }
.logo-glow-green { animation: pulseGreen 2.2s ease-in-out infinite; }
`;

const REQUIREMENTS = [
  'I meet the minimum age requirement of 16 years old. No exceptions.',
  'I own and play on PC, Xbox, or PS5.',
  'I have Arma Reforger installed (or am willing to install it).',
  'I am able to download and play with unit mods.',
  'I can attend at least 50% of Unit Events. Events are held Sundays & Thursdays at 8:00 PM Eastern Standard Time.',
  'I understand the 26th MEU\'s definition of Milsim and understand this is a Realism Milsim Unit — Serious-Toned, Relaxed Milsim.',
  'I understand application acceptance may take 24–48 hours.',
  'If accepted, I will be contacted in the Recruit Hall on Discord and assigned the Recruit tag.',
];

const STATUS_CONFIG = {
  pending:  { color: 'text-amber-400',  bg: 'bg-amber-950/30 border-amber-800/40',  label: 'UNDER REVIEW',    msg: 'Your application is being reviewed by Command Staff.' },
  accepted: { color: 'text-green-400',  bg: 'bg-green-950/30 border-green-800/40',  label: 'APPROVED',        msg: 'Welcome to the 26th MEU! Login to PERSCOM.' },
  rejected: { color: 'text-red-400',    bg: 'bg-red-950/30 border-red-800/40',      label: 'DENIED',          msg: null },
  review:   { color: 'text-yellow-400', bg: 'bg-yellow-950/30 border-yellow-800/40',label: 'FURTHER REVIEW',  msg: 'Your application requires additional review.' },
  none:     { color: 'text-[#4a6fa5]',  bg: 'bg-[#090f1e] border-[#162448]',        label: 'NOT FOUND',       msg: 'No application found for this Discord ID.' },
};

// ── Status Check Modal ────────────────────────────────────────────────────────
function StatusModal({ onClose }) {
  const [discordId, setDiscordId] = useState('');
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState('');

  const handleCheck = async () => {
    if (!discordId.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.get(`/applications/status?discord_id=${encodeURIComponent(discordId.trim())}`);
      setResult(res.data);
    } catch {
      setError('Unable to check status. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const cfg = result ? (STATUS_CONFIG[result.status] || STATUS_CONFIG.none) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#090f1e] border border-[#162448] rounded-sm w-full max-w-sm p-6 anim-fadeslide">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[#dbeafe] font-mono text-sm font-bold tracking-wider">CHECK APPLICATION STATUS</h2>
            <p className="text-[#1a2f55] font-mono text-[9px] tracking-widest mt-0.5">// ENTER YOUR DISCORD USER ID</p>
          </div>
          <button onClick={onClose} className="text-[#2a4a80] hover:text-[#dbeafe] transition-colors font-mono text-lg leading-none">&times;</button>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            className="input-field w-full"
            placeholder="Discord User ID (e.g. 123456789012345678)"
            value={discordId}
            onChange={e => setDiscordId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCheck()}
          />

          <button
            onClick={handleCheck}
            disabled={loading || !discordId.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2 py-2"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            CHECK STATUS
          </button>

          {error && (
            <div className="flex items-start gap-2 text-red-400 text-xs bg-red-950/30 border border-red-900/40 px-3 py-2.5 rounded-sm">
              <AlertCircle size={12} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result && cfg && (
            <div className={`border rounded-sm px-4 py-3 ${cfg.bg}`}>
              <div className={`font-mono text-xs font-bold tracking-widest mb-1 ${cfg.color}`}>
                {cfg.label}
              </div>
              {cfg.msg && <p className="text-[#dbeafe] text-xs">{cfg.msg}</p>}
              {result.status === 'rejected' && result.denial_reason && (
                <p className="text-[#dbeafe] text-xs">
                  <span className="text-red-400 font-mono">Reason:</span> {result.denial_reason}
                  <br />
                  <span className="text-[#4a6fa5]">You may reapply 72 hours after denial.</span>
                </p>
              )}
              {result.submitted_at && (
                <p className="text-[#4a6fa5] font-mono text-[10px] mt-1.5">
                  Submitted: {new Date(result.submitted_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Logo component ─────────────────────────────────────────────────────────────
function Logo({ size = 152, glowGreen = false }) {
  const logoUrl = `${import.meta.env.BASE_URL}meu-logo.png`;
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <div className="absolute rounded-full pointer-events-none" style={{
        inset: '-16px',
        background: 'radial-gradient(circle, rgba(212,175,55,0.07) 0%, transparent 70%)',
      }} />
      <div className="absolute rounded-full pointer-events-none" style={{
        inset: '-2px',
        border: '1px solid rgba(212,175,55,0.2)',
      }} />
      <div
        className={`rounded-full overflow-hidden ${glowGreen ? 'logo-glow-green' : ''}`}
        style={{
          width: size,
          height: size,
          border: '2px solid rgba(212,175,55,0.45)',
          boxShadow: glowGreen
            ? undefined
            : '0 0 22px rgba(212,175,55,0.15), 0 0 50px rgba(212,175,55,0.06), inset 0 0 18px rgba(0,0,0,0.3)',
        }}
      >
        <img src={logoUrl} alt="26th MEU" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
      </div>
    </div>
  );
}

// Discord icon SVG
function DiscordIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 71 55" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.44077 45.4204 0.52529C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.52529C25.5141 0.44359 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C7.16596 50.5495 13.7371 53.5582 20.1907 55.5213C20.2831 55.5495 20.3809 55.5157 20.4397 55.4398C21.9517 53.3696 23.3002 51.1855 24.4513 48.8891C24.5127 48.7673 24.4569 48.6228 24.3309 48.5766C22.1793 47.7597 20.1349 46.7551 18.1665 45.6201C18.0265 45.5378 18.0153 45.339 18.1441 45.2427C18.5522 44.9415 18.9603 44.629 19.3516 44.3137C19.4161 44.2607 19.505 44.2494 19.5814 44.2832C31.2814 49.7447 43.9246 49.7447 55.4835 44.2832C55.5599 44.2466 55.6488 44.2579 55.7161 44.311C56.1074 44.6263 56.5155 44.9415 56.9264 45.2427C57.0552 45.339 57.0468 45.5378 56.9068 45.6201C54.9384 46.7777 52.894 47.7597 50.7396 48.5738C50.6136 48.62 50.5606 48.7673 50.6219 48.8891C51.7954 51.1827 53.1440 53.3668 54.6280 55.437C54.6840 55.5157 54.7846 55.5495 54.8770 55.5213C61.3585 53.5582 67.9296 50.5495 74.7098 45.5576C74.7629 45.5182 74.7965 45.459 74.8021 45.3942C76.3068 30.0691 72.2929 16.7757 64.0947 4.9823C64.0752 4.9429 64.0416 4.9147 60.1045 4.8978Z" />
    </svg>
  );
}

// ── STEP 0: Discord OAuth Login ─────────────────────────────────────────────────
function Step0({ onVerified, onStatusCheck, oauthError }) {
  const [checking, setChecking] = useState(false);
  const [alertType, setAlertType] = useState(null);

  const DISCORD_OAUTH_URL = `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}/api/auth/discord-apply`;

  return (
    <div className="anim-fadeslide">
      {/* Logo + headline */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-6">
          <Logo size={152} />
        </div>
        <div className="text-[#60a5fa] font-mono text-3xl font-bold tracking-[0.3em] glow-green">PERSCOM</div>
        <div className="text-[#1a2f55] font-mono text-xs tracking-[0.4em] mt-1.5 mb-4">26TH MEU (SOC)</div>
        <div className="w-full h-px mb-5" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.25), transparent)' }} />
        <p className="text-[#dbeafe] text-sm leading-relaxed">
          First step to joining <span className="text-[#60a5fa] font-semibold">A Certain Force in an Uncertain World.</span>
        </p>
        <p className="text-[#4a6fa5] font-mono text-[10px] tracking-[0.3em] mt-2">RECRUITMENT PORTAL</p>
      </div>

      {/* Auth card */}
      <div className="bg-[#090f1e]/90 border border-[#162448] rounded-sm p-6">
        <p className="text-[#1a2f55] font-mono text-[10px] uppercase tracking-widest mb-5">
          // STEP 1 OF 3 — DISCORD VERIFICATION
        </p>

        <div className="space-y-3">
          {/* Not in server error */}
          {(oauthError === 'not_in_server') && (
            <div className="bg-red-950/30 border border-red-800/50 rounded-sm p-4 space-y-3">
              <div className="flex items-start gap-2 text-red-400 text-xs">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <span>You must join the 26th Marine Expeditionary Unit Discord server before applying.</span>
              </div>
              <a
                href="https://discord.gg/5qhqBswwZK"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-sm bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-mono transition-all"
              >
                <ExternalLink size={12} />
                JOIN DISCORD — discord.gg/5qhqBswwZK
              </a>
            </div>
          )}

          {oauthError && oauthError !== 'not_in_server' && (
            <div className="flex items-start gap-2 text-red-400 text-xs bg-red-950/30 border border-red-900/40 px-3 py-2.5 rounded-sm">
              <AlertCircle size={12} className="shrink-0 mt-0.5" />
              <span>Discord login failed ({oauthError}). Please try again.</span>
            </div>
          )}

          {/* Login with Discord button */}
          <a
            href={DISCORD_OAUTH_URL}
            className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-sm bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-mono font-bold tracking-wider transition-all"
          >
            <DiscordIcon />
            LOGIN WITH DISCORD
          </a>

          <p className="text-[#1a2f55] text-[9px] font-mono text-center leading-relaxed">
            You must be in the 26th MEU Discord server to apply.
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-[#162448]" />
          <span className="text-[#1a2f55] font-mono text-[10px]">OR</span>
          <div className="flex-1 h-px bg-[#162448]" />
        </div>

        <button
          onClick={onStatusCheck}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm border border-[#162448] hover:border-[#3b82f6]/30 text-[#4a6fa5] hover:text-[#93c5fd] transition-all text-sm font-mono"
        >
          <ClipboardList size={13} />
          CHECK APPLICATION STATUS
        </button>

        <div className="text-center mt-4">
          <Link to="/login" className="text-[#1a2f55] hover:text-[#4a6fa5] font-mono text-[9px] transition-colors">
            Already a member? Login to PERSCOM
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── STEP 1: Terms / Requirements ───────────────────────────────────────────────
function Step1({ onAccept, onBack }) {
  const [checked, setChecked] = useState(Array(REQUIREMENTS.length).fill(false));

  const allChecked = checked.every(Boolean);
  const toggle = (i) => setChecked(prev => prev.map((v, idx) => idx === i ? !v : v));

  return (
    <div className="anim-fadeslide">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <Logo size={80} />
        </div>
        <div className="text-[#dbeafe] font-mono text-lg font-bold tracking-wider">ENLISTMENT REQUIREMENTS</div>
        <div className="text-[#3b82f6] font-mono text-[10px] tracking-widest mt-1">// READ CAREFULLY — ALL TERMS MUST BE ACCEPTED</div>
        <div className="w-full h-px mt-4" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.2), transparent)' }} />
      </div>

      <div className="bg-[#090f1e]/90 border border-[#162448] rounded-sm p-6 space-y-4">
        {REQUIREMENTS.map((req, i) => (
          <label
            key={i}
            className={`flex items-start gap-3 cursor-pointer rounded-sm px-3 py-2.5 border transition-all ${
              checked[i] ? 'border-[#3b82f6]/40 bg-[#3b82f6]/5' : 'border-[#162448] hover:border-[#1e3364]'
            }`}
          >
            <div className={`mt-0.5 shrink-0 w-4 h-4 rounded-sm border flex items-center justify-center transition-all ${
              checked[i] ? 'bg-[#3b82f6] border-[#3b82f6]' : 'border-[#2a4a80] bg-[#06091a]'
            }`}>
              {checked[i] && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <input type="checkbox" className="sr-only" checked={checked[i]} onChange={() => toggle(i)} />
            <span className={`text-xs leading-relaxed ${checked[i] ? 'text-[#dbeafe]' : 'text-[#4a6fa5]'}`}>{req}</span>
          </label>
        ))}

        <div className="pt-2 space-y-2">
          <button
            onClick={onAccept}
            disabled={!allChecked}
            className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
            data-sound="boot"
          >
            <CheckCircle2 size={14} />
            ACCEPT & CONTINUE
          </button>
          <button onClick={onBack} className="w-full text-[#2a4a80] hover:text-[#4a6fa5] font-mono text-xs py-1.5 transition-colors">
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}

// ── STEP 2: Application Form ───────────────────────────────────────────────────
function Step2({ discordData, onSubmitted, onBack }) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    age: '',
    platform: '',
    desired_role: '',
    referred_by: '',
    reforger_experience: '',
    other_unit: 'no',
    other_unit_conflict: '',
    how_heard: '',
    why_join: '',
    long_term_commitment: '',
    na_timezone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handle = e => set(e.target.name, e.target.value);

  const isValid = () =>
    form.first_name.trim() &&
    form.last_name.trim() &&
    Number(form.age) >= 16 &&
    form.platform &&
    form.desired_role.trim() &&
    form.reforger_experience.trim() &&
    form.how_heard.trim() &&
    form.why_join.trim() &&
    form.long_term_commitment !== '' &&
    form.na_timezone !== '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid()) return;
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...discordData,
        ...form,
        age: Number(form.age),
        long_term_commitment: form.long_term_commitment === 'yes',
        na_timezone: form.na_timezone === 'yes',
        other_unit: form.other_unit === 'yes' ? form.other_unit : null,
        other_unit_conflict: form.other_unit === 'yes' ? form.other_unit_conflict : null,
      };
      const res = await api.post('/applications', payload);
      onSubmitted(res.data.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'input-field w-full';
  const labelCls = 'label';

  return (
    <div className="anim-fadeslide">
      <div className="text-center mb-6">
        <div className="text-[#dbeafe] font-mono text-lg font-bold tracking-wider">ENLISTMENT APPLICATION</div>
        <div className="text-[#3b82f6] font-mono text-[10px] tracking-widest mt-1">// 26TH MEU (SOC) — PERSCOM</div>
        <div className="w-full h-px mt-4" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.2), transparent)' }} />
      </div>

      <div className="bg-[#090f1e]/90 border border-[#162448] rounded-sm p-6">
        <p className="text-[#1a2f55] font-mono text-[10px] uppercase tracking-widest mb-5">
          // ALL FIELDS REQUIRED UNLESS MARKED OPTIONAL
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Marine Name — First & Last become their in-game Marine name in PERSCOM */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>First Name <span className="text-[#1a2f55] normal-case">(Marine Name)</span></label>
              <input name="first_name" type="text" className={inputCls} placeholder="First" value={form.first_name} onChange={handle} />
            </div>
            <div>
              <label className={labelCls}>Last Name <span className="text-[#1a2f55] normal-case">(Marine Name)</span></label>
              <input name="last_name" type="text" className={inputCls} placeholder="Last" value={form.last_name} onChange={handle} />
            </div>
          </div>

          {/* Discord (readonly) */}
          <div>
            <label className={labelCls}>Discord Account</label>
            <input
              type="text"
              className={`${inputCls} opacity-60 cursor-not-allowed`}
              value={discordData.discord_username ? `@${discordData.discord_username}` : discordData.discord_id}
              readOnly
            />
          </div>

          {/* Age */}
          <div>
            <label className={labelCls}>Age</label>
            <input name="age" type="number" min="16" max="99" className={inputCls} placeholder="Must be 16+" value={form.age} onChange={handle} />
          </div>

          {/* Platform */}
          <div>
            <label className={labelCls}>Platform</label>
            <select name="platform" className={inputCls} value={form.platform} onChange={handle}>
              <option value="">Select platform...</option>
              <option value="PC">PC</option>
              <option value="Xbox">Xbox</option>
              <option value="PS5">PS5</option>
            </select>
          </div>

          {/* Desired Role */}
          <div>
            <label className={labelCls}>Desired Role</label>
            <input name="desired_role" type="text" className={inputCls} placeholder="e.g. Rifleman, Pilot, Fireteam Leader" value={form.desired_role} onChange={handle} />
          </div>

          {/* Referred By */}
          <div>
            <label className={labelCls}>Referred By <span className="text-[#1a2f55]">(Optional)</span></label>
            <input name="referred_by" type="text" className={inputCls} placeholder="N/A if not referred" value={form.referred_by} onChange={handle} />
          </div>

          {/* Reforger Experience */}
          <div>
            <label className={labelCls}>How long have you been playing Arma Reforger?</label>
            <input name="reforger_experience" type="text" className={inputCls} placeholder="e.g. 6 months, 2 years, new player..." value={form.reforger_experience} onChange={handle} />
          </div>

          {/* Other unit */}
          <div>
            <label className={labelCls}>Are you in another unit?</label>
            <div className="flex gap-4 mt-1.5">
              {['yes', 'no'].map(v => (
                <label key={v} className={`flex items-center gap-2 cursor-pointer px-4 py-2 border rounded-sm text-xs font-mono transition-all ${
                  form.other_unit === v ? 'border-[#3b82f6]/50 bg-[#3b82f6]/10 text-[#93c5fd]' : 'border-[#162448] text-[#4a6fa5] hover:border-[#1e3364]'
                }`}>
                  <input type="radio" name="other_unit" value={v} checked={form.other_unit === v} onChange={handle} className="sr-only" />
                  {v.toUpperCase()}
                </label>
              ))}
            </div>
          </div>

          {/* Other unit conflict — conditional */}
          {form.other_unit === 'yes' && (
            <div className="anim-fadeslide">
              <label className={labelCls}>Will your other unit conflict with your attendance here?</label>
              <div className="flex gap-4 mt-1.5">
                {['yes', 'no'].map(v => (
                  <label key={v} className={`flex items-center gap-2 cursor-pointer px-4 py-2 border rounded-sm text-xs font-mono transition-all ${
                    form.other_unit_conflict === v ? 'border-[#3b82f6]/50 bg-[#3b82f6]/10 text-[#93c5fd]' : 'border-[#162448] text-[#4a6fa5] hover:border-[#1e3364]'
                  }`}>
                    <input type="radio" name="other_unit_conflict" value={v} checked={form.other_unit_conflict === v} onChange={handle} className="sr-only" />
                    {v.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* How heard */}
          <div>
            <label className={labelCls}>How did you hear about us?</label>
            <input name="how_heard" type="text" className={inputCls} placeholder="e.g. Friend, Reddit, YouTube..." value={form.how_heard} onChange={handle} />
          </div>

          {/* Why join */}
          <div>
            <label className={labelCls}>Why do you want to join the 26th MEU (SOC)? What are your expectations?</label>
            <textarea
              name="why_join"
              rows={4}
              className={`${inputCls} resize-none`}
              placeholder="Tell us why you want to join and what you hope to get out of the experience..."
              value={form.why_join}
              onChange={handle}
            />
          </div>

          {/* Long-term commitment */}
          <div>
            <label className={labelCls}>I understand this Unit is slower paced and I am willing to commit to a long-term commitment.</label>
            <div className="flex gap-4 mt-1.5">
              {[{v:'yes',l:'YES — I UNDERSTAND'},{v:'no',l:'NO'}].map(({v,l}) => (
                <label key={v} className={`flex items-center gap-2 cursor-pointer px-4 py-2 border rounded-sm text-xs font-mono transition-all ${
                  form.long_term_commitment === v ? 'border-[#3b82f6]/50 bg-[#3b82f6]/10 text-[#93c5fd]' : 'border-[#162448] text-[#4a6fa5] hover:border-[#1e3364]'
                }`}>
                  <input type="radio" name="long_term_commitment" value={v} checked={form.long_term_commitment === v} onChange={handle} className="sr-only" />
                  {l}
                </label>
              ))}
            </div>
          </div>

          {/* NA Timezone */}
          <div>
            <label className={labelCls}>I understand the unit is NA-Based, Eastern Standard Time.</label>
            <div className="flex gap-4 mt-1.5">
              {[{v:'yes',l:'YES — I UNDERSTAND'},{v:'no',l:'NO'}].map(({v,l}) => (
                <label key={v} className={`flex items-center gap-2 cursor-pointer px-4 py-2 border rounded-sm text-xs font-mono transition-all ${
                  form.na_timezone === v ? 'border-[#3b82f6]/50 bg-[#3b82f6]/10 text-[#93c5fd]' : 'border-[#162448] text-[#4a6fa5] hover:border-[#1e3364]'
                }`}>
                  <input type="radio" name="na_timezone" value={v} checked={form.na_timezone === v} onChange={handle} className="sr-only" />
                  {l}
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-red-400 text-xs bg-red-950/30 border border-red-900/40 px-3 py-2.5 rounded-sm">
              <AlertCircle size={12} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={loading || !isValid()}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
              data-sound="boot"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : null}
              SUBMIT APPLICATION
            </button>
            <button type="button" onClick={onBack} className="w-full text-[#2a4a80] hover:text-[#4a6fa5] font-mono text-xs py-1.5 transition-colors">
              ← Back
            </button>
          </div>

          <p className="text-[#1a2f55] font-mono text-[9px] text-center leading-relaxed">
            After submission, review takes 24–48 hours. You will be notified in Discord.
          </p>
        </form>
      </div>
    </div>
  );
}

// ── STEP 3: Submitted Confirmation ─────────────────────────────────────────────
function Step3({ appId, onCheckStatus }) {
  return (
    <div className="anim-fadeslide text-center">
      <div className="flex justify-center mb-6">
        <Logo size={120} glowGreen />
      </div>

      <div className="text-[#22c55e] font-mono text-2xl font-bold tracking-[0.2em] mb-3">
        APPLICATION SUBMITTED
      </div>
      <div className="w-full h-px mb-6" style={{ background: 'linear-gradient(to right, transparent, rgba(34,197,94,0.3), transparent)' }} />

      <div className="bg-[#090f1e]/90 border border-[#22c55e]/25 rounded-sm p-6 space-y-4">
        <p className="text-[#dbeafe] text-sm leading-relaxed">
          Your application has been received. Our Command Staff will review it within <strong>24–48 hours</strong>.
        </p>
        <p className="text-[#4a6fa5] text-sm">
          You will be notified in the <strong>26th MEU Discord server</strong>.
        </p>
        <div className="border border-[#162448] rounded-sm px-4 py-2">
          <span className="text-[#1a2f55] font-mono text-[10px]">APPLICATION ID: </span>
          <span className="text-[#60a5fa] font-mono text-sm font-bold">#{appId}</span>
        </div>

        <button
          onClick={onCheckStatus}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm border border-[#162448] hover:border-[#3b82f6]/30 text-[#4a6fa5] hover:text-[#93c5fd] transition-all text-sm font-mono"
        >
          <ClipboardList size={13} />
          Check Status
        </button>

        <Link
          to="/login"
          className="block text-[#1a2f55] hover:text-[#4a6fa5] font-mono text-[9px] transition-colors mt-2"
        >
          Already have access? Login to PERSCOM
        </Link>
      </div>
    </div>
  );
}

// ── Main Apply Page ────────────────────────────────────────────────────────────
export default function Apply() {
  const [step, setStep]             = useState(0);
  const [discordData, setDiscordData] = useState(null);
  const [appId, setAppId]           = useState(null);
  const [showStatus, setShowStatus] = useState(false);
  const [oauthError, setOauthError] = useState(null);

  // On mount, check if Discord OAuth redirected back with discord_id params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const discordId = params.get('discord_id');
    const error     = params.get('error');

    if (error) {
      setOauthError(error);
      // Clean the URL
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (discordId) {
      const data = {
        discord_id:       discordId,
        discord_username: params.get('discord_username') || '',
        discord_avatar:   params.get('discord_avatar')   || null,
      };
      // Clean the URL before advancing
      window.history.replaceState({}, '', window.location.pathname);
      setDiscordData(data);
      setStep(1);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#06091a] flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <style>{ANIM_CSS}</style>

      {/* Corner decorations */}
      <div className="absolute top-6 left-6 text-[#162448] font-mono text-[10px] tracking-widest z-10">CLASS: RECRUITING</div>
      <div className="absolute top-6 right-6 text-[#162448] font-mono text-[10px] tracking-widest z-10">26TH MEU (SOC)</div>
      <div className="absolute bottom-6 left-6 text-[#162448] font-mono text-[10px] z-10">PERSCOM v1.0</div>
      <div className="absolute bottom-6 right-6 text-[#162448] font-mono text-[10px] z-10">RECRUIT PORTAL</div>

      {/* Content */}
      <div className="relative w-full max-w-lg z-10">
        {/* Step progress indicator */}
        {step > 0 && step < 3 && (
          <div className="flex items-center gap-2 mb-6 justify-center">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-sm flex items-center justify-center font-mono text-[10px] border transition-all ${
                  i < step ? 'bg-[#3b82f6] border-[#3b82f6] text-white'
                  : i === step ? 'border-[#3b82f6] text-[#60a5fa]'
                  : 'border-[#162448] text-[#1a2f55]'
                }`}>{i + 1}</div>
                {i < 2 && <div className={`w-8 h-px ${i < step ? 'bg-[#3b82f6]' : 'bg-[#162448]'}`} />}
              </div>
            ))}
          </div>
        )}

        {step === 0 && (
          <Step0
            onVerified={data => { setDiscordData(data); setStep(1); }}
            onStatusCheck={() => setShowStatus(true)}
            oauthError={oauthError}
          />
        )}

        {step === 1 && (
          <Step1
            onAccept={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}

        {step === 2 && discordData && (
          <Step2
            discordData={discordData}
            onSubmitted={id => { setAppId(id); setStep(3); }}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <Step3
            appId={appId}
            onCheckStatus={() => setShowStatus(true)}
          />
        )}
      </div>

      {/* Status modal */}
      {showStatus && <StatusModal onClose={() => setShowStatus(false)} />}
    </div>
  );
}
