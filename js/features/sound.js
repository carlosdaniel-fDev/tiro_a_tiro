/**
 * FEATURE: Sound — efeitos sonoros com Tone.js (sintetizados, sem arquivos de áudio).
 *  • Tiro (seu e de outros jogadores)        → estouro de ruído + "tum" grave   (dos outros: com pan e volume pela distância)
 *  • Bala batendo no CUBO / chão       → "toc" curto e seco
 *  • Bala batendo no PERSONAGEM        → baque surdo + "ping" de confirmação
 *  • Você levando tiro / morrendo      → baque grave
 *  • Arma vazia ('empty')              → "clic" seco
 *  • Pegar munição ('pickup')          → dois "pings" subindo
 *  • Recarga ('reload' out/in/slide)   → tira o pente · encaixa o pente · puxa o ferrolho
 *  • Pular ('jump')                    → "fuf" curto de esforço + impulso grave
 *  • Bala de raspão ('whiz')           → "fiuu" agudo que desce (bala de outro jogador passando perto de você; com pan)
 *  • Música do menu principal          → "Mary Had a Little Lamb" (domínio público) em caixinha de música, em loop, só na tela inicial
 * Eventos ouvidos (bus): 'title:show' · 'title:hide' · 'shot' · 'remoteshot' · 'impact' · 'hurt' · 'jump' · 'whiz'.
 * Tone.js: carrega js/vendor/tone.min.js; se faltar, tenta o CDN; se também falhar, o jogo segue SEM som (sem erro).
 * Volume: menu ⚙ → "Volume" (Settings.values.volume). Para REMOVER: apague .use(FPS.Sound) em main.js.
 * Depende de: Model, Settings, bus · Exporta: FPS.Sound
 */
(function (FPS) {
  'use strict';
  const { Model, Settings, bus } = FPS;
  const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js';

  /** Receita de cada som. noise = chiado filtrado · body = "tum" (MembraneSynth) · ping = blip agudo · n = vozes simultâneas. */
  const KINDS = {
    shot:  { n: 6, noise: { type: 'white', decay: .10, f: ['bandpass', 2400, 1.0], vol: -7 },
                   body:  { note: 'A1', pd: .04, oct: 5, decay: .16, vol: -3 } },
    block: { n: 6, noise: { type: 'pink',  decay: .07, f: ['lowpass', 1500, .7],   vol: -9 },
                   body:  { note: 'E2', pd: .02, oct: 2, decay: .07, vol: -9 } },
    body:  { n: 3, noise: { type: 'brown', decay: .09, f: ['lowpass', 800, .7],    vol: -7 },
                   body:  { note: 'C2', pd: .05, oct: 3, decay: .14, vol: -3 },
                   ping:  { note: 'E6', decay: .09, vol: -14 } },
    hurt:  { n: 2, noise: { type: 'brown', decay: .12, f: ['lowpass', 600, .7],    vol: -6 },
                   body:  { note: 'A1', pd: .08, oct: 2, decay: .25, vol: -2 } },
    death: { n: 1, noise: { type: 'brown', decay: .40, f: ['lowpass', 400, .7],    vol: -8 },
                   body:  { note: 'F1', pd: .12, oct: 3, decay: .60, vol: 0 } },
    empty:       { n: 2, noise: { type: 'white', decay: .025, f: ['bandpass', 3800, 1.2], vol: -10 },
                         body:  { note: 'G3', pd: .008, oct: 1.5, decay: .04, vol: -10 } },
    pickup:      { n: 3, noise: { type: 'pink',  decay: .05,  f: ['highpass', 2500, .7], vol: -16 },
                         ping:  { note: 'E6', note2: 'B6', gap: .08, decay: .16, vol: -10 } },
    reloadOut:   { n: 2, noise: { type: 'white', decay: .04,  f: ['bandpass', 1800, 1.0], vol: -9 },
                         body:  { note: 'C3', pd: .01, oct: 1, decay: .05, vol: -9 } },
    reloadIn:    { n: 2, noise: { type: 'white', decay: .05,  f: ['bandpass', 1200, 1.0], vol: -6 },
                         body:  { note: 'A2', pd: .02, oct: 2, decay: .09, vol: -5 } },
    jump:        { n: 3, noise: { type: 'pink',  decay: .16, attack: .015, f: ['bandpass', 600, .9], vol: -2 }, sweep: [500, 1600],       // "fuu" subindo
                         body:  { note: 'A2', pd: .04, oct: 2, decay: .12, vol: -3 } },
    whiz:        { n: 4, noise: { type: 'white', decay: .26, attack: .04, f: ['bandpass', 4200, 1.4], vol: 0 }, sweep: [4200, 800],       // "fiuu" descendo
                         chirp: { from: 2400, to: 600, decay: .24, vol: -6 } },
    reloadSlide: { n: 2, noise: { type: 'white', decay: .06,  f: ['bandpass', 3000, 1.0], vol: -8 },
                         body:  { note: 'E3', pd: .015, oct: 1.5, decay: .06, vol: -8 } }
  };

  // "Mary Had a Little Lamb" (cantiga tradicional, domínio público): [nota, duração em tempos]; 8 compassos 4/4 + 1 de pausa antes de repetir
  const SONG = [['E4',1],['D4',1],['C4',1],['D4',1], ['E4',1],['E4',1],['E4',2], ['D4',1],['D4',1],['D4',2], ['E4',1],['G4',1],['G4',2],
    ['E4',1],['D4',1],['C4',1],['D4',1], ['E4',1],['E4',1],['E4',1],['E4',1], ['D4',1],['D4',1],['E4',1],['D4',1], ['C4',4]];
  const BASS = ['C3','C3','G2','C3','C3','C3','G2','C3']; // um grave por compasso
  const BPM = 96;

  const Sound = {
    name: 'som', ready: false, pools: {}, music: null, wanted: false, playing: false,

    init() {
      bus.on('shot', () => this.play('shot'));                                   // meu tiro: centralizado
      bus.on('remoteshot', e => this.play('shot', e.pos, .9));                   // tiro de outro jogador: posicional
      bus.on('impact', e => e.kind === 'body' ? this.play('body') : this.play('block', e.point)); // 'body' = acerto meu no boneco
      bus.on('hurt', e => { this.play('hurt', null, e.died ? 1.4 : 1); if (e.died) this.play('death'); });
      bus.on('title:show', () => { this.wanted = true; this.tryMusic(); });      // tela inicial aberta: toca a música
      bus.on('title:hide', () => this.stopMusic());                              // começou a jogar: para
      bus.on('jump', () => this.play('jump'));                                   // pulou
      bus.on('whiz', e => this.play('whiz', e.pos, 1.5));                        // bala de outro jogador passou perto
      bus.on('empty', () => this.play('empty'));                                 // apertou o gatilho sem bala
      bus.on('pickup', () => this.play('pickup'));                               // pegou munição
      bus.on('reload', e => this.play(e.stage === 'out' ? 'reloadOut' : e.stage === 'in' ? 'reloadIn' : 'reloadSlide'));
      // navegadores só liberam áudio após um gesto do usuário
      const unlock = () => { if (!window.Tone) return; if (Tone.context.state !== 'running') Tone.start().then(() => this.tryMusic()); else this.tryMusic(); };
      ['pointerdown', 'touchend', 'keydown', 'click'].forEach(ev => addEventListener(ev, unlock, { passive: true }));
      if (window.Tone) return this.build();
      const s = document.createElement('script'); s.src = CDN;
      s.onload = () => window.Tone && this.build();
      s.onerror = () => console.warn('Tone.js não encontrado: o jogo segue sem som. Coloque tone.min.js em js/vendor/.');
      document.head.appendChild(s);
    },

    /** Cria a cadeia de áudio: vozes → pan → ganho → master → limitador → saída. */
    build() {
      const T = Tone;
      this.master = new T.Gain(Settings.values.volume);
      this.limiter = new T.Limiter(-2); this.master.connect(this.limiter); this.limiter.toDestination();
      for (const k in KINDS) {
        const spec = KINDS[k], list = [];
        for (let i = 0; i < spec.n; i++) list.push(this.voice(spec));
        this.pools[k] = { list, i: 0 };
      }
      this.ready = true; this.tryMusic();
    },

    // ---------- Música do menu ----------
    buildMusic() {
      const T = Tone, out = new T.Gain(0).connect(this.master), spb = 60 / BPM;
      const lead = new T.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: .005, decay: .35, sustain: .12, release: .6 }, volume: -10 }).connect(out);
      const bass = new T.Synth({ oscillator: { type: 'sine' }, envelope: { attack: .01, decay: .6, sustain: .2, release: .7 }, volume: -15 }).connect(out);
      const ev = []; let b = 0;
      SONG.forEach(([n, d]) => { ev.push([`${(b / 4) | 0}:${b % 4}`, { lead: n, d: d * spb * .95 }]); b += d; });
      BASS.forEach((n, i) => ev.push([`${i}:0`, { bass: n, d: 3 * spb }]));
      const part = new T.Part((time, e) => { if (e.lead) lead.triggerAttackRelease(e.lead, e.d, time); else bass.triggerAttackRelease(e.bass, e.d, time); }, ev);
      part.loop = true; part.loopEnd = '9:0'; part.start(0);
      T.Transport.bpm.value = BPM;
      this.music = { out, lead, bass, part };
    },
    /** Começa a música se a tela inicial está aberta e o áudio já foi liberado (precisa de um clique/tecla do jogador). */
    tryMusic() {
      if (!this.wanted || this.playing || !this.ready || Tone.context.state !== 'running') return;
      try {
        if (!this.music) this.buildMusic();
        this.master.gain.value = Settings.values.volume;
        this.music.out.gain.cancelScheduledValues(Tone.now()); this.music.out.gain.rampTo(1, 1.2);
        if (Tone.Transport.state !== 'started') Tone.Transport.start('+0.1');
        this.playing = true;
      } catch (e) { console.warn('Música do menu falhou:', e); }
    },
    stopMusic() {
      this.wanted = false; if (!this.playing) return;
      this.playing = false;
      try { this.music.out.gain.cancelScheduledValues(Tone.now()); this.music.out.gain.rampTo(0, .5); } catch (_) {}
      setTimeout(() => { if (!this.playing) { try { Tone.Transport.stop(); } catch (_) {} } }, 700);
    },
    voice(spec) {
      const T = Tone, v = { t: 0 };
      v.out = new T.Gain(1).connect(this.master);
      v.pan = new T.Panner(0).connect(v.out);
      if (spec.noise) {
        const n = spec.noise;
        v.filter = new T.Filter(n.f[1], n.f[0]); v.filter.Q.value = n.f[2]; v.filter.connect(v.pan);
        v.noise = new T.NoiseSynth({ noise: { type: n.type }, envelope: { attack: n.attack || .001, decay: n.decay, sustain: 0, release: .02 }, volume: n.vol }).connect(v.filter);
      }
      if (spec.body) {
        const b = spec.body;
        v.body = new T.MembraneSynth({ pitchDecay: b.pd, octaves: b.oct, envelope: { attack: .001, decay: b.decay, sustain: 0, release: .05 }, volume: b.vol }).connect(v.pan);
      }
      if (spec.chirp) { const c = spec.chirp; v.chirp = new T.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: .01, decay: c.decay, sustain: 0, release: .02 }, volume: c.vol }).connect(v.pan); }
      if (spec.ping) {
        const p = spec.ping;
        v.ping = new T.Synth({ oscillator: { type: 'sine' }, envelope: { attack: .001, decay: p.decay, sustain: 0, release: .02 }, volume: p.vol }).connect(v.pan);
      }
      return v;
    },

    /** Toca um som. pos = {x,y,z} do mundo (opcional): define pan (esq./dir.) e volume pela distância. boost = multiplicador de volume. */
    play(kind, pos, boost) {
      if (!this.ready || Tone.context.state !== 'running') return;
      try {
        const spec = KINDS[kind], pool = this.pools[kind], v = pool.list[pool.i = (pool.i + 1) % pool.list.length];
        let pan = 0, g = 1;
        if (pos) {
          const p = Model.player, dx = pos.x - p.x, dz = pos.z - p.z, dy = (pos.y || 0) - 1.5, dh = Math.hypot(dx, dz), d = Math.hypot(dh, dy);
          const right = (dx * Math.cos(p.yaw) - dz * Math.sin(p.yaw)) / (dh || 1);     // direita da câmera = (cos yaw, 0, −sin yaw)
          pan = Math.max(-.9, Math.min(.9, right)) * Math.min(1, d / 2);
          g = 1 / (1 + d / 10);
        }
        this.master.gain.value = Settings.values.volume;
        v.pan.pan.value = pan; v.out.gain.value = g * (boost || 1);
        const t = Math.max(Tone.now() + .005, v.t + .002); v.t = t;
        if (spec.sweep && v.filter) { const f = v.filter.frequency; f.cancelScheduledValues(t); f.setValueAtTime(spec.sweep[0], t); f.exponentialRampToValueAtTime(spec.sweep[1], t + spec.noise.decay + .05); }
        if (v.chirp) { const c = spec.chirp; v.chirp.triggerAttackRelease(c.from, c.decay, t); v.chirp.frequency.setValueAtTime(c.from, t); v.chirp.frequency.exponentialRampToValueAtTime(c.to, t + c.decay); }
        if (v.noise) v.noise.triggerAttackRelease(spec.noise.decay, t);
        if (v.body) { v.body.detune.value = (Math.random() - .5) * 300; v.body.triggerAttackRelease(spec.body.note, spec.body.decay, t); }
        if (v.ping) {
          v.ping.triggerAttackRelease(spec.ping.note, spec.ping.decay, t + .02);
          if (spec.ping.note2) v.ping.triggerAttackRelease(spec.ping.note2, spec.ping.decay, t + .02 + spec.ping.gap);
        }
      } catch (e) { /* som nunca pode derrubar o jogo */ }
    }
  };

  FPS.Sound = Sound;
})(window.FPS = window.FPS || {});
