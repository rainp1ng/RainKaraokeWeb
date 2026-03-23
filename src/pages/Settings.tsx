import { Info, Plus, Volume2, VolumeX, Trash2, Square } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import { useAtmosphereStore } from '../stores/atmosphereStore'
import type { AtmosphereSound } from '../types'

const COLORS = ['#FF6B35', '#4ECDC4', '#9C27B0', '#4CAF50', '#FF9800', '#2196F3', '#E91E63', '#00BCD4']

export default function SettingsPage() {
  const {
    interludeEnabled,
    interludeVolume,
    duckingEnabled,
    autoPlayNext,
    lyricsFontSize,
    updateSettings,
  } = useSettingsStore()

  const {
    sounds,
    masterVolume,
    playingSounds,
    addSound,
    removeSound,
    playSound,
    stopAllSounds,
    setMasterVolume
  } = useAtmosphereStore()

  // 添加音效
  const handleAddSound = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (const file of Array.from(files)) {
      const sound: AtmosphereSound = {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        file,
        volume: 0.8,
        isOneShot: true,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        createdAt: Date.now()
      }
      addSound(sound)
    }
    e.target.value = ''
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur z-10 p-4">
        <h1 className="text-xl font-bold">设置</h1>
      </header>

      <div className="p-4 space-y-6">
        {/* 播放设置 */}
        <div>
          <h2 className="text-sm text-primary font-medium mb-2">播放设置</h2>
          <div className="bg-surface rounded-lg overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">自动播放下一首</h3>
                  <p className="text-xs text-white/60 mt-0.5">当前歌曲结束后自动播放下一首</p>
                </div>
                <button
                  onClick={() => updateSettings({ autoPlayNext: !autoPlayNext })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    autoPlayNext ? 'bg-primary' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      autoPlayNext ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-medium">歌词字体大小</h3>
                  <p className="text-xs text-white/60 mt-0.5">调整歌词显示大小</p>
                </div>
                <span className="text-primary text-sm">{lyricsFontSize.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={lyricsFontSize}
                onChange={(e) => updateSettings({ lyricsFontSize: parseFloat(e.target.value) })}
                className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:bg-primary
                  [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>
          </div>
        </div>

        {/* 过场音乐 */}
        <div>
          <h2 className="text-sm text-primary font-medium mb-2">过场音乐</h2>
          <div className="bg-surface rounded-lg overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">启用过场音乐</h3>
                  <p className="text-xs text-white/60 mt-0.5">歌曲结束时播放背景音乐</p>
                </div>
                <button
                  onClick={() => updateSettings({ interludeEnabled: !interludeEnabled })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    interludeEnabled ? 'bg-primary' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      interludeEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-medium">过场音乐音量</h3>
                  <p className="text-xs text-white/60 mt-0.5">调整背景音乐音量</p>
                </div>
                <span className="text-primary text-sm">{Math.round(interludeVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={interludeVolume}
                onChange={(e) => updateSettings({ interludeVolume: parseFloat(e.target.value) })}
                className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:bg-primary
                  [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>

            <div className="p-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">人声检测降低音量</h3>
                  <p className="text-xs text-white/60 mt-0.5">检测到人声时自动降低背景音乐</p>
                </div>
                <button
                  onClick={() => updateSettings({ duckingEnabled: !duckingEnabled })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    duckingEnabled ? 'bg-primary' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      duckingEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 气氛组音效 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm text-primary font-medium">气氛组音效</h2>
            <div className="flex gap-2">
              {playingSounds.size > 0 && (
                <button
                  onClick={stopAllSounds}
                  className="px-2 py-1 bg-red-600 rounded text-xs flex items-center gap-1"
                >
                  <Square className="w-3 h-3" />
                  停止全部
                </button>
              )}
              <label className="px-3 py-1 bg-primary rounded text-xs cursor-pointer flex items-center gap-1">
                <Plus className="w-3 h-3" />
                添加音效
                <input
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={handleAddSound}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="bg-surface rounded-lg overflow-hidden">
            {/* 主音量 */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">主音量</span>
                <span className="text-primary text-sm">{Math.round(masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={masterVolume}
                onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:bg-primary
                  [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>

            {/* 音效列表 */}
            {sounds.length === 0 ? (
              <div className="p-8 text-center text-white/40">
                <VolumeX className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无音效</p>
                <p className="text-xs mt-1">点击上方添加音效文件</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 p-2">
                {sounds.map((sound) => {
                  const isPlaying = playingSounds.has(sound.id)
                  return (
                    <div
                      key={sound.id}
                      className={`relative rounded-lg p-3 cursor-pointer transition-all ${
                        isPlaying ? 'ring-2 ring-primary scale-105' : ''
                      }`}
                      style={{ backgroundColor: `${sound.color}30` }}
                      onClick={() => playSound(sound.id)}
                    >
                      <div
                        className="w-full h-12 rounded flex items-center justify-center mb-2"
                        style={{ backgroundColor: `${sound.color}50` }}
                      >
                        {isPlaying ? (
                          <Volume2 className="w-6 h-6" style={{ color: sound.color }} />
                        ) : (
                          <span className="text-lg font-bold" style={{ color: sound.color }}>
                            {sound.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-center truncate">{sound.name}</p>

                      {/* 删除按钮 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeSound(sound.id)
                        }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* 关于 */}
        <div>
          <h2 className="text-sm text-primary font-medium mb-2">关于</h2>
          <div className="bg-surface rounded-lg overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-white/60" />
                <span>版本</span>
              </div>
              <span className="text-white/60">1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
