// WebAudio による効果音 + コンボ連動の動的音楽。音源ファイルは使わずコードで合成する。
// 音楽は 2-operator FM 音色（キャリア + モジュレータ）で、疾走するマイナー調。
// musicLevel（コンボ段階 0..4）が上がるほどレイヤー（ベース→ドラム→アルペジオ→リード→カウンター）が増える。
//
// すべてブラウザ前提。AudioContext は createAudio() で生成し、初回ユーザー操作で resume する。

const STEP_SEC = 0.079;     // 16分音符の長さ（≒190BPM の疾走感）
const A = 440;              // 基準音 A4
const hz = (semiFromA, oct = 0) => A * Math.pow(2, oct + semiFromA / 12);

// --- 長尺の楽曲（曲構成をデータ化）---
// 短い旋律の反復に聞こえないよう、コード進行とリード・フレーズを「ライブラリ」として持ち、
// ARRANGEMENT（曲構成表）でイントロ→Aメロ→サビ→間奏…と並べ替えて1曲を組む。
// セクションごとに進行・リード・転調が替わるので、長く・展開のある曲になる。

const SECTION_BARS = 4; // 1セクション = 4小節（= 進行1周ぶん）

// 4小節のコード進行ライブラリ（A からの半音、和音はルート+構成音。7th 込みの厚い響き）。
const PROGS = [
  /*P0*/[[0, 3, 7, 10], [5, 8, 12, 15], [10, 14, 17], [3, 7, 10, 14]],   // Am7 Dm7 G  Cmaj7
  /*P1*/[[7, 10, 14], [8, 12, 15], [10, 14, 17], [0, 3, 7]],             // Em  F   G  Am
  /*P2*/[[3, 7, 10, 14], [10, 14, 17], [0, 3, 7, 10], [8, 12, 15]],      // Cmaj7 G Am7 F
  /*P3*/[[0, 3, 7], [10, 14, 17], [8, 12, 15], [7, 11, 14]],             // Am  G   F  E7
  /*P4*/[[5, 8, 12, 15], [10, 14, 17, 20], [3, 7, 10, 14], [0, 3, 7, 10]], // Dm7 G7 Cmaj7 Am7
  /*P5*/[[8, 12, 15], [10, 14, 17], [7, 10, 14], [0, 3, 7]],             // F   G   Em Am
  /*P6*/[[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]],              // Am  F   C  G（アンセム）
  /*P7*/[[5, 8, 12], [7, 10, 14], [8, 12, 15], [10, 14, 17]],            // Dm  Em  F  G（上行）
];

// 4小節 = 32個（8分）のリード・フレーズ・ライブラリ（A からの半音 / null=休符）。
const LEADS = [
  /*L0 下降フック*/[
    19, null, 17, 19, 22, 19, 15, 12, 17, null, 14, 17, 19, 17, 14, 10,
    15, 17, 19, 22, 24, 22, 19, 15, 14, null, 17, 14, 12, 10, 7, null,
  ],
  /*L1 シンコペの呼び*/[
    12, 12, null, 15, 17, null, 15, 12, 10, 10, null, 14, 15, null, 14, 10,
    12, 15, 17, 19, 17, 15, 12, 10, 8, null, 10, 12, 10, 7, null, null,
  ],
  /*L2 高音ロング（スペース）*/[
    24, null, null, 22, 19, null, 17, 19, 22, null, null, 24, 22, null, 19, 17,
    20, null, null, 19, 17, null, 15, 17, 19, null, 22, null, 24, null, null, null,
  ],
  /*L3 速い駆け上がり*/[
    12, 14, 15, 17, 19, 17, 15, 14, 15, 17, 19, 20, 22, 20, 19, 17,
    19, 20, 22, 24, 22, 20, 19, 17, 15, 14, 12, 10, 12, null, null, null,
  ],
  /*L4 ペンタトニック・リフ*/[
    0, 3, 7, 10, 12, 10, 7, 3, 0, 3, 7, 10, 15, 12, 10, 7,
    10, 7, 3, 7, 10, 12, 15, 17, 19, 17, 15, 12, 10, 7, 3, null,
  ],
  /*L5 サビ（大跳躍）*/[
    19, null, 24, null, 22, 19, 17, 19, 17, null, 22, null, 20, 17, 15, 17,
    15, null, 19, null, 17, 15, 12, 15, 12, 14, 15, 17, 19, null, null, null,
  ],
  /*L6 応答（下降）*/[
    22, 20, 19, 17, 15, 17, 19, null, 20, 19, 17, 15, 14, 15, 17, null,
    19, 17, 15, 14, 12, 14, 15, null, 12, 10, 7, 5, 7, null, null, null,
  ],
  /*L7 スタブ（隙間多め）*/[
    12, null, 12, null, 15, null, 17, null, 19, null, 17, 15, 12, null, null, null,
    14, null, 14, null, 17, null, 19, null, 22, null, 19, 17, 14, null, null, null,
  ],
];

// 16分のベース駆動パターン（コード根音に対する相対半音 / null=休符）。
// オクターブ跳躍（0↔12）と5度(7)を織り交ぜた、休符少なめの疾走ベース。
const BASS = [0, null, 0, 12, 7, null, 0, 12, 0, null, 0, 12, 7, 12, 10, 7];

// 曲構成: 各エントリ = [progIndex, leadIndex, transpose]（leadIndex < 0 はリード無し）。
// 1エントリ = 4小節。これを順に演奏して1曲とし、最後まで来たら頭へループする。
const ARRANGEMENT = [
  [6, -1, 0], [6, -1, 0],                         // イントロ（リード無しで導入）
  [0, 0, 0], [0, 0, 0], [1, 1, 0], [1, 1, 0],     // A メロ
  [0, 4, 0], [0, 0, 0], [1, 2, 0], [1, 1, 0],     // A' 変奏
  [7, 3, 0], [7, 3, 0],                           // プリサビ（駆け上がり）
  [2, 5, 0], [2, 5, 0], [5, 6, 0], [5, 6, 0],     // サビ
  [3, -1, 0], [3, 2, 0],                          // 間奏（スペース）
  [4, 3, 0], [4, 3, 0], [7, 1, 0], [7, 1, 0],     // B メロ
  [3, 7, 0], [3, 7, 0],                           // ブレイク（スタブ）
  [2, 5, 5], [2, 5, 5], [5, 6, 5], [5, 6, 5],     // サビ2（+5 転調で高揚）
  [2, 2, 0], [5, 6, 0], [0, 4, 0], [1, 2, 0],     // 展開（高音フレーズ）
  [7, 0, 0], [7, 1, 0], [4, 3, 0], [4, 5, 0],     // ブリッジ
  [2, 5, 7], [5, 6, 7], [2, 5, 0], [5, 6, 0],     // 最終サビ（+7 で持ち上げ→着地）
  [6, 0, 0], [6, -1, 0],                          // アウトロ
];

const LOOP_BARS = ARRANGEMENT.length * SECTION_BARS;
const LOOP_STEPS = LOOP_BARS * 16;

// ループ内ステップから、その小節の進行・リード・転調・小節内位置を解決する（純粋）。
function resolveBar(s) {
  const ls = ((s % LOOP_STEPS) + LOOP_STEPS) % LOOP_STEPS;
  const bar = Math.floor(ls / 16);
  const secIndex = Math.floor(bar / SECTION_BARS) % ARRANGEMENT.length;
  const [pi, li, transpose] = ARRANGEMENT[secIndex];
  const prog = PROGS[pi];
  const lead = li >= 0 ? LEADS[li] : null;
  const barInProg = bar % SECTION_BARS;
  return { ls, bar, secIndex, transpose, chord: prog[barInProg], lead, barInProg, i16: ls % 16 };
}

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let delaySend = null; // 空間系ディレイ（やまびこ）への送りバス。超連射68k 風のスペース感の核。
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
    musicGain.gain.value = 0.3; // 多声 + ディレイでも歪まないよう控えめ
    musicGain.connect(master);

    // --- フィードバック・ディレイ（付点8分相当のやまびこ）---
    // 各ボイスから send で送られた音が減衰しながら反復し、広い空間/疾走するエコーを作る。
    delaySend = ctx.createGain();
    delaySend.gain.value = 1;
    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = STEP_SEC * 3;   // 付点8分（≈0.237s @190BPM）
    const feedback = ctx.createGain();
    feedback.gain.value = 0.36;             // 反復の減衰（高すぎると飽和する）
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    // 反復音は高域を少し削って奥行きを出す（テープエコー風）。
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 3200;
    delaySend.connect(delay);
    delay.connect(tone);
    tone.connect(feedback);
    feedback.connect(delay);   // フィードバックループ
    tone.connect(wet);
    wet.connect(master);
  }

  function resume() {
    ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // --- 2-operator FM ボイス（時刻 time に正確にスケジュール）---
  function fmVoice(time, freq, dur, opts = {}) {
    if (!ctx) return;
    const {
      ratio = 1, index = 2, type = 'sine', attack = 0.005, gain = 0.2, dest = musicGain,
      pan = 0,        // -1..1 のステレオ定位（空間の広がり）
      send = 0,       // 0..1 のディレイ送り量（やまびこ・スペース感）
      detune = 0,     // セント単位のデチューン（リードの厚み）
    } = opts;
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const amp = ctx.createGain();

    carrier.type = type;
    modulator.type = 'sine';
    carrier.frequency.value = freq;
    if (detune) carrier.detune.value = detune;
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

    // パンがあれば StereoPanner を挟み、出力ノード out を確定する。
    let out = amp;
    if (pan && ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      amp.connect(panner);
      out = panner;
    }
    out.connect(dest);
    // ディレイ送り（ドライ音はそのまま、ウェット成分をやまびこバスへ）。
    if (send > 0 && delaySend) {
      const sg = ctx.createGain();
      sg.gain.value = send;
      out.connect(sg);
      sg.connect(delaySend);
    }

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
  // かすり。短く高い「チッ」。連発するので控えめ。
  const sfxGraze = () => sfxBlip(2400, 0.04, 'sine', 0.04, 3200);
  // アイテム取得。きらめく2音。
  const sfxItem = () => {
    if (!ctx) return;
    const t = ctx.currentTime;
    fmVoice(t, hz(7, 1), 0.16, { ratio: 3, index: 3, type: 'sine', gain: 0.14, dest: master });
    fmVoice(t + 0.07, hz(12, 1), 0.2, { ratio: 3, index: 3, type: 'sine', gain: 0.14, dest: master });
  };
  // シールド消費（被弾を肩代わり）。やわらかい下降ノイズ＋トーン。
  const sfxShield = () => {
    if (!ctx) return;
    fmVoice(ctx.currentTime, 320, 0.3, { ratio: 1.5, index: 4, type: 'sine', gain: 0.2, dest: master });
    noiseBurst(ctx.currentTime, 0.25, 0.12, 1200, master);
  };

  // --- 動的音楽: 16分のステップシーケンサ（各ステップを時刻 time に正確配置）---
  // 音数は 2 軸で増える: level=コンボ段階(0..4)、intensity=生存時間段階(0..4)。
  function scheduleStep(time, s) {
    const { ls, transpose, chord, lead, barInProg, i16 } = resolveBar(s);
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

    // L2: アルペジオ（16分・コードトーンを2オクターブで駆け上がる）。
    // 1ステップごとに左右へ振り、ディレイへ送って跳ね回るエコー（疾走＋空間）を作る。
    if (level >= 2) {
      const idx = ls % chord.length;
      const tone = chord[idx] + tr + (Math.floor(ls / chord.length) % 2) * 12;
      const pan = (i16 % 2 === 0) ? -0.55 : 0.55; // ピンポン・ディレイ風
      fmVoice(time, hz(tone, 0), STEP_SEC * 0.9, { ratio: 3, index: 4, type: 'sine', gain: 0.07, pan, send: 0.3 });
    }

    // L3: リード（8分・ブラス風 FM）。2 基を逆相デチューンで重ね、ワイドで伸びる音に。
    if (level >= 3 && i16 % 2 === 0) {
      const note = (lead ? lead[(barInProg * 8 + i16 / 2) | 0] : null);
      if (note !== null) {
        const f = hz(note + tr, 0);
        const idx2 = level >= 4 ? 5 : 3;
        fmVoice(time, f, STEP_SEC * 1.8, { ratio: 1, index: idx2, type: 'sawtooth', gain: 0.07, pan: -0.25, detune: -7, send: 0.22 });
        fmVoice(time, f, STEP_SEC * 1.8, { ratio: 1, index: idx2, type: 'sawtooth', gain: 0.07, pan: 0.25, detune: 7 });
      }
    }

    // L4: カウンター（リードのオクターブ下を拍頭で重ねる）。
    if (level >= 4 && i16 % 4 === 0) {
      const note = (lead ? lead[(barInProg * 8 + i16 / 2) | 0] : null);
      if (note !== null) fmVoice(time, hz(note - 12 + tr, 0), STEP_SEC * 2.4, { ratio: 2, index: 2, type: 'triangle', gain: 0.06, send: 0.15 });
    }

    // === 生存時間による追加レイヤー（コンボとは独立に音数を増やす）===
    // I1: 16分シェイカー（常時の細かいノリ）。左右に薄く散らす。
    if (intensity >= 1 && i16 % 2 === 0) {
      noiseBurst(time, 0.025, 0.03, 9000);
    }
    // I2: パッド（小節頭にコードを長く伸ばす）。各音を左右に配置して横に広い空間を作る。
    if (intensity >= 2 && i16 === 0) {
      chord.forEach((n, k) => {
        const pan = (k - (chord.length - 1) / 2) * 0.5; // 和音を左右に展開
        fmVoice(time, hz(n + tr, -1), STEP_SEC * 16 * 0.95, { ratio: 1, index: 1.2, type: 'sine', attack: 0.06, gain: 0.03, pan, send: 0.35 });
      });
    }
    // I3: シマー（裏拍で鳴る高音ベル。ほぼディレイに送って星屑のような余韻を残す）。
    if (intensity >= 3 && i16 % 4 === 2) {
      const idx = (ls * 5) % chord.length;
      const pan = (Math.floor(ls / 4) % 2 === 0) ? 0.7 : -0.7;
      fmVoice(time, hz(chord[idx] + tr, 1), STEP_SEC * 0.6, { ratio: 4, index: 3, type: 'sine', gain: 0.03, pan, send: 0.6 });
    }
    // I4: ハイ・カウンター旋律（リードの長3度上を重ね、華やかさを足す）。
    if (intensity >= 4 && i16 % 2 === 0) {
      const note = (lead ? lead[(barInProg * 8 + i16 / 2) | 0] : null);
      if (note !== null) fmVoice(time, hz(note + 4 + tr, 1), STEP_SEC * 1.4, { ratio: 2, index: 3, type: 'sine', gain: 0.04, pan: 0.4, send: 0.3 });
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
    sfxGraze,
    sfxItem,
    sfxShield,
  };
}
