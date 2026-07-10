// timer.js — Web Audio API timer with tick and buzz sounds

const TimerModule = (() => {
  let audioCtx = null;
  let intervalId = null;
  let remaining = 60;
  let onTickCallback = null;
  let onEndCallback = null;
  const TOTAL = 60;
  const URGENT_THRESHOLD = 10;

  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function resumeCtx() {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function playTick(urgent = false) {
    try {
      const ctx = resumeCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = urgent ? 1000 : 800;
      gain.gain.setValueAtTime(urgent ? 1.0 : 0.8, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) { /* audio not critical */ }
  }

  function playBuzz() {
    try {
      const ctx = resumeCtx();
      // מרימבה יורדת — game over עדין
      const notes = [523, 392, 330, 262]; // C5 → G4 → E4 → C4
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.15;
        gain.gain.setValueAtTime(1.0, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        osc.start(t);
        osc.stop(t + 0.15);
      });
    } catch (e) { /* audio not critical */ }
  }

  function start(onTick, onEnd) {
    stop();
    remaining = TOTAL;
    onTickCallback = onTick;
    onEndCallback = onEnd;

    // initial tick
    playTick(false);
    if (onTickCallback) onTickCallback(remaining);

    intervalId = setInterval(() => {
      remaining--;
      const urgent = remaining <= URGENT_THRESHOLD;
      if (remaining > 0) {
        playTick(urgent);
        if (onTickCallback) onTickCallback(remaining);
      } else {
        // 0 reached
        if (onTickCallback) onTickCallback(0);
        clearInterval(intervalId);
        intervalId = null;
        setTimeout(() => {
          playBuzz();
          if (onEndCallback) onEndCallback();
        }, 50);
      }
    }, 1000);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function getRemaining() {
    return remaining;
  }

  // מרימבה עולה עדינה — ✅ נוחש
  function playSuccess() {
    try {
      const ctx = resumeCtx();
      const notes = [392, 494, 587]; // G4 → B4 → D5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.09;
        gain.gain.setValueAtTime(1.0, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.start(t);
        osc.stop(t + 0.09);
      });
    } catch (e) { /* audio not critical */ }
  }

  // מרימבה יורדת עדינה — ❌ דלג
  function playSkip() {
    try {
      const ctx = resumeCtx();
      const notes = [294, 220]; // D4 → A3
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.11;
        gain.gain.setValueAtTime(1.0, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.11);
      });
    } catch (e) { /* audio not critical */ }
  }

  // Warm up audio context on first user interaction
  function warmUp() {
    getAudioCtx();
  }

  return { start, stop, getRemaining, warmUp, playTick, playBuzz, playSuccess, playSkip };
})();
