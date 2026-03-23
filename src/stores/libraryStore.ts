import { create } from 'zustand'
import { getAllSongs, addSong as dbAddSong, updateSong as dbUpdateSong, deleteSong as dbDeleteSong } from '../services/database'
import type { Song } from '../types'

interface LibraryStore {
  songs: Song[]
  searchQuery: string
  selectedFilter: string
  isLoading: boolean
  isInitialized: boolean

  // Actions
  init: () => Promise<void>
  loadSongs: () => Promise<void>
  setSongs: (songs: Song[]) => void
  addSong: (song: Song) => Promise<void>
  updateSong: (id: string, updates: Partial<Song>) => Promise<void>
  removeSong: (id: string) => Promise<void>
  setSearchQuery: (query: string) => void
  setSelectedFilter: (filter: string) => void
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  songs: [],
  searchQuery: '',
  selectedFilter: '全部',
  isLoading: false,
  isInitialized: false,

  init: async () => {
    if (get().isInitialized) return
    await get().loadSongs()
    set({ isInitialized: true })
  },

  loadSongs: async () => {
    set({ isLoading: true })
    try {
      const songs = await getAllSongs()
      console.log('Loaded songs from DB:', songs.length)
      set({ songs, isLoading: false })
    } catch (err) {
      console.error('Failed to load songs:', err)
      set({ isLoading: false })
    }
  },

  setSongs: (songs) => set({ songs }),

  addSong: async (song) => {
    try {
      await dbAddSong(song)
      set((state) => ({ songs: [...state.songs, song] }))
      console.log('Song added:', song.title)
    } catch (err) {
      console.error('Failed to add song:', err)
    }
  },

  updateSong: async (id, updates) => {
    await dbUpdateSong(id, updates)
    set((state) => ({
      songs: state.songs.map((song) =>
        song.id === id ? { ...song, ...updates, updatedAt: Date.now() } : song
      ),
    }))
  },

  removeSong: async (id) => {
    await dbDeleteSong(id)
    set((state) => ({
      songs: state.songs.filter((song) => song.id !== id),
    }))
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedFilter: (filter) => set({ selectedFilter: filter }),
}))

// 初始化时自动加载歌曲
if (typeof window !== 'undefined') {
  useLibraryStore.getState().init()
}
