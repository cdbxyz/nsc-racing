let ctx: AudioContext | null = null;
let primed = false;

export function primeAudio(): void {
  if (typeof window === "undefined") return;
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  primed = true;
}

export function isAudioPrimed(): boolean {
  return primed;
}

export async function playHorn(): Promise<void> {
  if (!ctx) return;
  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  const now = ctx.currentTime;
  const duration = 0.9;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.linearRampToValueAtTime(190, now + duration * 0.8);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1200, now);
  filter.Q.setValueAtTime(4, now);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.28, now + 0.04);
  gain.gain.setValueAtTime(0.28, now + duration * 0.7);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);
}
