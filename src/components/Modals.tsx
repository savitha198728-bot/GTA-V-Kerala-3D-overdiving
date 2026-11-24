import React from 'react';
import { WORLD_DESTINATIONS, WorldDestination } from '../game/models';
import {
  HudSnapshot,
  RADIO_STATIONS,
  TimePhase,
  WEATHER_ORDER,
  WEATHER_SPECS,
  WeatherCondition,
} from '../types/game';

interface PauseModalProps {
  hud: HudSnapshot;
  soundEnabled: boolean;
  onResume: () => void;
  onSelectWeather: (w: WeatherCondition) => void;
  onSelectTimePhase: (tp: TimePhase) => void;
  onToggleTimeAuto: () => void;
  onSelectRadio: (idx: number) => void;
  onTeleport: (dest: WorldDestination) => void;
  onToggleSound: () => void;
}

const TIME_PHASES: TimePhase[] = ['DAWN', 'DAY', 'SUNSET', 'NIGHT'];

export const PauseModal: React.FC<PauseModalProps> = ({
  hud,
  soundEnabled,
  onResume,
  onSelectWeather,
  onSelectTimePhase,
  onToggleTimeAuto,
  onSelectRadio,
  onTeleport,
  onToggleSound,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#07090f]/80">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0d121e] border border-white/15 p-5 sm:p-7 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
          <div>
            <h2 className="font-display text-4xl tracking-widest text-white leading-none">
              PAUSED
            </h2>
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">
              {hud.district} · TIER {hud.level}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleSound}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 text-xs font-bold text-slate-200 hover:border-cyan-400 cursor-pointer"
          >
            AUDIO: {soundEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Day-Night & Weather Controls */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-cyan-300 mb-1.5">
              Dynamic Weather [V]
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {WEATHER_ORDER.map((wId) => {
                const spec = WEATHER_SPECS[wId];
                const active = hud.weather === wId;
                return (
                  <button
                    key={wId}
                    type="button"
                    onClick={() => onSelectWeather(wId)}
                    className={`px-2 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
                      active
                        ? 'bg-cyan-500/20 border-cyan-400 text-white'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {spec.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300">
                Day-Night Cycle [T]
              </span>
              <button
                type="button"
                onClick={onToggleTimeAuto}
                className="text-[10px] font-mono-hud px-2 py-0.5 rounded bg-white/5 border border-white/15 text-cyan-300 cursor-pointer"
              >
                {hud.timeAuto ? 'AUTO' : 'LOCKED'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {TIME_PHASES.map((tp) => {
                const active = hud.timePhase === tp;
                return (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => onSelectTimePhase(tp)}
                    className={`px-2 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
                      active
                        ? 'bg-amber-500/20 border-amber-400 text-white'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {tp}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* World GPS Fast-Travel: Countries, Airport, Beach & Character Houses */}
        <div className="mt-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-300 mb-1.5">
            World GPS Fast-Travel (Countries, Airport, Beach & Houses)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {WORLD_DESTINATIONS.map((dest) => (
              <button
                key={dest.id}
                type="button"
                onClick={() => onTeleport(dest)}
                className="flex flex-col px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400 hover:bg-white/10 text-left cursor-pointer"
              >
                <span className="text-[11px] font-bold text-white truncate">
                  {dest.label}
                </span>
                <span
                  className="text-[9.5px] font-mono-hud font-bold"
                  style={{ color: dest.accent }}
                >
                  {dest.country}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* In-Car Radio Selector */}
        <div className="mt-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#ff2a85] mb-1.5">
            In-Car Radio Stations [R]
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {RADIO_STATIONS.map((st, idx) => {
              const active = hud.radioStationIdx === idx;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => onSelectRadio(idx)}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-left text-xs cursor-pointer ${
                    active
                      ? 'bg-white/15 border-white/40 text-white'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold truncate">
                      {st.freq !== '---' ? `${st.freq} · ` : ''}
                      {st.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {st.id === 'OFF'
                        ? 'Silence radio broadcast'
                        : `${st.djName} · ${st.tracks.length} tracks`}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono-hud shrink-0" style={{ color: st.accent }}>
                    {st.genre}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onResume}
            className="w-full sm:w-auto px-8 py-2.5 rounded-xl font-display text-2xl tracking-widest text-white bg-gradient-to-r from-[#ff2a85] to-[#ff6b00] cursor-pointer"
          >
            RESUME GAME [ESC]
          </button>
        </div>
      </div>
    </div>
  );
};

interface WastedModalProps {
  hud: HudSnapshot;
  onRestart: () => void;
}

export const WastedModal: React.FC<WastedModalProps> = ({ hud, onRestart }) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-5 bg-[#07090f]/88">
      <div className="w-full max-w-lg rounded-2xl bg-[#0d121e] border border-rose-500/35 p-7 sm:p-9 text-center shadow-[0_25px_60px_rgba(0,0,0,0.85)]">
        <div className="font-display text-7xl sm:text-8xl text-[#ff3b30] tracking-[0.14em] leading-none drop-shadow-[0_0_24px_rgba(255,59,48,0.7)]">
          WASTED
        </div>
        <p className="mt-2 text-xs sm:text-sm uppercase tracking-[0.2em] text-slate-400 font-semibold">
          The LSPD shut down your syndicate operation
        </p>

        <div className="grid grid-cols-3 gap-3 my-7">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-[10px] uppercase text-slate-400 font-bold">
              Total Cash
            </div>
            <div className="font-display text-2xl sm:text-3xl text-[#feca57] tabular-nums mt-0.5">
              ${hud.cash.toLocaleString()}
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-[10px] uppercase text-slate-400 font-bold">
              Contracts
            </div>
            <div className="font-display text-2xl sm:text-3xl text-[#00f0ff] tabular-nums mt-0.5">
              {hud.missionsCompleted}
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-[10px] uppercase text-slate-400 font-bold">
              Max Wanted
            </div>
            <div className="font-display text-2xl sm:text-3xl text-[#ff2a85] tabular-nums mt-0.5">
              {hud.maxWantedReached} ★
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onRestart}
          className="w-full max-w-xs py-3.5 rounded-xl font-display text-2xl tracking-widest text-white bg-gradient-to-r from-[#ff2a85] to-[#ff6b00] shadow-lg cursor-pointer"
        >
          RESPAWN AT HOSPITAL
        </button>
      </div>
    </div>
  );
};
