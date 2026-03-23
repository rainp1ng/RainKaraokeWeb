import { NavLink } from 'react-router-dom'
import { Library, ListMusic, Settings, Disc3, Megaphone } from 'lucide-react'

const navItems = [
  { to: '/', icon: Library, label: '媒体库' },
  { to: '/playlists', icon: Disc3, label: '歌单' },
  { to: '/queue', icon: ListMusic, label: '队列' },
  { to: '/atmosphere', icon: Megaphone, label: '气氛组' },
  { to: '/settings', icon: Settings, label: '设置' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-white/10 safe-area-bottom z-50">
      <div className="flex justify-around items-center h-14 md:h-16">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-white/60 hover:text-white/80'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
