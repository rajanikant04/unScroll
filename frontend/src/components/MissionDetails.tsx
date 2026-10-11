import { useState, useEffect, useRef } from 'react'
import type { MissionItem } from '../types/mission'

interface MissionDetailsProps {
  mission: MissionItem
  onStartMission: () => void
  onAnotherMission: () => void
}

export default function MissionDetails({
  mission,
  onStartMission,
  onAnotherMission,
}: MissionDetailsProps) {
  const [isNarrating, setIsNarrating] = useState<boolean>(false)
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Stop narration if component unmounts or mission changes
  const stopNarration = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsNarrating(false)
    setIsLoadingAudio(false)
  }

  useEffect(() => {
    stopNarration()
  }, [mission.id])

  async function playMissionNarration(missionText: string) {
    // If currently playing, toggle off
    if (isNarrating) {
      stopNarration()
      return
    }

    setIsLoadingAudio(true)

    try {
      // 1. Request narration from FastAPI backend
      const response = await fetch('/api/voice/narrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: missionText }),
      })

      if (!response.ok) throw new Error('ElevenLabs service error')

      // 2. Turn stream into a playable audio blob
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsNarrating(false)
        URL.revokeObjectURL(audioUrl)
      }

      audio.onerror = () => {
        setIsNarrating(false)
        URL.revokeObjectURL(audioUrl)
      }

      // 3. Play audio (designed for mobile: user interaction unlocks audio playback)
      await audio.play()
      setIsLoadingAudio(false)
      setIsNarrating(true)
      console.log('Playing ElevenLabs narration...')
    } catch (error) {
      console.warn('ElevenLabs failed, falling back to browser speech synthesis.', error)
      setIsLoadingAudio(false)

      // 4. Fallback: Browser Web Speech API
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(missionText)
        utterance.rate = 1.0

        utterance.onend = () => setIsNarrating(false)
        utterance.onerror = () => setIsNarrating(false)

        window.speechSynthesis.speak(utterance)
        setIsNarrating(true)
      } else {
        alert('Speech narration is not supported on this device/browser.')
      }
    }
  }

  const narrationText = mission.narrationText || mission.title

  return (
    <div className="content">
      <span className="tag">{mission.tag}</span>
      <h1 className="title">{mission.title}</h1>
      <p className="desc">{mission.description}</p>

      <div className="actions">
        <button type="button" className="btn-primary" onClick={onStartMission}>
          Start mission
        </button>

        <button
          type="button"
          className={`btn-secondary ${isNarrating ? 'playing' : ''}`}
          onClick={() => playMissionNarration(narrationText)}
          title="Listen to mission narration"
          disabled={isLoadingAudio}
        >
          {isLoadingAudio ? (
            <>
              <span>⏳</span>
              <span>Loading audio...</span>
            </>
          ) : isNarrating ? (
            <>
              <span>🔊</span>
              <span>Pause narration</span>
            </>
          ) : (
            <>
              <span>🎧</span>
              <span>Listen</span>
            </>
          )}
        </button>

        <button type="button" className="btn-text" onClick={onAnotherMission}>
          Another mission
        </button>
      </div>
    </div>
  )
}
