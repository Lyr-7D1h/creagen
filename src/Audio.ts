import Meyda, { MeydaAudioFeature, MeydaFeaturesObject } from 'meyda'

export type Feature = MeydaAudioFeature | 'bpm'

const ALL_MEYDA_FEATURES: Feature[] = [
  'amplitudeSpectrum',
  'buffer',
  'chroma',
  'complexSpectrum',
  'energy',
  'loudness',
  'mfcc',
  'perceptualSharpness',
  'perceptualSpread',
  'powerSpectrum',
  'rms',
  'spectralCentroid',
  'spectralFlatness',
  'spectralKurtosis',
  'spectralRolloff',
  'spectralSkewness',
  'spectralSlope',
  'spectralSpread',
  'zcr',
  'bpm',
]

export type FeatureResponse = Partial<MeydaFeaturesObject> & { bpm?: number }

/**
 * Audio class for analyzing audio from web browser
 * Provides real-time access to FFT data, amplitude, and advanced audio features via Meyda
 */
export class Audio {
  private audioContext: AudioContext
  private analyser: AnalyserNode

  // BPM tracking
  private lastBeatTime: number = 0
  private beatIntervals: number[] = []
  private energyHistory: number[] = []
  private readonly maxBeatIntervals = 8
  private readonly historySize = 43

  /**
   * Create and initialize an Audio instance
   * @param fftSize Size of FFT analysis (default: 2048)
   * @returns Promise that resolves with initialized Audio instance
   */
  static async create(fftSize: number = 2048): Promise<Audio> {
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)()

    // Get microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    const analyser = audioContext.createAnalyser()
    analyser.fftSize = fftSize

    const microphone = audioContext.createMediaStreamSource(stream)
    microphone.connect(analyser)

    const audio = new Audio(audioContext, analyser)
    return audio
  }

  private constructor(audioContext: AudioContext, analyser: AnalyserNode) {
    this.audioContext = audioContext
    this.analyser = analyser
  }

  /**
   * Extract audio features using Meyda
   * @param features Array of feature names to extract, or 'all' for all available features
   * @returns Object containing the requested audio features
   */
  public getFeatures(features: Feature[] | 'all' = 'all'): FeatureResponse {
    // Get time domain data for Meyda
    const buffer = new Float32Array(this.analyser.fftSize)
    this.analyser.getFloatTimeDomainData(buffer)

    const featuresToExtract = features === 'all' ? ALL_MEYDA_FEATURES : features

    // Extract Meyda features (excluding BPM which is custom)
    const meydaFeatures = featuresToExtract.filter(
      (f) => f !== 'bpm',
    ) as Feature[]
    // If BPM is requested, we also need energy
    const needsEnergy =
      featuresToExtract.includes('bpm') && !meydaFeatures.includes('energy')
    const extractFeatures = needsEnergy
      ? [...meydaFeatures, 'energy']
      : meydaFeatures

    const result = Meyda.extract(
      extractFeatures as MeydaAudioFeature[],
      buffer,
    ) as Partial<MeydaFeaturesObject> & { bpm?: number }

    if (featuresToExtract.includes('bpm') && result.energy !== undefined) {
      result.bpm = this.calculateBPM(result.energy)
    }

    return result
  }

  /**
   * Calculate BPM using energy-based beat detection
   * @param energy Current energy value from Meyda
   * @returns Current BPM estimate, or undefined if not enough data
   */
  private calculateBPM(energy: number): number | undefined {
    // Update energy history
    this.energyHistory.push(energy)
    if (this.energyHistory.length > this.historySize) {
      this.energyHistory.shift()
    }

    // Need enough history for beat detection
    if (this.energyHistory.length < this.historySize) {
      return undefined
    }

    // Calculate average energy and variance for threshold
    const avgEnergy =
      this.energyHistory.reduce((sum, e) => sum + e, 0) /
      this.energyHistory.length
    const variance =
      this.energyHistory.reduce((sum, e) => sum + (e - avgEnergy) ** 2, 0) /
      this.energyHistory.length
    const threshold = avgEnergy + Math.sqrt(variance) * 1.5

    // Detect beat if current energy exceeds threshold
    const currentTime = this.audioContext.currentTime
    const timeSinceLastBeat = currentTime - this.lastBeatTime

    if (energy > threshold && timeSinceLastBeat > 0.3) {
      // Minimum 200 BPM
      this.beatIntervals.push(timeSinceLastBeat)
      if (this.beatIntervals.length > this.maxBeatIntervals) {
        this.beatIntervals.shift()
      }
      this.lastBeatTime = currentTime
    }

    // Calculate BPM from beat intervals
    if (this.beatIntervals.length >= 2) {
      const avgInterval =
        this.beatIntervals.reduce((sum, interval) => sum + interval, 0) /
        this.beatIntervals.length
      return Math.round(60 / avgInterval)
    }

    return undefined
  }

  /**
   * Start a feature extraction stream with callback
   * @param callback Function called with extracted features at each interval
   * @param features Features to extract ('all' or array of feature names)
   * @param fps Frames per second for feature extraction (default: 30)
   * @returns Function to call to stop the stream
   */
  public startStream(
    callback: (features: Partial<MeydaFeaturesObject>) => void,
    features: Feature[] | 'all' = 'all',
    fps: number = 30,
  ): () => void {
    const interval = 1000 / fps
    let animationId: number
    let lastTime = 0

    const update = (time: number) => {
      animationId = requestAnimationFrame(update)

      const elapsed = time - lastTime
      if (elapsed < interval) return

      lastTime = time - (elapsed % interval)

      const extractedFeatures = this.getFeatures(features)
      if (extractedFeatures) {
        callback(extractedFeatures)
      }
    }

    animationId = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(animationId)
    }
  }
}
