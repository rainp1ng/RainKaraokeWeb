import { useEffect, useCallback, useRef } from 'react'
import { usePlayerStore } from '../stores/playerStore'
import { useQueueStore } from '../stores/queueStore'
import { useInterludeStore } from '../stores/interludeStore'
import { useAtmosphereStore } from '../stores/atmosphereStore'
import { useMidiStore, type KeyBinding } from '../stores/midiStore'

// 检测是否是iPad/iPhone
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

// 将 KeyboardEvent.code 转换为可读的显示名称
function getKeyDisplay(code: string): string {
  // 特殊键名映射
  const specialKeys: Record<string, string> = {
    'Space': 'Space',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Escape': 'Esc',
    'Enter': 'Enter',
    'Backspace': '⌫',
    'Delete': 'Del',
    'Tab': 'Tab',
    'CapsLock': 'Caps',
    'ShiftLeft': 'Shift',
    'ShiftRight': 'Shift',
    'ControlLeft': 'Ctrl',
    'ControlRight': 'Ctrl',
    'AltLeft': 'Alt',
    'AltRight': 'Alt',
    'MetaLeft': '⌘',
    'MetaRight': '⌘',
    'Digit0': '0',
    'Digit1': '1',
    'Digit2': '2',
    'Digit3': '3',
    'Digit4': '4',
    'Digit5': '5',
    'Digit6': '6',
    'Digit7': '7',
    'Digit8': '8',
    'Digit9': '9',
    'Minus': '-',
    'Equal': '=',
    'BracketLeft': '[',
    'BracketRight': ']',
    'Backslash': '\\',
    'Semicolon': ';',
    'Quote': "'",
    'Comma': ',',
    'Period': '.',
    'Slash': '/',
    'Backquote': '`',
    'Numpad0': 'Num0',
    'Numpad1': 'Num1',
    'Numpad2': 'Num2',
    'Numpad3': 'Num3',
    'Numpad4': 'Num4',
    'Numpad5': 'Num5',
    'Numpad6': 'Num6',
    'Numpad7': 'Num7',
    'Numpad8': 'Num8',
    'Numpad9': 'Num9',
    'NumpadMultiply': 'Num*',
    'NumpadAdd': 'Num+',
    'NumpadSubtract': 'Num-',
    'NumpadDecimal': 'Num.',
    'NumpadDivide': 'Num/',
    'NumpadEnter': 'NumEnter',
    'F1': 'F1',
    'F2': 'F2',
    'F3': 'F3',
    'F4': 'F4',
    'F5': 'F5',
    'F6': 'F6',
    'F7': 'F7',
    'F8': 'F8',
    'F9': 'F9',
    'F10': 'F10',
    'F11': 'F11',
    'F12': 'F12',
  }
  
  // 检查特殊键
  if (specialKeys[code]) {
    return specialKeys[code]
  }
  
  // 字母键 (KeyA -> A)
  if (code.startsWith('Key')) {
    return code.slice(3)
  }
  
  // 其他情况直接返回
  return code
}

// 将 KeyboardEvent.code 转换为可读的显示名称
const DEFAULT_KEYBOARD_CONFIG: Record<string, KeyBinding> = {
  playPause: { key: 'Space', keyDisplay: 'Space' },
  nextSong: { key: 'KeyC', keyDisplay: 'C' },
  prevSong: { key: 'KeyV', keyDisplay: 'V' },
  seekForward: { key: 'ArrowRight', keyDisplay: '→' },
  seekBackward: { key: 'ArrowLeft', keyDisplay: '←' },
  toggleVocal: { key: 'KeyX', keyDisplay: 'X' },
  stop: { key: 'KeyQ', keyDisplay: 'Q' },
  stopAllSounds: { key: 'KeyE', keyDisplay: 'E' },
  interludePlayPause: { key: 'KeyW', keyDisplay: 'W' },
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
  const { init: initMidi, learningAction, learningSoundId, learningMode, keyboardMappings, soundKeyboardMappings, setKeyboardMapping, setSoundKeyboardMapping, stopLearning } = useMidiStore()

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

  // Action handlers map
  const actionHandlers = useRef<Record<string, () => void>>({
    playPause: handlePlayPause,
    nextSong: handleNext,
    prevSong: handlePrevious,
    seekForward: handleSeekForward,
    seekBackward: handleSeekBackward,
    toggleVocal: handleVocalToggle,
    stop: handleStop,
    stopAllSounds: handleStopAllSounds,
    interludePlayPause: handleInterludePlayPause,
  })

  // 键盘学习监听器
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Esc 键取消学习模式
      if (e.code === 'Escape' && (learningAction || learningSoundId)) {
        e.preventDefault()
        stopLearning()
        return
      }

      // 如果处于键盘学习模式
      if ((learningAction || learningSoundId) && (learningMode === 'keyboard' || learningMode === 'both')) {
        e.preventDefault()
        
        const binding: KeyBinding = {
          key: e.code,
          keyDisplay: getKeyDisplay(e.code),
          ctrl: e.ctrlKey || undefined,
          shift: e.shiftKey || undefined,
          alt: e.altKey || undefined,
        }

        if (learningAction) {
          setKeyboardMapping(learningAction, binding)
          if (learningMode !== 'both') {
            stopLearning()
          }
        } else if (learningSoundId) {
          setSoundKeyboardMapping(learningSoundId, binding)
          if (learningMode !== 'both') {
            stopLearning()
          }
        }
        return
      }

      // 正常快捷键处理
      // 首先检查自定义映射
      const customBinding = Object.entries(keyboardMappings).find(([, binding]) => {
        const keyMatch = e.code === binding.key
        const ctrlMatch = binding.ctrl ? e.ctrlKey : !e.ctrlKey
        const shiftMatch = binding.shift ? e.shiftKey : !e.shiftKey
        const altMatch = binding.alt ? e.altKey : !e.altKey
        return keyMatch && ctrlMatch && shiftMatch && altMatch
      })

      if (customBinding) {
        const actionId = customBinding[0]
        const handler = actionHandlers.current[actionId]
        if (handler) {
          e.preventDefault()
          handler()
        }
        return
      }

      // 检查默认快捷键
      const defaultBinding = Object.entries(DEFAULT_KEYBOARD_CONFIG).find(([, binding]) => {
        const keyMatch = e.code === binding.key
        const ctrlMatch = binding.ctrl ? e.ctrlKey : !e.ctrlKey
        const shiftMatch = binding.shift ? e.shiftKey : !e.shiftKey
        const altMatch = binding.alt ? e.altKey : !e.altKey
        return keyMatch && ctrlMatch && shiftMatch && altMatch
      })

      if (defaultBinding) {
        const actionId = defaultBinding[0]
        // 如果有自定义映射，跳过默认
        if (keyboardMappings[actionId]) return
        
        const handler = actionHandlers.current[actionId]
        if (handler) {
          e.preventDefault()
          handler()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [learningAction, learningSoundId, learningMode, keyboardMappings, setKeyboardMapping, setSoundKeyboardMapping, stopLearning])

  // 全局MIDI事件监听
  useEffect(() => {
    const handleMidiAction = (e: Event) => {
      const actionId = (e as CustomEvent).detail
      console.log('MIDI action received:', actionId)

      const handler = actionHandlers.current[actionId]
      if (handler) {
        handler()
      }
    }

    window.addEventListener('midi:action', handleMidiAction)
    return () => window.removeEventListener('midi:action', handleMidiAction)
  }, [])

  // 全局MIDI音效事件监听
  useEffect(() => {
    const handleMidiSound = (e: Event) => {
      const soundId = (e as CustomEvent).detail
      useAtmosphereStore.getState().playSound(soundId)
    }

    window.addEventListener('midi:sound', handleMidiSound)
    return () => window.removeEventListener('midi:sound', handleMidiSound)
  }, [])

  // 全局键盘音效事件监听
  useEffect(() => {
    const handleKeyboardSound = (e: Event) => {
      const soundId = (e as CustomEvent).detail
      useAtmosphereStore.getState().playSound(soundId)
    }

    window.addEventListener('keyboard:sound', handleKeyboardSound)
    return () => window.removeEventListener('keyboard:sound', handleKeyboardSound)
  }, [])

  // 处理自定义键盘映射的音效
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // 检查音效键盘映射
      const soundBinding = Object.entries(soundKeyboardMappings).find(([, binding]) => {
        const keyMatch = e.code === binding.key
        const ctrlMatch = binding.ctrl ? e.ctrlKey : !e.ctrlKey
        const shiftMatch = binding.shift ? e.shiftKey : !e.shiftKey
        const altMatch = binding.alt ? e.altKey : !e.altKey
        return keyMatch && ctrlMatch && shiftMatch && altMatch
      })

      if (soundBinding) {
        const soundId = soundBinding[0]
        useAtmosphereStore.getState().playSound(soundId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [soundKeyboardMappings])

  return {
    isIOS: isIOS(),
    getKeyDisplay,
    DEFAULT_KEYBOARD_CONFIG,
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
  { key: 'W', description: '过场音乐播放/暂停' },
  { key: 'E', description: '停止所有音效' },
]
