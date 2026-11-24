export class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private sirenTimer = 0;
  private sirenHigh = false;

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(next: boolean): void {
    this.enabled = next;
    if (!next && this.ctx) {
      if (this.engineGain) {
        this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
      }
      if (this.rainGain) {
        this.rainGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      }
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  public init(): void {
    if (this.ctx) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();

    // Continuous subtle vehicle engine hum
    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 48;
    this.engineGain.gain.value = 0.0;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180;

    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();

    // Continuous procedural rain ambience (looping filtered white noise)
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    noiseSrc.loop = true;

    this.rainFilter = this.ctx.createBiquadFilter();
    this.rainFilter.type = 'bandpass';
    this.rainFilter.frequency.value = 1150;
    this.rainFilter.Q.value = 0.65;

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0.0;

    noiseSrc.connect(this.rainFilter);
    this.rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.ctx.destination);
    noiseSrc.start();
  }

  public updateEngine(speedRatio: number, inVehicle: boolean, active: boolean): void {
    if (!this.ctx || !this.engineGain || !this.engineOsc) return;
    if (!this.enabled || !active) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      return;
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (inVehicle) {
      const targetFreq = 46 + Math.abs(speedRatio) * 118;
      const targetGain = 0.025 + Math.abs(speedRatio) * 0.045;
      this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
      this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.08);
    } else {
      this.engineGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.08);
    }
  }

  public updateRainAmbience(rainIntensity: number, active: boolean): void {
    if (!this.ctx || !this.rainGain || !this.rainFilter) return;
    if (!this.enabled || !active || rainIntensity <= 0.01) {
      this.rainGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
      return;
    }
    const targetGain = rainIntensity * 0.045;
    const targetFreq = 900 + rainIntensity * 650;
    this.rainGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.35);
    this.rainFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.35);
  }

  public playThunder(): void {
    if (!this.ctx || !this.enabled) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(68, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(26, this.ctx.currentTime + 1.4);

    gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.16, this.ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.55);
  }

  public playTone(
    freq: number,
    type: OscillatorType,
    duration: number,
    vol = 0.12,
    slideTo: number | null = null,
  ): void {
    if (!this.ctx || !this.enabled) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slideTo !== null) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, slideTo),
        this.ctx.currentTime + duration,
      );
    }

    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  public playCash(): void {
    this.playTone(880, 'sine', 0.14, 0.14);
    window.setTimeout(() => this.playTone(1320, 'triangle', 0.24, 0.16), 90);
  }

  public playShoot(): void {
    this.playTone(340, 'square', 0.11, 0.1, 70);
  }

  public playBoost(): void {
    this.playTone(140, 'sawtooth', 0.34, 0.1, 420);
  }

  public playCrash(): void {
    this.playTone(95, 'sawtooth', 0.24, 0.16, 28);
  }

  public playDoor(): void {
    this.playTone(180, 'triangle', 0.09, 0.12, 90);
  }

  public updateSiren(dt: number, wantedLevel: number): void {
    if (!this.ctx || !this.enabled || wantedLevel <= 0) return;
    this.sirenTimer += dt;
    if (this.sirenTimer > 0.42) {
      this.sirenTimer = 0;
      this.sirenHigh = !this.sirenHigh;
      this.playTone(this.sirenHigh ? 780 : 590, 'sine', 0.36, 0.028);
    }
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
