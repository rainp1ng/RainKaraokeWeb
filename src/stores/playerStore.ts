import { create } from 'zustand'
import type { Song, PlaybackStatus, PlaybackState } from '../types'

interface PlayerStore {
  // 播放状态
  playbackState: PlaybackState
  // 视频元素引用
  videoElement: HTMLVideoElement | null

  // Actions
  setVideoElement: (element: HTMLVideoElement | null) => void
  setCurrentSong: (song: Song | null) => void
  setPlaybackStatus: (status: PlaybackStatus) => void
  setCurrentPosition: (position: number) => void
  setDuration: (duration: number) => void
  toggleVocal: () => void
  setPitch: (pitch: number) => void
  setSpeed: (speed: number) => void
  setVolume: (volume: number) => void
  seek: (position: number) => void
  play: () => void
  pause: () => void
  stop: () => void
  reset: () => void
}

const initialPlaybackState: PlaybackState = {
  status: 'idle',
  currentSong: null,
  currentPosition: 0,
  duration: 0,
  isVocal: true,
  pitch: 0,
  speed: 1,
  volume: 0.8,
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  playbackState: initialPlaybackState,
  videoElement: null,

  setVideoElement: (element) => set({ videoElement: element }),

  setCurrentSong: (song) =>
    set((state) => ({
      playbackState: {
        ...state.playbackState,
        currentSong: song,
        status: song ? 'playing' : 'idle',
        currentPosition: 0,
      },
    })),

  setPlaybackStatus: (status) =>
    set((state) => ({
      playbackState: { ...state.playbackState, status },
    })),

  setCurrentPosition: (position) =>
    set((state) => ({
      playbackState: { ...state.playbackState, currentPosition: position },
    })),

  setDuration: (duration) =>
    set((state) => ({
      playbackState: { ...state.playbackState, duration },
    })),

  toggleVocal: () =>
    set((state) => ({
      playbackState: { ...state.playbackState, isVocal: !state.playbackState.isVocal },
    })),

  setPitch: (pitch) =>
    set((state) => ({
      playbackState: { ...state.playbackState, pitch: Math.max(-12, Math.min(12, pitch)) },
    })),

  setSpeed: (speed) =>
    set((state) => ({
      playbackState: { ...state.playbackState, speed: Math.max(0.5, Math.min(2, speed)) },
    })),

  setVolume: (volume) =>
    set((state) => ({
      playbackState: { ...state.playbackState, volume: Math.max(0, Math.min(1, volume)) },
    })),

  seek: (position) => {
    const { videoElement } = get()
    if (videoElement) {
      videoElement.currentTime = position
      set((state) => ({
        playbackState: { ...state.playbackState, currentPosition: position },
      }))
    }
  },

  play: () => {
    const { videoElement, playbackState } = get()
    if (videoElement && playbackState.currentSong) {
      videoElement.play().catch(err => {
        console.error('Play error:', err)
      })
      set((state) => ({
        playbackState: { ...state.playbackState, status: 'playing' },
      }))
    }
  },

  pause: () => {
    const { videoElement, playbackState } = get()
    if (videoElement && playbackState.currentSong) {
      videoElement.pause()
      set((state) => ({
        playbackState: { ...state.playbackState, status: 'paused' },
      }))
    }
  },

  stop: () => {
    const { videoElement } = get()
    if (videoElement) {
      videoElement.pause()
      videoElement.currentTime = 0
    }
    set((state) => ({
      playbackState: { ...state.playbackState, status: 'idle', currentPosition: 0 },
    }))
  },

  reset: () =>
    set({ playbackState: initialPlaybackState, videoElement: null }),
}))
