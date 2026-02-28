import { createContext, useContext, useRef, useEffect, useCallback } from 'react';

const SoundContext = createContext(null);

// ── Synthesise sounds using Web Audio API (no external files) ─────────────────
function synthesize(ctx, type) {
  const t = ctx.currentTime;

  const osc = (freq, type_ = 'sine') => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type_;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(ctx.destination);
    return { o, g };
  };

  const playTone = (freq, oscType, startVol, dur, startT = 0, endFreq = null) => {
    const { o, g } = osc(freq, oscType);
    g.gain.setValueAtTime(startVol, t + startT);
    g.gain.exponentialRampToValueAtTime(0.0001, t + startT + dur);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + startT + dur);
    o.start(t + startT);
    o.stop(t + startT + dur + 0.01);
  };

  switch (type) {
    case 'click':
      // Hard digital press — square wave, very short
      playTone(900, 'square', 0.12, 0.025, 0, 250);
      break;

    case 'tab':
      // Navigation blip — pure sine
      playTone(1100, 'sine', 0.09, 0.07);
      playTone(800, 'sine', 0.04, 0.06, 0.04);
      break;

    case 'open':
      // Modal open — two ascending tones
      playTone(600, 'sine', 0.07, 0.07);
      playTone(900, 'sine', 0.07, 0.07, 0.07);
      break;

    case 'close':
      // Modal close — descending
      playTone(800, 'sine', 0.07, 0.09, 0, 400);
      break;

    case 'confirm':
      // Triple success beep
      [0, 0.08, 0.16].forEach((delay) => playTone(1000, 'sine', 0.09, 0.055, delay));
      break;

    case 'error':
      // Low sawtooth buzz
      playTone(220, 'sawtooth', 0.14, 0.12);
      break;

    case 'login':
      // Power-on sequence — ascending tones
      playTone(400, 'sine', 0.06, 0.08);
      playTone(600, 'sine', 0.07, 0.08, 0.10);
      playTone(800, 'sine', 0.08, 0.08, 0.20);
      playTone(1200, 'sine', 0.09, 0.14, 0.30);
      break;

    case 'boot':
      // Guest or logout — single short descending sweep
      playTone(700, 'sine', 0.06, 0.15, 0, 300);
      break;

    default:
      break;
  }
}

export function SoundProvider({ children }) {
  const ctxRef = useRef(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playSound = useCallback((type) => {
    try {
      synthesize(getCtx(), type);
    } catch {
      // Silently fail if audio not available
    }
  }, [getCtx]);

  // Global click handler — plays 'click' for all buttons, 'tab' for nav links
  useEffect(() => {
    const handler = (e) => {
      const btn = e.target.closest('button:not([disabled]), a[href], [role="tab"]');
      if (!btn) return;

      // Skip if element explicitly opts out
      if (btn.dataset.nosound !== undefined) return;

      const soundType = btn.dataset.sound || (btn.tagName === 'A' ? 'tab' : 'click');
      playSound(soundType);
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [playSound]);

  return (
    <SoundContext.Provider value={{ playSound }}>
      {children}
    </SoundContext.Provider>
  );
}

export const useSound = () => useContext(SoundContext);
