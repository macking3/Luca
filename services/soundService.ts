
class SoundService {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gain = this.ctx.createGain();
      this.gain.connect(this.ctx.destination);
      this.gain.gain.value = 0.1; // Default low volume
    }
  }

  public async play(type: 'BOOT' | 'KEYSTROKE' | 'ALERT' | 'SUCCESS' | 'HOVER' | 'PROCESSING') {
    this.init();
    if (!this.ctx || !this.gain) return;
    
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    
    osc.connect(env);
    env.connect(this.gain);

    const now = this.ctx.currentTime;

    switch(type) {
        case 'BOOT':
            // Deep THX-like swell
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(50, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 1.5);
            env.gain.setValueAtTime(0, now);
            env.gain.linearRampToValueAtTime(0.3, now + 0.5);
            env.gain.exponentialRampToValueAtTime(0.01, now + 2);
            osc.start(now);
            osc.stop(now + 2);
            break;
        case 'KEYSTROKE':
            // High tech click
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800 + Math.random() * 200, now);
            env.gain.setValueAtTime(0.05, now);
            env.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
            break;
        case 'ALERT':
            // Red Queen Warning
            osc.type = 'square';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(600, now + 0.1);
            env.gain.setValueAtTime(0.2, now);
            env.gain.linearRampToValueAtTime(0.2, now + 0.1);
            env.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
            break;
        case 'SUCCESS':
            // Friendly chirp
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, now);
            osc.frequency.exponentialRampToValueAtTime(1800, now + 0.1);
            env.gain.setValueAtTime(0.1, now);
            env.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
            break;
        case 'HOVER':
            // Subtle UI flutter
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200, now);
            env.gain.setValueAtTime(0.02, now);
            env.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
            break;
        case 'PROCESSING':
            // Computing chatter
            osc.type = 'square';
            osc.frequency.setValueAtTime(1000, now);
            osc.frequency.linearRampToValueAtTime(200, now + 0.1);
            env.gain.setValueAtTime(0.05, now);
            env.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
    }
  }
}

export const soundService = new SoundService();
