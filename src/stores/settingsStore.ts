import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Settings } from '../types'

interface SettingsStore extends Settings {
  // Actions
  updateSettings: (updates: Partial<Settings>) => void
  reset: () => void
}

const defaultSettings: Settings = {
  interludeEnabled: true,
  interludeVolume: 0.3,
  duckingEnabled: false,
  autoPlayNext: true,
  lyricsFontSize: 1,
  theme: 'dark',
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,

      updateSettings: (updates) =>
        set((state) => ({ ...state, ...updates })),

      reset: () => set(defaultSettings),
    }),
    {
      name: 'rainkaraoke-settings',
    }
  )
)
