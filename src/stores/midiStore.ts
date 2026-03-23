import { create } from 'zustand'

export interface MidiBinding {
  messageType: 'NOTE' | 'CC' | 'PC'
  note: number
  channel: number
}

export interface MidiDevice {
  id: string
  name: string
}

export interface KeyBinding {
  key: string          // KeyboardEvent.code, e.g. 'KeyA', 'Space'
  keyDisplay: string   // 显示名称, e.g. 'A', 'Space'
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
}

interface MidiStore {
  // MIDI设备
  devices: MidiDevice[]
  connectedDevice: MidiDevice | null
  midiAccess: MIDIAccess | null
  savedDeviceId: string | null  // 保存的设备ID

  // 学习模式 (MIDI + 键盘共用)
  learningAction: string | null  // 正在学习的动作ID
  learningSoundId: string | null  // 正在学习音效ID
  learningMode: 'midi' | 'keyboard' | 'both'  // 学习模式

  // MIDI映射
  mappings: Record<string, MidiBinding>  // action -> binding
  soundMappings: Record<string, MidiBinding>  // soundId -> binding

  // 键盘映射
  keyboardMappings: Record<string, KeyBinding>  // action -> keyBinding
  soundKeyboardMappings: Record<string, KeyBinding>  // soundId -> keyBinding

  // Actions
  init: () => Promise<void>
  connect: (deviceId: string) => Promise<boolean>
  disconnect: () => void
  startLearning: (action: string, mode?: 'midi' | 'keyboard' | 'both') => void
  startLearningSound: (soundId: string, mode?: 'midi' | 'keyboard' | 'both') => void
  stopLearning: () => void
  setMapping: (action: string, binding: MidiBinding | null) => void
  setSoundMapping: (soundId: string, binding: MidiBinding | null) => void
  setKeyboardMapping: (action: string, binding: KeyBinding | null) => void
  setSoundKeyboardMapping: (soundId: string, binding: KeyBinding | null) => void
  saveMappings: () => void
  loadMappings: () => void
}

const MAPPINGS_KEY = 'midiMappings'
const SOUND_MAPPINGS_KEY = 'midiSoundMappings'
const KEYBOARD_MAPPINGS_KEY = 'keyboardMappings'
const SOUND_KEYBOARD_MAPPINGS_KEY = 'soundKeyboardMappings'
const DEVICE_ID_KEY = 'midiDeviceId'

export const useMidiStore = create<MidiStore>((set, get) => ({
  devices: [],
  connectedDevice: null,
  midiAccess: null,
  savedDeviceId: null,
  learningAction: null,
  learningSoundId: null,
  learningMode: 'both',
  mappings: {},
  soundMappings: {},
  keyboardMappings: {},
  soundKeyboardMappings: {},

  init: async () => {
    if (!navigator.requestMIDIAccess) {
      console.log('Web MIDI API not supported')
      return
    }

    try {
      const midiAccess = await navigator.requestMIDIAccess()
      set({ midiAccess })

      // 获取设备列表
      const devices: MidiDevice[] = []
      midiAccess.inputs.forEach((input) => {
        devices.push({ id: input.id, name: input.name || 'Unknown Device' })
      })
      set({ devices })

      // 加载保存的映射和设备ID
      get().loadMappings()

      // 加载保存的设备ID
      const savedDeviceId = localStorage.getItem(DEVICE_ID_KEY)
      if (savedDeviceId) {
        set({ savedDeviceId })
      }

      // 尝试自动连接保存的设备
      if (savedDeviceId) {
        const deviceExists = devices.some(d => d.id === savedDeviceId)
        if (deviceExists) {
          console.log('Auto-connecting to MIDI device:', savedDeviceId)
          await get().connect(savedDeviceId)
        } else {
          console.log('Saved MIDI device not found')
        }
      }

      // 监听设备连接/断开
      midiAccess.onstatechange = () => {
        const newDevices: MidiDevice[] = []
        midiAccess.inputs.forEach((input) => {
          newDevices.push({ id: input.id, name: input.name || 'Unknown Device' })
        })
        set({ devices: newDevices })

        // 如果保存的设备现在可用，尝试连接
        const { savedDeviceId, connectedDevice } = get()
        if (savedDeviceId && !connectedDevice) {
          const deviceExists = newDevices.some(d => d.id === savedDeviceId)
          if (deviceExists) {
            get().connect(savedDeviceId)
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize MIDI:', error)
    }
  },

  connect: async (deviceId: string) => {
    const { midiAccess } = get()
    if (!midiAccess) return false

    const input = midiAccess.inputs.get(deviceId)
    if (!input) return false

    // 断开之前的连接
    get().disconnect()

    // 设置MIDI消息处理器
    input.onmidimessage = (event) => {
      const { learningAction, learningSoundId, learningMode, mappings, soundMappings } = get()

      // 解析MIDI消息
      const data = event.data
      if (!data || data.length < 2) return

      const status = data[0]
      const data1 = data[1]
      const data2 = data.length > 2 ? data[2] : 0
      const channel = status & 0x0f
      const messageType = status >> 4

      let parsedType: 'NOTE' | 'CC' | 'PC'
      let isOn = false

      if (messageType === 9) { // Note On
        parsedType = 'NOTE'
        isOn = data2 > 0
      } else if (messageType === 8) { // Note Off
        parsedType = 'NOTE'
        isOn = false
      } else if (messageType === 11) { // CC
        parsedType = 'CC'
        isOn = true
      } else if (messageType === 12) { // PC
        parsedType = 'PC'
        isOn = true
      } else {
        return
      }

      const binding: MidiBinding = {
        messageType: parsedType,
        note: data1,
        channel,
      }

      // 如果处于学习模式 (midi 或 both)
      if ((learningAction || learningSoundId) && (learningMode === 'midi' || learningMode === 'both')) {
        if (learningAction) {
          set((state) => ({
            mappings: { ...state.mappings, [learningAction]: binding },
            learningAction: learningMode === 'both' ? learningAction : null,
          }))
          get().saveMappings()
          // 如果是 both 模式，继续等待键盘输入；否则停止学习
          if (learningMode !== 'both') {
            return
          }
        }
        if (learningSoundId) {
          set((state) => ({
            soundMappings: { ...state.soundMappings, [learningSoundId]: binding },
            learningSoundId: learningMode === 'both' ? learningSoundId : null,
          }))
          get().saveMappings()
          if (learningMode !== 'both') {
            return
          }
        }
      }

      // 触发映射的动作
      const actionKey = Object.entries(mappings).find(([, b]) =>
        b.messageType === binding.messageType &&
        b.note === binding.note &&
        b.channel === binding.channel &&
        (binding.messageType !== 'NOTE' || isOn)
      )?.[0]

      if (actionKey) {
        // 发送自定义事件
        window.dispatchEvent(new CustomEvent('midi:action', { detail: actionKey }))
      }

      // 触发音效映射
      const soundId = Object.entries(soundMappings).find(([, b]) =>
        b.messageType === binding.messageType &&
        b.note === binding.note &&
        b.channel === binding.channel &&
        (binding.messageType !== 'NOTE' || isOn)
      )?.[0]

      if (soundId) {
        window.dispatchEvent(new CustomEvent('midi:sound', { detail: soundId }))
      }
    }

    const device = get().devices.find(d => d.id === deviceId)
    set({ connectedDevice: device || null })

    // 保存设备ID
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
    set({ savedDeviceId: deviceId })

    return true
  },

  disconnect: () => {
    const { midiAccess, connectedDevice } = get()
    if (midiAccess && connectedDevice) {
      const input = midiAccess.inputs.get(connectedDevice.id)
      if (input) {
        input.onmidimessage = null
      }
    }
    set({ connectedDevice: null })
  },

  startLearning: (action: string, mode: 'midi' | 'keyboard' | 'both' = 'both') => {
    set({ learningAction: action, learningSoundId: null, learningMode: mode })
  },

  startLearningSound: (soundId: string, mode: 'midi' | 'keyboard' | 'both' = 'both') => {
    set({ learningSoundId: soundId, learningAction: null, learningMode: mode })
  },

  stopLearning: () => {
    set({ learningAction: null, learningSoundId: null })
  },

  setMapping: (action, binding) => {
    set((state) => {
      const newMappings = { ...state.mappings }
      if (binding) {
        newMappings[action] = binding
      } else {
        delete newMappings[action]
      }
      return { mappings: newMappings }
    })
    get().saveMappings()
  },

  setSoundMapping: (soundId, binding) => {
    set((state) => {
      const newMappings = { ...state.soundMappings }
      if (binding) {
        newMappings[soundId] = binding
      } else {
        delete newMappings[soundId]
      }
      return { soundMappings: newMappings }
    })
    get().saveMappings()
  },

  setKeyboardMapping: (action, binding) => {
    set((state) => {
      const newMappings = { ...state.keyboardMappings }
      if (binding) {
        newMappings[action] = binding
      } else {
        delete newMappings[action]
      }
      return { keyboardMappings: newMappings }
    })
    get().saveMappings()
  },

  setSoundKeyboardMapping: (soundId, binding) => {
    set((state) => {
      const newMappings = { ...state.soundKeyboardMappings }
      if (binding) {
        newMappings[soundId] = binding
      } else {
        delete newMappings[soundId]
      }
      return { soundKeyboardMappings: newMappings }
    })
    get().saveMappings()
  },

  saveMappings: () => {
    const { mappings, soundMappings, keyboardMappings, soundKeyboardMappings } = get()
    localStorage.setItem(MAPPINGS_KEY, JSON.stringify(mappings))
    localStorage.setItem(SOUND_MAPPINGS_KEY, JSON.stringify(soundMappings))
    localStorage.setItem(KEYBOARD_MAPPINGS_KEY, JSON.stringify(keyboardMappings))
    localStorage.setItem(SOUND_KEYBOARD_MAPPINGS_KEY, JSON.stringify(soundKeyboardMappings))
  },

  loadMappings: () => {
    try {
      const stored = localStorage.getItem(MAPPINGS_KEY)
      if (stored) {
        set({ mappings: JSON.parse(stored) })
      }
      const soundStored = localStorage.getItem(SOUND_MAPPINGS_KEY)
      if (soundStored) {
        set({ soundMappings: JSON.parse(soundStored) })
      }
      const keyboardStored = localStorage.getItem(KEYBOARD_MAPPINGS_KEY)
      if (keyboardStored) {
        set({ keyboardMappings: JSON.parse(keyboardStored) })
      }
      const soundKeyboardStored = localStorage.getItem(SOUND_KEYBOARD_MAPPINGS_KEY)
      if (soundKeyboardStored) {
        set({ soundKeyboardMappings: JSON.parse(soundKeyboardStored) })
      }
    } catch (e) {
      console.error('Failed to load MIDI mappings:', e)
    }
  },
}))
