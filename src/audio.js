// WebAudio による効果音 + コンボ連動の動的音楽。音源ファイルは使わずコードで合成する。
// 音楽は 2-operator FM 音色（キャリア + モジュレータ）で、疾走するマイナー調。
// musicLevel（コンボ段階 0..4）が上がるほどレイヤー（ベース→ドラム→アルペジオ→リード→カウンター）が増える。
//
// すべてブラウザ前提。AudioContext は createAudio() で生成し、初回ユーザー操作で resume する。

const STEP_SEC = 0.079;     // 16分音符の長さ（≒190BPM の疾走感）
const A = 440;              // 基準音 A4
const hz = (semiFromA, oct = 0) => A * Math.pow(2, oct + semiFromA / 12);

// --- 長尺ループ（約300秒）---
// セクション制: 複数のコード進行と移調を bar から決定的に算出し、LOOP_STEPS で正確にループする。
const BARS_PER_SECTION = 16;                       // 1セクション = 16小節
const LOOP_BARS = 240;                             // 240小節 × 16分16個 × 0.079s ≈ 303秒
const LOOP_STEPS = LOOP_BARS * 16;

// 各4小節のコード進行（A からの半音、和音はルート+構成音）。セクションごとに切り替える。
const PROGS = [
  [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]],  // Am F C G
  [[0, 3, 7], [5, 8, 12], [10, 14, 17], [8, 12, 15]],  // Am Dm G F
  [[3, 7, 10], [10, 14, 17], [5, 8, 12], [0, 3, 7]],   // C G Dm Am
  [[8, 12, 15], [3, 7, 10], [10, 14, 17], [0, 3, 7]],  // F C G Am
];
// セクションごとの移調（半音）。長く聴いても飽きないよう転調で起伏を作る。
const SECTION_TRANSPOSE = [0, 0, 5, -2, 3, -2, 7, 0];

// 16分のベース駆動パターン（コード根音に対する相対半音 / null=休符）。
const BASS = [0, null, 0, null, 7, null, 0, 12, 0, null, 0, null, 7, null, 0, 5];
// 8分のリード旋律（A からの半音 / null=休符）。4小節 = 32 個。
const LEAD = [
  12, null, 7, 12, 14, 12, 7, 3,      // 1小節目
  8, null, 12, 8, 5, 8, 12, null,     // 2小節目
  15, 14, 12, 10, 7, 10, 12, null,    // 3小節目
  14, 10, 7, 10, 14, 17, 19, null,    // 4小節目
];

// ループ内ステップから、その小節のコード進行・移調・小節内位置を解決する（純粋）。
function resolveBar(s) {
  const ls = ((s % LOOP_STEPS) + LOOP_STEPS) % LOOP_STEPS;
  const bar = Math.floor(ls / 16);
  const sec = Math.floor(bar / BARS_PER_SECTION);
  const prog = PROGS[sec % PROGS.length];
  const transpose = SECTION_TRANSPOSE[sec % SECTION_TRANSPOSE.length];
  const barInProg = bar % prog.length;
  return { ls, bar, sec, transpose, chord: prog[barInProg], barInProg, i16: ls % 16 };
}

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let level = 0;       // コンボ由来のレイヤー段階(0..4)
  let intensity = 0;   // 生存時間由来の追加レイヤー段階(0..4)
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
  // エクステンド（1UP）。明るい上昇アルペジオ。
  const sfxExtend = () => {
    if (!ctx) return;
    const t = ctx.currentTime;
    [0, 4, 7, 12, 16].forEach((semi, i) => {
      fmVoice(t + i * 0.06, hz(semi, 1), 0.22, { ratio: 2, index: 3, type: 'sine', gain: 0.16, dest: master });
    });
  };

  // --- 動的音楽: 16分のステップシーケンサ（各ステップを時刻 time に正確配置）---
  // 音数は 2 軸で増える: level=コンボ段階(0..4)、intensity=生存時間段階(0..4)。
  function scheduleStep(time, s) {
    const { ls, transpose, chord, barInProg, i16 } = resolveBar(s);
    const tr = transpose;
    const root = chord[0];

    // L0: ベース（駆動）+ キック。
    const bassRel = BASS[i16];
    if (bassRel !== null) {
      fmVoice(time, hz(root + bassRel + tr, -2), STEP_SEC * 1.3, { ratio: 2, index: 3, type: 'sine', gain: 0.3 });
      // intensity3: ベースのオクターブ上を薄く重ね、低音に厚みを出す。
      if (intensity >= 3) {
        fmVoice(time, hz(root + bassRel + tr, -1), STEP_SEC * 1.0, { ratio: 2, index: 2, type: 'triangle', gain: 0.05 });
      }
    }
    if (i16 % 4 === 0) kick(time);

    // L1: スネア（2・4拍）+ 16分ハット。
    if (level >= 1) {
      if (i16 === 4 || i16 === 12) noiseBurst(time, 0.12, 0.18, 1800);
      if (i16 % 2 === 1) noiseBurst(time, 0.03, 0.05, 7000);
    }

    // L2: アルペジオ（16分・コードトーンを2オクターブで駆け上がる、FM プラック）。
    if (level >= 2) {
      const idx = ls % chord.length;
      const tone = chord[idx] + tr + (Math.floor(ls / chord.length) % 2) * 12;
      fmVoice(time, hz(tone, 0), STEP_SEC * 0.9, { ratio: 3, index: 4, type: 'sine', gain: 0.07 });
    }

    // L3: リード（8分・SCC/ブラス風 FM）。
    if (level >= 3 && i16 % 2 === 0) {
      const note = LEAD[(barInProg * 8 + i16 / 2) % LEAD.length | 0];
      if (note !== null) {
        fmVoice(time, hz(note + tr, 0), STEP_SEC * 1.8, { ratio: 1, index: level >= 4 ? 5 : 3, type: 'sawtooth', gain: 0.09 });
      }
    }

    // L4: カウンター（リードのオクターブ下を拍頭で重ねる）。
    if (level >= 4 && i16 % 4 === 0) {
      const note = LEAD[(barInProg * 8 + i16 / 2) % LEAD.length | 0];
      if (note !== null) fmVoice(time, hz(note - 12 + tr, 0), STEP_SEC * 2.4, { ratio: 2, index: 2, type: 'triangle', gain: 0.06 });
    }

    // === 生存時間による追加レイヤー（コンボとは独立に音数を増やす）===
    // I1: 16分シェイカー（常時の細かいノリ）。
    if (intensity >= 1 && i16 % 2 === 0) {
      noiseBurst(time, 0.025, 0.03, 9000);
    }
    // I2: パッド（小節頭にコードを長く伸ばし、空間を埋める）。
    if (intensity >= 2 && i16 === 0) {
      for (const n of chord) {
        fmVoice(time, hz(n + tr, -1), STEP_SEC * 16 * 0.95, { ratio: 1, index: 1.2, type: 'sine', attack: 0.04, gain: 0.035 });
      }
    }
    // I4: ハイ・カウンター旋律（リードの長3度上を重ね、華やかさを足す）。
    if (intensity >= 4 && i16 % 2 === 0) {
      const note = LEAD[(barInProg * 8 + i16 / 2) % LEAD.length | 0];
      if (note !== null) fmVoice(time, hz(note + 4 + tr, 1), STEP_SEC * 1.4, { ratio: 2, index: 3, type: 'sine', gain: 0.045 });
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

  function setMusicIntensity(n) {
    intensity = Math.max(0, Math.min(4, n | 0));
  }

  return {
    resume,
    startMusic,
    stopMusic,
    setMusicLevel,
    setMusicIntensity,
    sfxShot,
    sfxEnemyShot,
    sfxHit,
    sfxExplosion,
    sfxBomb,
    sfxExtend,
  };
}
