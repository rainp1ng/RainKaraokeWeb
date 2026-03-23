import { create } from 'zustand'
import type { AtmosphereSound } from '../types'
import { getAllAtmosphereSounds, addAtmosphereSound, deleteAtmosphereSound } from '../services/database'
import { useInterludeStore } from './interludeStore'
import { usePlayerStore } from './playerStore'

interface AtmosphereStore {
  sounds: AtmosphereSound[]
  masterVolume: number
  playingSounds: Set<string>
  isLoading: boolean
  isInitialized: boolean

  // Actions
  init: () => Promise<void>
  loadSounds: () => Promise<void>
  addSound: (sound: AtmosphereSound) => Promise<string>
  removeSound: (id: string) => Promise<void>
  updateSound: (id: string, updates: Partial<AtmosphereSound>) => void
  playSound: (id: string) => void
  stopSound: (id: string) => void
  stopAllSounds: () => void
  setMasterVolume: (volume: number) => void
}

export const useAtmosphereStore = create<AtmosphereStore>((set, get) => ({
  sounds: [],
  masterVolume: 0.8,
  playingSounds: new Set(),
  isLoading: false,
  isInitialized: false,

  init: async () => {
    if (get().isInitialized) return
    await get().loadSounds()
    set({ isInitialized: true })
  },

  loadSounds: async () => {
    set({ isLoading: true })
    try {
      const sounds = await getAllAtmosphereSounds()
      set({ sounds, isLoading: false })
    } catch (error) {
      console.error('Failed to load atmosphere sounds:', error)
      set({ isLoading: false })
    }
  },

  addSound: async (sound) => {
    try {
      console.log('Adding sound:', sound.name, sound.file)
      const id = await addAtmosphereSound(sound)
      console.log('Sound added with id:', id)
      await get().loadSounds()
      return id
    } catch (error) {
      console.error('Failed to add sound:', error)
      throw error
    }
  },

  removeSound: async (id) => {
    const { sounds, playingSounds } = get()
    const sound = sounds.find(s => s.id === id)

    // 停止并清理音频元素
    if (sound?.file) {
      get().stopSound(id)
    }

    playingSounds.delete(id)

    await deleteAtmosphereSound(id)
    set({
      sounds: sounds.filter(s => s.id !== id),
      playingSounds: new Set(playingSounds)
    })
  },

  updateSound: (id, updates) =>
    set((state) => ({
      sounds: state.sounds.map(s =>
        s.id === id ? { ...s, ...updates } : s
      )
    })),

  playSound: (id) => {
    const { sounds, masterVolume, playingSounds } = get()
    const sound = sounds.find(s => s.id === id)
    if (!sound?.file) return

    // 如果已经在播放，停止
    if (playingSounds.has(id)) {
      get().stopSound(id)
      return
    }

    // 播放音效时暂停过场音乐
    useInterludeStore.getState().pause()

    // 创建新的音频元素
    const audio = new Audio()
    audio.src = URL.createObjectURL(sound.file)
    audio.volume = sound.volume * masterVolume
    audio.loop = !sound.isOneShot

    audio.onended = () => {
      const newPlaying = new Set(get().playingSounds)
      newPlaying.delete(id)
      set({ playingSounds: newPlaying })

      // 如果没有其他音效在播放，且歌曲暂停中，恢复过场音乐
      if (newPlaying.size === 0) {
        const playerStatus = usePlayerStore.getState().playbackState.status
        if (playerStatus === 'paused') {
          useInterludeStore.getState().play()
        }
      }
    }

    audio.play().catch(err => {
      console.error('Failed to play sound:', err)
    })

    // 存储音频元素引用到sound对象
    set({
      sounds: sounds.map(s =>
        s.id === id ? { ...s, audioElement: audio } : s
      ),
      playingSounds: new Set([...playingSounds, id])
    })
  },

  stopSound: (id) => {
    const { sounds, playingSounds } = get()
    const sound = sounds.find(s => s.id === id)

    if (sound?.audioElement) {
      sound.audioElement.pause()
      sound.audioElement.currentTime = 0
    }

    playingSounds.delete(id)
    set({ playingSounds: new Set(playingSounds) })
  },

  stopAllSounds: () => {
    const { sounds, playingSounds } = get()

    for (const id of playingSounds) {
      const sound = sounds.find(s => s.id === id)
      if (sound?.audioElement) {
        sound.audioElement.pause()
        sound.audioElement.currentTime = 0
      }
    }

    set({ playingSounds: new Set() })

    // 如果歌曲暂停中，恢复过场音乐
    const playerStatus = usePlayerStore.getState().playbackState.status
    if (playerStatus === 'paused') {
      useInterludeStore.getState().play()
    }
  },

  setMasterVolume: (volume) => {
    const { sounds, playingSounds } = get()

    // 更新所有正在播放的音量
    for (const id of playingSounds) {
      const sound = sounds.find(s => s.id === id)
      if (sound?.audioElement) {
        sound.audioElement.volume = sound.volume * volume
      }
    }

    set({ masterVolume: volume })
  }
}))

// Auto-initialize
if (typeof window !== 'undefined') {
  useAtmosphereStore.getState().init()
}
