export const BANDS = [
  { id: 'sub', label: 'Sub', lo: 20, hi: 60 },
  { id: 'bass', label: 'Bass', lo: 60, hi: 250 },
  { id: 'lowmid', label: 'LM', lo: 250, hi: 500 },
  { id: 'mid', label: 'Mid', lo: 500, hi: 2000 },
  { id: 'himid', label: 'HM', lo: 2000, hi: 4000 },
  { id: 'high', label: 'High', lo: 4000, hi: 8000 },
  { id: 'presence', label: 'Pres', lo: 8000, hi: 14000 },
  { id: 'air', label: 'Air', lo: 14000, hi: 20000 },
] as const

export interface AnalysisResult {
  energy: number
  peak: number
  rms: number
  centroid: number
  flux: number
  spread: number
  zcr: number
  crest: number
  beat: number
  onset: number
  rolloff: number
  loudness: number
  bassRatio: number
}

// Pure function: compute 8 band values from frequency data
// prevBands is mutated in-place for smoothing (module-level array, no GC)
export function computeBands(
  frequencyData: Uint8Array,
  prevBands: Float32Array,  // length 8, smoothed values from previous frame
  sampleRate: number,
  gain: number,
  smoothing: number,
): Float32Array {
  const n = frequencyData.length
  const nyquist = sampleRate / 2
  const result = prevBands // mutate in-place

  for (let b = 0; b < BANDS.length; b++) {
    const band = BANDS[b]!
    const iLo = Math.floor(band.lo / nyquist * n)
    const iHi = Math.min(Math.ceil(band.hi / nyquist * n), n - 1)
    let sum = 0
    let count = 0
    for (let i = iLo; i <= iHi; i++) {
      sum += frequencyData[i]! * gain
      count++
    }
    const raw = count > 0 ? Math.min(sum / count / 255, 1) : 0
    result[b] = result[b]! + (raw - result[b]!) * (1 - smoothing)
  }

  return result
}

// Pure function: compute 13 analysis values
export function computeAnalysis(
  frequencyData: Uint8Array,
  timeDomainData: Uint8Array,
  prevSpectrum: Float32Array,
  energyHistory: Float32Array,
  historyIndex: number,
  prevAnalysis: AnalysisResult,
  sampleRate: number,
  gain: number,
  beatSensitivity: number,
  lastBeatTime: number,
  lastOnsetTime: number,
  now: number,
  bands: Float32Array,
  loudnessAccum: number,
): { analysis: AnalysisResult; newHistoryIndex: number; newLastBeatTime: number; newLastOnsetTime: number; newLoudnessAccum: number } {
  const n = frequencyData.length
  const tn = timeDomainData.length
  const nyquist = sampleRate / 2

  // Energy
  let totalEnergy = 0
  for (let i = 0; i < n; i++) totalEnergy += frequencyData[i]! * gain
  const energy = prevAnalysis.energy + (Math.min(totalEnergy / (n * 255), 1) - prevAnalysis.energy) * 0.25

  // Peak
  let peak = 0
  for (let b = 0; b < 8; b++) { if (bands[b]! > peak) peak = bands[b]! }

  // RMS
  let rmsSum = 0
  for (let i = 0; i < tn; i++) {
    const v = (timeDomainData[i]! - 128) / 128
    rmsSum += v * v
  }
  const rmsRaw = Math.min(Math.sqrt(rmsSum / tn) * gain * 2, 1)
  const rms = prevAnalysis.rms + (rmsRaw - prevAnalysis.rms) * 0.3

  // Zero Crossing Rate
  let zc = 0
  for (let i = 1; i < tn; i++) {
    if ((timeDomainData[i - 1]! < 128 && timeDomainData[i]! >= 128) ||
        (timeDomainData[i - 1]! >= 128 && timeDomainData[i]! < 128)) zc++
  }
  const zcr = prevAnalysis.zcr + (Math.min(zc / tn * 4, 1) - prevAnalysis.zcr) * 0.2

  // Spectral Centroid
  let numC = 0, denC = 0
  for (let i = 0; i < n; i++) {
    numC += (i * nyquist / n) * frequencyData[i]!
    denC += frequencyData[i]!
  }
  const centroidHz = denC > 0 ? numC / denC : 0
  const centroid = prevAnalysis.centroid + (Math.min(centroidHz / 8000, 1) - prevAnalysis.centroid) * 0.2

  // Spectral Spread
  let spreadSum = 0
  for (let i = 0; i < n; i++) {
    const d = (i * nyquist / n) - centroidHz
    spreadSum += d * d * frequencyData[i]!
  }
  const spread = prevAnalysis.spread + (Math.min(denC > 0 ? Math.sqrt(spreadSum / denC) / 5000 : 0, 1) - prevAnalysis.spread) * 0.2

  // Spectral Flux
  let fluxSum = 0
  for (let i = 0; i < n; i++) {
    const d = frequencyData[i]! - prevSpectrum[i]!
    if (d > 0) fluxSum += d
  }
  const flux = prevAnalysis.flux + (Math.min(fluxSum / (n * 30), 1) - prevAnalysis.flux) * 0.3

  // Crest Factor
  let maxAmp = 0
  for (let i = 0; i < tn; i++) {
    const v = Math.abs((timeDomainData[i]! - 128) / 128)
    if (v > maxAmp) maxAmp = v
  }
  const crest = prevAnalysis.crest + (Math.min(maxAmp / (Math.sqrt(rmsSum / tn) || 0.001) / 6, 1) - prevAnalysis.crest) * 0.25

  // Update spectrum history
  for (let i = 0; i < n; i++) prevSpectrum[i] = frequencyData[i]!

  // Energy history for beat detection
  energyHistory[historyIndex] = energy
  const newHistoryIndex = (historyIndex + 1) % energyHistory.length
  let avgEnergy = 0
  for (let i = 0; i < energyHistory.length; i++) avgEnergy += energyHistory[i]!
  avgEnergy /= energyHistory.length

  // Beat detection
  const bs = beatSensitivity
  const isBeat = energy > avgEnergy * (1 + bs * 1.5) && energy > 0.15 + bs * 0.3 && now - lastBeatTime > 100 + bs * 100
  let newLastBeatTime = lastBeatTime
  let beat = prevAnalysis.beat
  if (isBeat) { newLastBeatTime = now; beat = 1 } else { beat *= 0.92 }

  // Onset detection (like beat but 50ms cooldown)
  const isOnset = flux > 0.15 && energy > avgEnergy * 1.1 && now - lastOnsetTime > 50
  let newLastOnsetTime = lastOnsetTime
  let onset = prevAnalysis.onset
  if (isOnset) { newLastOnsetTime = now; onset = 1 } else { onset *= 0.85 }

  // Spectral Rolloff (frequency below which 85% of energy lies)
  const targetEnergy = totalEnergy * 0.85
  let cumEnergy = 0
  let rolloffBin = 0
  for (let i = 0; i < n; i++) {
    cumEnergy += frequencyData[i]! * gain
    if (cumEnergy >= targetEnergy) { rolloffBin = i; break }
  }
  const rolloff = prevAnalysis.rolloff + (Math.min(rolloffBin / n, 1) - prevAnalysis.rolloff) * 0.2

  // Loudness (LUFS approximation — exponential moving average of RMS)
  const newLoudnessAccum = loudnessAccum * 0.95 + rmsRaw * 0.05
  const loudness = Math.min(newLoudnessAccum, 1)

  // Bass Ratio
  const bassVal = bands[1] ?? 0 // bass band
  const highVal = bands[5] ?? 0 // high band
  const bassRatio = (bassVal + highVal) > 0.001 ? bassVal / (bassVal + highVal) : 0.5

  return {
    analysis: { energy, peak, rms, centroid, flux, spread, zcr, crest, beat, onset, rolloff, loudness, bassRatio },
    newHistoryIndex,
    newLastBeatTime: newLastBeatTime,
    newLastOnsetTime: newLastOnsetTime,
    newLoudnessAccum,
  }
}

// Factory that wraps an AnalyserNode
export interface AudioAnalyser {
  update(gain: number, smoothing: number, beatSensitivity: number): void
  getBands(): Float32Array
  getAnalysis(): AnalysisResult
  getFrequencyData(): Uint8Array
  getTimeDomainData(): Uint8Array
}

export function createAudioAnalyser(analyserNode: AnalyserNode, sampleRate: number): AudioAnalyser {
  const frequencyData = new Uint8Array(analyserNode.frequencyBinCount)
  const timeDomainData = new Uint8Array(analyserNode.fftSize)
  const prevSpectrum = new Float32Array(analyserNode.frequencyBinCount)
  const energyHistory = new Float32Array(80)
  const bandValues = new Float32Array(8)

  let historyIndex = 0
  let lastBeatTime = 0
  let lastOnsetTime = 0
  let loudnessAccum = 0
  let analysis: AnalysisResult = {
    energy: 0, peak: 0, rms: 0, centroid: 0, flux: 0,
    spread: 0, zcr: 0, crest: 0, beat: 0, onset: 0,
    rolloff: 0, loudness: 0, bassRatio: 0.5,
  }

  return {
    update(gain: number, smoothing: number, beatSensitivity: number) {
      analyserNode.smoothingTimeConstant = smoothing
      analyserNode.getByteFrequencyData(frequencyData)
      analyserNode.getByteTimeDomainData(timeDomainData)

      computeBands(frequencyData, bandValues, sampleRate, gain, smoothing)

      const now = performance.now()
      const result = computeAnalysis(
        frequencyData, timeDomainData, prevSpectrum, energyHistory,
        historyIndex, analysis, sampleRate, gain, beatSensitivity,
        lastBeatTime, lastOnsetTime, now, bandValues, loudnessAccum,
      )

      analysis = result.analysis
      historyIndex = result.newHistoryIndex
      lastBeatTime = result.newLastBeatTime
      lastOnsetTime = result.newLastOnsetTime
      loudnessAccum = result.newLoudnessAccum
    },

    getBands() { return bandValues },
    getAnalysis() { return analysis },
    getFrequencyData() { return frequencyData },
    getTimeDomainData() { return timeDomainData },
  }
}
