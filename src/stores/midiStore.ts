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

interface MidiStore {
  // MIDI设备
  devices: MidiDevice[]
  connectedDevice: MidiDevice | null
  midiAccess: MIDIAccess | null
  savedDeviceId: string | null  // 保存的设备ID

  // MIDI学习模式
  learningAction: string | null  // 正在学习的动作ID
  learningSoundId: string | null  // 正在学习音效ID

  // MIDI映射
  mappings: Record<string, MidiBinding>  // action -> binding
  soundMappings: Record<string, MidiBinding>  // soundId -> binding

  // Actions
  init: () => Promise<void>
  connect: (deviceId: string) => Promise<boolean>
  disconnect: () => void
  startLearning: (action: string) => void
  startLearningSound: (soundId: string) => void
  stopLearning: () => void
  setMapping: (action: string, binding: MidiBinding | null) => void
  setSoundMapping: (soundId: string, binding: MidiBinding | null) => void
  saveMappings: () => void
  loadMappings: () => void
}

const MAPPINGS_KEY = 'midiMappings'
const SOUND_MAPPINGS_KEY = 'midiSoundMappings'
const DEVICE_ID_KEY = 'midiDeviceId'

export const useMidiStore = create<MidiStore>((set, get) => ({
  devices: [],
  connectedDevice: null,
  midiAccess: null,
  savedDeviceId: null,
  learningAction: null,
  learningSoundId: null,
  mappings: {},
  soundMappings: {},

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
      const { learningAction, learningSoundId, mappings, soundMappings } = get()

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

      // 如果处于学习模式
      if (learningAction) {
        set((state) => ({
          mappings: { ...state.mappings, [learningAction]: binding },
          learningAction: null,
        }))
        get().saveMappings()
        return
      }

      if (learningSoundId) {
        set((state) => ({
          soundMappings: { ...state.soundMappings, [learningSoundId]: binding },
          learningSoundId: null,
        }))
        get().saveMappings()
        return
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

  startLearning: (action: string) => {
    set({ learningAction: action, learningSoundId: null })
  },

  startLearningSound: (soundId: string) => {
    set({ learningSoundId: soundId, learningAction: null })
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

  saveMappings: () => {
    const { mappings, soundMappings } = get()
    localStorage.setItem(MAPPINGS_KEY, JSON.stringify(mappings))
    localStorage.setItem(SOUND_MAPPINGS_KEY, JSON.stringify(soundMappings))
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
    } catch (e) {
      console.error('Failed to load MIDI mappings:', e)
    }
  },
}))
