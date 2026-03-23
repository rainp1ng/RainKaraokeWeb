import { useEffect, useCallback, useRef } from 'react'
import { usePlayerStore } from '../stores/playerStore'
import { useQueueStore } from '../stores/queueStore'
import { useInterludeStore } from '../stores/interludeStore'
import { useAtmosphereStore } from '../stores/atmosphereStore'
import { useMidiStore } from '../stores/midiStore'

// 检测是否是iPad/iPhone
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

interface ShortcutConfig {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
  description: string
  id: string  // 用于MIDI映射
}

// 默认键盘快捷键配置
const DEFAULT_KEYBOARD_CONFIG: Record<string, string> = {
  playPause: 'Space',
  nextSong: 'KeyC',
  prevSong: 'KeyV',
  seekForward: 'ArrowRight',
  seekBackward: 'ArrowLeft',
  toggleVocal: 'KeyX',
  stop: 'KeyQ',
}

/**
 * 键盘快捷键和MIDI控制Hook
 */
export function useKeyboardShortcuts() {
  const {
    playbackState,
    toggleVocal,
    setVolume
  } = usePlayerStore()
  const { playNext, playPrevious } = useQueueStore()
  const { stop: stopInterlude, isPlaying: interludeIsPlaying } = useInterludeStore()
  const { stopAllSounds } = useAtmosphereStore()
  const { init: initMidi } = useMidiStore()

  const { status, currentPosition, duration, volume } = playbackState

  // 使用 ref 存储最新的状态，避免回调过期
  const statusRef = useRef(status)
  const currentPositionRef = useRef(currentPosition)
  const durationRef = useRef(duration)
  const volumeRef = useRef(volume)
  const interludeIsPlayingRef = useRef(interludeIsPlaying)

  useEffect(() => {
    statusRef.current = status
    currentPositionRef.current = currentPosition
    durationRef.current = duration
    volumeRef.current = volume
    interludeIsPlayingRef.current = interludeIsPlaying
  }, [status, currentPosition, duration, volume, interludeIsPlaying])

  // 初始化MIDI
  useEffect(() => {
    initMidi()
  }, [initMidi])

  // 播放/暂停（过场音乐由 GlobalPlayer 自动管理）
  const handlePlayPause = useCallback(() => {
    // 直接从 store 获取最新状态
    const playerStore = usePlayerStore.getState()
    const currentStatus = playerStore.playbackState.status

    // 只有当有歌曲加载时才控制播放
    if (currentStatus === 'playing') {
      playerStore.pause()
      // 过场音乐会由 GlobalPlayer 的 pause 事件自动播放
    } else if (currentStatus === 'paused') {
      playerStore.play()
      // 过场音乐会由 GlobalPlayer 的 play 事件自动暂停
    }
    // 如果 status 是 'idle' 或 'ended'，不做任何操作
  }, [])

  // 停止
  const handleStop = useCallback(() => {
    const playerStore = usePlayerStore.getState()
    playerStore.pause()
    playerStore.seek(0)
    stopInterlude()
  }, [stopInterlude])

  // 快进
  const handleSeekForward = useCallback(() => {
    const newPosition = Math.min(durationRef.current, currentPositionRef.current + 10)
    usePlayerStore.getState().seek(newPosition)
  }, [])

  // 快退
  const handleSeekBackward = useCallback(() => {
    const newPosition = Math.max(0, currentPositionRef.current - 10)
    usePlayerStore.getState().seek(newPosition)
  }, [])

  // 下一首
  const handleNext = useCallback(() => {
    playNext()
  }, [playNext])

  // 上一首
  const handlePrevious = useCallback(() => {
    if (currentPositionRef.current > 3) {
      usePlayerStore.getState().seek(0)
    } else {
      playPrevious()
    }
  }, [playPrevious])

  // 静音切换
  const handleMuteToggle = useCallback(() => {
    setVolume(volumeRef.current > 0 ? 0 : 0.8)
  }, [setVolume])

  // 原唱/伴奏切换
  const handleVocalToggle = useCallback(() => {
    toggleVocal()
  }, [toggleVocal])

  // 停止所有音效
  const handleStopAllSounds = useCallback(() => {
    stopAllSounds()
  }, [stopAllSounds])

  // 过场音乐播放/暂停
  const handleInterludePlayPause = useCallback(() => {
    // 当歌曲正在播放时，不允许播放过场音乐
    const playerState = usePlayerStore.getState()
    if (playerState.playbackState.status === 'playing') {
      return
    }

    // 直接从 store 获取最新状态和方法
    const store = useInterludeStore.getState()
    if (!store.currentTrack) return

    if (store.isPlaying) {
      store.pause()
    } else {
      store.play()
    }
  }, [])

  // 快捷键配置（包含ID用于MIDI映射）
  const shortcuts: ShortcutConfig[] = [
    { id: 'playPause', key: DEFAULT_KEYBOARD_CONFIG.playPause, action: handlePlayPause, description: '播放/暂停' },
    { id: 'nextSong', key: DEFAULT_KEYBOARD_CONFIG.nextSong, action: handleNext, description: '下一首' },
    { id: 'prevSong', key: DEFAULT_KEYBOARD_CONFIG.prevSong, action: handlePrevious, description: '上一首' },
    { id: 'seekForward', key: DEFAULT_KEYBOARD_CONFIG.seekForward, action: handleSeekForward, description: '快进10秒' },
    { id: 'seekBackward', key: DEFAULT_KEYBOARD_CONFIG.seekBackward, action: handleSeekBackward, description: '快退10秒' },
    { id: 'toggleVocal', key: DEFAULT_KEYBOARD_CONFIG.toggleVocal, action: handleVocalToggle, description: '原唱/伴奏切换' },
    { id: 'stop', key: DEFAULT_KEYBOARD_CONFIG.stop, action: handleStop, description: '停止' },
  ]

  // 键盘事件监听（仅非iOS设备）
  useEffect(() => {
    if (isIOS()) {
      console.log('iOS device detected, keyboard shortcuts disabled')
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const shortcut = shortcuts.find(s => {
        const keyMatch = e.code === s.key
        const ctrlMatch = s.ctrl ? e.ctrlKey : !e.ctrlKey
        const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey
        const altMatch = s.alt ? e.altKey : !e.altKey
        return keyMatch && ctrlMatch && shiftMatch && altMatch
      })

      if (shortcut) {
        e.preventDefault()
        shortcut.action()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])

  // 全局MIDI事件监听
  useEffect(() => {
    const handleMidiAction = (e: Event) => {
      const actionId = (e as CustomEvent).detail
      console.log('MIDI action received:', actionId)

      switch (actionId) {
        case 'playPause':
          handlePlayPause()
          break
        case 'nextSong':
          handleNext()
          break
        case 'prevSong':
          handlePrevious()
          break
        case 'seekForward':
          handleSeekForward()
          break
        case 'seekBackward':
          handleSeekBackward()
          break
        case 'toggleVocal':
          handleVocalToggle()
          break
        case 'stop':
          handleStop()
          break
        case 'stopAllSounds':
          handleStopAllSounds()
          break
        case 'interludePlayPause':
          handleInterludePlayPause()
          break
      }
    }

    window.addEventListener('midi:action', handleMidiAction)
    return () => window.removeEventListener('midi:action', handleMidiAction)
  }, [handlePlayPause, handleNext, handlePrevious, handleSeekForward, handleSeekBackward, handleVocalToggle, handleStop, handleStopAllSounds, handleInterludePlayPause])

  // 全局MIDI音效事件监听
  useEffect(() => {
    const handleMidiSound = (e: Event) => {
      const soundId = (e as CustomEvent).detail
      useAtmosphereStore.getState().playSound(soundId)
    }

    window.addEventListener('midi:sound', handleMidiSound)
    return () => window.removeEventListener('midi:sound', handleMidiSound)
  }, [])

  return {
    shortcuts,
    isIOS: isIOS(),
    handlePlayPause,
    handleSeekForward,
    handleSeekBackward,
    handleNext,
    handlePrevious,
    handleMuteToggle,
    handleVocalToggle,
    handleStop,
    handleStopAllSounds,
    handleInterludePlayPause,
  }
}

/**
 * 快捷键帮助列表
 */
export const SHORTCUT_HELP = [
  { key: 'Space', description: '播放/暂停' },
  { key: '←', description: '快退10秒' },
  { key: '→', description: '快进10秒' },
  { key: '↑', description: '上一首/重播' },
  { key: '↓', description: '下一首' },
  { key: 'C', description: '下一首' },
  { key: 'V', description: '上一首' },
  { key: 'X', description: '原唱/伴奏切换' },
  { key: 'Q', description: '停止' },
]
