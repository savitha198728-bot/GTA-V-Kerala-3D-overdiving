import {
  RADIO_COMMERCIALS,
  RADIO_STATIONS,
  RadioSegmentType,
  RadioStationSpec,
  RadioTrackInfo,
} from '../types/game';

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export interface RadioBroadcastState {
  segment: RadioSegmentType;
  speaker: string;
  line: string;
}

export class RadioSequencer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private distortion: WaveShaperNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private stationIdx = 0;
  private trackIdx = 0;
  private stepIdx = 0;
  private stepTimer = 0;
  private barCount = 0;
  private active = false;
  private muted = false;

  // Broadcast state machine: MUSIC <-> DJ / COMMERCIAL
  private segment: RadioSegmentType = 'MUSIC';
  private segmentTimer = 0;
  private djLineIdx = 0;
  private commercialIdx = 0;
  private breakToggle = 0;
  private broadcastSpeaker = '';
  private broadcastLine = '';

  public init(sharedCtx?: AudioContext): void {
    if (this.ctx) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = sharedCtx ?? (AudioCtx ? new AudioCtx() : null);
    if (!this.ctx) return;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(this.ctx.destination);

    // Waveshaper for Arena Rock guitar crunch
    this.distortion = this.ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] =
        ((3 + 18) * x * 20 * (Math.PI / 180)) / (Math.PI + 18 * Math.abs(x));
    }
    this.distortion.curve = curve;

    // Noise buffer for snare/hi-hat/tuning static
    const len = Math.floor(this.ctx.sampleRate * 0.25);
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  public getStation(): RadioStationSpec {
    return RADIO_STATIONS[this.stationIdx];
  }

  public getStationIndex(): number {
    return this.stationIdx;
  }

  public getCurrentTrack(): RadioTrackInfo {
    const st = this.getStation();
    return st.tracks[this.trackIdx % st.tracks.length];
  }

  public getBroadcastState(): RadioBroadcastState {
    if (this.getStation().id === 'OFF') {
      return { segment: 'OFF', speaker: 'OFF AIR', line: '' };
    }
    return {
      segment: this.segment,
      speaker: this.broadcastSpeaker,
      line: this.broadcastLine,
    };
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.cancelSpeech();
    this.syncMasterGain();
  }

  public setVehicleActive(inVehicleAndRunning: boolean): void {
    const wasActive = this.active;
    this.active = inVehicleAndRunning;
    if (!inVehicleAndRunning) {
      this.cancelSpeech();
    } else if (!wasActive && this.getStation().id !== 'OFF') {
      // Short DJ greeting when stepping back into a vehicle
      this.startDjBreak(true);
    }
    this.syncMasterGain();
  }

  public cycleStation(step = 1): RadioStationSpec {
    this.stationIdx =
      (this.stationIdx + step + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    this.onStationChanged();
    return this.getStation();
  }

  public setStation(idx: number): RadioStationSpec {
    this.stationIdx = Math.max(0, Math.min(RADIO_STATIONS.length - 1, idx));
    this.onStationChanged();
    return this.getStation();
  }

  private onStationChanged(): void {
    this.cancelSpeech();
    this.trackIdx = 0;
    this.stepIdx = 0;
    this.stepTimer = 0;
    this.barCount = 0;
    this.playTuningSquelch();
    const st = this.getStation();
    if (st.id === 'OFF') {
      this.segment = 'OFF';
      this.broadcastSpeaker = '';
      this.broadcastLine = '';
    } else if (this.active) {
      this.startDjBreak(true);
    } else {
      this.segment = 'MUSIC';
      this.broadcastSpeaker = st.djName;
      this.broadcastLine = st.djLines[0] ?? '';
    }
    this.syncMasterGain();
  }

  private syncMasterGain(): void {
    if (!this.ctx || !this.masterGain) return;
    const st = this.getStation();
    const shouldPlay = this.active && !this.muted && st.id !== 'OFF';
    let targetGain = 0;
    if (shouldPlay) {
      // Duck music smoothly under DJ voice lines and commercial breaks
      targetGain = this.segment === 'MUSIC' ? 0.22 : 0.065;
    }
    this.masterGain.gain.setTargetAtTime(
      targetGain,
      this.ctx.currentTime,
      0.14,
    );
  }

  private cancelSpeech(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore if speechSynthesis is restricted
      }
    }
  }

  private speakLine(text: string, pitch: number, rate: number): void {
    if (!this.active || this.muted) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.pitch = pitch;
      utter.rate = rate;
      utter.volume = 0.72;
      window.speechSynthesis.speak(utter);
    } catch {
      // Safe fallback when speech synthesis is unavailable
    }
  }

  private startDjBreak(isStationIntro = false): void {
    const st = this.getStation();
    if (st.id === 'OFF') return;

    this.segment = 'DJ';
    this.segmentTimer = 4.8;
    const nextTrack = this.getCurrentTrack();

    let line: string;
    if (isStationIntro) {
      line =
        st.djLines[this.djLineIdx % st.djLines.length] ??
        `You're tuned to ${st.freq} ${st.name}.`;
    } else {
      const chatter = st.djLines[this.djLineIdx % st.djLines.length];
      line = `${chatter} Up next: "${nextTrack.title}" by ${nextTrack.artist}!`;
    }
    this.djLineIdx++;
    this.broadcastSpeaker = st.djName;
    this.broadcastLine = line;

    this.playStationSting(st);
    this.speakLine(line, st.djPitch, st.djRate);
    this.syncMasterGain();
  }

  private startCommercialBreak(): void {
    const ad = RADIO_COMMERCIALS[this.commercialIdx % RADIO_COMMERCIALS.length];
    this.commercialIdx++;

    this.segment = 'COMMERCIAL';
    this.segmentTimer = 5.5;
    this.broadcastSpeaker = `AD · ${ad.sponsor}`;
    this.broadcastLine = ad.line;

    this.playCommercialJingle(ad.jingleNotes);
    this.speakLine(ad.line, 1.04, 1.08);
    this.syncMasterGain();
  }

  private playStationSting(st: RadioStationSpec): void {
    if (!this.ctx || !this.active || this.muted) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    const now = this.ctx.currentTime;
    const notes =
      st.id === 'HIPHOP'
        ? [48, 55, 60]
        : st.id === 'ROCK'
          ? [52, 59, 64]
          : [60, 67, 72];
    notes.forEach((midi, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(midiToFreq(midi), now + idx * 0.08);
      gain.gain.setValueAtTime(0.08, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.24);
    });
  }

  private playCommercialJingle(notes: number[]): void {
    if (!this.ctx || !this.active || this.muted) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    const now = this.ctx.currentTime;
    notes.forEach((midi, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.11;
      osc.frequency.setValueAtTime(midiToFreq(midi), t);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  private playTuningSquelch(): void {
    if (!this.ctx || !this.noiseBuffer || this.muted || !this.active) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start();
    src.stop(this.ctx.currentTime + 0.15);
    this.syncMasterGain();
  }

  public update(dt: number): void {
    const st = this.getStation();
    if (
      !this.ctx ||
      !this.masterGain ||
      !this.active ||
      this.muted ||
      st.id === 'OFF'
    ) {
      return;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();

    if (this.segment === 'DJ' || this.segment === 'COMMERCIAL') {
      this.segmentTimer -= dt;
      if (this.segmentTimer <= 0) {
        this.segment = 'MUSIC';
        this.broadcastSpeaker = st.djName;
        this.broadcastLine = '';
        this.syncMasterGain();
      }
    }

    const track = this.getCurrentTrack();
    const stepDuration = 60 / track.bpm / 4;
    this.stepTimer += dt;
    while (this.stepTimer >= stepDuration) {
      this.stepTimer -= stepDuration;
      this.triggerStep(st, track, this.stepIdx);
      this.stepIdx = (this.stepIdx + 1) % 16;
      if (this.stepIdx === 0) {
        this.barCount++;
        // Play ~8 bars per song, then transition through Commercial or DJ Break into the next song
        if (this.segment === 'MUSIC' && this.barCount >= 8) {
          this.barCount = 0;
          this.trackIdx = (this.trackIdx + 1) % st.tracks.length;
          this.breakToggle = (this.breakToggle + 1) % 2;
          if (this.breakToggle === 0) {
            this.startCommercialBreak();
          } else {
            this.startDjBreak(false);
          }
        }
      }
    }
  }

  private triggerStep(
    station: RadioStationSpec,
    track: RadioTrackInfo,
    step: number,
  ): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const bassMidi = track.bassNotes[step] ?? 0;
    const leadMidi = track.leadNotes[step] ?? 0;

    // 1. Drums tailored per genre
    if (station.id === 'ELECTRONIC') {
      if (step % 4 === 0) this.playKick(now, 130, 0.22);
      if (step % 2 === 1) this.playHat(now, 0.06);
      if (step === 4 || step === 12) this.playSnare(now, 0.11);
    } else if (station.id === 'HIPHOP') {
      // Boom-bap / 808 pocket
      if (step === 0 || step === 3 || step === 10) this.playKick(now, 92, 0.28);
      if (step === 4 || step === 12) this.playSnare(now, 0.2);
      if (step % 2 === 0 || step === 15) this.playHat(now, 0.045);
    } else if (station.id === 'ROCK') {
      if (step === 0 || step === 6 || step === 8 || step === 10)
        this.playKick(now, 110, 0.2);
      if (step === 4 || step === 12) this.playSnare(now, 0.17);
      if (step % 2 === 0) this.playHat(now, 0.05);
    } else if (station.id === 'POP') {
      if (step % 4 === 0) this.playKick(now, 115, 0.18);
      if (step === 4 || step === 12) this.playSnare(now, 0.14);
      if (step % 2 === 1) this.playHat(now, 0.045);
    } else {
      // SYNTHWAVE
      if (step === 0 || step === 8) this.playKick(now, 105, 0.21);
      if (step === 4 || step === 12) this.playSnare(now, 0.18);
      if (step % 2 === 0) this.playHat(now, 0.035);
    }

    // 2. Bassline
    if (bassMidi > 0) {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(midiToFreq(bassMidi), now);

      if (station.id === 'SYNTHWAVE') {
        osc.type = 'sawtooth';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(520, now);
        filter.frequency.exponentialRampToValueAtTime(180, now + 0.16);
        gain.gain.setValueAtTime(0.18, now);
      } else if (station.id === 'HIPHOP') {
        osc.type = 'sine';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(340, now);
        gain.gain.setValueAtTime(0.3, now);
      } else if (station.id === 'ROCK') {
        osc.type = 'sawtooth';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(950, now);
        gain.gain.setValueAtTime(0.16, now);
      } else if (station.id === 'ELECTRONIC') {
        osc.type = 'triangle';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(750, now);
        gain.gain.setValueAtTime(0.24, now);
      } else {
        // POP
        osc.type = 'square';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(640, now);
        gain.gain.setValueAtTime(0.13, now);
      }

      const bassLen = station.id === 'HIPHOP' ? 0.28 : 0.18;
      gain.gain.exponentialRampToValueAtTime(0.001, now + bassLen);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + bassLen + 0.01);
    }

    // 3. Lead / Riff / G-Funk Whistle / Acid Synth
    if (leadMidi > 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(midiToFreq(leadMidi), now);

      if (station.id === 'ROCK' && this.distortion) {
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.connect(this.distortion);
        this.distortion.connect(gain);
        gain.connect(this.masterGain);
      } else if (station.id === 'HIPHOP') {
        // West-coast G-funk sine whistle lead
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
        osc.connect(gain);
        gain.connect(this.masterGain);
      } else if (station.id === 'POP') {
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(this.masterGain);
      } else if (station.id === 'ELECTRONIC') {
        osc.type = 'sawtooth';
        const acid = this.ctx.createBiquadFilter();
        acid.type = 'bandpass';
        acid.Q.value = 4.2;
        acid.frequency.setValueAtTime(450, now);
        acid.frequency.exponentialRampToValueAtTime(1950, now + 0.12);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(acid);
        acid.connect(gain);
        gain.connect(this.masterGain);
      } else {
        // SYNTHWAVE square lead
        osc.type = 'square';
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(1600, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(lp);
        lp.connect(gain);
        gain.connect(this.masterGain);
      }

      osc.start(now);
      osc.stop(now + 0.35);
    }

    // 4. Warm Pad Chord on Beat 1
    if (step === 0 && track.chordRoots.length > 0) {
      const root = track.chordRoots[this.barCount % track.chordRoots.length];
      const intervals = station.id === 'POP' ? [0, 4, 7] : [0, 3, 7];
      for (const iv of intervals) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(midiToFreq(root + iv), now);
        gain.gain.setValueAtTime(0.032, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.92);
      }
    }
  }

  private playKick(now: number, startFreq: number, vol: number): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.12);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  private playSnare(now: number, vol: number): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    src.connect(hp);
    hp.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.13);
  }

  private playHat(now: number, vol: number): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 5500;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    src.connect(hp);
    hp.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.05);
  }

  public dispose(): void {
    this.active = false;
    this.cancelSpeech();
  }
}
