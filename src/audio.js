// WebAudio による効果音 + コンボ連動の動的音楽。音源ファイルは使わずコードで合成する。
// 音楽は 2-operator FM 音色（キャリア + モジュレータ）で、疾走するマイナー調。
// musicLevel（コンボ段階 0..4）が上がるほどレイヤー（ベース→ドラム→アルペジオ→リード→カウンター）が増える。
//
// すべてブラウザ前提。AudioContext は createAudio() で生成し、初回ユーザー操作で resume する。

const STEP_SEC = 0.105;     // 16分音符の長さ（≒143BPM の疾走感）
const A = 440;              // 基準音 A4
const hz = (semiFromA, oct = 0) => A * Math.pow(2, oct + semiFromA / 12);

// A マイナーのコード進行（i–VI–III–VII = Am–F–C–G）。各小節の和音をルートからの半音で。
const CHORDS = [
  [0, 3, 7],    // Am: A C E
  [8, 12, 15],  // F : F A C
  [3, 7, 10],   // C : C E G
  [10, 14, 17], // G : G B D
];
// 各小節のベース根音（A からの半音）。
const BASS_ROOT = [0, 8, 3, 10];
// 16分のベース駆動パターン（コード根音に対する相対半音 / null=休符）。
const BASS = [0, null, 0, null, 7, null, 0, 12, 0, null, 0, null, 7, null, 0, 5];
// 8分のリード旋律（A からの半音 / null=休符）。4小節 = 32 個。
const LEAD = [
  12, null, 7, 12, 14, 12, 7, 3,      // Am
  8, null, 12, 8, 5, 8, 12, null,     // F
  15, 14, 12, 10, 7, 10, 12, null,    // C
  14, 10, 7, 10, 14, 17, 19, null,    // G
];

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let level = 0;
  let schedulerId = null;
  let step = 0;
  let nextStepTime = 0;

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.33; // 多声でも歪まないよう控えめ
    musicGain.connect(master);
  }

  function resume() {
    ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // --- 2-operator FM ボイス（時刻 time に正確にスケジュール）---
  function fmVoice(time, freq, dur, opts = {}) {
    if (!ctx) return;
    const { ratio = 1, index = 2, type = 'sine', attack = 0.005, gain = 0.2, dest = musicGain } = opts;
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const amp = ctx.createGain();

    carrier.type = type;
    modulator.type = 'sine';
    carrier.frequency.value = freq;
    modulator.frequency.value = freq * ratio;

    // モジュレーション指数の包絡（FM らしいアタックの効いた音色）。
    const peak = index * freq;
    modGain.gain.setValueAtTime(peak, time);
    modGain.gain.exponentialRampToValueAtTime(Math.max(1, peak * 0.18), time + Math.min(dur, 0.18));
    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    // 振幅の包絡。
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(gain, time + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    carrier.connect(amp);
    amp.connect(dest);

    carrier.start(time);
    modulator.start(time);
    carrier.stop(time + dur + 0.05);
    modulator.stop(time + dur + 0.05);
  }

  // ノイズ系（時刻指定）。
  function noiseBurst(time, dur, gain, hpFreq, dest = musicGain) {
    if (!ctx) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = hpFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(filter); filter.connect(g); g.connect(dest);
    src.start(time);
    src.stop(time + dur + 0.02);
  }

  function kick(time) {
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, time);
    o.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    g.gain.setValueAtTime(0.6, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
    o.connect(g); g.connect(musicGain);
    o.start(time); o.stop(time + 0.18);
  }

  // --- 効果音（即時・currentTime 基準）---
  function sfxBlip(freq, dur, type, gain, slideTo) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  const sfxShot = () => sfxBlip(880, 0.06, 'square', 0.07, 660);
  const sfxEnemyShot = () => sfxBlip(330, 0.08, 'sawtooth', 0.04, 220);
  const sfxHit = () => { sfxBlip(160, 0.3, 'sawtooth', 0.22, 60); noiseBurst(ctx.currentTime, 0.25, 0.18, 800, master); };
  const sfxExplosion = () => { if (ctx) noiseBurst(ctx.currentTime, 0.18, 0.1, 500, master); };
  const sfxBomb = (charge = 0.5) => {
    if (!ctx) return;
    fmVoice(ctx.currentTime, 90 + charge * 90, 0.5, { ratio: 1.5, index: 6, type: 'sine', gain: 0.32, dest: master });
    noiseBurst(ctx.currentTime, 0.5, 0.22, 200, master);
  };

  // --- 動的音楽: 16分のステップシーケンサ（各ステップを時刻 time に正確配置）---
  function scheduleStep(time, s) {
    const bar = Math.floor(s / 16) % 4;
    const i16 = s % 16;          // 小節内の16分位置
    const chord = CHORDS[bar];
    const root = BASS_ROOT[bar];

    // L0: ベース（駆動）+ キック。
    const bassRel = BASS[i16];
    if (bassRel !== null) {
      fmVoice(time, hz(root + bassRel, -2), STEP_SEC * 1.3, { ratio: 2, index: 3, type: 'sine', gain: 0.3 });
    }
    if (i16 % 4 === 0) kick(time);

    // L1: スネア（2・4拍）+ 16分ハット。
    if (level >= 1) {
      if (i16 === 4 || i16 === 12) noiseBurst(time, 0.12, 0.18, 1800);
      if (i16 % 2 === 1) noiseBurst(time, 0.03, 0.05, 7000);
    }

    // L2: アルペジオ（16分・コードトーンを2オクターブで駆け上がる、FM プラック）。
    if (level >= 2) {
      const tone = chord[s % chord.length] + (Math.floor(s / chord.length) % 2) * 12;
      fmVoice(time, hz(tone, 0), STEP_SEC * 0.9, { ratio: 3, index: 4, type: 'sine', gain: 0.07 });
    }

    // L3: リード（8分・SCC/ブラス風 FM）。
    if (level >= 3 && i16 % 2 === 0) {
      const note = LEAD[(s / 2) % LEAD.length | 0];
      if (note !== null) {
        fmVoice(time, hz(note, 0), STEP_SEC * 1.8, { ratio: 1, index: level >= 4 ? 5 : 3, type: 'sawtooth', gain: 0.09 });
      }
    }

    // L4: カウンター（リードのオクターブ下を拍頭で重ねる）。
    if (level >= 4 && i16 % 4 === 0) {
      const note = LEAD[(s / 2) % LEAD.length | 0];
      if (note !== null) fmVoice(time, hz(note - 12, 0), STEP_SEC * 2.4, { ratio: 2, index: 2, type: 'triangle', gain: 0.06 });
    }
  }

  function scheduler() {
    if (!ctx) return;
    while (nextStepTime < ctx.currentTime + 0.14) {
      scheduleStep(nextStepTime, step);
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
