
let audioCtx: AudioContext | null = null;
let soundEnabled = true;

try {
  const saved = localStorage.getItem('pookieboth_sound');
  soundEnabled = saved !== null ? JSON.parse(saved) : true;
} catch (e) {
  soundEnabled = true;
}

export const setSoundEnabled = (enabled: boolean) => {
  soundEnabled = enabled;
  localStorage.setItem('pookieboth_sound', JSON.stringify(enabled));
};

export const isSoundEnabled = () => soundEnabled;

const getContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

// "Cute" envelope generator
const playTone = (freq: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    // Smooth attack and release for "softness"
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
};

export const playSound = (type: 'beep' | 'shutter' | 'click' | 'pop' | 'success' | 'delete') => {
  if (!soundEnabled) return;

  try {
    const ctx = getContext();
    const now = ctx.currentTime;

    if (type === 'click') {
      // High pitched pop
      playTone(1000, 'sine', 0.1, 0.05);
    } 
    else if (type === 'pop') {
      // Bubble sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.1);
    }
    else if (type === 'beep') {
      playTone(800, 'sine', 0.15, 0.05);
    } 
    else if (type === 'shutter') {
        // White noise burst
        const bufferSize = ctx.sampleRate * 0.1;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        noise.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
    } 
    else if (type === 'success') {
      // Cute major arpeggio
      setTimeout(() => playTone(523.25, 'sine', 0.3, 0.05), 0);
      setTimeout(() => playTone(659.25, 'sine', 0.3, 0.05), 100);
      setTimeout(() => playTone(783.99, 'sine', 0.4, 0.05), 200);
    }
    else if (type === 'delete') {
        playTone(300, 'triangle', 0.2, 0.05);
        setTimeout(() => playTone(200, 'triangle', 0.2, 0.05), 100);
    }
  } catch (e) {
    console.warn("Audio play failed", e);
  }
};
