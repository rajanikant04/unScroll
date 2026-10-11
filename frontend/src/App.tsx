import { useState } from 'react'
import Navbar from './components/Navbar'
import MissionCard from './components/MissionCard'
import MissionDetails from './components/MissionDetails'
import OutsideView from './components/OutsideView'
import CompleteView from './components/CompleteView'
import JourneyView from './components/JourneyView'
import Footer from './components/Footer'
import type {
  ViewMode,
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

const INITIAL_DAYS: DayActivity[] = [
  { dayName: 'Mon', dateLabel: 'Oct 5', minutes: 20, completed: true },
  { dayName: 'Tue', dateLabel: 'Oct 6', minutes: 15, completed: true },
  { dayName: 'Wed', dateLabel: 'Oct 7', minutes: 0, completed: false },
  { dayName: 'Thu', dateLabel: 'Oct 8', minutes: 30, completed: true },
  { dayName: 'Fri', dateLabel: 'Oct 9', minutes: 15, completed: true },
  { dayName: 'Sat', dateLabel: 'Oct 10', minutes: 25, completed: true },
  { dayName: 'Sun', dateLabel: 'Today', minutes: 15, completed: true },
]

const INITIAL_REFLECTIONS: ReflectionEntry[] = [
  {
    id: 'ref-1',
    missionTitle: 'Find a tree and spend two minutes looking at it.',
    durationMinutes: 15,
    xpEarned: 60,
    reflectionText: 'Felt calm noticing how the sun filtered through the autumn canopy. My shoulders immediately lowered.',
    date: 'Yesterday, 5:45 PM',
  },
  {
    id: 'ref-2',
    missionTitle: 'Look at the furthest point on the horizon without squinting.',
    durationMinutes: 20,
    xpEarned: 50,
    reflectionText: 'Eye strain from 6 hours of laptop work completely dissipated after 5 minutes of distance gazing.',
    date: 'Oct 8, 6:15 PM',
  },
]

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('mission')
  const [missionIndex, setMissionIndex] = useState<number>(0)
  const [selectedTime, setSelectedTime] = useState<MissionDuration>('15m')
  const [streakCount, setStreakCount] = useState<number>(5)
  const [totalMinutes, setTotalMinutes] = useState<number>(120)
  const [completedCount, setCompletedCount] = useState<number>(7)
  const [lastSevenDays, setLastSevenDays] = useState<DayActivity[]>(INITIAL_DAYS)
  const [reflections, setReflections] = useState<ReflectionEntry[]>(INITIAL_REFLECTIONS)

  // Recent completion cache
  const [lastCompletedMinutes, setLastCompletedMinutes] = useState<number>(15)
  const [lastEarnedXp, setLastEarnedXp] = useState<number>(60)

  const activeMission = MISSIONS[missionIndex]

  // Dynamic reward calculation
  const multiplier = selectedTime === '5m' ? 1 : selectedTime === '15m' ? 1.5 : 2.5
  const currentRewardXp = Math.round(activeMission.baseXp * multiplier)

  const handleStartMission = () => {
    setCurrentView('outside')
  }

  const handleImBackFromOutside = (elapsedMinutes: number) => {
    const plannedMinutes = selectedTime === '5m' ? 5 : selectedTime === '15m' ? 15 : 30
    const finalMinutes = Math.max(elapsedMinutes, plannedMinutes)

    setLastCompletedMinutes(finalMinutes)
    setLastEarnedXp(currentRewardXp)
    setTotalMinutes((prev) => prev + finalMinutes)

    // Mark today as active in the 7-day tracker
    setLastSevenDays((prev) =>
      prev.map((d) =>
        d.dayName === 'Sun' || d.dateLabel === 'Today'
          ? { ...d, minutes: d.minutes + finalMinutes, completed: true }
          : d
      )
    )

    setCurrentView('complete')
  }

  const handleSaveReflection = (reflectionText: string) => {
    const newEntry: ReflectionEntry = {
      id: `ref-${Date.now()}`,
      missionTitle: activeMission.title,
      durationMinutes: lastCompletedMinutes,
      xpEarned: lastEarnedXp,
      reflectionText,
      date: 'Today, Just now',
    }

    setReflections((prev) => [newEntry, ...prev])
    setCompletedCount((prev) => prev + 1)
    setStreakCount((prev) => prev + 1)
    setCurrentView('journey')
  }

  const handleNextMission = () => {
    setMissionIndex((prev) => (prev + 1) % MISSIONS.length)
    setCurrentView('mission')
  }

  const handleCycleMission = () => {
    setMissionIndex((prev) => (prev + 1) % MISSIONS.length)
  }

  return (
    <div className="page">
      {/* 1. OUTSIDE VIEW */}
      {currentView === 'outside' ? (
        <OutsideView
          duration={selectedTime}
          missionTitle={activeMission.title}
          onImBack={handleImBackFromOutside}
          onCancel={() => setCurrentView('mission')}
        />
      ) : (
        <>
          {/* Global Navbar for Mission, Complete, and Journey */}
          <Navbar
            currentView={currentView}
            onSelectView={setCurrentView}
            streakCount={streakCount}
          />

          {/* 2. MISSION VIEW */}
          {currentView === 'mission' && (
            <main className="container">
              <MissionCard
                selectedTime={selectedTime}
                onSelectTime={setSelectedTime}
                focus={activeMission.focus}
                rewardXp={currentRewardXp}
                step2={activeMission.step2}
              />

              <MissionDetails
                mission={activeMission}
                onStartMission={handleStartMission}
                onAnotherMission={handleCycleMission}
              />
            </main>
          )}

          {/* 3. COMPLETE VIEW */}
          {currentView === 'complete' && (
            <main className="container-centered">
              <CompleteView
                completedDurationMinutes={lastCompletedMinutes}
                xpEarned={lastEarnedXp}
                missionTitle={activeMission.title}
                onSaveReflection={handleSaveReflection}
                onNextMission={handleNextMission}
              />
            </main>
          )}

          {/* 4. JOURNEY VIEW */}
          {currentView === 'journey' && (
            <main className="container-journey">
              <JourneyView
                totalMinutes={totalMinutes}
                completedMissionsCount={completedCount}
                streakCount={streakCount}
                lastSevenDays={lastSevenDays}
                reflections={reflections}
                onNewMission={() => setCurrentView('mission')}
              />
            </main>
          )}

          <Footer />
        </>
      )}
    </div>
  )
}
