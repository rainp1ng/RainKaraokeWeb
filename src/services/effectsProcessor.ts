/**
 * 音频效果器服务 - 使用Web Audio API实现
 */

export interface EffectParams {
  [key: string]: number
}

export interface Effect {
  id: string
  type: 'reverb' | 'eq' | 'compressor' | 'gain'
  enabled: boolean
  params: EffectParams
  node?: AudioNode
}

/**
 * 创建混响效果器
 */
function createReverbNode(audioContext: AudioContext, params: EffectParams): ConvolverNode {
  const convolver = audioContext.createConvolver()

  // 创建脉冲响应
  const sampleRate = audioContext.sampleRate
  const length = sampleRate * (params.duration || 2) // 2秒混响
  const impulse = audioContext.createBuffer(2, length, sampleRate)

  for (let channel = 0; channel < 2; channel++) {
    const channelData = impulse.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      // 指数衰减
      const decay = Math.exp(-i / (sampleRate * (params.decay || 2)))
      channelData[i] = (Math.random() * 2 - 1) * decay
    }
  }

  convolver.buffer = impulse
  return convolver
}

/**
 * 创建均衡器效果器
 */
function createEQNode(audioContext: AudioContext, params: EffectParams): BiquadFilterNode[] {
  // 创建三段均衡器
  const low = audioContext.createBiquadFilter()
  low.type = 'lowshelf'
  low.frequency.value = 320
  low.gain.value = params.low || 0

  const mid = audioContext.createBiquadFilter()
  mid.type = 'peaking'
  mid.frequency.value = 1000
  mid.Q.value = 0.5
  mid.gain.value = params.mid || 0

  const high = audioContext.createBiquadFilter()
  high.type = 'highshelf'
  high.frequency.value = 3200
  high.gain.value = params.high || 0

  return [low, mid, high]
}

/**
 * 创建压缩器效果器
 */
function createCompressorNode(audioContext: AudioContext, params: EffectParams): DynamicsCompressorNode {
  const compressor = audioContext.createDynamicsCompressor()

  compressor.threshold.value = params.threshold ?? -24
  compressor.ratio.value = params.ratio ?? 4
  compressor.attack.value = params.attack ?? 0.003
  compressor.release.value = params.release ?? 0.25
  compressor.knee.value = params.knee ?? 30

  return compressor
}

/**
 * 创建增益节点
 */
function createGainNode(audioContext: AudioContext, params: EffectParams): GainNode {
  const gain = audioContext.createGain()
  gain.gain.value = params.gain ?? 1
  return gain
}

/**
 * 效果器链管理类
 */
export class EffectsChain {
  private audioContext: AudioContext | null = null
  private sourceNode: MediaElementAudioSourceNode | null = null
  private inputGain: GainNode | null = null
  private outputGain: GainNode | null = null
  private effects: Map<string, Effect> = new Map()
  private bypass: boolean = false

  /**
   * 初始化效果器链
   */
  async init(videoElement: HTMLVideoElement): Promise<void> {
    if (this.audioContext) {
      await this.audioContext.close()
    }

    this.audioContext = new AudioContext()

    // 创建源节点
    this.sourceNode = this.audioContext.createMediaElementSource(videoElement)

    // 创建输入增益节点
    this.inputGain = this.audioContext.createGain()

    // 创建输出增益节点
    this.outputGain = this.audioContext.createGain()

    // 初始连接
    this.sourceNode.connect(this.inputGain)
    this.inputGain.connect(this.outputGain)
    this.outputGain.connect(this.audioContext.destination)
  }

  /**
   * 添加效果器
   */
  addEffect(id: string, type: Effect['type'], params: EffectParams = {}): void {
    if (!this.audioContext) return

    const effect: Effect = {
      id,
      type,
      enabled: true,
      params,
    }

    // 设置默认参数
    switch (type) {
      case 'reverb':
        effect.params = { duration: 2, decay: 2, mix: 0.3, ...params }
        break
      case 'eq':
        effect.params = { low: 0, mid: 0, high: 0, ...params }
        break
      case 'compressor':
        effect.params = { threshold: -24, ratio: 4, attack: 0.003, release: 0.25, knee: 30, ...params }
        break
      case 'gain':
        effect.params = { gain: 1, ...params }
        break
    }

    this.effects.set(id, effect)
    this.rebuildChain()
  }

  /**
   * 移除效果器
   */
  removeEffect(id: string): void {
    this.effects.delete(id)
    this.rebuildChain()
  }

  /**
   * 更新效果器参数
   */
  updateEffectParams(id: string, params: Partial<EffectParams>): void {
    const effect = this.effects.get(id)
    if (effect) {
      // 过滤掉undefined值
      const filteredParams: EffectParams = {}
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          filteredParams[key] = value
        }
      }
      effect.params = { ...effect.params, ...filteredParams }
      this.rebuildChain()
    }
  }

  /**
   * 切换效果器开关
   */
  toggleEffect(id: string, enabled?: boolean): void {
    const effect = this.effects.get(id)
    if (effect) {
      effect.enabled = enabled ?? !effect.enabled
      this.rebuildChain()
    }
  }

  /**
   * 设置全局旁通
   */
  setBypass(bypass: boolean): void {
    this.bypass = bypass
    this.rebuildChain()
  }

  /**
   * 设置输入增益
   */
  setInputGain(gain: number): void {
    if (this.inputGain) {
      this.inputGain.gain.value = Math.max(0, Math.min(2, gain))
    }
  }

  /**
   * 设置输出增益
   */
  setOutputGain(gain: number): void {
    if (this.outputGain) {
      this.outputGain.gain.value = Math.max(0, Math.min(2, gain))
    }
  }

  /**
   * 重建效果器链
   */
  private rebuildChain(): void {
    if (!this.audioContext || !this.sourceNode || !this.inputGain || !this.outputGain) return

    // 断开所有连接
    this.sourceNode.disconnect()
    this.inputGain.disconnect()
    this.outputGain.disconnect()

    // 清理旧的效果器节点
    for (const effect of this.effects.values()) {
      if (effect.node) {
        effect.node.disconnect()
        effect.node = undefined
      }
    }

    // 如果旁通，直接连接输入到输出
    if (this.bypass) {
      this.sourceNode.connect(this.inputGain)
      this.inputGain.connect(this.outputGain)
      this.outputGain.connect(this.audioContext.destination)
      return
    }

    // 构建效果器链
    let lastNode: AudioNode = this.inputGain

    for (const effect of this.effects.values()) {
      if (!effect.enabled) continue

      let node: AudioNode | null = null

      switch (effect.type) {
        case 'reverb':
          // 混响需要特殊的干湿混合
          const reverbGain = this.audioContext.createGain()
          const dryGain = this.audioContext.createGain()
          reverbGain.gain.value = effect.params.mix ?? 0.3
          dryGain.gain.value = 1 - (effect.params.mix ?? 0.3)

          const convolver = createReverbNode(this.audioContext, effect.params)

          lastNode.connect(convolver)
          convolver.connect(reverbGain)
          lastNode.connect(dryGain)

          // 使用增益节点作为合并点
          const merger = this.audioContext.createGain()
          reverbGain.connect(merger)
          dryGain.connect(merger)

          node = merger
          effect.node = convolver
          break

        case 'eq':
          const [low, mid, high] = createEQNode(this.audioContext, effect.params)
          lastNode.connect(low)
          low.connect(mid)
          mid.connect(high)
          node = high
          effect.node = low
          break

        case 'compressor':
          node = createCompressorNode(this.audioContext, effect.params)
          lastNode.connect(node)
          effect.node = node
          break

        case 'gain':
          node = createGainNode(this.audioContext, effect.params)
          lastNode.connect(node)
          effect.node = node
          break
      }

      if (node) {
        lastNode = node
      }
    }

    // 连接到输出
    this.sourceNode.connect(this.inputGain)
    lastNode.connect(this.outputGain)
    this.outputGain.connect(this.audioContext.destination)
  }

  /**
   * 获取所有效果器
   */
  getEffects(): Effect[] {
    return Array.from(this.effects.values())
  }

  /**
   * 清理资源
   */
  async destroy(): Promise<void> {
    if (this.audioContext) {
      await this.audioContext.close()
      this.audioContext = null
      this.sourceNode = null
      this.inputGain = null
      this.outputGain = null
      this.effects.clear()
    }
  }
}

// 单例实例
export const effectsChain = new EffectsChain()

/**
 * 效果器预设
 */
export const EFFECT_PRESETS = {
  default: {
    name: '默认',
    effects: []
  },
  vocal: {
    name: '人声',
    effects: [
      { type: 'eq' as const, params: { low: -2, mid: 1, high: 2 } },
      { type: 'compressor' as const, params: { threshold: -18, ratio: 3 } },
      { type: 'reverb' as const, params: { duration: 1.5, decay: 1.5, mix: 0.2 } }
    ]
  },
  karaoke: {
    name: '卡拉OK',
    effects: [
      { type: 'eq' as const, params: { low: 1, mid: 2, high: 3 } },
      { type: 'reverb' as const, params: { duration: 2, decay: 2, mix: 0.3 } }
    ]
  },
  concert: {
    name: '演唱会',
    effects: [
      { type: 'reverb' as const, params: { duration: 3, decay: 3, mix: 0.4 } }
    ]
  }
}
