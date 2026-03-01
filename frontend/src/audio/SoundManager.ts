/**
 * Procedural sound system using Web Audio API.
 * No audio files needed — all sounds are synthesized.
 */

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

let masterGain: GainNode | null = null

function getMaster(): GainNode {
  const ctx = getCtx()
  if (!masterGain) {
    masterGain = ctx.createGain()
    masterGain.gain.value = 0.3
    masterGain.connect(ctx.destination)
  }
  return masterGain
}

export function setVolume(v: number) {
  getMaster().gain.value = Math.max(0, Math.min(1, v))
}

export function setMuted(muted: boolean) {
  getMaster().gain.value = muted ? 0 : 0.3
}

/** Sword clash: white noise burst with bandpass filter */
export function playSwordClash() {
  const ctx = getCtx()
  const master = getMaster()
  const duration = 0.12

  const bufferSize = Math.ceil(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 3000
  filter.Q.value = 2

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.4, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

  source.connect(filter).connect(gain).connect(master)
  source.start()
  source.stop(ctx.currentTime + duration)
}

/** Bow shot: sine sweep 800→200Hz */
export function playBowShot() {
  const ctx = getCtx()
  const master = getMaster()
  const duration = 0.15

  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(800, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + duration)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.2, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

  osc.connect(gain).connect(master)
  osc.start()
  osc.stop(ctx.currentTime + duration)
}

/** Building complete: ascending chord */
export function playBuildingComplete() {
  const ctx = getCtx()
  const master = getMaster()
  const duration = 0.4

  for (const freq of [440, 554, 659]) {
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    osc.connect(gain).connect(master)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  }
}

/** Capture taken: two-note arpeggio */
export function playCaptureTaken() {
  const ctx = getCtx()
  const master = getMaster()

  for (let i = 0; i < 2; i++) {
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = i === 0 ? 523 : 659
    const gain = ctx.createGain()
    const t = ctx.currentTime + i * 0.12
    gain.gain.setValueAtTime(0.08, t)
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15)
    osc.connect(gain).connect(master)
    osc.start(t)
    osc.stop(t + 0.15)
  }
}

/** Unit death: descending noise burst */
export function playUnitDeath() {
  const ctx = getCtx()
  const master = getMaster()
  const duration = 0.2

  const bufferSize = Math.ceil(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(4000, ctx.currentTime)
  filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + duration)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.25, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

  source.connect(filter).connect(gain).connect(master)
  source.start()
  source.stop(ctx.currentTime + duration)
}

/** Ambient: low drone with LFO */
let ambientSource: OscillatorNode | null = null

export function startAmbient() {
  if (ambientSource) return
  const ctx = getCtx()
  const master = getMaster()

  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = 55

  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 0.3
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 8
  lfo.connect(lfoGain)
  lfoGain.connect(osc.frequency)

  const gain = ctx.createGain()
  gain.gain.value = 0.06

  osc.connect(gain).connect(master)
  osc.start()
  lfo.start()

  ambientSource = osc
}

export function stopAmbient() {
  if (ambientSource) {
    ambientSource.stop()
    ambientSource = null
  }
}
