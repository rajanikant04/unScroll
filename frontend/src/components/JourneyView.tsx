import type { ReflectionEntry, DayActivity } from '../types/mission'

interface JourneyViewProps {
  totalMinutes: number
  completedMissionsCount: number
  streakCount: number
  lastSevenDays: DayActivity[]
  reflections: ReflectionEntry[]
  onNewMission: () => void
  onResetJourney?: () => void
}

export default function JourneyView({
  totalMinutes,
  completedMissionsCount,
  streakCount,
  lastSevenDays,
  reflections,
  onNewMission,
  onResetJourney,
}: JourneyViewProps) {
  return (
    <div className="journey-screen">
      <div className="journey-header">
        <div>
          <span className="tag">MINDFUL ODYSSEY</span>
          <h1 className="title journey-title">Your Outdoor Journey</h1>
          <p className="desc journey-desc">
            Reclaiming attention and presence in nature. Every minute outside resets your dopamine baseline.
          </p>
        </div>

        <div className="journey-header-actions">
          <button type="button" className="btn-primary" onClick={onNewMission}>
            Start new mission
          </button>
          {onResetJourney && (totalMinutes > 0 || completedMissionsCount > 0 || reflections.length > 0) && (
            <button
              type="button"
              className="btn-text btn-reset-stats"
              onClick={() => {
                if (window.confirm('Reset all saved outdoor journey progress and reflections?')) {
                  onResetJourney()
                }
              }}
              title="Clear journey history from local storage"
            >
              Reset data
            </button>
          )}
        </div>
      </div>

      {/* Top 3 Stats Metrics */}
      <div className="journey-stats-row">
        <div className="journey-metric-card">
          <div className="metric-icon-wrap">⏱️</div>
          <div className="metric-info">
            <span className="metric-num">{totalMinutes} min</span>
            <span className="metric-sub">Total Outdoor Time</span>
          </div>
        </div>

        <div className="journey-metric-card">
          <div className="metric-icon-wrap">🎯</div>
          <div className="metric-info">
            <span className="metric-num">{completedMissionsCount}</span>
            <span className="metric-sub">Completed Missions</span>
          </div>
        </div>

        <div className="journey-metric-card">
          <div className="metric-icon-wrap">{streakCount > 0 ? '🔥' : '🌱'}</div>
          <div className="metric-info">
            <span className="metric-num">{streakCount} {streakCount === 1 ? 'Day' : 'Days'}</span>
            <span className="metric-sub">Daily Consistency Streak</span>
          </div>
        </div>
      </div>

      {/* The Last Seven Days Activity Tracker */}
      <div className="journey-section">
        <div className="journey-section-header">
          <h2 className="serif-title">The Last Seven Days</h2>
          <span className="journey-section-hint">Daily outdoor vitality reset</span>
        </div>

        <div className="seven-days-grid">
          {lastSevenDays.map((day, idx) => (
            <div
              key={idx}
              className={`day-card ${day.completed ? 'active-day' : 'inactive-day'}`}
            >
              <span className="day-name">{day.dayName}</span>
              <div className="day-bar-container">
                <div
                  className="day-bar"
                  style={{
                    height: day.completed
                      ? `${Math.min(100, Math.max(30, (day.minutes / 45) * 100))}%`
                      : '8%',
                  }}
                ></div>
              </div>
              <span className="day-minutes">
                {day.minutes > 0 ? `${day.minutes}m` : '—'}
              </span>
              <span className="day-status">
                {day.completed ? '✓' : '•'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Past Reflections Section */}
      <div className="journey-section">
        <div className="journey-section-header">
          <h2 className="serif-title">Past Reflections</h2>
          <span className="journey-section-hint">
            {reflections.length} {reflections.length === 1 ? 'reflection' : 'reflections'} recorded
          </span>
        </div>

        {reflections.length === 0 ? (
          <div className="reflections-empty">
            <p>No reflections recorded yet. Complete your first mission and jot down what you noticed outside!</p>
          </div>
        ) : (
          <div className="reflections-list">
            {reflections.map((entry) => (
              <div key={entry.id} className="reflection-card">
                <div className="reflection-card-header">
                  <h3 className="reflection-mission-title">{entry.missionTitle}</h3>
                  <div className="reflection-meta">
                    <span className="reflection-time-tag">{entry.durationMinutes} min outdoor</span>
                    <span className="reflection-xp-tag">+{entry.xpEarned} XP</span>
                    <span className="reflection-date">{entry.date}</span>
                  </div>
                </div>
                <p className="reflection-text">"{entry.reflectionText}"</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
