import { useEffect, useRef } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { useQueueStore } from '../../stores/queueStore'
import { useInterludeStore } from '../../stores/interludeStore'
import { getPitchProcessor } from '../../utils/pitchShifter'

/**
 * 全局播放器组件
 * 管理唯一的 video 元素，确保不会有重复播放
 * 支持过场音乐自动播放和pitch shift
 */
export default function GlobalPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const blobUrlRef = useRef<string | null>(null)
  const pitchConnectedRef = useRef(false)
  const currentSongIdRef = useRef<string | null>(null)

  const {
    playbackState,
    setVideoElement,
    setPlaybackStatus,
  } = usePlayerStore()

  const { playNext } = useQueueStore()

  const { currentSong, pitch } = playbackState

  // 创建 Blob URL
  useEffect(() => {
    if (currentSong?.videoFile) {
      const file = currentSong.videoFile

      // 如果是同一首歌，不需要重新创建Blob URL
      if (currentSongIdRef.current === currentSong.id && blobUrlRef.current) {
        return
      }

      // 清理旧的 Blob URL
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
      }

      // 创建新的 Blob URL，保留MIME类型
      const mimeType = currentSong.videoMimeType || (file instanceof File ? file.type : undefined) || 'video/mp4'
      const blob = file instanceof Blob ? file : new Blob([file], { type: mimeType })
      const url = URL.createObjectURL(blob)

      blobUrlRef.current = url
      currentSongIdRef.current = currentSong.id

      console.log('Created blob URL for song:', currentSong.title, 'MIME:', mimeType)

      return () => {
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current)
          blobUrlRef.current = null
        }
      }
    }
  }, [currentSong?.videoFile, currentSong?.videoMimeType, currentSong?.id])

  // 初始化 video 元素（只执行一次）
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // 将 video 元素存储到 store
    setVideoElement(video)

    const handleTimeUpdate = () => {
      usePlayerStore.getState().setCurrentPosition(video.currentTime)
    }

    const handleLoadedMetadata = () => {
      usePlayerStore.getState().setDuration(video.duration)
      console.log('Media loaded, duration:', video.duration)
    }

    const handleCanPlay = () => {
      console.log('Media can play')
    }

    const handleEnded = () => {
      const { currentTrack } = useInterludeStore.getState()
      // 歌曲结束时播放过场音乐
      if (currentTrack) {
        useInterludeStore.getState().play()
      }

      // 播放下一首
      const { queue, currentIndex } = useQueueStore.getState()
      if (queue.length > currentIndex + 1) {
        playNext()
        // 开始播放新歌曲时暂停过场音乐
        setTimeout(() => useInterludeStore.getState().pause(), 100)
      } else {
        setPlaybackStatus('ended')
      }
    }

    const handleError = (e: Event) => {
      const error = (e.target as HTMLVideoElement).error
      console.error('Media error:', error)
      if (error) {
        console.error('Error code:', error.code, 'Message:', error.message)
        // 错误代码说明:
        // 1 = MEDIA_ERR_ABORTED - 用户中止
        // 2 = MEDIA_ERR_NETWORK - 网络错误
        // 3 = MEDIA_ERR_DECODE - 解码错误
        // 4 = MEDIA_ERR_SRC_NOT_SUPPORTED - 不支持的格式
      }
    }

    const handlePlay = () => {
      // 播放时暂停过场音乐
      useInterludeStore.getState().pause()
    }

    const handlePause = () => {
      // 暂停时播放过场音乐
      const { currentTrack } = useInterludeStore.getState()
      if (currentTrack) {
        useInterludeStore.getState().play()
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('error', handleError)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('error', handleError)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [setVideoElement, setPlaybackStatus, playNext])

  // 初始化 pitch processor（只执行一次）
  useEffect(() => {
    const video = videoRef.current
    if (!video || pitchConnectedRef.current) return

    const pitchProcessor = getPitchProcessor()
    pitchProcessor.init().then(() => {
      try {
        pitchProcessor.connectMediaElement(video)
        pitchConnectedRef.current = true
        console.log('Pitch processor connected')
      } catch (err) {
        console.error('Failed to connect pitch processor:', err)
      }
    })

    // 不在cleanup时断开，因为我们只连接一次
  }, [])

  // 更新播放速度和pitch
  useEffect(() => {
    const pitchProcessor = getPitchProcessor()
    pitchProcessor.setSpeed(playbackState.speed)
    pitchProcessor.setPitch(pitch)
  }, [playbackState.speed, pitch])

  // 当歌曲变化时加载并播放
  useEffect(() => {
    const video = videoRef.current
    if (!video || !blobUrlRef.current) return

    console.log('Loading new media source')
    video.src = blobUrlRef.current
    video.load()

    // 尝试自动播放
    const playPromise = video.play()
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log('Auto-play started successfully')
        setPlaybackStatus('playing')
      }).catch(err => {
        console.log('Auto-play prevented:', err.name, err.message)
        setPlaybackStatus('paused')
      })
    }
  }, [blobUrlRef.current])

  return (
    <video
      ref={videoRef}
      className="hidden"
      playsInline
      preload="auto"
    />
  )
}
