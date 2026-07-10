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
      osc.type = 'square';
      osc.frequency.value = urgent ? 900 : 660;
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.09);
    } catch (e) { /* audio not critical */ }
  }

  function playBuzz() {
    try {
      const ctx = resumeCtx();
      // Low buzzing sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.value = 120;
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.9);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.95);

      // Second harmonic for richness
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'square';
      osc2.frequency.value = 90;
      gain2.gain.setValueAtTime(0.25, ctx.currentTime);
      gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.9);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.95);
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

  // Warm up audio context on first user interaction
  function warmUp() {
    getAudioCtx();
  }

  return { start, stop, getRemaining, warmUp, playTick, playBuzz };
})();
