// 歌曲类型
export interface Song {
  id: string
  title: string
  artist?: string
  album?: string
  duration?: number

  // 文件引用 (File或Blob)
  videoFile?: File | Blob
  vocalFile?: File | Blob
  instrumentalFile?: File | Blob
  lyricsFile?: File | Blob

  // 文件名（用于判断文件类型）
  videoFileName?: string
  vocalFileName?: string
  instrumentalFileName?: string
  lyricsFileName?: string

  // 文件MIME类型
  videoMimeType?: string

  // 元数据
  lyricsFormat?: LyricsFormat
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

// 歌词格式
export type LyricsFormat = 'lrc' | 'ksc' | 'txt'

// 歌词行
export interface LyricsLine {
  time: number      // 开始时间 (毫秒)
  duration: number  // 持续时间 (毫秒)
  text: string
  words?: LyricsWord[]  // KSC格式逐字
}

// 歌词单词
export interface LyricsWord {
  time: number
  duration: number
  text: string
}

// 歌词
export interface Lyrics {
  format: LyricsFormat
  lines: LyricsLine[]
}

// 播放队列项
export interface QueueItem {
  id: string
  songId: string
  position: number
  song?: Song
  addedAt: number
}

// 播放状态
export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'ended'

// 播放状态数据
export interface PlaybackState {
  status: PlaybackStatus
  currentSong: Song | null
  currentPosition: number
  duration: number
  isVocal: boolean
  pitch: number
  speed: number
  volume: number
}

// 歌单
export interface Playlist {
  id: string
  name: string
  description?: string
  songCount: number
  createdAt: number
  updatedAt: number
}

// 歌单歌曲项
export interface PlaylistSong {
  id: string
  playlistId: string
  songId: string
  position: number
  title?: string
  artist?: string
  duration?: number
  addedAt: number
}

// 气氛组音效
export interface AtmosphereSound {
  id: string
  name: string
  file?: File | Blob
  fileName?: string
  volume: number
  isOneShot: boolean
  color: string
  createdAt: number
  audioElement?: HTMLAudioElement
  // MIDI配置
  midiMessageType?: 'NOTE' | 'CC' | 'PC'
  midiNote?: number
  midiChannel?: number
}

// 过场音乐
export interface InterludeTrack {
  id: string
  title: string
  file?: File | Blob
  fileName?: string
  volume: number
  isActive: boolean
  createdAt: number
}

// 效果器类型
export type EffectType = 'reverb' | 'chorus' | 'eq' | 'compressor' | 'delay'

// 效果器槽位
export interface EffectSlot {
  type: EffectType
  enabled: boolean
  params: Record<string, number>
}

// 设置
export interface Settings {
  interludeEnabled: boolean
  interludeVolume: number
  duckingEnabled: boolean
  autoPlayNext: boolean
  lyricsFontSize: number
  theme: 'dark' | 'light'
}
