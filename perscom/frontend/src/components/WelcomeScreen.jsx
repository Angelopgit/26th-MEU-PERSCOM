import { useState, useEffect } from 'react';
import MeuLogo from '../assets/MeuLogo';

export default function WelcomeScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('perscom_welcome_seen');
    if (!seen) {
      setVisible(true);
      const timer = setTimeout(() => {
        setFading(true);
        setTimeout(() => {
          setVisible(false);
          localStorage.setItem('perscom_welcome_seen', '1');
        }, 1000);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setFading(true);
    setTimeout(() => {
      setVisible(false);
      localStorage.setItem('perscom_welcome_seen', '1');
    }, 500);
  };

  if (!visible) return null;

  return (
    <div
      onClick={dismiss}
      className={`fixed inset-0 z-[100] bg-[#06091a] flex flex-col items-center justify-center cursor-pointer transition-opacity duration-1000 ${fading ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Logo */}
      <div className="mb-8 animate-pulse" style={{ animation: 'fadeSlideIn 0.8s ease-out both' }}>
        <MeuLogo size={96} />
      </div>

      <div className="text-[#4a6fa5] font-mono text-[11px] tracking-[0.5em] uppercase mb-3" style={{ animation: 'fadeSlideIn 0.8s ease-out 0.3s both' }}>
        WELCOME TO THE
      </div>
      <div className="text-[#dbeafe] font-mono text-xl sm:text-2xl font-bold tracking-wider glow-green" style={{ animation: 'fadeSlideIn 0.8s ease-out 0.6s both' }}>
        26th Marine Expeditionary Unit
      </div>
      <div className="text-[#3b82f6] font-mono text-base sm:text-lg tracking-[0.3em] mt-2" style={{ animation: 'fadeSlideIn 0.8s ease-out 0.9s both' }}>
        PERSCOM
      </div>
      <div className="text-[#1a2f55] font-mono text-[9px] tracking-[0.3em] mt-2" style={{ animation: 'fadeSlideIn 0.8s ease-out 1.2s both' }}>
        FLEET MARINE FORCE
      </div>

      <div className="text-[#162448] font-mono text-[10px] mt-12" style={{ animation: 'fadeSlideIn 0.8s ease-out 1.5s both' }}>
        CLICK ANYWHERE TO CONTINUE
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
