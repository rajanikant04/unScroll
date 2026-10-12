import { useEffect, useState, useRef, useCallback } from 'react'
import type { MissionDuration } from '../types/mission'

interface OutsideViewProps {
  duration: MissionDuration
  missionTitle: string
  startAt: number
  endAt: number
  onMissionFinished: () => void
  onReturnEarly: (elapsedMinutes: number) => void
  onCancel: () => void
}

function getRemainingSeconds(endAt: number): number {
  return Math.max(0, Math.ceil((endAt - Date.now()) / 1000))
}

export default function OutsideView({
  duration,
  missionTitle,
  startAt,
  endAt,
  onMissionFinished,
  onReturnEarly,
  onCancel,
}: OutsideViewProps) {
  const [timeLeft, setTimeLeft] = useState<number>(() => getRemainingSeconds(endAt))
  const [isDimmed, setIsDimmed] = useState<boolean>(false)
  const [chimePlaying, setChimePlaying] = useState<boolean>(false)
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const finishedTriggeredRef = useRef<boolean>(false)

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Procedural Web Audio API chime (Solfeggio 528 Hz + harmonic overtone)
  const playChime = useCallback((isCompletion: boolean = false) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = audioCtxRef.current || new AudioCtx()
      audioCtxRef.current = ctx

      setChimePlaying(true)
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      // Primary 528 Hz, secondary 660 Hz harmonic bell
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(528, ctx.currentTime)
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(660, ctx.currentTime)

      const durationSecs = isCompletion ? 4.0 : 2.5
      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSecs)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start()
      osc2.start()
      osc1.stop(ctx.currentTime + durationSecs)
      osc2.stop(ctx.currentTime + durationSecs)

      setTimeout(() => setChimePlaying(false), durationSecs * 1000)
    } catch (e) {
      console.warn('Audio playback not permitted or unavailable:', e)
      setChimePlaying(false)
    }
  }, [])

  // Step 5.2 Countdown with real clock & visibilitychange
  useEffect(() => {
    const updateCountdown = () => {
      const remaining = getRemainingSeconds(endAt)
      setTimeLeft(remaining)

      if (remaining <= 0 && !finishedTriggeredRef.current) {
        finishedTriggeredRef.current = true
        playChime(true)
        // Transition to complete page after gentle completion chime
        setTimeout(() => {
          onMissionFinished()
        }, 1200)
      }
    }

    // 1. Regular tick
    const timer = setInterval(updateCountdown, 500)

    // 2. Recalculate immediately when tab or device wakes up
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateCountdown()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [endAt, onMissionFinished, playChime])

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Handle "I'm back" button
  const handleImBack = () => {
    if (finishedTriggeredRef.current) return
    finishedTriggeredRef.current = true

    const elapsedSeconds = Math.max(1, Math.round((Date.now() - startAt) / 1000))
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60))

    if (getRemainingSeconds(endAt) <= 0) {
      onMissionFinished()
    } else {
      // Early return with actual elapsed time
      onReturnEarly(elapsedMinutes)
    }
  }

  return (
    <div className={`outside-screen ${isDimmed ? 'dimmed' : ''}`}>
      {/* Offline Mode Indicator */}
      {!isOnline && (
        <div className="offline-badge" title="Missions and timer function fully offline">
          <span>📡 Offline Mode Active — Local Missions & Timer Running</span>
        </div>
      )}

      {/* Low-stimulation Dimmed Screen Overlay */}
      {isDimmed && (
        <div className="dim-badge" onClick={() => setIsDimmed(false)}>
          <span>🌙 Low-stimulation screen active. Tap anywhere or tap "Undim screen" to restore.</span>
        </div>
      )}

      {/* Concentric timer circles */}
      <div className="timer-concentric-container">
        <div className="timer-outer-ring"></div>
        <div className="timer-inner-ring">
          <span className="timer-display">{formatTime(timeLeft)}</span>
        </div>
      </div>

      <h1 className="active-mission-title">You are outside. Put the phone away.</h1>
      <p className="active-mission-desc">
        {missionTitle ? `Focus on: ${missionTitle} (${duration})` : `Keep walking without checking your screen (${duration}).`}
      </p>

      {/* Safety Prompt */}
      <div className="safety-stationary-notice">
        <span>⚠️ Put your phone in your pocket. Only interact when safely stationary.</span>
      </div>

      {/* Primary Action Button */}
      <div className="outside-main-action">
        <button type="button" className="btn-im-back" onClick={handleImBack}>
          I'm back
        </button>
      </div>

      {/* Secondary Controls: Dim screen, Chime test, Cancel mission */}
      <div className="outside-secondary-controls">
        <button
          type="button"
          className={`btn-outside-tool ${isDimmed ? 'active' : ''}`}
          onClick={() => setIsDimmed((prev) => !prev)}
        >
          {isDimmed ? '☀️ Undim screen' : '🌙 Dim screen'}
        </button>

        <button
          type="button"
          className={`btn-outside-tool ${chimePlaying ? 'active' : ''}`}
          onClick={() => playChime(false)}
        >
          {chimePlaying ? '🔔 Chime playing...' : '🔔 Chime test'}
        </button>

        <button type="button" className="btn-cancel-mission" onClick={onCancel}>
          Cancel mission
        </button>
      </div>
    </div>
  )
}
