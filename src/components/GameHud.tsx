import React, { useEffect, useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Clock,
  CloudFog,
  CloudLightning,
  CloudRain,
  DoorOpen,
  Home,
  Moon,
  Pause,
  Radio,
  Star,
  Sun,
  Sunrise,
  Sunset,
  Volume2,
  VolumeX,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  HudSnapshot,
  PROTAGONISTS_META,
  RADIO_STATIONS,
  TimePhase,
  ToastMessage,
  WEATHER_SPECS,
  WeatherCondition,
} from '../types/game';

interface GameHudProps {
  hud: HudSnapshot;
  toast: ToastMessage | null;
  soundEnabled: boolean;
  minimapRef: React.RefObject<HTMLCanvasElement | null>;
  onSwitchChar: (idx: number) => void;
  onTriggerAbility: () => void;
  onCycleCamera: () => void;
  onCycleWeather: () => void;
  onToggleWeatherAuto: () => void;
  onCycleTime: () => void;
  onToggleTimeAuto: () => void;
  onCycleRadio: () => void;
  onInteractPlace: () => void;
  onToggleSound: () => void;
  onTogglePause: () => void;
  onTouchKey: (code: string, pressed: boolean) => void;
}

const WeatherIcon: React.FC<{ weather: WeatherCondition; className?: string }> = ({
  weather,
  className = 'w-3.5 h-3.5',
}) => {
  if (weather === 'CLEAR') return <Sun className={className} />;
  if (weather === 'LIGHT_RAIN') return <CloudRain className={className} />;
  if (weather === 'HEAVY_RAIN') return <CloudLightning className={className} />;
  return <CloudFog className={className} />;
};

const TimeIcon: React.FC<{ phase: TimePhase; className?: string }> = ({
  phase,
  className = 'w-3.5 h-3.5',
}) => {
  if (phase === 'DAWN') return <Sunrise className={className} />;
  if (phase === 'DAY') return <Sun className={className} />;
  if (phase === 'SUNSET') return <Sunset className={className} />;
  return <Moon className={className} />;
};

function formatClock(hourFloat: number): string {
  const h = Math.floor(hourFloat) % 24;
  const m = Math.floor((hourFloat - Math.floor(hourFloat)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  toast,
  soundEnabled,
  minimapRef,
  onSwitchChar,
  onTriggerAbility,
  onCycleCamera,
  onCycleWeather,
  onToggleWeatherAuto,
  onCycleTime,
  onToggleTimeAuto,
  onCycleRadio,
  onInteractPlace,
  onToggleSound,
  onTogglePause,
  onTouchKey,
}) => {
  const [dockOpen, setDockOpen] = useState(true);
  const [showTouch, setShowTouch] = useState(
    () =>
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || window.innerWidth <= 820),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyH') setDockOpen((prev) => !prev);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const weatherSpec = WEATHER_SPECS[hud.weather];
  const station = RADIO_STATIONS[hud.radioStationIdx] ?? RADIO_STATIONS[0];
  const camLabels = ['CHASE', 'CINEMATIC', 'TOP-DOWN'];

  return (
    <>
      {/* Damage Vignette Flash */}
      <div
        className="fixed inset-0 pointer-events-none z-10 transition-opacity duration-150"
        style={{
          opacity: hud.damageFlash ? 1 : 0,
          background:
            'radial-gradient(circle at center, transparent 42%, rgba(255, 20, 40, 0.55) 100%)',
        }}
      />

      {/* Full-Viewport Low-Occlusion Perimeter HUD */}
      <div className="fixed inset-0 pointer-events-none z-20">
        {/* TOP LEFT: Compact Contract Card & Weather Telemetry */}
        <div className="absolute top-4 left-4 max-w-[300px] sm:max-w-[330px] flex flex-col gap-2">
          <div
            className="bg-[#0a0e18]/90 border border-white/15 rounded-xl px-3.5 py-2.5 shadow-lg"
            style={{ borderLeftWidth: '4px', borderLeftColor: hud.missionAccent }}
          >
            <div
              className="font-display text-lg tracking-wider leading-tight"
              style={{ color: hud.missionAccent }}
            >
              {hud.missionTitle}
            </div>
            <div className="text-xs text-slate-200 leading-snug mt-0.5">
              {hud.missionDesc}
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] font-mono-hud text-cyan-300">
              <span>DIST: {hud.missionDist}m</span>
              <span
                className="flex items-center gap-1 font-bold"
                style={{ color: weatherSpec.accent }}
              >
                <WeatherIcon weather={hud.weather} className="w-3.5 h-3.5" />
                {weatherSpec.shortLabel} · {hud.gripPercent}% GRIP
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[10.5px] font-mono-hud text-amber-300 border-t border-white/10 pt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatClock(hud.timeOfDay)} · {hud.timePhase}
              </span>
              <span className="text-slate-400">
                {hud.activeInteriorId ? 'INDOORS' : 'OPEN WORLD'}
              </span>
            </div>
          </div>
        </div>

        {/* TOP RIGHT: Cash, Tier & Wanted Stars */}
        <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
          <div className="font-display text-3xl sm:text-4xl text-[#4cd964] tracking-wider leading-none tabular-nums drop-shadow-[0_2px_0_#000]">
            ${hud.cash.toLocaleString()}
          </div>
          <div className="bg-[#0a0e18]/90 border border-white/15 px-3 py-0.5 rounded-full text-[11px] font-extrabold tracking-wider text-cyan-300 uppercase">
            TIER {hud.level} · {PROTAGONISTS_META[hud.activeCharIdx]?.name}
          </div>
          <div className="flex gap-1 mt-0.5" aria-label={`Wanted level ${hud.wantedLevel} of 5`}>
            {[0, 1, 2, 3, 4].map((idx) => (
              <span
                key={idx}
                className={`text-xl sm:text-2xl leading-none ${
                  idx < hud.wantedLevel
                    ? 'wanted-star-active'
                    : 'text-white/20'
                }`}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        {/* CENTER TOAST BANNER */}
        {toast && (
          <div
            key={toast.id}
            className="absolute top-[18%] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0a0e18]/95 px-6 py-2.5 rounded-xl border font-display text-xl sm:text-2xl tracking-[0.14em] text-white text-center shadow-xl max-w-[90vw]"
            style={{
              borderColor: toast.color,
              textShadow: `0 0 12px ${toast.color}`,
            }}
          >
            {toast.text}
          </div>
        )}

        {/* BOTTOM LEFT: District Label + GTA Radar Minimap + Health & Armor */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-1.5">
          <div className="bg-[#0a0e18]/90 border border-white/15 rounded-md px-2.5 py-0.5 font-display text-sm tracking-widest text-white text-center truncate max-w-[168px]">
            {hud.district}
          </div>
          <div className="w-[140px] h-[140px] sm:w-[168px] sm:h-[168px] rounded-xl overflow-hidden border-2 border-white/25 bg-[#080c14] shadow-xl">
            <canvas
              ref={minimapRef}
              width={168}
              height={168}
              className="w-full h-full block"
            />
          </div>
          <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-[#0a0e18]/90 border border-white/10 text-[9px] font-mono-hud text-slate-300 w-[140px] sm:w-[168px]">
            <span className="flex items-center gap-0.5 text-amber-300" title="Mission Start / Objective">
              <Star className="w-2.5 h-2.5 fill-current" /> MSN
            </span>
            <span className="flex items-center gap-0.5 text-cyan-300" title="Safehouse">
              <Home className="w-2.5 h-2.5" /> HOME
            </span>
            <span className="flex items-center gap-0.5 text-[#ff9f43]" title="Vehicle Repair Shop">
              <Wrench className="w-2.5 h-2.5" /> FIX
            </span>
          </div>
          <div className="flex gap-1.5 w-[140px] sm:w-[168px]">
            <div
              className="flex-1 h-2 bg-black/80 rounded-full overflow-hidden border border-white/15"
              title={`Health ${hud.health}%`}
            >
              <div
                className="h-full bg-gradient-to-r from-[#27ae60] to-[#2ecc71] transition-[width] duration-150"
                style={{ width: `${hud.health}%` }}
              />
            </div>
            <div
              className="flex-1 h-2 bg-black/80 rounded-full overflow-hidden border border-white/15"
              title={`Armor ${hud.armor}%`}
            >
              <div
                className="h-full bg-gradient-to-r from-[#2980b9] to-[#00f0ff] transition-[width] duration-150"
                style={{ width: `${hud.armor}%` }}
              />
            </div>
          </div>
        </div>

        {/* BOTTOM RIGHT: Speedometer & Active Radio Readout */}
        <div className="absolute bottom-4 right-4 flex flex-col items-end gap-1.5">
          {hud.inVehicle && (
            <div
              className="bg-[#0a0e18]/90 border border-white/15 rounded-xl px-3 py-1.5 text-right max-w-[260px]"
              style={{ borderRightWidth: '3px', borderRightColor: station.accent }}
            >
              <div className="flex items-center justify-end gap-1.5 text-[10px] font-extrabold tracking-wider uppercase">
                <Radio className="w-3 h-3" style={{ color: station.accent }} />
                <span style={{ color: station.accent }}>
                  {station.freq} · {station.name}
                </span>
              </div>
              {station.id === 'OFF' ? (
                <div className="text-[11px] text-slate-400 font-semibold">
                  Radio Muted [R]
                </div>
              ) : hud.radioSegment === 'DJ' || hud.radioSegment === 'COMMERCIAL' ? (
                <div className="mt-0.5">
                  <div className="text-[10px] font-mono-hud font-bold uppercase text-amber-300">
                    {hud.radioSegment === 'COMMERCIAL'
                      ? hud.radioBroadcastSpeaker
                      : `ON AIR · ${hud.radioBroadcastSpeaker}`}
                  </div>
                  <div className="text-[10.5px] text-slate-200 leading-tight line-clamp-2">
                    {hud.radioBroadcastLine}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-200 font-semibold truncate">
                  {hud.radioTrackTitle} — {hud.radioTrackArtist}
                </div>
              )}
            </div>
          )}

          <div className="bg-[#0a0e18]/90 border border-white/15 rounded-xl px-4 py-2 text-right min-w-[140px]">
            <div className="font-display text-4xl leading-none text-white tabular-nums">
              {hud.speedMph}
            </div>
            <div className="text-[10px] font-extrabold tracking-wider text-[#ff2a85] uppercase tabular-nums mt-0.5">
              {hud.inVehicle
                ? `MPH · NITRO ${hud.nitro}%`
                : 'ON FOOT · BLASTER'}
            </div>
            <div className="text-[11px] text-slate-400 font-semibold truncate max-w-[180px]">
              {hud.vehicleName}
            </div>
          </div>
        </div>

        {/* INTERACTIVE HOUSE / PLACE ENTRY & INTERIOR PROMPT */}
        {(hud.nearbyPlaceName || hud.activeInteriorName) && (
          <div
            data-interactive="true"
            className="fixed bottom-[88px] left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-1"
          >
            {hud.activeInteriorName ? (
              <div className="flex items-center gap-2 bg-[#0a0e18]/95 border border-emerald-400/60 rounded-xl px-3.5 py-1.5 shadow-xl">
                <span className="text-[11px] font-bold text-emerald-300 tracking-wide">
                  {hud.activeInteriorName} · {hud.activeInteriorPerk}
                </span>
                <button
                  type="button"
                  onClick={onInteractPlace}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/25 border border-emerald-400 text-[11px] font-extrabold text-white hover:bg-emerald-500/40 cursor-pointer"
                >
                  <DoorOpen className="w-3.5 h-3.5" />
                  EXIT [E]
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onInteractPlace}
                className="flex items-center gap-2 bg-[#0a0e18]/95 border rounded-xl px-4 py-2 text-xs font-extrabold tracking-wider text-white shadow-xl hover:bg-white/10 cursor-pointer"
                style={{ borderColor: hud.nearbyPlaceAccent }}
              >
                <DoorOpen
                  className="w-4 h-4"
                  style={{ color: hud.nearbyPlaceAccent }}
                />
                <span>
                  PRESS [E] TO ENTER {hud.nearbyPlaceName}
                  {hud.nearbyPlaceKind === 'HOUSE' ? ' (SAFEHOUSE)' : ''}
                </span>
              </button>
            )}
          </div>
        )}

        {/* BOTTOM CENTER: Collapsible Ergonomic Control Dock */}
        <div
          data-interactive="true"
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center transition-transform duration-200 max-w-[94vw] ${
            dockOpen ? 'translate-y-0' : 'translate-y-[calc(100%-26px)]'
          }`}
        >
          <button
            type="button"
            onClick={() => setDockOpen((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-0.5 rounded-t-lg bg-[#0a0e18]/95 border border-b-0 border-white/15 text-[10px] font-bold tracking-wider uppercase text-slate-300 hover:text-white cursor-pointer"
          >
            {dockOpen ? (
              <>
                <ChevronDown className="w-3 h-3" /> Hide Controls [H]
              </>
            ) : (
              <>
                <ChevronUp className="w-3 h-3" /> Show Controls [H]
              </>
            )}
          </button>

          <div className="bg-[#0a0e18]/95 border border-white/15 rounded-xl px-2.5 py-2 shadow-2xl flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {/* 3-Protagonist Switcher */}
            <div className="flex items-center gap-1 pr-1.5 border-r border-white/10">
              {PROTAGONISTS_META.map((hero) => {
                const isActive = hud.activeCharIdx === hero.id;
                return (
                  <button
                    key={hero.id}
                    type="button"
                    onClick={() => onSwitchChar(hero.id)}
                    title={`Switch to ${hero.fullName} [${hero.id + 1}]`}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-left cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-cyan-500/20 border-cyan-400 text-white'
                        : 'bg-white/5 border-transparent text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white shrink-0"
                      style={{ background: hero.gradient }}
                    >
                      {hero.initial}
                    </span>
                    <span className="text-[10px] font-extrabold tracking-wide hidden md:inline">
                      {hero.name}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono-hud">
                      {hero.id + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Special Ability [Q] */}
            <button
              type="button"
              onClick={onTriggerAbility}
              disabled={hud.abilityCooldown > 0}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer ${
                hud.abilityCooldown > 0
                  ? 'bg-white/5 border-white/10 text-slate-400 cursor-not-allowed'
                  : 'bg-[#ff2a85]/20 border-[#ff2a85]/60 text-white hover:bg-[#ff2a85]/35'
              }`}
              title="Trigger Hero Special Ability [Q]"
            >
              <Zap className="w-3.5 h-3.5 text-[#ffcc00]" />
              <span>
                {hud.abilityCooldown > 0 ? `${hud.abilityCooldown}s` : 'SPECIAL [Q]'}
              </span>
            </button>

            {/* In-Car Radio Station Switcher [R] */}
            <button
              type="button"
              onClick={onCycleRadio}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/15 hover:border-cyan-400 text-[11px] font-bold text-white cursor-pointer"
              title="Switch In-Car Radio Station [R]"
            >
              <Radio className="w-3.5 h-3.5" style={{ color: station.accent }} />
              <span className="hidden sm:inline">{station.genre}</span>
              <span className="text-[10px] text-slate-400 font-mono-hud">[R]</span>
            </button>

            {/* Dynamic Weather Control [V] */}
            <div className="flex items-center rounded-lg overflow-hidden border border-white/15 bg-white/5">
              <button
                type="button"
                onClick={onCycleWeather}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-white/10 cursor-pointer"
                title="Cycle Weather Condition [V]"
              >
                <span style={{ color: weatherSpec.accent }}>
                  <WeatherIcon weather={hud.weather} />
                </span>
                <span className="hidden sm:inline">{weatherSpec.shortLabel}</span>
                <span className="text-[10px] text-slate-400 font-mono-hud">[V]</span>
              </button>
              <button
                type="button"
                onClick={onToggleWeatherAuto}
                className={`px-1.5 py-1.5 text-[9px] font-mono-hud border-l border-white/10 cursor-pointer ${
                  hud.weatherAuto ? 'text-cyan-300' : 'text-amber-300'
                }`}
                title="Toggle Auto Weather Cycle"
              >
                {hud.weatherAuto ? 'AUTO' : 'LOCK'}
              </button>
            </div>

            {/* Dynamic Day-Night Cycle [T] */}
            <div className="flex items-center rounded-lg overflow-hidden border border-white/15 bg-white/5">
              <button
                type="button"
                onClick={onCycleTime}
                className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-bold text-white hover:bg-white/10 cursor-pointer"
                title="Cycle Time of Day [T]"
              >
                <TimeIcon phase={hud.timePhase} className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden md:inline">{hud.timePhase}</span>
                <span className="text-[10px] text-slate-400 font-mono-hud">[T]</span>
              </button>
              <button
                type="button"
                onClick={onToggleTimeAuto}
                className={`px-1.5 py-1.5 text-[9px] font-mono-hud border-l border-white/10 cursor-pointer ${
                  hud.timeAuto ? 'text-cyan-300' : 'text-amber-300'
                }`}
                title="Toggle Auto Day-Night Cycle"
              >
                {hud.timeAuto ? 'AUTO' : 'LOCK'}
              </button>
            </div>

            {/* Camera [C] */}
            <button
              type="button"
              onClick={onCycleCamera}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/15 hover:border-cyan-400 text-[11px] font-bold text-white cursor-pointer"
              title="Cycle Camera Mode [C]"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-300" />
              <span className="hidden md:inline">{camLabels[hud.cameraMode]}</span>
            </button>

            {/* Sound Mute Toggle */}
            <button
              type="button"
              onClick={onToggleSound}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/15 hover:border-cyan-400 text-[11px] font-bold text-white cursor-pointer"
              title="Toggle Sound & Radio"
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              )}
            </button>

            {/* Touch Pad Toggle */}
            <button
              type="button"
              onClick={() => setShowTouch((p) => !p)}
              className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer ${
                showTouch
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                  : 'bg-white/5 border-white/15 text-slate-300'
              }`}
            >
              PAD
            </button>

            {/* Pause [Esc] */}
            <button
              type="button"
              onClick={onTogglePause}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/15 hover:border-[#ff2a85] text-[11px] font-bold text-white cursor-pointer"
              title="Pause [Esc]"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* On-Screen Touch Pad (Mobile or when toggled) */}
      {showTouch && (
        <div className="fixed inset-0 pointer-events-none z-20">
          <div className="absolute bottom-[190px] left-4 flex gap-3 pointer-events-auto">
            {[
              { code: 'ArrowLeft', label: '◀' },
              { code: 'ArrowRight', label: '▶' },
            ].map((btn) => (
              <button
                key={btn.code}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onTouchKey(btn.code, true);
                }}
                onPointerUp={() => onTouchKey(btn.code, false)}
                onPointerLeave={() => onTouchKey(btn.code, false)}
                className="w-14 h-14 rounded-full bg-[#0f172a]/85 border-2 border-white/25 text-white font-extrabold text-sm active:bg-[#ff2a85]/70 touch-none"
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="absolute bottom-[145px] right-4 grid grid-cols-2 gap-2.5 pointer-events-auto">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onTouchKey('KeyF', true);
              }}
              onPointerUp={() => onTouchKey('KeyF', false)}
              className="w-14 h-14 rounded-full bg-[#0f172a]/85 border-2 border-white/25 text-white font-extrabold text-[11px] touch-none"
            >
              CAR
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onTouchKey('Space', true);
              }}
              onPointerUp={() => onTouchKey('Space', false)}
              onPointerLeave={() => onTouchKey('Space', false)}
              className="w-14 h-14 rounded-full bg-[#0f172a]/85 border-2 border-cyan-400/60 text-white font-extrabold text-[11px] touch-none"
            >
              NOS/FIRE
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onTouchKey('ArrowDown', true);
              }}
              onPointerUp={() => onTouchKey('ArrowDown', false)}
              onPointerLeave={() => onTouchKey('ArrowDown', false)}
              className="w-14 h-14 rounded-full bg-rose-500/30 border-2 border-rose-400/70 text-white font-extrabold text-xs touch-none"
            >
              REV
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onTouchKey('ArrowUp', true);
              }}
              onPointerUp={() => onTouchKey('ArrowUp', false)}
              onPointerLeave={() => onTouchKey('ArrowUp', false)}
              className="w-14 h-14 rounded-full bg-emerald-500/30 border-2 border-emerald-400/70 text-white font-extrabold text-xs touch-none"
            >
              GAS
            </button>
          </div>
        </div>
      )}
    </>
  );
};
