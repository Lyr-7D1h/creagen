/**
 * Audio class for analyzing audio from web browser
 * Provides real-time access to FFT data and amplitude
 */
export class Audio {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private microphone: MediaStreamAudioSourceNode | null = null
  private fftSize: number = 2048
  private stream: MediaStream | null = null
  private intialized: boolean = false

  // FFT data arrays
  private fftData: Uint8Array | null = null
  private timeData: Uint8Array | null = null

  static create(fftSize: number = 2048) {
    return new Audio(fftSize)
  }

  constructor(fftSize: number = 2048) {
    this.fftSize = fftSize
  }

  /**
   * Initialize audio context and analyzer
   * @returns Promise that resolves when audio is initialized
   */
  public async initialize(): Promise<void> {
    if (this.intialized) return

    try {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)()

      // Get microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = this.fftSize

      this.microphone = this.audioContext.createMediaStreamSource(this.stream)
      this.microphone.connect(this.analyser)

      this.fftData = new Uint8Array(this.analyser.frequencyBinCount)
      this.timeData = new Uint8Array(this.analyser.fftSize)

      this.intialized = true
    } catch (error) {
      console.error('Error initializing audio:', error)
      throw error
    }
  }

  /**
   * Get current FFT data
   * @returns Frequency data as Uint8Array (0-255 values)
   */
  public getFFTData(): Uint8Array {
    if (!this.intialized || !this.analyser || !this.fftData) {
      throw new Error('Audio not initialized. Call initialize() first')
    }

    this.analyser.getByteFrequencyData(this.fftData)
    return this.fftData
  }

  /**
   * Get current time domain data
   * @returns Time domain data as Uint8Array (0-255 values)
   */
  public getTimeData(): Uint8Array {
    if (!this.intialized || !this.analyser || !this.timeData) {
      throw new Error('Audio not initialized. Call initialize() first')
    }

    this.analyser.getByteTimeDomainData(this.timeData)
    return this.timeData
  }

  /**
   * Get current audio amplitude (volume level)
   * @returns Number between 0 and 1 representing current amplitude
   */
  public getAmplitude(): number {
    const timeData = this.getTimeData()
    let sum = 0

    // Calculate RMS (root mean square) of time domain data
    for (let i = 0; i < timeData.length; i++) {
      // Convert from 0-255 to -1 to 1
      const amplitude = (timeData[i] - 128) / 128
      sum += amplitude * amplitude
    }

    const rms = Math.sqrt(sum / timeData.length)
    return rms
  }

  /**
   * Get frequency data for a specific frequency range
   * @param minFreq Minimum frequency in Hz
   * @param maxFreq Maximum frequency in Hz
   * @returns Object with averageAmplitude and peak data for the frequency range
   */
  public getFrequencyRange(
    minFreq: number,
    maxFreq: number,
  ): {
    averageAmplitude: number
    peak: number
  } {
    if (!this.intialized || !this.analyser || !this.fftData) {
      throw new Error('Audio not initialized. Call initialize() first')
    }

    const fftData = this.getFFTData()
    const nyquist = this.audioContext!.sampleRate / 2
    const lowBin = Math.floor(
      (minFreq / nyquist) * this.analyser.frequencyBinCount,
    )
    const highBin = Math.ceil(
      (maxFreq / nyquist) * this.analyser.frequencyBinCount,
    )

    let sum = 0
    let peak = 0

    for (let i = lowBin; i <= highBin && i < fftData.length; i++) {
      sum += fftData[i]
      peak = Math.max(peak, fftData[i])
    }

    const binCount = highBin - lowBin + 1
    return {
      averageAmplitude: sum / (binCount * 255), // Normalize to 0-1
      peak: peak / 255, // Normalize to 0-1
    }
  }

  /**
   * Start a continuous audio stream and call the callback function with analysis data
   * @param callback Function to call with each frame of audio analysis data
   * @param fps Frames per second for analysis (default: 30)
   * @returns Function to call to stop the stream
   */
  public startStream(
    callback: (data: {
      fft: Uint8Array
      amplitude: number
      timeData: Uint8Array
    }) => void,
    fps: number = 30,
  ): () => void {
    if (!this.intialized) {
      throw new Error('Audio not initialized. Call initialize() first')
    }

    const interval = 1000 / fps
    let animationId: number
    let lastTime = 0

    const update = (time: number) => {
      animationId = requestAnimationFrame(update)

      const elapsed = time - lastTime
      if (elapsed < interval) return

      lastTime = time - (elapsed % interval)

      const fft = this.getFFTData()
      const timeData = this.getTimeData()
      const amplitude = this.getAmplitude()

      callback({
        fft: fft,
        amplitude: amplitude,
        timeData: timeData,
      })
    }

    animationId = requestAnimationFrame(update)

    // Return function to stop the stream
    return () => {
      cancelAnimationFrame(animationId)
    }
  }

  /**
   * Get average audio metrics over a specified time window
   * @param duration Duration of the time window in milliseconds
   * @param metrics What metrics to average ("amplitude", "fft", or both)
   * @returns Promise that resolves with the averaged metrics
   */
  public async getTimeWindowAverage(
    duration: number = 1000,
    metrics: { amplitude?: boolean; fft?: boolean } = {
      amplitude: true,
      fft: true,
    },
  ): Promise<{ amplitude?: number; fft?: Uint8Array }> {
    if (!this.intialized) {
      throw new Error('Audio not initialized. Call initialize() first')
    }

    return new Promise((resolve) => {
      const startTime = Date.now()
      const samples = {
        amplitudes: [] as number[],
        fftFrames: [] as Uint8Array[],
      }

      const collectSamples = this.startStream((data) => {
        const elapsed = Date.now() - startTime

        // Collect samples
        if (metrics.amplitude) {
          samples.amplitudes.push(data.amplitude)
        }

        if (metrics.fft) {
          samples.fftFrames.push(new Uint8Array(data.fft))
        }

        // Check if we've collected enough data
        if (elapsed >= duration) {
          collectSamples() // Stop the stream

          const result: { amplitude?: number; fft?: Uint8Array } = {}

          // Calculate amplitude average
          if (metrics.amplitude && samples.amplitudes.length > 0) {
            const amplitudeSum = samples.amplitudes.reduce(
              (sum, val) => sum + val,
              0,
            )
            result.amplitude = amplitudeSum / samples.amplitudes.length
          }

          // Calculate FFT average
          if (metrics.fft && samples.fftFrames.length > 0 && this.fftData) {
            const avgFFT = new Uint8Array(this.fftData.length)

            // Sum all FFT frames
            for (let i = 0; i < avgFFT.length; i++) {
              let sum = 0
              for (const frame of samples.fftFrames) {
                sum += frame[i]
              }
              avgFFT[i] = Math.round(sum / samples.fftFrames.length)
            }

            result.fft = avgFFT
          }

          resolve(result)
        }
      })
    })
  }

  /**
   * Get frequency band energy over time
   * @param bands Array of frequency bands to analyze, each with min and max frequencies in Hz
   * @param duration Duration to analyze in milliseconds
   * @returns Promise that resolves with the average energy in each band
   */
  public async getFrequencyBandsOverTime(
    bands: Array<{ name: string; minFreq: number; maxFreq: number }>,
    duration: number = 1000,
  ): Promise<Array<{ name: string; averageEnergy: number }>> {
    if (!this.intialized) {
      throw new Error('Audio not initialized. Call initialize() first')
    }

    return new Promise((resolve) => {
      const startTime = Date.now()
      const bandSamples = bands.map((band) => ({
        name: band.name,
        minFreq: band.minFreq,
        maxFreq: band.maxFreq,
        samples: [] as number[],
      }))

      const collectSamples = this.startStream(() => {
        const elapsed = Date.now() - startTime

        // Collect samples for each band
        for (const band of bandSamples) {
          const { averageAmplitude } = this.getFrequencyRange(
            band.minFreq,
            band.maxFreq,
          )
          band.samples.push(averageAmplitude)
        }

        // Check if we've collected enough data
        if (elapsed >= duration) {
          collectSamples() // Stop the stream

          // Calculate average for each band
          const results = bandSamples.map((band) => {
            const sum = band.samples.reduce((acc, val) => acc + val, 0)
            const average =
              band.samples.length > 0 ? sum / band.samples.length : 0

            return {
              name: band.name,
              averageEnergy: average,
            }
          })

          resolve(results)
        }
      })
    })
  }

  /**
   * Clean up and release resources
   */
  public dispose(): void {
    if (this.microphone) {
      this.microphone.disconnect()
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
    }

    this.analyser = null
    this.microphone = null
    this.audioContext = null
    this.stream = null
    this.fftData = null
    this.timeData = null
    this.intialized = false
  }
}
