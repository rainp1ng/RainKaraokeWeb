import { create } from 'zustand'
import { usePlayerStore } from './playerStore'
import type { QueueItem, Song } from '../types'

interface QueueStore {
  items: QueueItem[]
  currentIndex: number

  // Computed
  queue: Song[]
  currentSong: Song | null

  // Actions
  addToQueue: (song: Song) => void
  addManyToQueue: (songs: Song[]) => void
  removeFromQueue: (id: string) => void
  clearQueue: () => void
  moveItem: (fromIndex: number, toIndex: number) => void
  playNext: () => void
  playPrevious: () => void
  playAtIndex: (index: number) => void
  moveToTop: (id: string) => void  // 顶歌功能
  getNextItem: () => QueueItem | undefined
}

export const useQueueStore = create<QueueStore>((set, get) => ({
  items: [],
  currentIndex: -1,

  get queue() {
    return get().items.map(item => item.song).filter(Boolean) as Song[]
  },

  get currentSong() {
    const { items, currentIndex } = get()
    if (currentIndex >= 0 && currentIndex < items.length) {
      return items[currentIndex].song || null
    }
    return null
  },

  addToQueue: (song) =>
    set((state) => {
      const newItems = [
        ...state.items,
        {
          id: crypto.randomUUID(),
          songId: song.id,
          position: state.items.length,
          song,
          addedAt: Date.now(),
        },
      ]

      // 如果是第一首歌，自动开始播放
      if (state.items.length === 0) {
        usePlayerStore.getState().setCurrentSong(song)
        return { items: newItems, currentIndex: 0 }
      }

      return { items: newItems }
    }),

  addManyToQueue: (songs) =>
    set((state) => {
      const newItems = songs.map((song, index) => ({
        id: crypto.randomUUID(),
        songId: song.id,
        position: state.items.length + index,
        song,
        addedAt: Date.now(),
      }))

      const allItems = [...state.items, ...newItems]

      // 如果队列为空，自动开始播放第一首
      if (state.items.length === 0 && songs.length > 0) {
        usePlayerStore.getState().setCurrentSong(songs[0])
        return { items: allItems, currentIndex: 0 }
      }

      return { items: allItems }
    }),

  removeFromQueue: (id) =>
    set((state) => {
      const removeIndex = state.items.findIndex(item => item.id === id)
      const newItems = state.items
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, position: index }))

      let newCurrentIndex = state.currentIndex

      // 如果移除的是当前播放歌曲之前的歌，索引需要调整
      if (removeIndex < state.currentIndex) {
        newCurrentIndex = state.currentIndex - 1
      }
      // 如果移除的是当前播放的歌曲，播放下一首
      else if (removeIndex === state.currentIndex) {
        if (newItems.length === 0) {
          newCurrentIndex = -1
          usePlayerStore.getState().stop()
        } else if (newCurrentIndex >= newItems.length) {
          newCurrentIndex = newItems.length - 1
        }
        if (newItems.length > 0 && newCurrentIndex >= 0) {
          usePlayerStore.getState().setCurrentSong(newItems[newCurrentIndex].song!)
        }
      }

      return { items: newItems, currentIndex: newCurrentIndex }
    }),

  clearQueue: () => {
    usePlayerStore.getState().stop()
    set({ items: [], currentIndex: -1 })
  },

  moveItem: (fromIndex, toIndex) =>
    set((state) => {
      const items = [...state.items]
      const [removed] = items.splice(fromIndex, 1)
      items.splice(toIndex, 0, removed)

      let newCurrentIndex = state.currentIndex
      if (fromIndex === state.currentIndex) {
        newCurrentIndex = toIndex
      } else if (fromIndex < state.currentIndex && toIndex >= state.currentIndex) {
        newCurrentIndex = state.currentIndex - 1
      } else if (fromIndex > state.currentIndex && toIndex <= state.currentIndex) {
        newCurrentIndex = state.currentIndex + 1
      }

      return {
        items: items.map((item, index) => ({ ...item, position: index })),
        currentIndex: newCurrentIndex,
      }
    }),

  moveToTop: (id) =>
    set((state) => {
      const index = state.items.findIndex(item => item.id === id)
      if (index <= 0 || index === state.items.length - 1) return state

      // 移动到当前播放歌曲的下一个位置
      const targetIndex = state.currentIndex + 1
      const items = [...state.items]
      const [removed] = items.splice(index, 1)
      items.splice(targetIndex, 0, removed)

      return {
        items: items.map((item, index) => ({ ...item, position: index })),
      }
    }),

  playNext: () => {
    const { items, currentIndex } = get()
    if (currentIndex < items.length - 1) {
      const nextIndex = currentIndex + 1
      const nextSong = items[nextIndex].song
      if (nextSong) {
        usePlayerStore.getState().setCurrentSong(nextSong)
        set({ currentIndex: nextIndex })
      }
    }
  },

  playPrevious: () => {
    const { items, currentIndex } = get()
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1
      const prevSong = items[prevIndex].song
      if (prevSong) {
        usePlayerStore.getState().setCurrentSong(prevSong)
        set({ currentIndex: prevIndex })
      }
    }
  },

  playAtIndex: (index) => {
    const { items } = get()
    if (index >= 0 && index < items.length) {
      const song = items[index].song
      if (song) {
        usePlayerStore.getState().setCurrentSong(song)
        set({ currentIndex: index })
      }
    }
  },

  getNextItem: () => {
    const { items, currentIndex } = get()
    if (currentIndex < items.length - 1) {
      return items[currentIndex + 1]
    }
    return undefined
  },
}))
