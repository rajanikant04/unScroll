import { useReducer, useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import MissionCard from './components/MissionCard'
import MissionDetails from './components/MissionDetails'
import OutsideView from './components/OutsideView'
import CompleteView from './components/CompleteView'
import JourneyView from './components/JourneyView'
import Footer from './components/Footer'
import { getApiUrl } from './api'
import type {
  AppState,
  Action,
  ActiveSession,
  MissionDuration,
  MissionItem,
  ReflectionEntry,
  DayActivity,
} from './types/mission'
import './App.css'

const MISSIONS: MissionItem[] = [
  {
    id: 1,
    tag: "TODAY'S MISSION",
    title: 'Find a tree and spend two minutes looking at it.',
    description: 'Notice the bark, the leaves and what moves around it. No phone until you are done.',
    focus: 'Nature',
    baseXp: 40,
    step2: 'Go outside and find a tree.',
    narrationText:
      'Your mission today is to step outside and find a tree. Spend two quiet minutes observing its bark, its leaves, and whatever life moves around it. Put your phone away until you are finished.',
  },
  {
    id: 2,
    tag: 'SENSORY DETOX',
    title: 'Step outside, close your eyes, and identify 5 distinct sounds.',
    description: 'Listen past the distant traffic. Notice bird calls, leaves in the wind, or faint footsteps.',
    focus: 'Sensory',
    baseXp: 35,
    step2: 'Find a quiet spot and close your eyes.',
    narrationText:
      'Step into the open air. Close your eyes and gently listen. Identify five distinct sounds in the environment before checking your screen.',
  },
  {
    id: 3,
    tag: 'VISION RESET',
    title: 'Look at the furthest point on the horizon without squinting.',
    description: 'Rest your ciliary eye muscles after screen time. Breathe deeply and soften your gaze for two minutes.',
    focus: 'Vision',
    baseXp: 45,
    step2: 'Look toward the distant skyline or tree line.',
    narrationText:
      'Direct your gaze to the furthest visible point on the horizon. Soften your eyes, take three deep breaths, and let your screen fatigue dissolve.',
  },
]

interface AppFullState {
  view: AppState
  missions: MissionItem[]
  missionIndex: number
  selectedTime: MissionDuration
  streakCount: number
  lastActiveDate: string
  totalMinutes: number
  completedCount: number
  dailyActivityLog: Record<string, number>
  lastSevenDays: DayActivity[]
  reflections: ReflectionEntry[]
  activeSession: ActiveSession | null
}

const STORAGE_KEY_STREAK = 'unscroll_streak'
const STORAGE_KEY_LAST_DATE = 'unscroll_last_active_date'
const STORAGE_KEY_TOTAL_MINUTES = 'unscroll_total_minutes'
const STORAGE_KEY_COMPLETED_COUNT = 'unscroll_completed_count'
const STORAGE_KEY_REFLECTIONS = 'unscroll_reflections'
const STORAGE_KEY_DAILY_LOG = 'unscroll_daily_activity'

function getTodayDateStr(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getYesterdayDateStr(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function loadInitialStreak(): { streak: number; lastDate: string } {
  try {
    const savedStreak = localStorage.getItem(STORAGE_KEY_STREAK)
    const savedDate = localStorage.getItem(STORAGE_KEY_LAST_DATE)
    const savedCount = localStorage.getItem(STORAGE_KEY_COMPLETED_COUNT)
    const today = getTodayDateStr()
    const yesterday = getYesterdayDateStr()

    // If no missions were ever completed, streak is strictly 0 and legacy streak is wiped
    if (!savedCount || parseInt(savedCount, 10) <= 0) {
      localStorage.removeItem(STORAGE_KEY_STREAK)
      localStorage.removeItem(STORAGE_KEY_LAST_DATE)
      return { streak: 0, lastDate: '' }
    }

    if (savedStreak !== null && savedDate !== null) {
      const parsed = parseInt(savedStreak, 10)
      if (!isNaN(parsed) && parsed > 0) {
        if (savedDate === today || savedDate === yesterday) {
          return { streak: parsed, lastDate: savedDate }
        }
        return { streak: 0, lastDate: savedDate }
      }
    }
  } catch (err) {
    console.warn('Failed to read streak from localStorage:', err)
  }
  return { streak: 0, lastDate: '' }
}

function loadInitialTotalMinutes(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_TOTAL_MINUTES)
    if (saved !== null) {
      const parsed = parseInt(saved, 10)
      if (!isNaN(parsed) && parsed >= 0) return parsed
    }
  } catch (err) {
    console.warn('Failed to read total minutes from localStorage:', err)
  }
  return 0
}

function loadInitialCompletedCount(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_COMPLETED_COUNT)
    if (saved !== null) {
      const parsed = parseInt(saved, 10)
      if (!isNaN(parsed) && parsed >= 0) return parsed
    }
  } catch (err) {
    console.warn('Failed to read completed count from localStorage:', err)
  }
  return 0
}

function loadInitialReflections(): ReflectionEntry[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_REFLECTIONS)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (err) {
    console.warn('Failed to read reflections from localStorage:', err)
  }
  return []
}

function loadDailyActivityLog(): Record<string, number> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DAILY_LOG)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (typeof parsed === 'object' && parsed !== null) return parsed
    }
  } catch (err) {
    console.warn('Failed to read daily activity from localStorage:', err)
  }
  return {}
}

/**
 * Reconciles dailyActivityLog with totalMinutes and reflections.
 * Fixes any double-counted entries from previous StrictMode side-effects.
 */
function reconcileDailyActivityLog(
  dailyLog: Record<string, number>,
  totalMinutes: number,
  reflections: ReflectionEntry[]
): { log: Record<string, number>; total: number } {
  const cleanLog: Record<string, number> = {}
  let logSum = 0
  for (const [date, mins] of Object.entries(dailyLog)) {
    const m = typeof mins === 'number' ? mins : parseInt(String(mins), 10)
    if (!isNaN(m) && m > 0) {
      cleanLog[date] = m
      logSum += m
    }
  }

  const reflectionsSum = reflections.reduce((sum, r) => sum + (r.durationMinutes || 0), 0)
  const authoritativeTotal = Math.max(totalMinutes, reflectionsSum)

  // If daily log sum exceeds authoritative total (e.g. from reducer double-count bug)
  if (logSum > authoritativeTotal && authoritativeTotal > 0) {
    const dates = Object.keys(cleanLog)
    if (dates.length === 1) {
      cleanLog[dates[0]] = authoritativeTotal
    } else {
      const scale = authoritativeTotal / logSum
      let sumAllocated = 0
      dates.forEach((d, idx) => {
        if (idx === dates.length - 1) {
          cleanLog[d] = Math.max(0, authoritativeTotal - sumAllocated)
        } else {
          cleanLog[d] = Math.round(cleanLog[d] * scale)
          sumAllocated += cleanLog[d]
        }
      })
    }
  } else if (logSum === 0 && authoritativeTotal > 0) {
    const today = getTodayDateStr()
    cleanLog[today] = authoritativeTotal
  }

  return { log: cleanLog, total: authoritativeTotal }
}

function calculateLastSevenDays(dailyLog: Record<string, number>): DayActivity[] {
  const days: DayActivity[] = []
  const today = new Date()

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)

    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const dateKey = `${year}-${month}-${day}`

    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
    const dateLabel =
      i === 0
        ? 'Today'
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    const minutes = dailyLog[dateKey] || 0
    days.push({
      dayName,
      dateLabel,
      minutes,
      completed: minutes > 0,
    })
  }

  return days
}

// Step 8.1 Backend / Frontend Reward Rule:
// Mission XP = Completed Minutes (max 30), Reflection XP = 10
function calculateReward(completedMinutes: number, reflectionSaved: boolean): number {
  const missionXp = Math.max(1, Math.min(completedMinutes, 30))
  const reflectionXp = reflectionSaved ? 10 : 0
  return missionXp + reflectionXp
}

// Pure reducer with ZERO side-effects. React StrictMode invocations produce pure, deterministic results.
function appReducer(state: AppFullState, action: Action): AppFullState {
  const activeMission = MISSIONS[state.missionIndex]

  switch (action.type) {
    case 'START_MISSION': {
      const plannedMinutes =
        state.selectedTime === '5m' ? 5 : state.selectedTime === '15m' ? 15 : 30
      const startAt = Date.now()
      const endAt = startAt + plannedMinutes * 60_000
      const sessionId = action.sessionId || `session-${startAt}`

      return {
        ...state,
        view: 'outside',
        activeSession: {
          sessionId,
          missionId: activeMission.id,
          missionTitle: activeMission.title,
          startAt,
          endAt,
          plannedMinutes,
          elapsedMinutes: 0,
          completedMinutes: plannedMinutes,
          xpEarned: calculateReward(plannedMinutes, false),
        },
      }
    }

    case 'MISSION_FINISHED': {
      if (state.view !== 'outside' || !state.activeSession) {
        return state
      }

      const session = state.activeSession
      const completedMinutes = session.plannedMinutes
      const xpEarned = calculateReward(completedMinutes, false)

      const today = getTodayDateStr()
      const yesterday = getYesterdayDateStr()

      const updatedDailyLog = {
        ...state.dailyActivityLog,
        [today]: (state.dailyActivityLog[today] || 0) + completedMinutes,
      }
      const updatedDays = calculateLastSevenDays(updatedDailyLog)

      const newTotalMinutes = state.totalMinutes + completedMinutes
      const newCompletedCount = state.completedCount + 1

      // Accurate streak update
      let newStreak = state.streakCount
      if (state.lastActiveDate === today) {
        newStreak = Math.max(state.streakCount, 1)
      } else if (state.lastActiveDate === yesterday) {
        newStreak = state.streakCount + 1
      } else {
        newStreak = 1
      }

      return {
        ...state,
        view: 'complete',
        totalMinutes: newTotalMinutes,
        completedCount: newCompletedCount,
        streakCount: newStreak,
        lastActiveDate: today,
        dailyActivityLog: updatedDailyLog,
        lastSevenDays: updatedDays,
        activeSession: {
          ...session,
          completedMinutes,
          elapsedMinutes: completedMinutes,
          xpEarned,
        },
      }
    }

    case 'RETURN_EARLY': {
      if (state.view !== 'outside' || !state.activeSession) {
        return state
      }

      const session = state.activeSession
      const elapsedMinutes =
        action.elapsedMinutes !== undefined && action.elapsedMinutes > 0
          ? action.elapsedMinutes
          : Math.max(1, Math.round((Date.now() - session.startAt) / 60000))
      const xpEarned = calculateReward(elapsedMinutes, false)

      const today = getTodayDateStr()
      const yesterday = getYesterdayDateStr()

      const updatedDailyLog = {
        ...state.dailyActivityLog,
        [today]: (state.dailyActivityLog[today] || 0) + elapsedMinutes,
      }
      const updatedDays = calculateLastSevenDays(updatedDailyLog)

      const newTotalMinutes = state.totalMinutes + elapsedMinutes
      const newCompletedCount = state.completedCount + 1

      // Accurate streak update
      let newStreak = state.streakCount
      if (state.lastActiveDate === today) {
        newStreak = Math.max(state.streakCount, 1)
      } else if (state.lastActiveDate === yesterday) {
        newStreak = state.streakCount + 1
      } else {
        newStreak = 1
      }

      return {
        ...state,
        view: 'complete',
        totalMinutes: newTotalMinutes,
        completedCount: newCompletedCount,
        streakCount: newStreak,
        lastActiveDate: today,
        dailyActivityLog: updatedDailyLog,
        lastSevenDays: updatedDays,
        activeSession: {
          ...session,
          completedMinutes: elapsedMinutes,
          elapsedMinutes,
          xpEarned,
        },
      }
    }

    case 'SAVE_REFLECTION': {
      const session = state.activeSession
      const completedMinutes = session ? session.completedMinutes : 15
      const xpEarned = calculateReward(completedMinutes, true)
      const today = getTodayDateStr()

      const formattedDate =
        new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ', ' +
        new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

      const newReflection: ReflectionEntry = {
        id: `ref-${Date.now()}`,
        missionTitle: session ? session.missionTitle : activeMission.title,
        durationMinutes: completedMinutes,
        xpEarned,
        reflectionText: action.reflectionText,
        date: formattedDate,
      }

      return {
        ...state,
        view: 'journey',
        lastActiveDate: today,
        reflections: [newReflection, ...state.reflections],
        activeSession: null,
      }
    }

    case 'RESET_JOURNEY': {
      return {
        ...state,
        totalMinutes: 0,
        completedCount: 0,
        streakCount: 0,
        lastActiveDate: '',
        reflections: [],
        dailyActivityLog: {},
        lastSevenDays: calculateLastSevenDays({}),
      }
    }

    case 'OPEN_JOURNEY':
      return { ...state, view: 'journey' }

    case 'BACK_TO_MISSION':
      return { ...state, view: 'mission' }

    case 'SET_DURATION':
      return { ...state, selectedTime: action.duration }

    case 'CYCLE_MISSION':
      return { ...state, missionIndex: (state.missionIndex + 1) % state.missions.length }

    case 'SET_CURRENT_MISSION':
      return {
        ...state,
        missions: [action.mission, ...state.missions],
        missionIndex: 0,
      }

    default:
      return state
  }
}

export default function App() {
  const initialStreakData = loadInitialStreak()
  const rawDailyLog = loadDailyActivityLog()
  const rawTotalMinutes = loadInitialTotalMinutes()
  const initialReflections = loadInitialReflections()
  const initialCompletedCount = loadInitialCompletedCount()

  const { log: initialDailyLog, total: initialTotalMinutes } = reconcileDailyActivityLog(
    rawDailyLog,
    rawTotalMinutes,
    initialReflections
  )
  const initialLastSevenDays = calculateLastSevenDays(initialDailyLog)

  const [state, dispatch] = useReducer(appReducer, {
    view: 'mission',
    missions: MISSIONS,
    missionIndex: 0,
    selectedTime: '15m',
    streakCount: initialStreakData.streak,
    lastActiveDate: initialStreakData.lastDate,
    totalMinutes: initialTotalMinutes,
    completedCount: initialCompletedCount,
    dailyActivityLog: initialDailyLog,
    lastSevenDays: initialLastSevenDays,
    reflections: initialReflections,
    activeSession: null,
  })

  const [isGeneratingMission, setIsGeneratingMission] = useState<boolean>(false)

  // Sync state changes to localStorage cleanly without reducer side-effects
  useEffect(() => {
    try {
      if (
        state.completedCount === 0 &&
        state.totalMinutes === 0 &&
        state.reflections.length === 0 &&
        Object.keys(state.dailyActivityLog).length === 0
      ) {
        localStorage.removeItem(STORAGE_KEY_STREAK)
        localStorage.removeItem(STORAGE_KEY_LAST_DATE)
        localStorage.removeItem(STORAGE_KEY_TOTAL_MINUTES)
        localStorage.removeItem(STORAGE_KEY_COMPLETED_COUNT)
        localStorage.removeItem(STORAGE_KEY_REFLECTIONS)
        localStorage.removeItem(STORAGE_KEY_DAILY_LOG)
      } else {
        localStorage.setItem(STORAGE_KEY_TOTAL_MINUTES, String(state.totalMinutes))
        localStorage.setItem(STORAGE_KEY_COMPLETED_COUNT, String(state.completedCount))
        localStorage.setItem(STORAGE_KEY_DAILY_LOG, JSON.stringify(state.dailyActivityLog))
        if (state.streakCount > 0 && state.lastActiveDate) {
          localStorage.setItem(STORAGE_KEY_STREAK, String(state.streakCount))
          localStorage.setItem(STORAGE_KEY_LAST_DATE, state.lastActiveDate)
        }
        localStorage.setItem(STORAGE_KEY_REFLECTIONS, JSON.stringify(state.reflections))
      }
    } catch (err) {
      console.warn('Failed to sync journey progress to localStorage:', err)
    }
  }, [
    state.totalMinutes,
    state.completedCount,
    state.dailyActivityLog,
    state.streakCount,
    state.lastActiveDate,
    state.reflections,
  ])

  const activeMission = state.missions[state.missionIndex] || MISSIONS[0]
  const plannedMinutes =
    state.selectedTime === '5m' ? 5 : state.selectedTime === '15m' ? 15 : 30
  const previewRewardXp = calculateReward(plannedMinutes, false)

  // Fetch Gemma 2 generated mission with policy validation, fallback to local cycling
  const handleAnotherMission = async () => {
    setIsGeneratingMission(true)
    try {
      const dur = state.selectedTime === '5m' ? 5 : state.selectedTime === '15m' ? 15 : 30
      const res = await fetch(getApiUrl('/api/missions/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'nature', duration_minutes: dur }),
      })
      if (res.ok) {
        const data = await res.json()
        const newMission: MissionItem = {
          id: data.id || `gen-${Date.now()}`,
          tag: `${(data.category || 'outdoor').toUpperCase()} MISSION`,
          title: data.title,
          description: data.instructions ? data.instructions.join(' ') : data.title,
          focus: (data.category || 'Nature').charAt(0).toUpperCase() + (data.category || 'Nature').slice(1),
          baseXp: data.reward_xp || 20,
          step2: data.instructions && data.instructions[0] ? data.instructions[0] : 'Step outside and begin.',
          narrationText: `Your mission is: ${data.title}. ${data.instructions ? data.instructions.join(' ') : ''} Put your phone away until finished.`,
        }
        dispatch({ type: 'SET_CURRENT_MISSION', mission: newMission })
        return
      }
    } catch {
      // Local fallback
    } finally {
      setIsGeneratingMission(false)
    }
    dispatch({ type: 'CYCLE_MISSION' })
  }

  return (
    <div className="page">
      {/* 1. OUTSIDE VIEW */}
      {state.view === 'outside' && state.activeSession ? (
        <OutsideView
          duration={state.selectedTime}
          missionTitle={state.activeSession.missionTitle}
          startAt={state.activeSession.startAt}
          endAt={state.activeSession.endAt}
          onMissionFinished={() => dispatch({ type: 'MISSION_FINISHED' })}
          onReturnEarly={(elapsedMinutes) => dispatch({ type: 'RETURN_EARLY', elapsedMinutes })}
          onCancel={() => dispatch({ type: 'BACK_TO_MISSION' })}
        />
      ) : (
        <>
          {/* Global Navbar */}
          <Navbar
            currentView={state.view}
            onSelectView={(v) => {
              if (v === 'journey') dispatch({ type: 'OPEN_JOURNEY' })
              else dispatch({ type: 'BACK_TO_MISSION' })
            }}
            streakCount={state.streakCount}
          />

          {/* 2. MISSION VIEW */}
          {state.view === 'mission' && (
            <main className="container">
              <MissionCard
                selectedTime={state.selectedTime}
                onSelectTime={(duration) => dispatch({ type: 'SET_DURATION', duration })}
                focus={activeMission.focus}
                rewardXp={previewRewardXp}
                step2={activeMission.step2}
              />

              <MissionDetails
                mission={activeMission}
                onStartMission={() => dispatch({ type: 'START_MISSION' })}
                onAnotherMission={handleAnotherMission}
                isGenerating={isGeneratingMission}
              />
            </main>
          )}

          {/* 3. COMPLETE VIEW */}
          {state.view === 'complete' && (
            <main className="container-centered">
              <CompleteView
                completedDurationMinutes={
                  state.activeSession ? state.activeSession.completedMinutes : 15
                }
                xpEarned={
                  state.activeSession
                    ? state.activeSession.xpEarned + 10 // Previews total with reflection bonus
                    : 25
                }
                missionTitle={
                  state.activeSession ? state.activeSession.missionTitle : activeMission.title
                }
                onSaveReflection={(reflectionText) =>
                  dispatch({ type: 'SAVE_REFLECTION', reflectionText })
                }
                onNextMission={() => {
                  dispatch({ type: 'CYCLE_MISSION' })
                  dispatch({ type: 'BACK_TO_MISSION' })
                }}
              />
            </main>
          )}

          {/* 4. JOURNEY VIEW */}
          {state.view === 'journey' && (
            <main className="container-journey">
              <JourneyView
                totalMinutes={state.totalMinutes}
                completedMissionsCount={state.completedCount}
                streakCount={state.streakCount}
                lastSevenDays={state.lastSevenDays}
                reflections={state.reflections}
                onNewMission={() => dispatch({ type: 'BACK_TO_MISSION' })}
                onResetJourney={() => dispatch({ type: 'RESET_JOURNEY' })}
              />
            </main>
          )}

          <Footer />
        </>
      )}
    </div>
  )
}
