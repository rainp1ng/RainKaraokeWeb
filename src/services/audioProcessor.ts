/**
 * 音频处理服务 - 使用Web Audio API实现变调功能
 */

class AudioProcessor {
  private audioContext: AudioContext | null = null
  private sourceNode: MediaElementAudioSourceNode | null = null
  private gainNode: GainNode | null = null
  private compressorNode: DynamicsCompressorNode | null = null

  // 当前状态
  private currentPitch = 0
  private currentSpeed = 1

  /**
   * 初始化音频上下文
   */
  async init(videoElement: HTMLVideoElement): Promise<void> {
    if (this.audioContext) {
      await this.audioContext.close()
    }

    this.audioContext = new AudioContext()

    // 从视频元素创建源节点
    this.sourceNode = this.audioContext.createMediaElementSource(videoElement)

    // 创建增益节点
    this.gainNode = this.audioContext.createGain()

    // 创建压缩器节点
    this.compressorNode = this.audioContext.createDynamicsCompressor()

    // 连接节点链
    this.sourceNode.connect(this.gainNode)
    this.gainNode.connect(this.compressorNode)
    this.compressorNode.connect(this.audioContext.destination)
  }

  /**
   * 设置音调 (-12 到 +12 半音)
   * 注意：纯Web Audio API不直接支持变调，需要使用AudioWorklet或第三方库
   */
  setPitch(semitones: number): void {
    this.currentPitch = Math.max(-12, Math.min(12, semitones))
    // 真正的变调需要AudioWorklet或第三方库
    // 当前实现使用 playbackRate，会同时改变音高和速度
  }

  /**
   * 设置播放速度
   */
  setSpeed(speed: number): void {
    this.currentSpeed = Math.max(0.5, Math.min(2, speed))

    if (this.sourceNode?.mediaElement) {
      this.sourceNode.mediaElement.playbackRate = this.currentSpeed
    }
  }

  /**
   * 设置音量
   */
  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume))
    }
  }

  /**
   * 获取当前音调
   */
  getPitch(): number {
    return this.currentPitch
  }

  /**
   * 获取当前速度
   */
  getSpeed(): number {
    return this.currentSpeed
  }

  /**
   * 恢复音频上下文
   */
  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  /**
   * 暂停音频上下文
   */
  async suspend(): Promise<void> {
    if (this.audioContext?.state === 'running') {
      await this.audioContext.suspend()
    }
  }

  /**
   * 清理资源
   */
  async destroy(): Promise<void> {
    if (this.audioContext) {
      await this.audioContext.close()
      this.audioContext = null
      this.sourceNode = null
      this.gainNode = null
      this.compressorNode = null
    }
  }
}

// 单例实例
export const audioProcessor = new AudioProcessor()

export interface PitchShiftOptions {
  semitones: number  // -12 到 +12
  preserveSpeed: boolean
}

/**
 * 计算变调后的播放速率
 */
export function calculateCompensatedRate(pitch: number, speed: number): number {
  const pitchRatio = Math.pow(2, pitch / 12)
  return speed * pitchRatio
}
