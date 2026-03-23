import { openDB, DBSchema, IDBPDatabase } from 'idb'
import type { Song, QueueItem, Settings, Playlist, PlaylistSong, AtmosphereSound, InterludeTrack } from '../types'

// 存储歌曲数据（文件转为ArrayBuffer）
export interface SongRecord {
  id: string
  title: string
  artist?: string
  album?: string
  duration?: number

  // 文件数据
  videoData?: ArrayBuffer
  vocalData?: ArrayBuffer
  instrumentalData?: ArrayBuffer
  lyricsData?: ArrayBuffer
  lyricsFormat?: 'lrc' | 'ksc' | 'txt'

  // 文件名
  videoFileName?: string
  vocalFileName?: string
  instrumentalFileName?: string
  lyricsFileName?: string

  // MIME类型
  videoMimeType?: string

  // 元数据
  hasVocal: boolean
  hasInstrumental: boolean

  // 分类
  genre?: string
  language?: string

  // 统计
  playCount: number
  lastPlayedAt?: number

  createdAt: number
  updatedAt: number
}

// 音效记录
export interface AtmosphereSoundRecord {
  id: string
  name: string
  audioData: ArrayBuffer
  fileName: string
  volume: number
  isOneShot: boolean
  color: string
  createdAt: number
}

// 过场音乐记录
export interface InterludeTrackRecord {
  id: string
  title: string
  audioData: ArrayBuffer
  fileName: string
  volume: number
  isActive: boolean
  createdAt: number
}

interface KaraokeDB extends DBSchema {
  songs: {
    key: string
    value: SongRecord
    indexes: { 'by-title': string; 'by-artist': string }
  }
  queue: {
    key: string
    value: QueueItem
    indexes: { 'by-position': number }
  }
  playlists: {
    key: string
    value: Playlist
    indexes: { 'by-name': string; 'by-updated': number }
  }
  playlistSongs: {
    key: string
    value: PlaylistSong
    indexes: { 'by-playlist': string; 'by-position': [string, number] }
  }
  atmosphereSounds: {
    key: string
    value: AtmosphereSoundRecord
  }
  interludeTracks: {
    key: string
    value: InterludeTrackRecord
  }
  settings: {
    key: string
    value: Settings
  }
}

const DB_NAME = 'rainkaraoke'
const DB_VERSION = 4

let dbPromise: Promise<IDBPDatabase<KaraokeDB>> | null = null

export async function getDB(): Promise<IDBPDatabase<KaraokeDB>> {
  if (!dbPromise) {
    dbPromise = openDB<KaraokeDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // 版本升级时删除旧的songs store并重建
        if (oldVersion < 3 && db.objectStoreNames.contains('songs')) {
          db.deleteObjectStore('songs')
        }

        // Songs store
        if (!db.objectStoreNames.contains('songs')) {
          const songStore = db.createObjectStore('songs', { keyPath: 'id' })
          songStore.createIndex('by-title', 'title')
          songStore.createIndex('by-artist', 'artist')
        }

        // Queue store
        if (!db.objectStoreNames.contains('queue')) {
          const queueStore = db.createObjectStore('queue', { keyPath: 'id' })
          queueStore.createIndex('by-position', 'position')
        }

        // Playlists store
        if (!db.objectStoreNames.contains('playlists')) {
          const playlistStore = db.createObjectStore('playlists', { keyPath: 'id' })
          playlistStore.createIndex('by-name', 'name')
          playlistStore.createIndex('by-updated', 'updatedAt')
        }

        // Playlist songs store
        if (!db.objectStoreNames.contains('playlistSongs')) {
          const psStore = db.createObjectStore('playlistSongs', { keyPath: 'id' })
          psStore.createIndex('by-playlist', 'playlistId')
          psStore.createIndex('by-position', ['playlistId', 'position'])
        }

        // Atmosphere sounds store (音效)
        if (!db.objectStoreNames.contains('atmosphereSounds')) {
          db.createObjectStore('atmosphereSounds', { keyPath: 'id' })
        }

        // Interlude tracks store (过场音乐)
        if (!db.objectStoreNames.contains('interludeTracks')) {
          db.createObjectStore('interludeTracks', { keyPath: 'id' })
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings')
        }
      },
    })
  }
  return dbPromise
}

// 将File或Blob转换为ArrayBuffer
async function fileToArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
  return await file.arrayBuffer()
}

// Song operations
export async function getAllSongs(): Promise<Song[]> {
  const db = await getDB()
  const records = await db.getAll('songs')

  // 转换记录为Song对象（包含Blob URL）
  return records.map(record => {
    const song: Song = {
      id: record.id,
      title: record.title,
      artist: record.artist,
      album: record.album,
      duration: record.duration,
      hasVocal: record.hasVocal,
      hasInstrumental: record.hasInstrumental,
      genre: record.genre,
      language: record.language,
      playCount: record.playCount,
      lastPlayedAt: record.lastPlayedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      lyricsFormat: record.lyricsFormat,
      videoFileName: record.videoFileName,
      vocalFileName: record.vocalFileName,
      instrumentalFileName: record.instrumentalFileName,
      lyricsFileName: record.lyricsFileName,
      videoMimeType: record.videoMimeType,
    }

    // 将ArrayBuffer转回Blob，保留MIME类型
    if (record.videoData) {
      const mimeType = record.videoMimeType || 'video/mp4'
      const blob = new Blob([record.videoData], { type: mimeType })
      song.videoFile = blob as any
    }
    if (record.vocalData) {
      const blob = new Blob([record.vocalData])
      song.vocalFile = blob as any
    }
    if (record.instrumentalData) {
      const blob = new Blob([record.instrumentalData])
      song.instrumentalFile = blob as any
    }
    if (record.lyricsData) {
      const blob = new Blob([record.lyricsData])
      song.lyricsFile = blob as any
    }

    return song
  })
}

export async function getSong(id: string): Promise<Song | undefined> {
  const db = await getDB()
  const record = await db.get('songs', id)
  if (!record) return undefined

  const song: Song = {
    id: record.id,
    title: record.title,
    artist: record.artist,
    album: record.album,
    duration: record.duration,
    hasVocal: record.hasVocal,
    hasInstrumental: record.hasInstrumental,
    genre: record.genre,
    language: record.language,
    playCount: record.playCount,
    lastPlayedAt: record.lastPlayedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lyricsFormat: record.lyricsFormat,
  }

  if (record.videoData) {
    const blob = new Blob([record.videoData])
    song.videoFile = blob as any
  }
  if (record.lyricsData) {
    const blob = new Blob([record.lyricsData])
    song.lyricsFile = blob as any
  }

  return song
}

export async function addSong(song: Song): Promise<string> {
  const db = await getDB()

  const record: SongRecord = {
    id: song.id,
    title: song.title,
    artist: song.artist,
    album: song.album,
    duration: song.duration,
    hasVocal: song.hasVocal,
    hasInstrumental: song.hasInstrumental,
    genre: song.genre,
    language: song.language,
    playCount: song.playCount,
    lastPlayedAt: song.lastPlayedAt,
    createdAt: song.createdAt,
    updatedAt: song.updatedAt,
    lyricsFormat: song.lyricsFormat,
    videoFileName: song.videoFileName,
    vocalFileName: song.vocalFileName,
    instrumentalFileName: song.instrumentalFileName,
    lyricsFileName: song.lyricsFileName,
    videoMimeType: song.videoMimeType,
  }

  // 将File转换为ArrayBuffer存储，并保存文件名和MIME类型
  if (song.videoFile) {
    record.videoData = await fileToArrayBuffer(song.videoFile)
    if (song.videoFile instanceof File) {
      record.videoFileName = song.videoFile.name
      record.videoMimeType = song.videoFile.type || 'video/mp4'
    }
  }
  if (song.vocalFile) {
    record.vocalData = await fileToArrayBuffer(song.vocalFile)
    if (song.vocalFile instanceof File) {
      record.vocalFileName = song.vocalFile.name
    }
  }
  if (song.instrumentalFile) {
    record.instrumentalData = await fileToArrayBuffer(song.instrumentalFile)
    if (song.instrumentalFile instanceof File) {
      record.instrumentalFileName = song.instrumentalFile.name
    }
  }
  if (song.lyricsFile) {
    record.lyricsData = await fileToArrayBuffer(song.lyricsFile)
    if (song.lyricsFile instanceof File) {
      record.lyricsFileName = song.lyricsFile.name
    }
  }

  await db.put('songs', record)
  return song.id
}

export async function updateSong(id: string, updates: Partial<Song>): Promise<void> {
  const db = await getDB()
  const record = await db.get('songs', id)
  if (!record) return

  // 更新基本字段
  if (updates.title !== undefined) record.title = updates.title
  if (updates.artist !== undefined) record.artist = updates.artist
  if (updates.album !== undefined) record.album = updates.album
  if (updates.duration !== undefined) record.duration = updates.duration
  if (updates.genre !== undefined) record.genre = updates.genre
  if (updates.language !== undefined) record.language = updates.language
  if (updates.playCount !== undefined) record.playCount = updates.playCount
  if (updates.lastPlayedAt !== undefined) record.lastPlayedAt = updates.lastPlayedAt
  if (updates.lyricsFormat !== undefined) record.lyricsFormat = updates.lyricsFormat

  // 更新文件数据
  if (updates.videoFile) {
    record.videoData = await fileToArrayBuffer(updates.videoFile)
  }
  if (updates.lyricsFile) {
    record.lyricsData = await fileToArrayBuffer(updates.lyricsFile)
  }

  record.updatedAt = Date.now()
  await db.put('songs', record)
}

export async function deleteSong(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('songs', id)
}

// Queue operations
export async function getQueue(): Promise<QueueItem[]> {
  const db = await getDB()
  const items = await db.getAllFromIndex('queue', 'by-position')
  return items
}

export async function addToQueue(item: QueueItem): Promise<string> {
  const db = await getDB()
  await db.put('queue', item)
  return item.id
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('queue', id)
}

export async function clearQueue(): Promise<void> {
  const db = await getDB()
  await db.clear('queue')
}

// Playlist operations
export async function getAllPlaylists(): Promise<Playlist[]> {
  const db = await getDB()
  const playlists = await db.getAll('playlists')
  return playlists.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getPlaylist(id: string): Promise<Playlist | undefined> {
  const db = await getDB()
  return db.get('playlists', id)
}

export async function createPlaylist(name: string, description?: string): Promise<string> {
  const db = await getDB()
  const id = crypto.randomUUID()
  const playlist: Playlist = {
    id,
    name,
    description,
    songCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  await db.put('playlists', playlist)
  return id
}

export async function updatePlaylist(id: string, name: string, description?: string): Promise<void> {
  const db = await getDB()
  const playlist = await db.get('playlists', id)
  if (playlist) {
    playlist.name = name
    playlist.description = description
    playlist.updatedAt = Date.now()
    await db.put('playlists', playlist)
  }
}

export async function deletePlaylist(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('playlists', id)
  const songs = await db.getAllFromIndex('playlistSongs', 'by-playlist', id)
  for (const song of songs) {
    await db.delete('playlistSongs', song.id)
  }
}

export async function getPlaylistSongs(playlistId: string): Promise<PlaylistSong[]> {
  const db = await getDB()
  const songs = await db.getAllFromIndex('playlistSongs', 'by-playlist', playlistId)
  return songs.sort((a, b) => a.position - b.position)
}

export async function addSongsToPlaylist(playlistId: string, songIds: string[]): Promise<void> {
  const db = await getDB()
  const existingSongs = await db.getAllFromIndex('playlistSongs', 'by-playlist', playlistId)
  let position = existingSongs.length

  for (const songId of songIds) {
    const song = await db.get('songs', songId)
    if (!song) continue

    const id = crypto.randomUUID()
    const playlistSong: PlaylistSong = {
      id,
      playlistId,
      songId,
      position,
      title: song.title,
      artist: song.artist,
      duration: song.duration,
      addedAt: Date.now(),
    }

    await db.put('playlistSongs', playlistSong)
    position++
  }

  const playlist = await db.get('playlists', playlistId)
  if (playlist) {
    playlist.songCount = position
    playlist.updatedAt = Date.now()
    await db.put('playlists', playlist)
  }
}

export async function removeSongFromPlaylist(playlistId: string, songId: string): Promise<void> {
  const db = await getDB()
  const songs = await db.getAllFromIndex('playlistSongs', 'by-playlist', playlistId)
  const songToRemove = songs.find(s => s.songId === songId)
  if (!songToRemove) return

  await db.delete('playlistSongs', songToRemove.id)

  for (const song of songs) {
    if (song.position > songToRemove.position) {
      song.position--
      await db.put('playlistSongs', song)
    }
  }

  const playlist = await db.get('playlists', playlistId)
  if (playlist) {
    playlist.songCount = Math.max(0, playlist.songCount - 1)
    playlist.updatedAt = Date.now()
    await db.put('playlists', playlist)
  }
}

export async function clearPlaylist(playlistId: string): Promise<void> {
  const db = await getDB()
  const songs = await db.getAllFromIndex('playlistSongs', 'by-playlist', playlistId)
  for (const song of songs) {
    await db.delete('playlistSongs', song.id)
  }

  const playlist = await db.get('playlists', playlistId)
  if (playlist) {
    playlist.songCount = 0
    playlist.updatedAt = Date.now()
    await db.put('playlists', playlist)
  }
}

// Settings operations
export async function getSettings(): Promise<Settings | undefined> {
  const db = await getDB()
  return db.get('settings', 'main')
}

export async function saveSettings(settings: Settings): Promise<void> {
  const db = await getDB()
  await db.put('settings', settings, 'main')
}

// Atmosphere Sound operations (音效)
export async function getAllAtmosphereSounds(): Promise<AtmosphereSound[]> {
  const db = await getDB()
  const records = await db.getAll('atmosphereSounds')

  return records.map(record => {
    const sound: AtmosphereSound = {
      id: record.id,
      name: record.name,
      fileName: record.fileName,
      volume: record.volume,
      isOneShot: record.isOneShot,
      color: record.color,
      createdAt: record.createdAt,
    }

    if (record.audioData) {
      sound.file = new Blob([record.audioData], { type: 'audio/mpeg' })
    }

    return sound
  })
}

export async function addAtmosphereSound(sound: AtmosphereSound): Promise<string> {
  try {
    const db = await getDB()
    console.log('DB obtained, adding atmosphere sound')

    const record: AtmosphereSoundRecord = {
      id: sound.id,
      name: sound.name,
      fileName: sound.fileName || '',
      volume: sound.volume,
      isOneShot: sound.isOneShot,
      color: sound.color,
      createdAt: sound.createdAt,
      audioData: new ArrayBuffer(0),
    }

    if (sound.file) {
      record.audioData = await fileToArrayBuffer(sound.file)
      if (sound.file instanceof File) {
        record.fileName = sound.file.name
      }
    }

    console.log('Putting record to DB:', record.id)
    await db.put('atmosphereSounds', record)
    console.log('Record saved successfully')
    return sound.id
  } catch (error) {
    console.error('Database error in addAtmosphereSound:', error)
    throw error
  }
}

export async function deleteAtmosphereSound(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('atmosphereSounds', id)
}

// Interlude Track operations (过场音乐)
export async function getAllInterludeTracks(): Promise<InterludeTrack[]> {
  const db = await getDB()
  const records = await db.getAll('interludeTracks')

  return records.map(record => {
    const track: InterludeTrack = {
      id: record.id,
      title: record.title,
      fileName: record.fileName,
      volume: record.volume,
      isActive: record.isActive,
      createdAt: record.createdAt,
    }

    if (record.audioData) {
      track.file = new Blob([record.audioData], { type: 'audio/mpeg' })
    }

    return track
  })
}

export async function addInterludeTrack(track: InterludeTrack): Promise<string> {
  const db = await getDB()

  const record: InterludeTrackRecord = {
    id: track.id,
    title: track.title,
    fileName: track.fileName || '',
    volume: track.volume,
    isActive: track.isActive,
    createdAt: track.createdAt,
    audioData: new ArrayBuffer(0),
  }

  if (track.file) {
    record.audioData = await fileToArrayBuffer(track.file)
    if (track.file instanceof File) {
      record.fileName = track.file.name
    }
  }

  await db.put('interludeTracks', record)
  return track.id
}

export async function deleteInterludeTrack(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('interludeTracks', id)
}

export async function updateInterludeTrack(id: string, updates: Partial<InterludeTrack>): Promise<void> {
  const db = await getDB()
  const record = await db.get('interludeTracks', id)
  if (!record) return

  if (updates.title !== undefined) record.title = updates.title
  if (updates.volume !== undefined) record.volume = updates.volume
  if (updates.isActive !== undefined) record.isActive = updates.isActive

  await db.put('interludeTracks', record)
}
