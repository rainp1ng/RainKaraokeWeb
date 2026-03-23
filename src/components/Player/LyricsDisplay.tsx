import { useEffect, useState, useRef, useCallback } from 'react'
import { FileText, Settings2 } from 'lucide-react'
import { usePlayerStore } from '../../stores/playerStore'
import { parseLyrics } from '../../utils/lyricsParser'
import type { Song, Lyrics, LyricsLine } from '../../types'

type ClickMode = 'single' | 'double'

// 获取存储的点击模式
const getStoredClickMode = (): ClickMode => {
  const stored = localStorage.getItem('lyricsClickMode')
  return (stored === 'single' || stored === 'double') ? stored : 'double'
}

interface LyricsDisplayProps {
  song: Song | null
  currentTime: number  // 秒
}

export default function LyricsDisplay({ song, currentTime }: LyricsDisplayProps) {
  const [lyrics, setLyrics] = useState<Lyrics | null>(null)
  const [currentLineIndex, setCurrentLineIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  const [clickMode, setClickMode] = useState<ClickMode>(getStoredClickMode)
  const [showConfig, setShowConfig] = useState(false)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isAutoScrollingRef = useRef(false)

  const { seek, playbackState } = usePlayerStore()
  const { status } = playbackState

  // 加载歌词
  useEffect(() => {
    if (!song?.id) {
      setLyrics(null)
      setCurrentLineIndex(-1)
      return
    }

    setIsLoading(true)

    const loadLyrics = async () => {
      try {
        // 如果歌曲有歌词文件，解析它
        if (song.lyricsFile) {
          const content = await song.lyricsFile.text()
          const fileName = song.lyricsFile instanceof File ? song.lyricsFile.name : undefined
          const parsed = parseLyrics(content, fileName)
          setLyrics(parsed)
        } else {
          setLyrics(null)
        }
        setCurrentLineIndex(-1)
      } catch (err) {
        console.error('Failed to load lyrics:', err)
        setLyrics(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadLyrics()
  }, [song?.id, song?.lyricsFile])

  // 切换点击模式
  const toggleClickMode = () => {
    const newMode = clickMode === 'single' ? 'double' : 'single'
    setClickMode(newMode)
    localStorage.setItem('lyricsClickMode', newMode)
  }

  // 处理歌词行点击
  const handleLineClick = (line: LyricsLine) => {
    if (status !== 'playing' && status !== 'paused') return

    // 跳转到该行时间（毫秒转秒）
    const timeInSeconds = line.time / 1000
    seek(timeInSeconds)

    // 跳转后恢复自动滚动
    setIsUserScrolling(false)
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = null
    }
  }

  // 处理单击事件
  const handleClick = (line: LyricsLine) => {
    if (clickMode === 'single') {
      handleLineClick(line)
    } else {
      // 双击模式下，单击启动一个延迟，如果双击则取消
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
        clickTimeoutRef.current = null
      }
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null
      }, 300)
    }
  }

  // 处理双击事件
  const handleDoubleClick = (line: LyricsLine) => {
    if (clickMode === 'double') {
      // 取消单击的延迟
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
        clickTimeoutRef.current = null
      }
      handleLineClick(line)
    }
  }

  // 更新当前行
  useEffect(() => {
    if (!lyrics || lyrics.lines.length === 0) return

    const timeMs = currentTime * 1000  // 转换为毫秒

    let newIndex = -1
    for (let i = 0; i < lyrics.lines.length; i++) {
      const line = lyrics.lines[i]
      const nextLine = lyrics.lines[i + 1]

      if (timeMs >= line.time) {
        if (!nextLine || timeMs < nextLine.time) {
          newIndex = i
          break
        }
      }
    }

    if (newIndex !== currentLineIndex) {
      setCurrentLineIndex(newIndex)

      // 只有在用户没有手动滚动时才自动滚动
      if (!isUserScrolling && containerRef.current && newIndex >= 0) {
        const lineElements = containerRef.current.querySelectorAll('.lyrics-line')
        if (lineElements[newIndex]) {
          // 标记为程序化滚动
          isAutoScrollingRef.current = true

          const container = containerRef.current
          const targetElement = lineElements[newIndex] as HTMLElement
          const containerHeight = container.clientHeight
          const targetTop = targetElement.offsetTop
          const targetHeight = targetElement.clientHeight
          const scrollTo = targetTop - (containerHeight / 2) + (targetHeight / 2)

          container.scrollTo({
            top: Math.max(0, scrollTo),
            behavior: 'smooth'
          })

          // 延迟后重置标志
          setTimeout(() => {
            isAutoScrollingRef.current = false
          }, 300)
        }
      }
    }
  }, [currentTime, lyrics, isUserScrolling])

  // 处理用户滚动
  const handleScroll = useCallback(() => {
    // 如果是程序化滚动，忽略
    if (isAutoScrollingRef.current) {
      return
    }

    // 用户开始滚动
    setIsUserScrolling(true)

    // 清除之前的定时器
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    // 3秒后恢复自动滚动
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false)
    }, 3000)
  }, [])

  // 清理滚动定时器
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  // 渲染逐字高亮
  const renderWords = (line: LyricsLine) => {
    if (!line.words || line.words.length === 0) {
      return line.text
    }

    const timeMs = currentTime * 1000

    return line.words.map((word, idx) => {
      const isActive = timeMs >= word.time && timeMs < word.time + word.duration
      const isPast = timeMs >= word.time + word.duration

      return (
        <span
          key={idx}
          className={`transition-colors duration-100 ${
            isActive
              ? 'text-primary-light'
              : isPast
              ? 'text-white/40'
              : 'text-white/50'
          }`}
        >
          {word.text}
        </span>
      )
    })
  }

  // 无歌曲
  if (!song) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/40">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>选择歌曲查看歌词</p>
        </div>
      </div>
    )
  }

  // 加载中
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/40">
        <div className="animate-pulse">加载歌词...</div>
      </div>
    )
  }

  // 无歌词
  if (!lyrics || lyrics.lines.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/40">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>暂无歌词</p>
          <p className="text-sm mt-1">导入歌曲时可添加同名 .lrc 或 .ksc 文件</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full relative">
      {/* 配置按钮 */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        {/* 滚动暂停提示 */}
        {isUserScrolling && (
          <button
            onClick={() => setIsUserScrolling(false)}
            className="px-2 py-1 rounded bg-primary/80 text-white text-xs hover:bg-primary transition-colors"
          >
            已暂停滚动 · 点击恢复
          </button>
        )}
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
          title="歌词设置"
        >
          <Settings2 className="w-4 h-4" />
        </button>
        {showConfig && (
          <div className="absolute top-8 right-0 bg-surface rounded-lg p-2 shadow-lg border border-white/10 min-w-[120px]">
            <div className="text-xs text-white/60 mb-1.5">点击跳转模式</div>
            <button
              onClick={toggleClickMode}
              className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                clickMode === 'double'
                  ? 'bg-primary text-white'
                  : 'hover:bg-white/10'
              }`}
            >
              双击跳转
            </button>
            <button
              onClick={toggleClickMode}
              className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                clickMode === 'single'
                  ? 'bg-primary text-white'
                  : 'hover:bg-white/10'
              }`}
            >
              单击跳转
            </button>
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        onWheel={(e) => {
          e.stopPropagation()
        }}
        className="absolute inset-0 overflow-y-auto overflow-x-hidden p-4"
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }}
      >
        {/* 顶部填充 */}
        <div className="h-24" />

        {lyrics.lines.map((line, index) => {
          const isActive = index === currentLineIndex
          const isPast = index < currentLineIndex

          return (
            <div
              key={index}
              onClick={() => handleClick(line)}
              onDoubleClick={() => handleDoubleClick(line)}
              className={`lyrics-line text-center py-2 transition-all duration-300 cursor-pointer select-none hover:text-white ${
                isActive
                  ? 'text-2xl text-white font-medium scale-105'
                  : isPast
                  ? 'text-lg text-white/30'
                  : 'text-lg text-white/50'
              }`}
              title={clickMode === 'double' ? '双击跳转到此处' : '点击跳转到此处'}
            >
              {renderWords(line)}
            </div>
          )
        })}

        {/* 底部填充 */}
        <div className="h-24" />
      </div>
    </div>
  )
}
