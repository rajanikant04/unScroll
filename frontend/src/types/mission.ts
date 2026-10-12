export type AppState = 'mission' | 'outside' | 'complete' | 'journey'
export type ViewMode = AppState

export type MissionDuration = '5m' | '15m' | '30m'

export interface ActiveSession {
  sessionId: string
  missionId: number | string
  missionTitle: string
  startAt: number
  endAt: number
  plannedMinutes: number
  elapsedMinutes: number
  completedMinutes: number
  xpEarned: number
}

export type Action =
  | { type: 'START_MISSION'; sessionId?: string }
  | { type: 'MISSION_FINISHED' }
  | { type: 'RETURN_EARLY'; elapsedMinutes?: number }
  | { type: 'SAVE_REFLECTION'; reflectionText: string }
  | { type: 'OPEN_JOURNEY' }
  | { type: 'BACK_TO_MISSION' }
  | { type: 'SET_DURATION'; duration: MissionDuration }
  | { type: 'CYCLE_MISSION' }
  | { type: 'SET_CURRENT_MISSION'; mission: MissionItem }
  | { type: 'RESET_JOURNEY' }

export interface MissionItem {
  id: number | string
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
