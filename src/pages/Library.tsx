import { useState, useCallback, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Plus, FolderOpen, MoreVertical, Play,
  Trash2, X, Edit2, Check, FileText, ListPlus
} from 'lucide-react'
import { useLibraryStore } from '../stores/libraryStore'
import { useQueueStore } from '../stores/queueStore'
import { usePlayerStore } from '../stores/playerStore'
import { usePlaylistStore } from '../stores/playlistStore'
import { updateSong, deleteSong } from '../services/database'
import type { Song } from '../types'

const filters = ['全部', '华语', '欧美', '日语', '韩语', '流行', '摇滚', '民谣']
const PAGE_SIZE = 20

export default function LibraryPage() {
  const navigate = useNavigate()
  const { songs, searchQuery, selectedFilter, setSearchQuery, setSelectedFilter, addSong, loadSongs } = useLibraryStore()
  const { addToQueue } = useQueueStore()
  const { setCurrentSong } = usePlayerStore()
  const { playlists, loadPlaylists, addSongsToPlaylist } = usePlaylistStore()

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)

  // 批量选择状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // 菜单状态
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  // 编辑状态
  const [editingSong, setEditingSong] = useState<Song | null>(null)
  const [editForm, setEditForm] = useState({ title: '', artist: '', album: '' })

  // 添加到歌单状态
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false)
  const [playlistMenuSongId, setPlaylistMenuSongId] = useState<string | null>(null)

  // 加载歌曲和歌单列表
  useEffect(() => {
    loadSongs()
    loadPlaylists()
  }, [])

  // 过滤后的歌曲
  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      const matchesSearch = searchQuery
        ? song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          song.artist?.toLowerCase().includes(searchQuery.toLowerCase())
        : true

      const matchesFilter = selectedFilter === '全部' ||
        song.language === selectedFilter ||
        song.genre === selectedFilter

      return matchesSearch && matchesFilter
    })
  }, [songs, searchQuery, selectedFilter])

  // 分页计算
  const totalPages = Math.ceil(filteredSongs.length / PAGE_SIZE)
  const paginatedSongs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredSongs.slice(start, start + PAGE_SIZE)
  }, [filteredSongs, currentPage])

  // 重置页码当过滤条件改变
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter)
    setCurrentPage(1)
  }

  // 导入文件
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (const file of Array.from(files)) {
      // 检查是否是歌词文件
      const isLyrics = file.name.endsWith('.lrc') || file.name.endsWith('.ksc') || file.name.endsWith('.txt')

      if (isLyrics) {
        // 尝试匹配现有歌曲
        const baseName = file.name.replace(/\.[^/.]+$/, '')
        const matchedSong = songs.find(s =>
          s.title === baseName
        )

        if (matchedSong) {
          await updateSong(matchedSong.id, { lyricsFile: file })
        }
        continue
      }

      const song: Song = {
        id: crypto.randomUUID(),
        title: file.name.replace(/\.[^/.]+$/, ''),
        videoFile: file,
        videoFileName: file.name,
        videoMimeType: file.type || 'video/mp4',
        hasVocal: false,
        hasInstrumental: false,
        playCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      addSong(song)
    }

    // 清空input以允许重复选择相同文件
    e.target.value = ''
  }, [addSong, songs])

  // 播放歌曲
  const handlePlaySong = (song: Song) => {
    setCurrentSong(song)
    addToQueue(song)
    navigate('/player')
  }

  // 切换选择
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedSongs.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedSongs.map(s => s.id)))
    }
  }

  // 批量添加到队列
  const handleAddSelectedToQueue = () => {
    for (const song of songs) {
      if (selectedIds.has(song.id)) {
        addToQueue(song)
      }
    }
    setSelectedIds(new Set())
  }

  // 批量删除
  const handleDeleteSelected = async () => {
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 首歌曲吗？`)) return

    for (const id of selectedIds) {
      await deleteSong(id)
    }
    setSelectedIds(new Set())
    // 重新加载歌曲列表
    useLibraryStore.getState().loadSongs()
  }

  // 添加到歌单
  const handleAddToPlaylist = async (playlistId: string) => {
    const songIds = Array.from(selectedIds)
    await addSongsToPlaylist(playlistId, songIds)
    setSelectedIds(new Set())
    setShowPlaylistMenu(false)
  }

  // 单首歌曲添加到歌单
  const handleAddSongToPlaylist = async (playlistId: string, songId: string) => {
    await addSongsToPlaylist(playlistId, [songId])
    setPlaylistMenuSongId(null)
    setMenuOpenId(null)
  }

  // 删除单首歌曲
  const handleDeleteSong = async (song: Song) => {
    if (!confirm(`确定要删除 "${song.title}" 吗？`)) return

    await deleteSong(song.id)
    useLibraryStore.getState().loadSongs()
    setMenuOpenId(null)
  }

  // 打开编辑
  const handleOpenEdit = (song: Song) => {
    setEditingSong(song)
    setEditForm({
      title: song.title,
      artist: song.artist || '',
      album: song.album || '',
    })
    setMenuOpenId(null)
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingSong || !editForm.title.trim()) return

    await updateSong(editingSong.id, {
      title: editForm.title.trim(),
      artist: editForm.artist.trim() || undefined,
      album: editForm.album.trim() || undefined,
    })

    setEditingSong(null)
    useLibraryStore.getState().loadSongs()
  }

  // 导入歌词到歌曲
  const handleImportLyrics = async (song: Song, file: File) => {
    await updateSong(song.id, { lyricsFile: file })
    useLibraryStore.getState().loadSongs()
    setMenuOpenId(null)
  }

  // 处理歌词文件选择
  const handleLyricsFileSelect = (song: Song) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImportLyrics(song, file)
    }
    e.target.value = ''
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur z-10 p-4">
        <h1 className="text-xl font-bold mb-4">媒体库</h1>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="搜索歌曲..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => handleFilterChange(filter)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedFilter === filter
                  ? 'bg-primary text-white'
                  : 'bg-surface text-white/60 hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </header>

      {/* Actions */}
      <div className="flex gap-2 px-4 mb-4">
        <label className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary rounded-lg cursor-pointer hover:bg-primary-dark transition-colors">
          <Plus className="w-4 h-4" />
          <span>导入歌曲</span>
          <input
            type="file"
            accept="video/*,audio/*,.lrc,.ksc,.txt"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
        <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface rounded-lg hover:bg-surface-variant transition-colors">
          <FolderOpen className="w-4 h-4" />
          <span>扫描</span>
        </button>
      </div>

      {/* Song count and selection info */}
      <div className="px-4 mb-2 flex items-center justify-between">
        <span className="text-sm text-white/60">
          {filteredSongs.length} 首歌曲
          {totalPages > 1 && ` · 第 ${currentPage}/${totalPages} 页`}
        </span>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-primary">已选 {selectedIds.size} 首</span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-white/60 hover:text-white"
            >
              取消
            </button>
          </div>
        )}
      </div>

      {/* Batch actions */}
      {selectedIds.size > 0 && (
        <div className="px-4 mb-2 flex gap-2 flex-wrap">
          <button
            onClick={handleAddSelectedToQueue}
            className="px-3 py-1.5 bg-primary rounded-lg text-sm hover:bg-primary-dark transition-colors"
          >
            添加到队列
          </button>
          <div className="relative">
            <button
              onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}
              className="px-3 py-1.5 bg-surface rounded-lg text-sm hover:bg-surface-variant transition-colors flex items-center gap-1"
            >
              <ListPlus className="w-4 h-4" />
              添加到歌单
            </button>
            {showPlaylistMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowPlaylistMenu(false)} />
                <div className="absolute left-0 top-full mt-1 bg-surface border border-white/10 rounded-lg shadow-lg py-1 min-w-[150px] max-h-60 overflow-y-auto z-20">
                  {playlists.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-white/40">暂无歌单</div>
                  ) : (
                    playlists.map((playlist) => (
                      <button
                        key={playlist.id}
                        onClick={() => handleAddToPlaylist(playlist.id)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 truncate"
                      >
                        {playlist.name}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleDeleteSelected}
            className="px-3 py-1.5 bg-red-600 rounded-lg text-sm hover:bg-red-700 transition-colors"
          >
            删除选中
          </button>
        </div>
      )}

      {/* Song list */}
      <div className="flex-1 overflow-y-auto px-4">
        {paginatedSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/40">
            <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4">
              <Plus className="w-8 h-8" />
            </div>
            <p>暂无歌曲</p>
            <p className="text-sm mt-1">点击上方导入歌曲</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Select all checkbox */}
            <div className="flex items-center gap-3 p-2 bg-surface/50 rounded-lg">
              <input
                type="checkbox"
                checked={selectedIds.size === paginatedSongs.length && paginatedSongs.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-white/60">全选当前页</span>
            </div>

            {paginatedSongs.map((song) => (
              <div
                key={song.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  selectedIds.has(song.id)
                    ? 'bg-primary/20 ring-1 ring-primary'
                    : 'bg-surface hover:bg-surface-variant'
                }`}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedIds.has(song.id)}
                  onChange={() => toggleSelect(song.id)}
                  className="w-4 h-4 rounded"
                />

                {/* Play button */}
                <button
                  onClick={() => handlePlaySong(song)}
                  className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary hover:bg-primary/30 transition-colors flex-shrink-0"
                >
                  <Play className="w-4 h-4 ml-0.5" />
                </button>

                {/* Song info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{song.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <span className="truncate">{song.artist || '未知歌手'}</span>
                    {song.language && <span>· {song.language}</span>}
                    {/* 音轨状态 */}
                    <div className="flex gap-1">
                      {song.hasVocal && (
                        <span className="px-1 py-0.5 bg-green-900/50 text-green-400 rounded text-xs">原唱</span>
                      )}
                      {song.hasInstrumental && (
                        <span className="px-1 py-0.5 bg-blue-900/50 text-blue-400 rounded text-xs">伴奏</span>
                      )}
                      {song.lyricsFile && (
                        <span className="px-1 py-0.5 bg-purple-900/50 text-purple-400 rounded text-xs">歌词</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* More options */}
                <div className="relative">
                  <button
                    onClick={() => setMenuOpenId(menuOpenId === song.id ? null : song.id)}
                    className="p-2 text-white/40 hover:text-white"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* Dropdown menu */}
                  {menuOpenId === song.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setMenuOpenId(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 bg-surface border border-white/10 rounded-lg shadow-lg z-20 min-w-[140px]">
                        <button
                          onClick={() => handleOpenEdit(song)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 flex items-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          编辑信息
                        </button>
                        <label className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 flex items-center gap-2 cursor-pointer">
                          <FileText className="w-4 h-4" />
                          导入歌词
                          <input
                            type="file"
                            accept=".lrc,.ksc,.txt"
                            onChange={handleLyricsFileSelect(song)}
                            className="hidden"
                          />
                        </label>
                        <hr className="border-white/10" />
                        <div className="relative">
                          <button
                            onClick={() => setPlaylistMenuSongId(playlistMenuSongId === song.id ? null : song.id)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 flex items-center gap-2"
                          >
                            <ListPlus className="w-4 h-4" />
                            添加到歌单
                          </button>
                          {playlistMenuSongId === song.id && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setPlaylistMenuSongId(null)} />
                              <div className="absolute left-0 top-full mt-1 bg-surface border border-white/10 rounded-lg shadow-lg py-1 min-w-[150px] max-h-48 overflow-y-auto z-40">
                                {playlists.length === 0 ? (
                                  <div className="px-3 py-2 text-sm text-white/40">暂无歌单</div>
                                ) : (
                                  playlists.map((playlist) => (
                                    <button
                                      key={playlist.id}
                                      onClick={() => handleAddSongToPlaylist(playlist.id, song.id)}
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 truncate"
                                    >
                                      {playlist.name}
                                    </button>
                                  ))
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        <hr className="border-white/10" />
                        <button
                          onClick={() => handleDeleteSong(song)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 text-red-400 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          删除歌曲
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-white/10 flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-surface rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-variant transition-colors"
          >
            上一页
          </button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number
              if (totalPages <= 5) {
                page = i + 1
              } else if (currentPage <= 3) {
                page = i + 1
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i
              } else {
                page = currentPage - 2 + i
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                    currentPage === page
                      ? 'bg-primary text-white'
                      : 'bg-surface hover:bg-surface-variant'
                  }`}
                >
                  {page}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-surface rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-variant transition-colors"
          >
            下一页
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">编辑歌曲信息</h3>
              <button
                onClick={() => setEditingSong(null)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-1">歌曲名</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="输入歌曲名"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1">歌手</label>
                <input
                  type="text"
                  value={editForm.artist}
                  onChange={(e) => setEditForm({ ...editForm, artist: e.target.value })}
                  className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="输入歌手名"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1">专辑</label>
                <input
                  type="text"
                  value={editForm.album}
                  onChange={(e) => setEditForm({ ...editForm, album: e.target.value })}
                  className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="输入专辑名"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditingSong(null)}
                className="px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editForm.title.trim()}
                className="px-4 py-2 bg-primary rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
