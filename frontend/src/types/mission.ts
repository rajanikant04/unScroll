export type ViewMode = 'mission' | 'outside' | 'complete' | 'journey'

export type MissionDuration = '5m' | '15m' | '30m'

export interface MissionItem {
  id: number
  tag: string
  title: string
  description: string
  focus: string
  baseXp: number
  step2: string
  narrationText: string
}

export interface ReflectionEntry {
  id: string
  missionTitle: string
  durationMinutes: number
  xpEarned: number
  reflectionText: string
  date: string
}

export interface DayActivity {
  dayName: string
  dateLabel: string
  minutes: number
  completed: boolean
}
