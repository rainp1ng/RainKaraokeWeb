import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ListMusic, Plus, Trash2, MoreVertical, Play,
  Edit2, X, Music, ChevronLeft, ListPlus
} from 'lucide-react'
import { usePlaylistStore } from '../stores/playlistStore'
import { useQueueStore } from '../stores/queueStore'
import { usePlayerStore } from '../stores/playerStore'
import { useLibraryStore } from '../stores/libraryStore'
import type { Playlist, PlaylistSong } from '../types'

export default function PlaylistsPage() {
  const navigate = useNavigate()
  const {
    playlists,
    currentPlaylist,
    currentPlaylistSongs,
    isLoading,
    loadPlaylists,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    loadPlaylistSongs,
    removeSongFromPlaylist,
    clearPlaylist,
    setCurrentPlaylist
  } = usePlaylistStore()
  const { addManyToQueue } = useQueueStore()
  const { setCurrentSong } = usePlayerStore()
  const { songs } = useLibraryStore()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('')
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  useEffect(() => {
    loadPlaylists()
  }, [])

  // 创建歌单
  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return

    await createPlaylist(newPlaylistName.trim(), newPlaylistDesc.trim() || undefined)
    setShowCreateModal(false)
    setNewPlaylistName('')
    setNewPlaylistDesc('')
  }

  // 删除歌单
  const handleDeletePlaylist = async (playlist: Playlist) => {
    if (!confirm(`确定要删除歌单 "${playlist.name}" 吗？`)) return
    await deletePlaylist(playlist.id)
    setMenuOpenId(null)
  }

  // 更新歌单
  const handleUpdatePlaylist = async () => {
    if (!editingPlaylist || !editName.trim()) return
    await updatePlaylist(editingPlaylist.id, editName.trim(), editDesc.trim() || undefined)
    setEditingPlaylist(null)
  }

  // 选择歌单查看
  const handleSelectPlaylist = async (playlist: Playlist) => {
    setCurrentPlaylist(playlist)
    await loadPlaylistSongs(playlist.id)
  }

  // 返回歌单列表
  const handleBackToList = () => {
    setCurrentPlaylist(null)
  }

  // 播放歌曲
  const handlePlaySong = (playlistSong: PlaylistSong) => {
    const song = songs.find(s => s.id === playlistSong.songId)
    if (song) {
      setCurrentSong(song)
      navigate('/player')
    }
  }

  // 播放全部
  const handlePlayAll = () => {
    if (currentPlaylistSongs.length === 0) return

    const playlistSongs = currentPlaylistSongs
      .map(ps => songs.find(s => s.id === ps.songId))
      .filter(Boolean)

    if (playlistSongs.length > 0) {
      setCurrentSong(playlistSongs[0]!)
      addManyToQueue(playlistSongs.slice(1) as any)
      navigate('/player')
    }
  }

  // 全部添加到队列
  const handleAddAllToQueue = () => {
    const playlistSongs = currentPlaylistSongs
      .map(ps => songs.find(s => s.id === ps.songId))
      .filter(Boolean)

    addManyToQueue(playlistSongs as any)
  }

  // 从歌单移除
  const handleRemoveFromPlaylist = async (playlistSong: PlaylistSong) => {
    if (currentPlaylist) {
      await removeSongFromPlaylist(currentPlaylist.id, playlistSong.songId)
    }
  }

  // 清空歌单
  const handleClearPlaylist = async () => {
    if (!currentPlaylist) return
    if (!confirm(`确定要清空歌单 "${currentPlaylist.name}" 吗？`)) return
    await clearPlaylist(currentPlaylist.id)
  }

  // 正在查看歌单详情
  if (currentPlaylist) {
    return (
      <div className="h-full flex flex-col">
        {/* 歌单头部 */}
        <header className="sticky top-0 bg-background/95 backdrop-blur z-10 p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToList}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-lg truncate">{currentPlaylist.name}</h1>
              <p className="text-sm text-white/60">
                共 {currentPlaylistSongs.length} 首歌曲
              </p>
            </div>
          </div>
        </header>

        {/* 操作按钮 */}
        {currentPlaylistSongs.length > 0 && (
          <div className="p-4 flex gap-2">
            <button
              onClick={handlePlayAll}
              className="flex-1 py-2.5 bg-primary rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              播放全部
            </button>
            <button
              onClick={handleAddAllToQueue}
              className="flex-1 py-2.5 bg-surface rounded-lg text-sm font-medium hover:bg-surface-variant transition-colors flex items-center justify-center gap-2"
            >
              <ListPlus className="w-4 h-4" />
              添加到队列
            </button>
            <button
              onClick={handleClearPlaylist}
              className="p-2.5 bg-surface rounded-lg text-white/60 hover:text-red-400 hover:bg-surface-variant transition-colors"
              title="清空歌单"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 歌曲列表 */}
        <div className="flex-1 overflow-y-auto px-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-white/40">
              加载中...
            </div>
          ) : currentPlaylistSongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/40">
              <Music className="w-12 h-12 mb-2 opacity-50" />
              <p>歌单为空</p>
              <p className="text-sm mt-1">从媒体库添加歌曲到这个歌单</p>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {currentPlaylistSongs.map((song, index) => (
                <div
                  key={song.id}
                  className="flex items-center gap-3 p-3 bg-surface rounded-lg hover:bg-surface-variant transition-colors cursor-pointer group"
                >
                  {/* 序号 */}
                  <div
                    onClick={() => handlePlaySong(song)}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/40 text-sm hover:bg-primary hover:text-white transition-colors"
                  >
                    {index + 1}
                  </div>

                  {/* 歌曲信息 */}
                  <div
                    className="flex-1 min-w-0"
                    onClick={() => handlePlaySong(song)}
                  >
                    <p className="font-medium truncate">{song.title || '未知歌曲'}</p>
                    <p className="text-sm text-white/60 truncate">{song.artist || '未知歌手'}</p>
                  </div>

                  {/* 删除按钮 */}
                  <button
                    onClick={() => handleRemoveFromPlaylist(song)}
                    className="p-2 text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    title="从歌单移除"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 歌单列表视图
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur z-10 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">歌单</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建
          </button>
        </div>
      </header>

      {/* 歌单列表 */}
      <div className="flex-1 overflow-y-auto px-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-white/40">
            加载中...
          </div>
        ) : playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/40">
            <ListMusic className="w-12 h-12 mb-2 opacity-50" />
            <p>暂无歌单</p>
            <p className="text-sm mt-1">点击上方按钮创建歌单</p>
          </div>
        ) : (
          <div className="space-y-2 py-2">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="flex items-center gap-3 p-3 bg-surface rounded-lg hover:bg-surface-variant transition-colors cursor-pointer group"
              >
                {/* 图标 */}
                <div
                  className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center"
                  onClick={() => handleSelectPlaylist(playlist)}
                >
                  <ListMusic className="w-6 h-6 text-primary" />
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0" onClick={() => handleSelectPlaylist(playlist)}>
                  <p className="font-medium truncate">{playlist.name}</p>
                  <p className="text-sm text-white/60">
                    {playlist.songCount} 首歌曲
                  </p>
                </div>

                {/* 菜单 */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpenId(menuOpenId === playlist.id ? null : playlist.id)
                    }}
                    className="p-2 text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {menuOpenId === playlist.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setMenuOpenId(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 bg-surface border border-white/10 rounded-lg shadow-lg py-1 min-w-[100px] z-20">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingPlaylist(playlist)
                            setEditName(playlist.name)
                            setEditDesc(playlist.description || '')
                            setMenuOpenId(null)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 text-left"
                        >
                          <Edit2 className="w-4 h-4" />
                          编辑
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeletePlaylist(playlist)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 text-left text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                          删除
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

      {/* 创建歌单弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-semibold mb-4">新建歌单</h3>
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="歌单名称"
              className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <textarea
              value={newPlaylistDesc}
              onChange={(e) => setNewPlaylistDesc(e.target.value)}
              placeholder="描述（可选）"
              className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 mb-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewPlaylistName('')
                  setNewPlaylistDesc('')
                }}
                className="px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim()}
                className="px-4 py-2 bg-primary rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑歌单弹窗 */}
      {editingPlaylist && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-semibold mb-4">编辑歌单</h3>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="歌单名称"
              className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="描述（可选）"
              className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 mb-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingPlaylist(null)}
                className="px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleUpdatePlaylist}
                disabled={!editName.trim()}
                className="px-4 py-2 bg-primary rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
