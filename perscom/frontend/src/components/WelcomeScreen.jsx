import { useState, useEffect } from 'react';

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
      }, 4500);
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
      {/* Subtle tactical grid */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Radial ambient glow behind logo */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ animation: 'fadeIn 1.2s ease-out both' }}
      >
        <div style={{
          width: '480px',
          height: '480px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 65%)',
        }} />
      </div>

      {/* Logo */}
      <div
        className="relative mb-10"
        style={{ animation: 'popIn 0.9s cubic-bezier(0.34,1.4,0.64,1) both' }}
      >
        {/* Pulsing outer ambient ring */}
        <div className="absolute rounded-full pointer-events-none" style={{
          inset: '-20px',
          background: 'radial-gradient(circle, rgba(212,175,55,0.09) 0%, transparent 70%)',
          animation: 'pulse 3.5s ease-in-out infinite',
        }} />

        {/* Spinning gold arc */}
        <div className="absolute rounded-full pointer-events-none" style={{
          inset: '-5px',
          background: 'conic-gradient(from 0deg, rgba(212,175,55,0.85) 0deg, rgba(212,175,55,0.2) 50deg, transparent 80deg, transparent 180deg, rgba(212,175,55,0.2) 210deg, rgba(212,175,55,0.85) 260deg, transparent 300deg, transparent 360deg)',
          animation: 'spin 10s linear infinite',
        }} />

        {/* Static outer ring */}
        <div className="absolute rounded-full pointer-events-none" style={{
          inset: '-2px',
          border: '1px solid rgba(212,175,55,0.22)',
        }} />

        {/* Background fill (masks the spinning ring from the inside) */}
        <div className="absolute inset-0 rounded-full bg-[#06091a]" />

        {/* Logo image */}
        <div
          className="relative rounded-full overflow-hidden"
          style={{
            width: '192px',
            height: '192px',
            border: '2px solid rgba(212,175,55,0.5)',
            boxShadow: '0 0 28px rgba(212,175,55,0.18), 0 0 60px rgba(212,175,55,0.07), inset 0 0 24px rgba(0,0,0,0.35)',
          }}
        >
          <img
            src={`${import.meta.env.BASE_URL}meu-logo.png`}
            alt="26th MEU"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Text block */}
      <div
        className="font-mono text-[10px] tracking-[0.65em] uppercase mb-3"
        style={{ color: '#4a6fa5', animation: 'fadeSlideIn 0.8s ease-out 0.5s both' }}
      >
        WELCOME TO
      </div>

      <div
        className="font-mono font-bold tracking-wider text-center"
        style={{ fontSize: '1.2rem', color: '#dbeafe', animation: 'fadeSlideIn 0.8s ease-out 0.75s both' }}
      >
        26th Marine Expeditionary Unit
      </div>

      <div
        className="font-mono mt-1.5 tracking-[0.45em]"
        style={{ fontSize: '0.65rem', color: '#c9a227', animation: 'fadeSlideIn 0.8s ease-out 0.95s both' }}
      >
        FLEET MARINE FORCE
      </div>

      {/* Thin gold separator */}
      <div style={{
        width: '220px',
        height: '1px',
        marginTop: '14px',
        marginBottom: '10px',
        background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.4), transparent)',
        animation: 'fadeSlideIn 0.8s ease-out 1.1s both',
      }} />

      <div
        className="font-mono tracking-[0.45em]"
        style={{ fontSize: '0.85rem', color: '#3b82f6', animation: 'fadeSlideIn 0.8s ease-out 1.2s both' }}
      >
        PERSCOM
      </div>

      {/* Click to continue */}
      <div
        className="font-mono absolute bottom-8"
        style={{
          fontSize: '0.6rem',
          color: '#1a2f55',
          letterSpacing: '0.3em',
          animation: 'fadeSlideIn 0.8s ease-out 2s both',
        }}
      >
        CLICK ANYWHERE TO CONTINUE
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.85) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes spin {
          from { transform: rotate(0deg);   }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%,100% { opacity: 0.5; transform: scale(1);    }
          50%     { opacity: 1;   transform: scale(1.06); }
        }
      `}</style>
    </div>
  );
}
