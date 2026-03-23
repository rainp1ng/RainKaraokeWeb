import { useEffect, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, Mic, MicOff, Maximize, PictureInPicture, ChevronUp, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePlayerStore } from '../../stores/playerStore'
import { useQueueStore } from '../../stores/queueStore'
import { formatTime } from '../../utils/formatTime'

/**
 * 播放器控制栏组件
 * 只显示控制界面，video 元素由 GlobalPlayer 管理
 * 支持折叠/展开
 */
export default function PlayerBar() {
  const navigate = useNavigate()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const {
    playbackState,
    toggleVocal,
    setPitch,
    setSpeed,
    seek,
    play,
    pause
  } = usePlayerStore()

  const { playNext, playPrevious } = useQueueStore()

  const { currentSong, status, currentPosition, duration, isVocal, pitch, speed } = playbackState

  // 控制播放速度
  useEffect(() => {
    const video = usePlayerStore.getState().videoElement
    if (video) {
      video.playbackRate = speed
    }
  }, [speed])

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
    navigate('/player')
  }

  const handlePiP = async () => {
    const video = usePlayerStore.getState().videoElement
    if (!video) return

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else {
        await video.requestPictureInPicture()
      }
    } catch (err) {
      console.error('PiP error:', err)
    }
  }

  if (!currentSong) {
    return (
      <div className="fixed bottom-14 md:bottom-16 left-0 right-0 bg-surface/95 backdrop-blur border-t border-white/10 p-3">
        <p className="text-center text-white/40 text-sm">选择歌曲开始播放</p>
      </div>
    )
  }

  return (
    <div className={`fixed bottom-14 md:bottom-16 left-0 right-0 bg-surface/95 backdrop-blur border-t border-white/10 z-40 transition-[max-height] duration-300 overflow-hidden ${
      isCollapsed ? 'max-h-12' : 'max-h-80'
    }`}>
      {/* 折叠/展开按钮 */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-4 bg-surface rounded-t-lg flex items-center justify-center border border-white/10 border-b-0 hover:bg-white/10 transition-colors"
      >
        {isCollapsed ? (
          <ChevronUp className="w-3 h-3 text-white/60" />
        ) : (
          <ChevronDown className="w-3 h-3 text-white/60" />
        )}
      </button>

      {isCollapsed ? (
        /* 折叠状态 - 只显示歌曲名和控制按钮 */
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate text-sm">{currentSong.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              className="p-1.5 text-white/60 hover:text-white transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={handlePlayPause}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
            >
              {status === 'playing' ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 text-white/60 hover:text-white transition-colors"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* 展开状态 - 完整控制 */
        <div className="p-3 md:p-4">
          {/* Song info */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{currentSong.title}</h3>
              <p className="text-sm text-white/60 truncate">{currentSong.artist || '未知歌手'}</p>
            </div>

            {/* Vocal toggle */}
            <button
              onClick={toggleVocal}
              className={`p-2 rounded-lg transition-colors ${
                isVocal ? 'bg-primary text-white' : 'bg-white/10 text-white/60'
              }`}
              title={isVocal ? '切换到伴奏' : '切换到原唱'}
            >
              {isVocal ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            {/* PiP */}
            <button
              onClick={handlePiP}
              className="p-2 text-white/60 hover:text-white transition-colors"
              title="画中画"
            >
              <PictureInPicture className="w-4 h-4" />
            </button>

            {/* Fullscreen / Open Player */}
            <button
              onClick={handleFullscreen}
              className="p-2 text-white/60 hover:text-white transition-colors"
              title="打开播放器"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>

          {/* Progress bar */}
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

          {/* Controls */}
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

          {/* Pitch/Speed controls */}
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
      )}
    </div>
  )
}
