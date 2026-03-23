import { create } from 'zustand'
import {
  getAllPlaylists,
  getPlaylistSongs,
  createPlaylist as dbCreatePlaylist,
  updatePlaylist as dbUpdatePlaylist,
  deletePlaylist as dbDeletePlaylist,
  addSongsToPlaylist,
  removeSongFromPlaylist,
  clearPlaylist as dbClearPlaylist
} from '../services/database'
import type { Playlist, PlaylistSong } from '../types'

interface PlaylistStore {
  playlists: Playlist[]
  currentPlaylist: Playlist | null
  currentPlaylistSongs: PlaylistSong[]
  isLoading: boolean

  // Actions
  loadPlaylists: () => Promise<void>
  createPlaylist: (name: string, description?: string) => Promise<string>
  updatePlaylist: (id: string, name: string, description?: string) => Promise<void>
  deletePlaylist: (id: string) => Promise<void>
  loadPlaylistSongs: (playlistId: string) => Promise<void>
  addSongsToPlaylist: (playlistId: string, songIds: string[]) => Promise<void>
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>
  clearPlaylist: (playlistId: string) => Promise<void>
  setCurrentPlaylist: (playlist: Playlist | null) => void
}

export const usePlaylistStore = create<PlaylistStore>((set) => ({
  playlists: [],
  currentPlaylist: null,
  currentPlaylistSongs: [],
  isLoading: false,

  loadPlaylists: async () => {
    set({ isLoading: true })
    try {
      const playlists = await getAllPlaylists()
      set({ playlists, isLoading: false })
    } catch (err) {
      console.error('Failed to load playlists:', err)
      set({ isLoading: false })
    }
  },

  createPlaylist: async (name, description) => {
    const id = await dbCreatePlaylist(name, description)
    await usePlaylistStore.getState().loadPlaylists()
    return id
  },

  updatePlaylist: async (id, name, description) => {
    await dbUpdatePlaylist(id, name, description)
    await usePlaylistStore.getState().loadPlaylists()
  },

  deletePlaylist: async (id) => {
    await dbDeletePlaylist(id)
    set((state) => ({
      playlists: state.playlists.filter(p => p.id !== id),
      currentPlaylist: state.currentPlaylist?.id === id ? null : state.currentPlaylist,
      currentPlaylistSongs: state.currentPlaylist?.id === id ? [] : state.currentPlaylistSongs
    }))
  },

  loadPlaylistSongs: async (playlistId) => {
    set({ isLoading: true })
    try {
      const songs = await getPlaylistSongs(playlistId)
      set({ currentPlaylistSongs: songs, isLoading: false })
    } catch (err) {
      console.error('Failed to load playlist songs:', err)
      set({ isLoading: false })
    }
  },

  addSongsToPlaylist: async (playlistId, songIds) => {
    await addSongsToPlaylist(playlistId, songIds)
    await usePlaylistStore.getState().loadPlaylists()
    // 如果正在查看当前歌单，刷新歌曲列表
    const { currentPlaylist } = usePlaylistStore.getState()
    if (currentPlaylist?.id === playlistId) {
      await usePlaylistStore.getState().loadPlaylistSongs(playlistId)
    }
  },

  removeSongFromPlaylist: async (playlistId, songId) => {
    await removeSongFromPlaylist(playlistId, songId)
    await usePlaylistStore.getState().loadPlaylists()
    // 刷新当前歌单
    const { currentPlaylist } = usePlaylistStore.getState()
    if (currentPlaylist?.id === playlistId) {
      await usePlaylistStore.getState().loadPlaylistSongs(playlistId)
    }
  },

  clearPlaylist: async (playlistId) => {
    await dbClearPlaylist(playlistId)
    await usePlaylistStore.getState().loadPlaylists()
    set({ currentPlaylistSongs: [] })
  },

  setCurrentPlaylist: (playlist) => {
    set({ currentPlaylist: playlist })
  }
}))
