import { useState, useRef } from 'react'
import { Volume2, VolumeX, Plus, Trash2, Music, Play, Pause, StopCircle, Piano, Settings } from 'lucide-react'
import { useAtmosphereStore } from '../stores/atmosphereStore'
import { useInterludeStore } from '../stores/interludeStore'
import { useMidiStore } from '../stores/midiStore'
import type { AtmosphereSound, InterludeTrack } from '../types'

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']

// 可映射的动作列表
const MIDI_ACTIONS = [
  { id: 'playPause', label: '播放/暂停' },
  { id: 'nextSong', label: '下一首' },
  { id: 'prevSong', label: '上一首' },
  { id: 'seekForward', label: '快进10秒' },
  { id: 'seekBackward', label: '快退10秒' },
  { id: 'toggleVocal', label: '原唱/伴奏切换' },
  { id: 'stop', label: '停止' },
  { id: 'stopAllSounds', label: '停止所有音效' },
  { id: 'interludePlayPause', label: '过场音乐播放/暂停' },
]

export default function AtmospherePage() {
  const [activeTab, setActiveTab] = useState<'sounds' | 'interlude' | 'midi'>('sounds')

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur p-4 border-b border-white/10">
        <h1 className="text-xl font-bold mb-3">气氛组</h1>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('sounds')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              activeTab === 'sounds' ? 'bg-primary text-white' : 'bg-white/10 text-white/60'
            }`}
          >
            音效
          </button>
          <button
            onClick={() => setActiveTab('interlude')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              activeTab === 'interlude' ? 'bg-primary text-white' : 'bg-white/10 text-white/60'
            }`}
          >
            过场音乐
          </button>
          <button
            onClick={() => setActiveTab('midi')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              activeTab === 'midi' ? 'bg-primary text-white' : 'bg-white/10 text-white/60'
            }`}
          >
            MIDI控制
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'sounds' ? <SoundsPanel /> :
         activeTab === 'interlude' ? <InterludePanel /> :
         <MidiPanel />}
      </div>
    </div>
  )
}

// MIDI控制面板
function MidiPanel() {
  const { devices, connectedDevice, connect, disconnect, learningAction, startLearning, stopLearning, mappings, setMapping } = useMidiStore()
  const [showMidiSettings, setShowMidiSettings] = useState(true)

  return (
    <div className="space-y-4">
      {/* MIDI设备设置 */}
      <div className="bg-surface rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium flex items-center gap-2">
            <Piano className="w-4 h-4" />
            MIDI 设备
          </h3>
          <button
            onClick={() => setShowMidiSettings(!showMidiSettings)}
            className="text-sm text-white/60"
          >
            {showMidiSettings ? '收起' : '展开'}
          </button>
        </div>

        {showMidiSettings && (
          <>
            {devices.length === 0 ? (
              <p className="text-sm text-white/40">未检测到 MIDI 设备</p>
            ) : (
              <div className="space-y-2">
                {devices.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => connectedDevice?.id === device.id ? disconnect() : connect(device.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      connectedDevice?.id === device.id
                        ? 'bg-primary text-white'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {device.name}
                    {connectedDevice?.id === device.id && ' (已连接)'}
                  </button>
                ))}
              </div>
            )}

            {connectedDevice && (
              <button
                onClick={disconnect}
                className="mt-3 text-sm text-red-400 hover:text-red-300"
              >
                断开连接
              </button>
            )}
          </>
        )}
      </div>

      {/* 快捷键MIDI映射 */}
      <div className="bg-surface rounded-lg p-4">
        <h3 className="font-medium mb-3">快捷键 MIDI 映射</h3>
        <p className="text-sm text-white/40 mb-4">点击"学习"按钮，然后按下MIDI控制器上的按键来映射</p>

        <div className="space-y-2">
          {MIDI_ACTIONS.map((action) => {
            const binding = mappings[action.id]
            return (
              <div key={action.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm">{action.label}</span>
                <div className="flex items-center gap-2">
                  {binding && (
                    <span className="text-xs bg-white/10 px-2 py-1 rounded">
                      {binding.messageType}: {binding.note} (CH{binding.channel})
                    </span>
                  )}
                  <button
                    onClick={() => {
                      if (learningAction === action.id) {
                        stopLearning()
                      } else {
                        startLearning(action.id)
                      }
                    }}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      learningAction === action.id
                        ? 'bg-primary text-white'
                        : 'bg-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    {learningAction === action.id ? '学习中...' : binding ? '重新学习' : '学习'}
                  </button>
                  {binding && (
                    <button
                      onClick={() => setMapping(action.id, null)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      清除
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// 音效面板
function SoundsPanel() {
  const { sounds, playingSounds, addSound, removeSound, playSound, stopSound, stopAllSounds, updateSound } = useAtmosphereStore()
  const { devices, connectedDevice, connect, disconnect, learningSoundId, startLearningSound, stopLearning, soundMappings, setSoundMapping, mappings, learningAction } = useMidiStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSound, setNewSound] = useState({ name: '', color: COLORS[0], isOneShot: true })
  const [editingSound, setEditingSound] = useState<AtmosphereSound | null>(null)
  const [showMidiSettings, setShowMidiSettings] = useState(false)

  const handleAddSound = async (e: React.FormEvent) => {
    e.preventDefault()
    const file = fileInputRef.current?.files?.[0]
    if (!file || !newSound.name) return

    try {
      const sound: AtmosphereSound = {
        id: crypto.randomUUID(),
        name: newSound.name,
        file,
        fileName: file.name,
        volume: 0.8,
        isOneShot: newSound.isOneShot,
        color: newSound.color,
        createdAt: Date.now(),
        midiMessageType: 'NOTE',
        midiNote: undefined,
        midiChannel: 0,
      }

      await addSound(sound)
      setShowAddForm(false)
      setNewSound({ name: '', color: COLORS[0], isOneShot: true })
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      console.error('Add sound error:', err)
      alert('添加音效失败: ' + (err as Error).message)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingSound) return
    await updateSound(editingSound.id, editingSound)
    setEditingSound(null)
  }

  const stopAllBinding = mappings['stopAllSounds']

  return (
    <div className="space-y-4">
      {/* MIDI状态和控制栏 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/60">{sounds.length} 个音效</span>
        <div className="flex items-center gap-2">
          {/* 停止全部按钮 */}
          <button
            onClick={stopAllSounds}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30"
          >
            <StopCircle className="w-4 h-4" />
            停止全部
          </button>
          {/* 停止全部 MIDI学习 */}
          <button
            onClick={() => {
              if (learningAction === 'stopAllSounds') {
                stopLearning()
              } else {
                useMidiStore.getState().startLearning('stopAllSounds')
              }
            }}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              learningAction === 'stopAllSounds'
                ? 'bg-primary text-white'
                : stopAllBinding
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-white/10 text-white/40'
            }`}
            title={stopAllBinding ? `${stopAllBinding.messageType}: ${stopAllBinding.note}` : 'MIDI学习'}
          >
            {learningAction === 'stopAllSounds' ? '...' : 'M'}
          </button>
          <button
            onClick={() => setShowMidiSettings(!showMidiSettings)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
              connectedDevice ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'
            }`}
          >
            <Piano className="w-4 h-4" />
            {connectedDevice ? connectedDevice.name : 'MIDI'}
          </button>
        </div>
      </div>

      {/* MIDI设备设置 */}
      {showMidiSettings && (
        <div className="bg-surface rounded-lg p-4">
          <h3 className="font-medium mb-3">MIDI 设备</h3>
          {devices.length === 0 ? (
            <p className="text-sm text-white/40">未检测到 MIDI 设备</p>
          ) : (
            <div className="space-y-2">
              {devices.map((device) => (
                <button
                  key={device.id}
                  onClick={() => connectedDevice?.id === device.id ? disconnect() : connect(device.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    connectedDevice?.id === device.id
                      ? 'bg-primary text-white'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {device.name}
                  {connectedDevice?.id === device.id && ' (已连接)'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sound grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {sounds.map((sound) => {
          const isPlaying = playingSounds.has(sound.id)
          const midiMapping = soundMappings[sound.id]
          return (
            <div key={sound.id} className="relative group">
              <button
                onClick={() => isPlaying ? stopSound(sound.id) : playSound(sound.id)}
                className={`w-full aspect-square rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all ${
                  isPlaying ? 'ring-2 ring-primary scale-95' : ''
                }`}
                style={{ backgroundColor: `${sound.color}20` }}
              >
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${sound.color}40` }}
                >
                  {isPlaying ? (
                    <Volume2 className="w-6 h-6" style={{ color: sound.color }} />
                  ) : (
                    <VolumeX className="w-6 h-6 text-white/40" />
                  )}
                </div>

                {/* Name */}
                <span className="text-sm text-center truncate w-full">{sound.name}</span>

                {/* MIDI info */}
                {midiMapping && (
                  <span className="text-xs text-white/40">
                    {midiMapping.messageType}: {midiMapping.note}
                  </span>
                )}

                {/* Playing indicator */}
                {isPlaying && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
                    <span className="w-1 h-3 bg-primary rounded-full animate-pulse" />
                    <span className="w-1 h-4 bg-primary rounded-full animate-pulse delay-75" />
                    <span className="w-1 h-2 bg-primary rounded-full animate-pulse delay-150" />
                  </div>
                )}
              </button>

              {/* Edit/Delete buttons */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingSound(sound)
                  }}
                  className="p-1.5 rounded-full bg-black/50 text-white/60 hover:text-white"
                >
                  <Settings className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeSound(sound.id)
                  }}
                  className="p-1.5 rounded-full bg-black/50 text-white/60 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          )
        })}

        {/* Add button */}
        <button
          onClick={() => setShowAddForm(true)}
          className="aspect-square rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-2 text-white/40 hover:text-white/60 hover:border-white/40 transition-colors"
        >
          <Plus className="w-8 h-8" />
          <span className="text-sm">添加音效</span>
        </button>
      </div>

      {/* Add form modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">添加音效</h2>
            <form onSubmit={handleAddSound} className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-1">名称</label>
                <input
                  type="text"
                  value={newSound.name}
                  onChange={(e) => setNewSound({ ...newSound, name: e.target.value })}
                  className="w-full bg-white/10 rounded-lg px-3 py-2"
                  placeholder="音效名称"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1">音频文件</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  className="w-full bg-white/10 rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">颜色</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewSound({ ...newSound, color })}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        newSound.color === color ? 'scale-125 ring-2 ring-white' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isOneShot"
                  checked={newSound.isOneShot}
                  onChange={(e) => setNewSound({ ...newSound, isOneShot: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="isOneShot" className="text-sm">一次性播放（不循环）</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 bg-white/10 rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary rounded-lg"
                >
                  添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit form modal */}
      {editingSound && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">编辑音效</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-1">名称</label>
                <input
                  type="text"
                  value={editingSound.name}
                  onChange={(e) => setEditingSound({ ...editingSound, name: e.target.value })}
                  className="w-full bg-white/10 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1">音量</label>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-white/40" />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={editingSound.volume}
                    onChange={(e) => setEditingSound({ ...editingSound, volume: parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-sm text-white/40 w-10">{Math.round(editingSound.volume * 100)}%</span>
                </div>
              </div>

              {/* MIDI设置 */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">MIDI 映射</label>
                  <button
                    onClick={() => {
                      if (learningSoundId === editingSound.id) {
                        stopLearning()
                      } else {
                        startLearningSound(editingSound.id)
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      learningSoundId === editingSound.id
                        ? 'bg-primary text-white'
                        : 'bg-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    {learningSoundId === editingSound.id ? '学习中...' : '学习'}
                  </button>
                </div>

                {learningSoundId === editingSound.id && (
                  <p className="text-sm text-primary mb-2">请按下 MIDI 控制器上的按键...</p>
                )}

                {soundMappings[editingSound.id] && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-white/60">当前映射:</span>
                    <span className="bg-white/10 px-2 py-1 rounded">
                      {soundMappings[editingSound.id].messageType}: {soundMappings[editingSound.id].note} (CH{soundMappings[editingSound.id].channel})
                    </span>
                    <button
                      onClick={() => setSoundMapping(editingSound.id, null)}
                      className="text-red-400 hover:text-red-300"
                    >
                      清除
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">颜色</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditingSound({ ...editingSound, color })}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        editingSound.color === color ? 'scale-125 ring-2 ring-white' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editOneShot"
                  checked={editingSound.isOneShot}
                  onChange={(e) => setEditingSound({ ...editingSound, isOneShot: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="editOneShot" className="text-sm">一次性播放（不循环）</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setEditingSound(null)
                    stopLearning()
                  }}
                  className="flex-1 px-4 py-2 bg-white/10 rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2 bg-primary rounded-lg"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 过场音乐面板
function InterludePanel() {
  const { tracks, currentTrack, isPlaying, volume, addTrack, removeTrack, play, pause, stop, setVolume, setCurrentTrack } = useInterludeStore()
  const { mappings, learningAction, startLearning, stopLearning, setMapping } = useMidiStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTrackName, setNewTrackName] = useState('')

  const handleAddTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    const file = fileInputRef.current?.files?.[0]
    if (!file) return

    try {
      const track: InterludeTrack = {
        id: crypto.randomUUID(),
        title: newTrackName || file.name.replace(/\.[^/.]+$/, ''),
        file,
        fileName: file.name,
        volume: 0.5,
        isActive: false,
        createdAt: Date.now(),
      }

      await addTrack(track)
      setShowAddForm(false)
      setNewTrackName('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      console.error('Add track error:', err)
      alert('添加过场音乐失败: ' + (err as Error).message)
    }
  }

  const interludeBinding = mappings['interludePlayPause']

  return (
    <div className="space-y-4">
      {/* Current playback */}
      {currentTrack && (
        <div className="bg-surface rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
              <Music className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{currentTrack.title}</h3>
              <p className="text-sm text-white/60">
                {isPlaying ? '正在播放' : '已暂停'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isPlaying ? (
                <button onClick={pause} className="p-2 bg-white/10 rounded-full">
                  <Pause className="w-5 h-5" />
                </button>
              ) : (
                <button onClick={play} className="p-2 bg-primary rounded-full">
                  <Play className="w-5 h-5" />
                </button>
              )}
              <button onClick={stop} className="p-2 bg-white/10 rounded-full">
                <StopCircle className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3">
            <VolumeX className="w-4 h-4 text-white/40" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:bg-primary
                [&::-webkit-slider-thumb]:rounded-full"
            />
            <Volume2 className="w-4 h-4 text-white/40" />
          </div>
        </div>
      )}

      {/* MIDI控制 */}
      <div className="bg-surface rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-sm">MIDI 控制</h4>
            <p className="text-xs text-white/40">播放/暂停过场音乐</p>
          </div>
          <div className="flex items-center gap-2">
            {interludeBinding && (
              <span className="text-xs bg-white/10 px-2 py-1 rounded">
                {interludeBinding.messageType}: {interludeBinding.note}
              </span>
            )}
            <button
              onClick={() => {
                if (learningAction === 'interludePlayPause') {
                  stopLearning()
                } else {
                  startLearning('interludePlayPause')
                }
              }}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                learningAction === 'interludePlayPause'
                  ? 'bg-primary text-white'
                  : 'bg-white/10 text-white/60 hover:text-white'
              }`}
            >
              {learningAction === 'interludePlayPause' ? '学习中...' : '学习'}
            </button>
            {interludeBinding && (
              <button
                onClick={() => setMapping('interludePlayPause', null)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                清除
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/60">{tracks.length} 首过场音乐</span>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary rounded-lg text-sm"
        >
          <Plus className="w-4 h-4" />
          添加
        </button>
      </div>

      <div className="space-y-2">
        {tracks.map((track) => (
          <div
            key={track.id}
            onClick={() => setCurrentTrack(track)}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
              currentTrack?.id === track.id ? 'bg-primary/20' : 'bg-surface hover:bg-white/5'
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Music className="w-5 h-5 text-white/60" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{track.title}</h3>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                removeTrack(track.id)
              }}
              className="p-2 text-white/40 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {tracks.length === 0 && (
          <div className="text-center py-8 text-white/40">
            <Music className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无过场音乐</p>
            <p className="text-sm mt-1">添加音乐在歌曲间隙播放</p>
          </div>
        )}
      </div>

      {/* Add form modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">添加过场音乐</h2>
            <form onSubmit={handleAddTrack} className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-1">名称（可选）</label>
                <input
                  type="text"
                  value={newTrackName}
                  onChange={(e) => setNewTrackName(e.target.value)}
                  className="w-full bg-white/10 rounded-lg px-3 py-2"
                  placeholder="使用文件名"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1">音频文件</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  className="w-full bg-white/10 rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 bg-white/10 rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary rounded-lg"
                >
                  添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-surface/50 rounded-lg p-4">
        <p className="text-sm text-white/60">
          过场音乐会在歌曲暂停或结束时自动播放。
        </p>
      </div>
    </div>
  )
}
