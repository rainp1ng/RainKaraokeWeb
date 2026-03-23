import { useEffect, useRef, useState, useMemo } from 'react'
import {
  Play, Pause, SkipBack, SkipForward,
  Mic, MicOff, Maximize, PictureInPicture,
  List
} from 'lucide-react'
import { usePlayerStore } from '../stores/playerStore'
import { useQueueStore } from '../stores/queueStore'
import LyricsDisplay from '../components/Player/LyricsDisplay'
import { formatTime } from '../utils/formatTime'
import type { Song } from '../types'

/**
 * 检查文件是否为纯音频格式
 */
function isAudioOnly(song: Song): boolean {
  // 如果没有视频文件，视为音频
  if (!song.videoFile && !song.videoFileName) return true

  // 检查存储的MIME类型
  if (song.videoMimeType) {
    if (song.videoMimeType.startsWith('audio/')) return true
    if (song.videoMimeType.startsWith('video/')) return false
  }

  // 检查Blob的type
  if (song.videoFile && song.videoFile.type) {
    if (song.videoFile.type.startsWith('audio/')) return true
    if (song.videoFile.type.startsWith('video/')) return false
  }

  // 检查文件名扩展
  const fileName = song.videoFileName || (song.videoFile instanceof File ? song.videoFile.name : null)
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase()
    const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'ape']
    if (ext && audioExts.includes(ext)) return true
  }

  // 默认视为视频
  return false
}

/**
 * 播放器页面
 * 显示视频画面、歌词和控制界面
 * video 元素由 GlobalPlayer 管理
 */
export default function PlayerPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)

  const {
    playbackState,
    videoElement,
    toggleVocal,
    setPitch,
    setSpeed,
    seek,
    play,
    pause
  } = usePlayerStore()

  const { items, currentIndex, playNext, playPrevious, playAtIndex, removeFromQueue } = useQueueStore()

  const [showQueue, setShowQueue] = useState(false)

  const { currentSong, status, currentPosition, duration, isVocal, pitch, speed } = playbackState

  // 检测是否为纯音频文件
  const isAudioOnlyFile = useMemo(() => {
    return currentSong ? isAudioOnly(currentSong) : false
  }, [currentSong])

  // 将全局 video 元素移动到当前容器的显示区域（仅视频文件）
  useEffect(() => {
    if (isAudioOnlyFile || !videoElement || !videoContainerRef.current) return

    // 将 video 元素移动到可见容器
    videoElement.classList.remove('hidden')
    videoElement.className = 'w-full h-full object-contain bg-black'
    videoContainerRef.current.appendChild(videoElement)

    return () => {
      // 组件卸载时，把 video 元素移回 body 继续播放
      if (videoElement.parentNode && document.body) {
        videoElement.classList.add('hidden')
        document.body.appendChild(videoElement)
      }
    }
  }, [videoElement, isAudioOnlyFile])

  const handlePlayPause = () => {
    if (status === 'playing') {
      pause()
    } else {
      play()
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    seek(time)
  }

  const handleNext = () => {
    playNext()
  }

  const handlePrevious = () => {
    if (currentPosition > 3) {
      seek(0)
    } else {
      playPrevious()
    }
  }

  const handleFullscreen = async () => {
    const container = containerRef.current
    if (!container) return

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await container.requestFullscreen()
      }
    } catch (err) {
      console.error('Fullscreen error:', err)
    }
  }

  const handlePiP = async () => {
    if (!videoElement) return

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else {
        await videoElement.requestPictureInPicture()
      }
    } catch (err) {
      console.error('PiP error:', err)
    }
  }

  if (!currentSong) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-white/40">
        <div className="text-center">
          <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">暂无播放中的歌曲</p>
          <p className="text-sm mt-1">从媒体库选择歌曲开始播放</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="fixed inset-0 flex flex-col bg-background z-30">
      {/* 主内容区域 */}
      {isAudioOnlyFile ? (
        // 纯音频文件：只显示歌词
        <div className="flex-1 overflow-hidden">
          <LyricsDisplay song={currentSong} currentTime={currentPosition} />
        </div>
      ) : (
        // 视频文件：只显示视频
        <div className="flex-1 relative">
          <div
            ref={videoContainerRef}
            className="w-full h-full bg-black flex items-center justify-center"
          >
            {!videoElement && (
              <div className="text-white/40">加载视频中...</div>
            )}
          </div>

          {/* 视频控制覆盖层 */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30 pointer-events-none">
            <div className="pointer-events-auto">
              <button
                onClick={handlePlayPause}
                className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
              >
                {status === 'playing' ? (
                  <Pause className="w-8 h-8 text-white" />
                ) : (
                  <Play className="w-8 h-8 text-white ml-1" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部控制栏 */}
      <div className="bg-surface/95 backdrop-blur border-t border-white/10 p-3 md:p-4">
        {/* 歌曲信息 */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{currentSong.title}</h3>
            <p className="text-sm text-white/60 truncate">{currentSong.artist || '未知歌手'}</p>
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center gap-2">
            {/* 队列 */}
            <button
              onClick={() => setShowQueue(!showQueue)}
              className={`p-2 rounded-lg transition-colors ${
                showQueue ? 'bg-primary text-white' : 'bg-white/10 text-white/60'
              }`}
              title="播放队列"
            >
              <List className="w-4 h-4" />
            </button>

            {/* 原唱/伴奏切换 */}
            <button
              onClick={toggleVocal}
              className={`p-2 rounded-lg transition-colors ${
                isVocal ? 'bg-primary text-white' : 'bg-white/10 text-white/60'
              }`}
              title={isVocal ? '切换到伴奏' : '切换到原唱'}
            >
              {isVocal ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            {/* 画中画 */}
            <button
              onClick={handlePiP}
              className="p-2 text-white/60 hover:text-white transition-colors"
              title="画中画"
            >
              <PictureInPicture className="w-4 h-4" />
            </button>

            {/* 全屏 */}
            <button
              onClick={handleFullscreen}
              className="p-2 text-white/60 hover:text-white transition-colors"
              title="全屏"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 进度条 */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-white/60 w-10 text-right">
            {formatTime(currentPosition)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentPosition}
            onChange={handleSeek}
            className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:bg-primary
              [&::-webkit-slider-thumb]:rounded-full"
          />
          <span className="text-xs text-white/60 w-10">
            {formatTime(duration)}
          </span>
        </div>

        {/* 播放控制 */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handlePrevious}
            className="p-2 text-white/60 hover:text-white transition-colors"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={handlePlayPause}
            className="w-12 h-12 rounded-full bg-primary flex items-center justify-center hover:bg-primary-dark transition-colors"
          >
            {status === 'playing' ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-0.5" />
            )}
          </button>

          <button
            onClick={handleNext}
            className="p-2 text-white/60 hover:text-white transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* 音调/速度控制 */}
        <div className="flex justify-center gap-4 mt-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPitch(pitch - 1)}
              className="w-6 h-6 rounded bg-white/10 text-sm hover:bg-white/20"
            >
              -
            </button>
            <span className="text-xs w-12 text-center">音调 {pitch}</span>
            <button
              onClick={() => setPitch(pitch + 1)}
              className="w-6 h-6 rounded bg-white/10 text-sm hover:bg-white/20"
            >
              +
            </button>
          </div>

          <select
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="bg-white/10 text-xs rounded px-2 py-1"
          >
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1">1.0x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2.0x</option>
          </select>
        </div>
      </div>

      {/* 队列侧边栏 */}
      {showQueue && (
        <div className="fixed inset-y-0 right-0 w-80 bg-surface border-l border-white/10 z-50 flex flex-col">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">播放队列</h3>
              <button
                onClick={() => setShowQueue(false)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-white/60 mt-1">{items.length} 首歌曲</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 border-b border-white/5 cursor-pointer hover:bg-white/5 ${
                  index === currentIndex ? 'bg-primary/20' : ''
                }`}
                onClick={() => playAtIndex(index)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.song?.title}</p>
                  <p className="text-sm text-white/60 truncate">{item.song?.artist || '未知歌手'}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFromQueue(item.id)
                  }}
                  className="text-white/40 hover:text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
