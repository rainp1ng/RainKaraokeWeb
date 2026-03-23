import { useState, useEffect } from 'react'
import { Sliders, Volume2, Waves } from 'lucide-react'
import { effectsChain, EFFECT_PRESETS } from '../services/effectsProcessor'

interface EffectConfig {
  id: string
  name: string
  icon: typeof Waves
  color: string
  type: 'reverb' | 'eq' | 'compressor'
  enabled: boolean
  params: Record<string, { value: number; min: number; max: number; step: number; label: string }>
}

const defaultEffects: EffectConfig[] = [
  {
    id: 'reverb',
    name: '混响',
    icon: Waves,
    color: '#9C27B0',
    type: 'reverb',
    enabled: false,
    params: {
      duration: { value: 2, min: 0.5, max: 5, step: 0.1, label: '时长' },
      decay: { value: 2, min: 0.5, max: 5, step: 0.1, label: '衰减' },
      mix: { value: 0.3, min: 0, max: 1, step: 0.05, label: '混合' },
    },
  },
  {
    id: 'eq',
    name: '均衡器',
    icon: Sliders,
    color: '#4CAF50',
    type: 'eq',
    enabled: false,
    params: {
      low: { value: 0, min: -12, max: 12, step: 1, label: '低频' },
      mid: { value: 0, min: -12, max: 12, step: 1, label: '中频' },
      high: { value: 0, min: -12, max: 12, step: 1, label: '高频' },
    },
  },
  {
    id: 'compressor',
    name: '压缩器',
    icon: Volume2,
    color: '#FF9800',
    type: 'compressor',
    enabled: false,
    params: {
      threshold: { value: -24, min: -60, max: 0, step: 1, label: '阈值' },
      ratio: { value: 4, min: 1, max: 20, step: 0.5, label: '压缩比' },
      attack: { value: 0.003, min: 0, max: 1, step: 0.001, label: '启动' },
      release: { value: 0.25, min: 0, max: 1, step: 0.01, label: '释放' },
    },
  },
]

export default function EffectsPage() {
  const [effects, setEffects] = useState<EffectConfig[]>(defaultEffects)
  const [inputGain, setInputGain] = useState(1)
  const [bypassAll, setBypassAll] = useState(false)

  // 初始化效果器
  useEffect(() => {
    // 初始化时添加效果器
    effects.forEach(effect => {
      const params: Record<string, number> = {}
      Object.entries(effect.params).forEach(([key, config]) => {
        params[key] = config.value
      })
      effectsChain.addEffect(effect.id, effect.type, params)
    })
  }, [])

  // 切换效果器
  const toggleEffect = (id: string) => {
    setEffects((prev) =>
      prev.map((effect) => {
        const newEnabled = !effect.enabled
        effectsChain.toggleEffect(id, newEnabled)
        return effect.id === id ? { ...effect, enabled: newEnabled } : effect
      })
    )
  }

  // 更新参数
  const updateParam = (effectId: string, paramId: string, value: number) => {
    setEffects((prev) =>
      prev.map((effect) =>
        effect.id === effectId
          ? {
              ...effect,
              params: {
                ...effect.params,
                [paramId]: { ...effect.params[paramId], value },
              },
            }
          : effect
      )
    )
    effectsChain.updateEffectParams(effectId, { [paramId]: value })
  }

  // 设置旁通
  const handleBypassAll = (bypass: boolean) => {
    setBypassAll(bypass)
    effectsChain.setBypass(bypass)
  }

  // 应用预设
  const applyPreset = (presetName: string) => {
    const preset = EFFECT_PRESETS[presetName as keyof typeof EFFECT_PRESETS]
    if (!preset) return

    // 重置所有效果器
    const newEffects = defaultEffects.map(e => ({ ...e, enabled: false }))
    setEffects(newEffects)

    // 应用预设效果
    preset.effects.forEach((presetEffect) => {
      const effectIndex = newEffects.findIndex(e => e.type === presetEffect.type)
      if (effectIndex >= 0) {
        newEffects[effectIndex].enabled = true
        Object.entries(presetEffect.params).forEach(([key, value]) => {
          if (newEffects[effectIndex].params[key]) {
            newEffects[effectIndex].params[key].value = value
          }
        })
        effectsChain.toggleEffect(newEffects[effectIndex].id, true)
        effectsChain.updateEffectParams(newEffects[effectIndex].id, presetEffect.params)
      }
    })

    setEffects([...newEffects])
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur z-10 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">效果器</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/60">旁通</span>
            <button
              onClick={() => handleBypassAll(!bypassAll)}
              className={`w-12 h-6 rounded-full transition-colors ${
                bypassAll ? 'bg-primary' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  bypassAll ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Input settings */}
        <div className="bg-surface rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium">输入增益</span>
            <span className="text-primary">{Math.round(inputGain * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={inputGain}
            onChange={(e) => {
              const value = parseFloat(e.target.value)
              setInputGain(value)
              effectsChain.setInputGain(value)
            }}
            className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:bg-primary
              [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>

        {/* Effects */}
        {effects.map((effect) => (
          <div
            key={effect.id}
            className={`bg-surface rounded-lg overflow-hidden ${
              effect.enabled && !bypassAll ? 'ring-1' : ''
            }`}
            style={{ borderColor: effect.enabled && !bypassAll ? effect.color : 'transparent' }}
          >
            {/* Effect header */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer"
              onClick={() => toggleEffect(effect.id)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${effect.color}20` }}
                >
                  <effect.icon className="w-5 h-5" style={{ color: effect.color }} />
                </div>
                <div>
                  <h3 className="font-medium">{effect.name}</h3>
                  <p className="text-xs text-white/60">
                    {effect.enabled ? '已启用' : '已禁用'}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleEffect(effect.id)
                }}
                className={`w-12 h-6 rounded-full transition-colors ${
                  effect.enabled ? 'bg-primary' : 'bg-white/20'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    effect.enabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Effect params */}
            {effect.enabled && (
              <div className="px-4 pb-4 space-y-3">
                {Object.entries(effect.params).map(([paramId, param]) => (
                  <div key={paramId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white/60">{param.label}</span>
                      <span className="text-sm">{param.value.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={param.min}
                      max={param.max}
                      step={param.step}
                      value={param.value}
                      onChange={(e) => updateParam(effect.id, paramId, parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-3
                        [&::-webkit-slider-thumb]:h-3
                        [&::-webkit-slider-thumb]:bg-primary
                        [&::-webkit-slider-thumb]:rounded-full"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Presets */}
        <div className="bg-surface rounded-lg p-4">
          <h3 className="font-medium mb-3">预设</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(EFFECT_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className="px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-surface/50 rounded-lg p-4">
          <p className="text-sm text-white/60">
            效果器会在播放歌曲时生效。开启"旁通"可以临时关闭所有效果。
          </p>
        </div>
      </div>
    </div>
  )
}
