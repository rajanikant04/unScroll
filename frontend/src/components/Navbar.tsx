import type { ViewMode } from '../types/mission'

interface NavbarProps {
  currentView: ViewMode
  onSelectView: (view: ViewMode) => void
  streakCount: number
}

export default function Navbar({
  currentView,
  onSelectView,
  streakCount,
}: NavbarProps) {
  return (
    <header className="navbar">
      <div className="nav-left">
        <button
          type="button"
          className="logo-btn"
          onClick={() => onSelectView('mission')}
        >
          unscroll
        </button>
      </div>

      <div className="nav-center">
        <button
          type="button"
          className={`nav-btn ${currentView === 'mission' ? 'active' : ''}`}
          onClick={() => onSelectView('mission')}
        >
          Mission...
        </button>

        <button
          type="button"
          className={`nav-btn ${currentView === 'journey' ? 'active' : ''}`}
          onClick={() => onSelectView('journey')}
        >
          Journey
        </button>
      </div>

      <div className="nav-right">
        <button
          type="button"
          className="nav-btn nav-btn-streak"
          onClick={() => onSelectView('journey')}
          title="View your streak & journey"
        >
          🔥 {streakCount} Day Streak
        </button>
      </div>
    </header>
  )
}
