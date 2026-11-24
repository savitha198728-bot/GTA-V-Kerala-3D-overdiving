/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { PauseModal, WastedModal } from './components/Modals';
import { TitleScreen } from './components/TitleScreen';
import { NeonViceEngine } from './game/engine';
import { WorldDestination } from './game/models';
import {
  GamePhase,
  HudSnapshot,
  TimePhase,
  ToastMessage,
  WeatherCondition,
} from './types/game';

const INITIAL_HUD: HudSnapshot = {
  cash: 0,
  level: 1,
  missionsCompleted: 0,
  wantedLevel: 0,
  maxWantedReached: 0,
  activeCharIdx: 0,
  cameraMode: 0,
  health: 100,
  armor: 100,
  nitro: 100,
  inVehicle: true,
  speedMph: 0,
  vehicleName: 'VANCE INFERNUS GT',
  district: 'DOWNTOWN FINANCIAL DISTRICT',
  missionTitle: 'CONTRACT #1',
  missionDesc: 'Loading contract...',
  missionDist: 0,
  missionAccent: '#ffcc00',
  abilityCooldown: 0,
  damageFlash: false,
  weather: 'CLEAR',
  weatherAuto: true,
  gripPercent: 100,
  timeOfDay: 17.8,
  timePhase: 'SUNSET',
  timeAuto: true,
  radioStationIdx: 0,
  radioTrackTitle: 'Midnight Overdrive',
  radioTrackArtist: 'Neon Drive & The Mirrors',
  radioSegment: 'MUSIC',
  radioBroadcastSpeaker: 'DJ Max Horizon',
  radioBroadcastLine: '',
  nearbyPlaceName: null,
  nearbyPlaceKind: null,
  nearbyPlaceAccent: '#00f0ff',
  activeInteriorId: null,
  activeInteriorName: null,
  activeInteriorPerk: null,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<NeonViceEngine | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const toastIdRef = useRef(0);

  const [phase, setPhase] = useState<GamePhase>('title');
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const showToast = useCallback((text: string, color: string) => {
    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, text, color });
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 2400);
  }, []);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new NeonViceEngine(mount, {
      onHudUpdate: (snapshot) => setHud(snapshot),
      onToast: showToast,
      onPhaseChange: (nextPhase) => setPhase(nextPhase),
    });
    engineRef.current = engine;

    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      engine.dispose();
      engineRef.current = null;
    };
  }, [showToast]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setMinimapCanvas(
        phase === 'playing' ? minimapRef.current : null,
      );
    }
  }, [phase]);

  const handleToggleSound = useCallback(() => {
    if (!engineRef.current) return;
    setSoundEnabled(engineRef.current.toggleSound());
  }, []);

  const handleSelectWeather = useCallback((w: WeatherCondition) => {
    engineRef.current?.setWeather(w, true);
  }, []);

  const handleSelectTimePhase = useCallback((tp: TimePhase) => {
    engineRef.current?.setTimePhase(tp);
  }, []);

  const handleSelectRadio = useCallback((idx: number) => {
    engineRef.current?.selectRadioStation(idx);
  }, []);

  const handleTeleport = useCallback((dest: WorldDestination) => {
    engineRef.current?.teleportToDestination(dest);
    engineRef.current?.togglePause();
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#07090f]">
      {/* Isolated WebGL Canvas Container */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0" />

      {/* Cinematic Vignette */}
      <div
        className="fixed inset-0 pointer-events-none z-10"
        style={{
          background:
            'radial-gradient(circle at center, transparent 58%, rgba(0, 0, 0, 0.58) 100%)',
        }}
      />

      {phase === 'title' && (
        <TitleScreen onStart={() => engineRef.current?.startGame()} />
      )}

      {(phase === 'playing' || phase === 'paused') && (
        <GameHud
          hud={hud}
          toast={toast}
          soundEnabled={soundEnabled}
          minimapRef={minimapRef}
          onSwitchChar={(idx) => engineRef.current?.switchCharacter(idx)}
          onTriggerAbility={() => engineRef.current?.triggerSpecialAbility()}
          onCycleCamera={() => engineRef.current?.cycleCameraMode()}
          onCycleWeather={() => engineRef.current?.cycleWeather(true)}
          onToggleWeatherAuto={() => engineRef.current?.toggleWeatherAuto()}
          onCycleTime={() => engineRef.current?.cycleTimePhase()}
          onToggleTimeAuto={() => engineRef.current?.toggleTimeAuto()}
          onCycleRadio={() => engineRef.current?.cycleRadioStation(1)}
          onInteractPlace={() => engineRef.current?.interactWithPlace()}
          onToggleSound={handleToggleSound}
          onTogglePause={() => engineRef.current?.togglePause()}
          onTouchKey={(code, pressed) =>
            engineRef.current?.setTouchKey(code, pressed)
          }
        />
      )}

      {phase === 'paused' && (
        <PauseModal
          hud={hud}
          soundEnabled={soundEnabled}
          onResume={() => engineRef.current?.togglePause()}
          onSelectWeather={handleSelectWeather}
          onSelectTimePhase={handleSelectTimePhase}
          onToggleTimeAuto={() => engineRef.current?.toggleTimeAuto()}
          onSelectRadio={handleSelectRadio}
          onTeleport={handleTeleport}
          onToggleSound={handleToggleSound}
        />
      )}

      {phase === 'wasted' && (
        <WastedModal
          hud={hud}
          onRestart={() => engineRef.current?.restartGame()}
        />
      )}
    </div>
  );
}
