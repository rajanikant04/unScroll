import { useEffect, useState, useRef } from 'react'
import type { MissionDuration } from '../types/mission'

interface OutsideViewProps {
  duration: MissionDuration
  missionTitle: string
  onImBack: (elapsedMinutes: number) => void
  onCancel: () => void
}

export default function OutsideView({
  duration,
  missionTitle,
  onImBack,
  onCancel,
}: OutsideViewProps) {
  const getInitialSeconds = (d: MissionDuration) => {
    switch (d) {
      case '5m':
        return 5 * 60
      case '15m':
        return 15 * 60
      case '30m':
        return 30 * 60
      default:
        return 15 * 60
    }
  }

  const initialSecs = getInitialSeconds(duration)
  const [timeLeft, setTimeLeft] = useState<number>(initialSecs)
  const [isDimmed, setIsDimmed] = useState<boolean>(false)
  const [chimePlaying, setChimePlaying] = useState<boolean>(false)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Play a mindful chime using procedural Web Audio API (sine wave bell chime)
  const handleChimeTest = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = audioCtxRef.current || new AudioCtx()
      audioCtxRef.current = ctx

      setChimePlaying(true)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      // 528 Hz - Solfeggio frequency for transformation & tranquility
      osc.type = 'sine'
      osc.frequency.setValueAtTime(528, ctx.currentTime)

      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.2)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 3.3)

      setTimeout(() => setChimePlaying(false), 3300)
    } catch (e) {
      console.warn('Audio not allowed yet:', e)
      setChimePlaying(false)
    }
  }

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleFinish = () => {
    const elapsedSeconds = initialSecs - timeLeft
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60))
    onImBack(elapsedMinutes)
  }

  return (
    <div className={`outside-screen ${isDimmed ? 'dimmed' : ''}`}>
      {isDimmed && (
        <div className="dim-badge" onClick={() => setIsDimmed(false)}>
          <span>Screen is dimmed for low stimulation. Tap anywhere or tap "Dim screen" to restore.</span>
        </div>
      )}

      {/* Concentric timer circles matching the image */}
      <div className="timer-concentric-container">
        <div className="timer-outer-ring"></div>
        <div className="timer-inner-ring">
          <span className="timer-display">{formatTime(timeLeft)}</span>
        </div>
      </div>

      <h1 className="active-mission-title">You are outside. Put the phone away.</h1>
      <p className="active-mission-desc">
        {missionTitle ? `Focus on: ${missionTitle}` : 'Keep walking without checking your screen.'}
      </p>

      {/* Primary Action Button */}
      <div className="outside-main-action">
        <button type="button" className="btn-im-back" onClick={handleFinish}>
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
          onClick={handleChimeTest}
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
