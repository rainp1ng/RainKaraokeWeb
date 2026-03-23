import type { Lyrics, LyricsLine, LyricsWord, LyricsFormat } from '../types'

/**
 * Parse LRC format lyrics
 * Format: [mm:ss.xx]lyrics text
 * Supports multiple timestamps on the same line: [00:10.00][00:20.00]歌词文本
 */
export function parseLRC(content: string): Lyrics {
  const lines: LyricsLine[] = []
  // Match all timestamps at the beginning of a line
  const lineRegex = /^(\[(\d{2}):(\d{2})\.(\d{2,3})\])+(.*)$/gm

  let lineMatch
  while ((lineMatch = lineRegex.exec(content)) !== null) {
    const fullMatch = lineMatch[0]
    const text = lineMatch[5].trim()

    if (!text) continue

    // Extract all timestamps from this line
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g
    let timeMatch
    while ((timeMatch = timeRegex.exec(fullMatch)) !== null) {
      const [, minutes, seconds, millis] = timeMatch
      const time = parseInt(minutes) * 60000 + parseInt(seconds) * 1000 + parseInt(millis) * 10

      lines.push({
        time,
        duration: 0,
        text,
      })
    }
  }

  // Sort by time
  lines.sort((a, b) => a.time - b.time)

  // Calculate durations
  for (let i = 0; i < lines.length; i++) {
    if (i < lines.length - 1) {
      lines[i].duration = lines[i + 1].time - lines[i].time
    } else {
      lines[i].duration = 5000 // Default 5 seconds for last line
    }
  }

  return { format: 'lrc', lines }
}

/**
 * Parse KSC format lyrics (Karaoke format with word-level timing)
 * Format: karaoke.add('mm:ss.ms', 'mm:ss.ms', 'text', 'word1_dur,word2_dur,...')
 */
export function parseKSC(content: string): Lyrics {
  const lines: LyricsLine[] = []
  const lineRegex = /karaoke\.add\('(\d{2}:\d{2}\.\d{2})',\s*'(\d{2}:\d{2}\.\d{2})',\s*'([^']+)',\s*'([^']+)'\)/g

  let match
  while ((match = lineRegex.exec(content)) !== null) {
    const [, startTime, endTime, text, wordDurations] = match

    const startMs = parseTime(startTime)
    const endMs = parseTime(endTime)
    const duration = endMs - startMs

    // Parse word durations
    const words: LyricsWord[] = []
    const durations = wordDurations.split(',').map((d) => parseInt(d.trim()) || 0)
    let wordTime = startMs

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      if (char !== ' ') {
        const wordDur = durations[i] || 300
        words.push({
          time: wordTime,
          duration: wordDur,
          text: char,
        })
        wordTime += wordDur
      }
    }

    lines.push({
      time: startMs,
      duration,
      text,
      words: words.length > 0 ? words : undefined,
    })
  }

  return { format: 'ksc', lines: lines.sort((a, b) => a.time - b.time) }
}

/**
 * Parse plain text lyrics
 */
export function parseTXT(content: string): Lyrics {
  const lines = content
    .split('\n')
    .filter((line) => line.trim())
    .map((text, index) => ({
      time: index * 5000,
      duration: 5000,
      text: text.trim(),
    }))

  return { format: 'txt', lines }
}

/**
 * Auto-detect format and parse
 */
export function parseLyrics(content: string, filePath?: string): Lyrics {
  let format: LyricsFormat = 'txt'

  if (filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase()
    if (ext === 'lrc') format = 'lrc'
    else if (ext === 'ksc') format = 'ksc'
  } else {
    // Auto-detect from content
    if (content.includes('karaoke.add(')) {
      format = 'ksc'
    } else if (/\[\d{2}:\d{2}\.\d{2,3}\]/.test(content)) {
      format = 'lrc'
    }
  }

  switch (format) {
    case 'lrc':
      return parseLRC(content)
    case 'ksc':
      return parseKSC(content)
    default:
      return parseTXT(content)
  }
}

/**
 * Get current lyrics line based on time
 */
export function getCurrentLineIndex(lines: LyricsLine[], currentTimeMs: number): number {
  return lines.findIndex((line, index) => {
    const nextLine = lines[index + 1]
    if (nextLine) {
      return currentTimeMs >= line.time && currentTimeMs < nextLine.time
    }
    return currentTimeMs >= line.time
  })
}

/**
 * Parse time string to milliseconds
 */
function parseTime(timeStr: string): number {
  const parts = timeStr.split(':')
  if (parts.length !== 2) return 0

  const [minutes, rest] = parts
  const [seconds, millis] = rest.split('.')

  return (
    parseInt(minutes) * 60000 +
    parseInt(seconds) * 1000 +
    (millis ? parseInt(millis.padEnd(3, '0')) : 0)
  )
}
