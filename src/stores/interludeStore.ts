import { create } from 'zustand'
import type { InterludeTrack } from '../types'
import { getAllInterludeTracks, addInterludeTrack, deleteInterludeTrack, updateInterludeTrack } from '../services/database'

interface InterludeStore {
  tracks: InterludeTrack[]
  currentTrack: InterludeTrack | null
  isPlaying: boolean
  volume: number
  audioElement: HTMLAudioElement | null
  isLoading: boolean
  isInitialized: boolean

  init: () => Promise<void>
  loadTracks: () => Promise<void>
  addTrack: (track: InterludeTrack) => Promise<string>
  removeTrack: (id: string) => Promise<void>
  play: () => void
  pause: () => void
  stop: () => void
  setVolume: (volume: number) => void
  setCurrentTrack: (track: InterludeTrack) => void
}

export const useInterludeStore = create<InterludeStore>((set, get) => ({
  tracks: [],
  currentTrack: null,
  isPlaying: false,
  volume: 0.3,
  audioElement: null,
  isLoading: false,
  isInitialized: false,

  init: async () => {
    if (get().isInitialized) return
    await get().loadTracks()
    set({ isInitialized: true })
  },

  loadTracks: async () => {
    set({ isLoading: true })
    try {
      const tracks = await getAllInterludeTracks()
      set({ tracks, isLoading: false })

      // 设置默认活动曲目
      const activeTrack = tracks.find(t => t.isActive) || tracks[0]
      if (activeTrack) {
        set({ currentTrack: activeTrack })
      }
    } catch (error) {
      console.error('Failed to load interlude tracks:', error)
      set({ isLoading: false })
    }
  },

  addTrack: async (track) => {
    try {
      console.log('Adding interlude track:', track.title, track.file)
      const id = await addInterludeTrack(track)
      console.log('Track added with id:', id)
      await get().loadTracks()
      return id
    } catch (error) {
      console.error('Failed to add interlude track:', error)
      throw error
    }
  },

  removeTrack: async (id) => {
    const { currentTrack, audioElement } = get()

    // 如果正在播放该曲目，停止播放
    if (currentTrack?.id === id && audioElement) {
      audioElement.pause()
      audioElement.src = ''
      set({ isPlaying: false, currentTrack: null, audioElement: null })
    }

    await deleteInterludeTrack(id)
    await get().loadTracks()
  },

  play: () => {
    const { currentTrack, volume, audioElement, isPlaying } = get()
    if (!currentTrack?.file) return

    // 如果已经在播放，不重复操作
    if (isPlaying && audioElement) return

    let audio = audioElement
    if (!audio) {
      audio = new Audio()
      audio.volume = volume
      audio.loop = true
      audio.onended = () => {
        // 循环播放
        const track = get().currentTrack
        if (track?.file && audio) {
          audio.currentTime = 0
          audio.play().catch(() => {})
        }
      }
      set({ audioElement: audio })
    }

    // 只在需要时设置 src（音频文件未加载时）
    if (!audio.src || audio.src === '') {
      audio.src = URL.createObjectURL(currentTrack.file)
    }

    audio.play().catch(err => {
      console.error('Failed to play interlude:', err)
    })

    set({ isPlaying: true })
  },

  pause: () => {
    const { audioElement } = get()
    if (audioElement) {
      audioElement.pause()
    }
    set({ isPlaying: false })
  },

  stop: () => {
    const { audioElement } = get()
    if (audioElement) {
      audioElement.pause()
      audioElement.currentTime = 0
    }
    set({ isPlaying: false })
  },

  setVolume: (volume) => {
    const { audioElement } = get()
    if (audioElement) {
      audioElement.volume = volume
    }
    set({ volume })

    // 更新数据库
    const { currentTrack } = get()
    if (currentTrack) {
      updateInterludeTrack(currentTrack.id, { volume })
    }
  },

  setCurrentTrack: (track) => {
    const { isPlaying, audioElement } = get()

    // 停止当前播放
    if (audioElement) {
      audioElement.pause()
    }

    set({ currentTrack: track, isPlaying: false })

    // 如果之前在播放，继续播放新曲目
    if (isPlaying && track.file) {
      get().play()
    }
  }
}))

// Auto-initialize
if (typeof window !== 'undefined') {
  useInterludeStore.getState().init()
}
