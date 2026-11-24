import React from 'react';

interface TitleScreenProps {
  onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-between px-6 py-10 pointer-events-auto bg-[radial-gradient(circle_at_50%_40%,rgba(7,9,15,0.22)_0%,rgba(7,9,15,0.82)_85%)]">
      {/* Top calm spacer + subtle district tag */}
      <div className="text-[11px] font-bold tracking-[0.35em] uppercase text-cyan-300/80">
        WORLD QUARTERS · AIRPORT & BEACH · ENTERABLE HOUSES & PLACES
      </div>

      {/* Bespoke Inline SVG Title Lockup */}
      <div className="flex flex-col items-center text-center max-w-2xl">
        <svg
          viewBox="0 0 680 180"
          className="w-[min(92vw,620px)] h-auto drop-shadow-[0_12px_32px_rgba(255,42,133,0.42)]"
          role="img"
          aria-label="NEON VICE: OVERDRIVE"
        >
          <defs>
            <linearGradient id="viceTitleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="48%" stopColor="#00f0ff" />
              <stop offset="100%" stopColor="#ff2a85" />
            </linearGradient>
            <linearGradient id="viceBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff2a85" />
              <stop offset="50%" stopColor="#ffcc00" />
              <stop offset="100%" stopColor="#00f0ff" />
            </linearGradient>
          </defs>

          {/* Horizon Grid Accent Lines */}
          <rect x="70" y="138" width="540" height="4" rx="2" fill="url(#viceBarGrad)" />
          <rect x="150" y="148" width="380" height="2" rx="1" fill="#00f0ff" fillOpacity="0.65" />

          {/* Main Display Wordmark */}
          <text
            x="340"
            y="108"
            textAnchor="middle"
            fill="url(#viceTitleGrad)"
            stroke="#090d16"
            strokeWidth="4"
            paintOrder="stroke"
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '112px',
              letterSpacing: '10px',
            }}
          >
            NEON VICE
          </text>

          {/* Sub-lockup */}
          <text
            x="340"
            y="172"
            textAnchor="middle"
            fill="#feca57"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '18px',
              fontWeight: 700,
              letterSpacing: '12px',
            }}
          >
            OVERDRIVE
          </text>
        </svg>

        <p className="mt-4 text-xs sm:text-sm tracking-[0.2em] uppercase text-slate-300 font-semibold">
          High-Speed Heists · Dynamic Weather · 5 In-Car Radio Stations
        </p>

        <button
          type="button"
          onClick={onStart}
          className="mt-8 px-11 py-4 rounded-xl font-display text-3xl tracking-[0.12em] text-white bg-gradient-to-r from-[#ff2a85] to-[#ff6b00] border border-white/25 shadow-[0_12px_32px_rgba(255,42,133,0.45)] hover:brightness-110 active:scale-[0.98] transition-transform cursor-pointer"
        >
          ENTER VICE CITY
        </button>

        <div className="mt-3 text-[11px] uppercase tracking-[0.22em] text-slate-400">
          Press Enter or Space to Launch
        </div>
      </div>

      {/* Single flat control-hint line */}
      <div className="px-4 py-2 rounded-lg bg-[#0a0e18]/90 border border-white/15 text-[11px] sm:text-xs font-mono-hud text-slate-200 tracking-wide text-center">
        WASD Move · Space Boost/Fire · F Hijack · E Enter House/Place · 1-3 Switch · R Radio · V Weather · T Day/Night · Esc GPS/Pause
      </div>
    </div>
  );
};
