// WebAudio による効果音 + コンボ連動の多層動的音楽。音源ファイルは使わずコードで合成する。
// 音楽はレイヤー（ベース→ドラム→アルペジオ→リード）の足し算。
// musicLevel（コンボ段階 0..4）が上がるほどレイヤーが増える。
//
// すべてブラウザ前提。AudioContext は createAudio() で生成し、初回ユーザー操作で resume する。

const STEP_SEC = 0.13;          // 16分音符相当の長さ（テンポ）
const SCALE = [0, 3, 5, 7, 10]; // マイナーペンタトニック（半音オフセット）
const ROOT = 220;               // A3

const midiToFreq = (semitoneFromRoot, octave = 0) =>
  ROOT * Math.pow(2, (semitoneFromRoot + octave * 12) / 12);

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let level = 0;          // 現在の音楽レイヤー段階
  let schedulerId = null;
  let step = 0;
  let nextStepTime = 0;

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.5;
    musicGain.connect(master);
  }

  function resume() {
    ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // --- 汎用シンセ: 単発の音を鳴らす ---
  function blip(freq, dur, type = 'square', gain = 0.2, dest = master, slideTo = null) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, gain = 0.2, dest = master, hp = 800) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + dur);
  }

  // --- 効果音 ---
  const sfxShot = () => blip(880, 0.06, 'square', 0.08, master, 660);
  const sfxEnemyShot = () => blip(330, 0.08, 'sawtooth', 0.05, master, 220);
  const sfxHit = () => { blip(160, 0.3, 'sawtooth', 0.25, master, 60); noise(0.25, 0.2); };
  const sfxExplosion = () => noise(0.18, 0.12, master, 500);
  const sfxBomb = (charge = 0.5) => {
    blip(120 + charge * 120, 0.5, 'sine', 0.35, master, 40);
    noise(0.5, 0.25, master, 200);
  };

  // --- 動的音楽: ステップシーケンサ ---
  function scheduleStep(time) {
    const bar = step % 16;

    // レイヤー0: ベース（常時、level>=0）。1拍ごとに根音。
    if (level >= 0 && bar % 4 === 0) {
      const root = midiToFreq(SCALE[0], -1);
      const t = time;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = root;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + STEP_SEC * 3.5);
      osc.connect(g); g.connect(musicGain);
      osc.start(t); osc.stop(t + STEP_SEC * 3.6);
    }

    // レイヤー1: ドラム（level>=1）。キック相当 + 裏拍ハイハット。
    if (level >= 1) {
      if (bar % 4 === 0) scheduleAt(() => blip(70, 0.14, 'sine', 0.3, musicGain, 40), time);
      if (bar % 2 === 1) scheduleAt(() => noise(0.04, 0.06, musicGain, 6000), time);
    }

    // レイヤー2: アルペジオ（level>=2）。8分でスケールを駆け上がる。
    if (level >= 2 && bar % 2 === 0) {
      const note = SCALE[(step / 2) % SCALE.length | 0];
      scheduleAt(() => blip(midiToFreq(note, 0), 0.12, 'square', 0.07, musicGain), time);
    }

    // レイヤー3: リード（level>=3）。4ステップごとに上オクターブの伸ばし。
    if (level >= 3 && bar % 4 === 2) {
      const note = SCALE[(step / 4) % SCALE.length | 0];
      scheduleAt(() => blip(midiToFreq(note, 1), STEP_SEC * 2, 'sawtooth', 0.05, musicGain), time);
    }

    // レイヤー4: 上物の追加ハーモニー（level>=4）。
    if (level >= 4 && bar % 8 === 4) {
      const note = SCALE[(step / 8) % SCALE.length | 0];
      scheduleAt(() => blip(midiToFreq(note + 7, 1), STEP_SEC * 3, 'triangle', 0.04, musicGain), time);
    }
  }

  // 指定時刻に発火する簡易スケジュール（currentTime との差を setTimeout に変換）。
  function scheduleAt(fn, time) {
    const delay = Math.max(0, (time - ctx.currentTime) * 1000);
    setTimeout(fn, delay);
  }

  function scheduler() {
    if (!ctx) return;
    while (nextStepTime < ctx.currentTime + 0.12) {
      scheduleStep(nextStepTime);
      step += 1;
      nextStepTime += STEP_SEC;
    }
  }

  function startMusic() {
    ensure();
    if (!ctx || schedulerId) return;
    step = 0;
    nextStepTime = ctx.currentTime + 0.1;
    schedulerId = setInterval(scheduler, 25);
  }

  function stopMusic() {
    if (schedulerId) {
      clearInterval(schedulerId);
      schedulerId = null;
    }
  }

  function setMusicLevel(l) {
    level = Math.max(0, Math.min(4, l | 0));
  }

  return {
    resume,
    startMusic,
    stopMusic,
    setMusicLevel,
    sfxShot,
    sfxEnemyShot,
    sfxHit,
    sfxExplosion,
    sfxBomb,
  };
}
