import { useState, useRef } from 'react'
import { ListMusic, Trash2, GripVertical, ChevronUp, Play } from 'lucide-react'
import { useQueueStore } from '../stores/queueStore'
import { useNavigate } from 'react-router-dom'

export default function QueuePage() {
  const navigate = useNavigate()
  const {
    items,
    currentIndex,
    removeFromQueue,
    clearQueue,
    moveItem,
    moveToTop,
    playAtIndex
  } = useQueueStore()

  // 拖拽状态
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragNodeRef = useRef<HTMLDivElement | null>(null)

  const handlePlayItem = (index: number) => {
    playAtIndex(index)
    navigate('/player')
  }

  // 拖拽开始
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    dragNodeRef.current = e.currentTarget as HTMLDivElement

    // 设置拖拽数据
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())

    // 延迟添加拖拽样式
    setTimeout(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = '0.5'
      }
    }, 0)
  }

  // 拖拽进入
  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  // 拖拽离开
  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  // 拖拽结束
  const handleDragEnd = () => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1'
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
    dragNodeRef.current = null
  }

  // 放下
  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      moveItem(draggedIndex, targetIndex)
    }
    handleDragEnd()
  }

  // 触摸设备支持
  const [touchStartY, setTouchStartY] = useState<number | null>(null)
  const [touchCurrentIndex, setTouchCurrentIndex] = useState<number | null>(null)

  const handleTouchStart = (index: number) => (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY)
    setTouchCurrentIndex(index)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null || touchCurrentIndex === null) return

    const deltaY = e.touches[0].clientY - touchStartY
    const threshold = 50

    if (Math.abs(deltaY) > threshold) {
      const direction = deltaY > 0 ? 1 : -1
      const newIndex = touchCurrentIndex + direction

      if (newIndex >= 0 && newIndex < items.length && newIndex !== touchCurrentIndex) {
        moveItem(touchCurrentIndex, newIndex)
        setTouchCurrentIndex(newIndex)
        setTouchStartY(e.touches[0].clientY)
      }
    }
  }

  const handleTouchEnd = () => {
    setTouchStartY(null)
    setTouchCurrentIndex(null)
  }

  // 顶歌
  const handleMoveToTop = (index: number) => {
    if (index === currentIndex + 1) return // 已经是下一首
    const item = items[index]
    if (item) {
      moveToTop(item.id)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur z-10 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">播放队列</h1>
          <div className="flex gap-2">
            {items.length > 1 && (
              <button
                onClick={clearQueue}
                className="px-3 py-1.5 bg-surface rounded-lg text-sm text-white/60 hover:text-red-400 transition-colors"
              >
                清空
              </button>
            )}
          </div>
        </div>

        {/* Queue stats */}
        {items.length > 0 && (
          <div className="mt-4 p-3 bg-surface rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">共 {items.length} 首歌曲</span>
              {currentIndex >= 0 && (
                <span className="text-primary">正在播放第 {currentIndex + 1} 首</span>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Queue list */}
      <div className="flex-1 overflow-y-auto px-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/40">
            <ListMusic className="w-16 h-16 mb-4" />
            <p>播放队列为空</p>
            <p className="text-sm mt-1">从媒体库添加歌曲</p>
          </div>
        ) : (
          <div className="space-y-2 py-2">
            {items.map((item, index) => {
              const isCurrentPlaying = index === currentIndex
              const isNext = index === currentIndex + 1

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragLeave={handleDragLeave}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragOver={(e) => e.preventDefault()}
                  onTouchStart={handleTouchStart(index)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    isCurrentPlaying
                      ? 'bg-primary/20 border border-primary/30'
                      : dragOverIndex === index
                      ? 'bg-primary/10 border border-primary/50 scale-[1.02]'
                      : 'bg-surface hover:bg-surface-variant'
                  } ${draggedIndex === index ? 'opacity-50' : ''}`}
                >
                  {/* Drag handle */}
                  <div className="cursor-grab active:cursor-grabbing text-white/40 hover:text-white/60">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Index / Playing indicator */}
                  <div
                    onClick={() => handlePlayItem(index)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer ${
                      isCurrentPlaying
                        ? 'bg-primary text-white'
                        : 'bg-white/10 text-white/40 hover:bg-white/20'
                    }`}
                  >
                    {isCurrentPlaying ? (
                      <Play className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  {/* Song info */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handlePlayItem(index)}
                  >
                    <h3 className={`font-medium truncate ${isCurrentPlaying ? 'text-primary' : ''}`}>
                      {item.song?.title}
                    </h3>
                    <p className="text-sm text-white/60 truncate">
                      {item.song?.artist || '未知歌手'}
                    </p>
                  </div>

                  {/* Status badges */}
                  <div className="flex items-center gap-2">
                    {isCurrentPlaying && (
                      <span className="px-2 py-0.5 bg-primary/30 text-primary rounded text-xs">
                        正在播放
                      </span>
                    )}
                    {isNext && (
                      <span className="px-2 py-0.5 bg-white/10 text-white/60 rounded text-xs">
                        下一首
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {/* 顶歌按钮 - 只有不在当前位置且不在下一首位置时显示 */}
                    {!isCurrentPlaying && !isNext && index > currentIndex + 1 && (
                      <button
                        onClick={() => handleMoveToTop(index)}
                        className="p-1.5 text-white/40 hover:text-primary transition-colors"
                        title="设为下一首"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                    )}

                    {/* 删除按钮 - 不删除正在播放的歌曲 */}
                    {!isCurrentPlaying && (
                      <button
                        onClick={() => removeFromQueue(item.id)}
                        className="p-1.5 text-white/40 hover:text-red-400 transition-colors"
                        title="从队列移除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Tips */}
      {items.length > 1 && (
        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-white/40 text-center">
            拖拽歌曲可调整播放顺序 · 点击↑设为下一首
          </p>
        </div>
      )}
    </div>
  )
}
