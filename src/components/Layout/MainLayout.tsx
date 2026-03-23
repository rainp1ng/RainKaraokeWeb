import { Outlet, useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import PlayerBar from '../Player/PlayerBar'
import GlobalPlayer from '../Player/GlobalPlayer'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

export default function MainLayout() {
  const location = useLocation()
  // 初始化全局键盘快捷键
  useKeyboardShortcuts()

  // 在播放页面不显示 PlayerBar（播放页面有自己的控制界面）
  const isPlayerPage = location.pathname === '/player'

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 全局播放器 - 管理唯一的 video 元素 */}
      <GlobalPlayer />

      {/* Main content area - 增加底部padding避免被播放栏遮挡 */}
      <main className="flex-1 overflow-y-auto pb-16">
        {/* 内容区域 - 额外底部空间供播放栏和导航栏 */}
        <div className={!isPlayerPage ? 'pb-56 md:pb-64' : ''}>
          <Outlet />
        </div>
      </main>

      {/* Player bar - 只在非播放页面显示 */}
      {!isPlayerPage && <PlayerBar />}

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  )
}
