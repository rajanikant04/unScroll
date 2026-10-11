import type { MissionDuration } from '../types/mission'

interface MissionCardProps {
  selectedTime: MissionDuration
  onSelectTime: (time: MissionDuration) => void
  focus?: string
  rewardXp?: number
  step2?: string
}

export default function MissionCard({
  selectedTime,
  onSelectTime,
  focus = 'Nature',
  rewardXp = 40,
  step2 = 'Go outside and find a tree.',
}: MissionCardProps) {
  const durations: MissionDuration[] = ['5m', '15m', '30m']

  return (
    <div className="card">
      <div className="card-top">
        <div className="metric">
          <span className="label">Time</span>
          <div className="time-pills">
            {durations.map((time) => (
              <button
                key={time}
                type="button"
                className={`pill ${selectedTime === time ? 'active' : ''}`}
                onClick={() => onSelectTime(time)}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        <div className="metric">
          <span className="label">Focus</span>
          <span className="value">{focus}</span>
        </div>

        <div className="metric">
          <span className="label">Reward</span>
          <span className="value">{rewardXp} XP</span>
        </div>
      </div>

      <hr className="divider" />

      <div className="card-section">
        <h2 className="serif-title">How it works</h2>
        <ol className="steps">
          <li>1. Start the mission, then put your phone away.</li>
          <li>2. {step2}</li>
          <li>3. Come back, tap 'I'm back' and add a short reflection.</li>
        </ol>
      </div>
    </div>
  )
}
