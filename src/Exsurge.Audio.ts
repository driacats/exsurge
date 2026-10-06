// Listening to a chant: the melody of a gabc body as a list of notes with MIDI
// pitches and relative durations, played with the Web Audio API or written as a
// standard MIDI file. Only the pitches and the few signs that change duration or
// add breath are read; the lyrics and the neume shapes are ignored.
//
// Kept out of the rendering classes on purpose: it works on the gabc text, so it
// can be used (and tested) without laying out a score.

export interface MelodyEvent {
  /** MIDI note number, or null for a rest (bar line). */
  pitch: number | null;
  /** Duration in beats (1 = an ordinary punctum). */
  beats: number;
}

const LETTERS = 'abcdefghijklm';
/** Semitones above do for each scale degree do re mi fa sol la si. */
const SCALE = [0, 2, 4, 5, 7, 9, 11];
/** Staff position of the clef line: line 1 = d, line 2 = f, line 3 = h, line 4 = j. */
const LINE_POS = [0, 3, 5, 7, 9];

/** MIDI pitch of "do" when the melody is sung: C4. Mode transposition is left to the singer. */
const DO_PITCH = 60;

const BAR_RESTS: Record<string, number> = { ',': 0.5, '`': 0.25, ';': 0.75, ':': 1, '::': 1.5 };

interface Clef {
  /** staff position (0 = letter a) of do */
  doPos: number;
}

function clefFromToken(tok: string): Clef | null {
  const m = /^([cf])(b?)([1-4])$/.exec(tok);
  if (!m) return null;
  const linePos = LINE_POS[Number(m[3])];
  // a C clef marks do on its line, an F clef marks fa (3 degrees above do)
  return { doPos: m[1] === 'c' ? linePos : linePos - 3 };
}

function pitchAt(pos: number, clef: Clef, flats: Set<number>): number {
  const degree = pos - clef.doPos;
  const octave = Math.floor(degree / 7);
  const step = ((degree % 7) + 7) % 7;
  let pitch = DO_PITCH + 12 * octave + SCALE[step];
  if (flats.has(pos)) pitch -= 1;
  return pitch;
}

/** All "( ... )" groups of the body, in order, with verbatim "[...]" parts removed. */
function notationGroups(body: string): string[] {
  const groups: string[] = [];
  const re = /\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) groups.push(m[1].replace(/\[[^\]]*\]/g, ''));
  return groups;
}

export function parseGabcMelody(body: string): MelodyEvent[] {
  const events: MelodyEvent[] = [];
  let clef: Clef = { doPos: LINE_POS[4] }; // c4 until told otherwise
  const flats = new Set<number>();

  const rest = (beats: number) => {
    const last = events[events.length - 1];
    if (!last) return;
    if (last.pitch === null) last.beats = Math.max(last.beats, beats);
    else events.push({ pitch: null, beats });
  };

  for (const group of notationGroups(body)) {
    const g = group.trim();
    const asClef = clefFromToken(g);
    if (asClef) {
      clef = asClef;
      flats.clear();
      if (/^cb|^fb/.test(g)) flats.add(clef.doPos - 1); // "cb3": b-flat built into the clef
      continue;
    }

    let i = 0;
    while (i < g.length) {
      const ch = g[i];

      // bars
      if (ch === ':' && g[i + 1] === ':') { rest(BAR_RESTS['::']); flats.clear(); i += 2; continue; }
      if (ch === ',' || ch === ';' || ch === ':' || ch === '`') {
        rest(BAR_RESTS[ch]);
        flats.clear();
        i++;
        while (i < g.length && /[0-9]/.test(g[i])) i++; // ";1", ",3"…
        continue;
      }

      // clef change in the middle of a group: "c3", "f4", "cb3"
      const clefMatch = /^([cf]b?[1-4])/.exec(g.slice(i));
      if (clefMatch && (i === 0 || /[\s/!]/.test(g[i - 1]))) {
        const c = clefFromToken(clefMatch[1]);
        if (c) { clef = c; flats.clear(); i += clefMatch[1].length; continue; }
      }

      const lower = ch.toLowerCase();
      const pos = LETTERS.indexOf(lower);
      if (pos < 0) { i++; continue; }

      const next = g[i + 1];
      // accidentals: "ix" flat, "iy" natural, "i#" sharp (treated as natural)
      if (next === 'x') { flats.add(pos); i += 2; continue; }
      if (next === 'y' || next === '#') { flats.delete(pos); i += 2; continue; }
      // custos: "h+"
      if (next === '+') { i += 2; continue; }

      // a note: read its modifiers
      let j = i + 1;
      let beats = 1;
      let dots = 0;
      let episema = false;
      while (j < g.length && /[vVoOwWsSrR~<>q.'_0-9-]/.test(g[j])) {
        if (g[j] === '.') dots++;
        if (g[j] === '_') episema = true;
        j++;
      }
      if (dots) beats = 2;
      else if (episema) beats = 1.5;
      events.push({ pitch: pitchAt(pos, clef, flats), beats });
      i = j;
    }
  }

  // no trailing rest
  while (events.length && events[events.length - 1].pitch === null) events.pop();
  return events;
}

// --- antiphon / EUOUAE ------------------------------------------------------------

/**
 * Splits off the EUOUAE (the psalm-tone ending printed after an antiphon) so the
 * two can be played separately. Returns null for `euouae` when there is none.
 * The EUOUAE part starts with the clef in force where it begins.
 */
export function splitEuouae(body: string): { main: string; euouae: string | null } {
  const tag = body.search(/<eu>/i);
  const syll = body.search(/E\s*\([^)]*\)\s*u\s*\([^)]*\)\s*o\s*\([^)]*\)\s*u\s*\([^)]*\)\s*a\s*\(/);
  const at = tag >= 0 ? tag : syll;
  if (at <= 0) return { main: body, euouae: null };
  const main = body.slice(0, at);
  const clefs = [...main.matchAll(/\(\s*([cf]b?[1-4])/g)];
  const clef = clefs.length ? clefs[clefs.length - 1][1] : 'c4';
  return { main, euouae: `(${clef}) ${body.slice(at)}` };
}

// --- standard MIDI file ----------------------------------------------------------

/** A type-0 MIDI file of the melody: choir "aahs", one beat = one quarter note lasting `secondsPerBeat`. */
export function melodyToMidi(events: MelodyEvent[], secondsPerBeat = 0.45): Uint8Array {
  const TPQ = 480;
  const usPerQuarter = Math.round(secondsPerBeat * 1e6);
  const track: number[] = [];
  const varLen = (n: number) => {
    const bytes = [n & 0x7f];
    while ((n >>= 7)) bytes.unshift((n & 0x7f) | 0x80);
    return bytes;
  };
  track.push(0, 0xff, 0x51, 3, (usPerQuarter >> 16) & 0xff, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff);
  track.push(0, 0xc0, 52); // program: choir aahs
  let pending = 0;
  for (const e of events) {
    const ticks = Math.round(e.beats * TPQ);
    if (e.pitch === null) { pending += ticks; continue; }
    track.push(...varLen(pending), 0x90, e.pitch, 80);
    track.push(...varLen(ticks), 0x80, e.pitch, 0);
    pending = 0;
  }
  track.push(...varLen(pending), 0xff, 0x2f, 0);

  const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, (TPQ >> 8) & 0xff, TPQ & 0xff];
  const len = track.length;
  const trackHeader = [0x4d, 0x54, 0x72, 0x6b, (len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff];
  return new Uint8Array([...header, ...trackHeader, ...track]);
}

// --- playback ----------------------------------------------------------------------

export interface PlayOptions {
  /** Seconds per beat (an ordinary punctum). Default 0.45. */
  secondsPerBeat?: number;
  /** Called when the melody ends or is stopped. */
  onEnd?: () => void;
  /**
   * Called each time the sounding note changes, with its index among the pitched
   * events (rests skipped), or null during a rest. Use it to follow the score.
   */
  onNote?: (index: number | null) => void;
  /** Overall volume, 0 to 1. Default 0.22. */
  volume?: number;
}

let audioContext: AudioContext | null = null;
let current: { stop: () => void } | null = null;

/** 0.05 s of silence, 8 kHz mono 8-bit WAV. */
const SILENT_WAV = () => 'data:audio/wav;base64,' + btoa(
  'RIFF' + String.fromCharCode(0xb4, 0x01, 0, 0) + 'WAVEfmt ' +
  String.fromCharCode(16, 0, 0, 0, 1, 0, 1, 0, 0x40, 0x1f, 0, 0, 0x40, 0x1f, 0, 0, 1, 0, 8, 0) +
  'data' + String.fromCharCode(144, 1, 0, 0) + String.fromCharCode(128).repeat(400));

/**
 * iPhone/iPad: Web Audio counts as "ambient" sound and is muted by the silent
 * switch. Declaring a playback session (Safari 16.4+) makes it play like music;
 * on older iOS, playing a short silent <audio> element during the tap does the
 * same. Both are harmless elsewhere.
 */
let unlocked = false;
function unlockAudio(): void {
  if (unlocked) return;
  unlocked = true;
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  try { if (nav.audioSession) nav.audioSession.type = 'playback'; } catch { /* not supported */ }
  try {
    const el = new Audio(SILENT_WAV());
    el.setAttribute('playsinline', '');
    void el.play().catch(() => { /* ignore */ });
  } catch { /* no HTMLAudioElement */ }
}

const frequency = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** Stops whatever melody is playing (if any). */
export function stopMelody(): void {
  current?.stop();
}

/**
 * Plays a melody: a soft, organ-like tone for each note. Only one melody plays
 * at a time; starting another stops the current one. Call it from a click or a
 * tap (browsers only allow sound after the user interacts). Returns a function
 * that stops it.
 */
export function playMelody(events: MelodyEvent[], options: PlayOptions = {}): () => void {
  const { secondsPerBeat = 0.45, onEnd, onNote, volume = 0.22 } = options;
  current?.stop();
  unlockAudio();
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) { onEnd?.(); return () => {}; }
  audioContext ??= new AC();
  const audio = audioContext;
  // resume() must be called inside the tap; "interrupted" (iOS, after a call) also needs it
  if (audio.state !== 'running') void audio.resume();

  const master = audio.createGain();
  master.gain.value = volume;
  master.connect(audio.destination);

  let t = audio.currentTime + 0.08;
  const nodes: OscillatorNode[] = [];
  /** start time and pitched-note index of every event (null for rests) */
  const cues: { at: number; index: number | null }[] = [];
  let pitched = 0;
  for (const e of events) {
    const dur = e.beats * secondsPerBeat;
    cues.push({ at: t, index: e.pitch !== null ? pitched++ : null });
    if (e.pitch !== null) {
      const env = audio.createGain();
      env.connect(master);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(1, t + 0.04);
      env.gain.setValueAtTime(1, t + Math.max(0.05, dur - 0.06));
      env.gain.linearRampToValueAtTime(0, t + dur);
      // fundamental + a quieter octave: a gentle flute/organ colour
      for (const [mult, type, gain] of [[1, 'sine', 1], [2, 'triangle', 0.18]] as const) {
        const osc = audio.createOscillator();
        osc.type = type;
        osc.frequency.value = frequency(e.pitch) * mult;
        const g = audio.createGain();
        g.gain.value = gain;
        osc.connect(g).connect(env);
        osc.start(t);
        osc.stop(t + dur + 0.02);
        nodes.push(osc);
      }
    }
    t += dur;
  }

  const total = (t - audio.currentTime) * 1000;
  let done = false;

  // follow the audio clock to tell which note is sounding
  let frame = 0;
  let shown: number | null | undefined;
  const follow = () => {
    const now = audio.currentTime;
    let index: number | null = null;
    for (let k = cues.length - 1; k >= 0; k--) {
      if (cues[k].at <= now) { index = cues[k].index; break; }
    }
    if (index !== shown) { shown = index; onNote?.(index); }
    frame = requestAnimationFrame(follow);
  };
  if (onNote) frame = requestAnimationFrame(follow);

  const finish = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    master.gain.cancelScheduledValues(audio.currentTime);
    master.gain.setTargetAtTime(0, audio.currentTime, 0.02);
    setTimeout(() => { nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } }); master.disconnect(); }, 120);
    if (current?.stop === finish) current = null;
    onEnd?.();
  };
  const timer = setTimeout(finish, total);
  current = { stop: finish };
  return finish;
}
