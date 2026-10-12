import { useState, useRef } from 'react'
import { getApiUrl } from '../api'

interface CompleteViewProps {
  completedDurationMinutes: number
  xpEarned: number
  missionTitle: string
  onSaveReflection: (reflectionText: string) => void
  onNextMission: () => void
}

export default function CompleteView({
  completedDurationMinutes,
  xpEarned,
  missionTitle,
  onSaveReflection,
  onNextMission,
}: CompleteViewProps) {
  const [reflection, setReflection] = useState<string>('')
  const [isSaved, setIsSaved] = useState<boolean>(false)
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const handleSave = () => {
    setIsSaved(true)
    onSaveReflection(reflection.trim() || 'Mindful outdoor reset completed.')
  }

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Microphone access is not supported on this browser.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      audioChunksRef.current = []

      // Choose supported mimeType
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : ''

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        // Stop all tracks to release mic
        stream.getTracks().forEach((track) => track.stop())
        await sendAudioForTranscription()
      }

      recorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Error starting microphone recording:', err)
      alert('Could not access microphone. Please check permissions.')
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const sendAudioForTranscription = async () => {
    if (audioChunksRef.current.length === 0) return

    setIsTranscribing(true)
    try {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: mediaRecorderRef.current?.mimeType || 'audio/webm',
      })
      // console.log(audioBlob)
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch(getApiUrl('/api/voice/transcribe'), {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Transcription failed with status ${response.status}`)
      }

      const data = await response.json()
      const transcript = data.transcript || ''

      if (transcript.trim()) {
        setReflection((prev) => (prev.trim() ? `${prev.trim()} ${transcript.trim()}` : transcript.trim()))
      } else {
        console.warn('Empty transcript received from server.')
      }
    } catch (error) {
      console.error('Failed to transcribe audio:', error)
      alert('Could not transcribe audio. You can type your reflection manually.')
    } finally {
      setIsTranscribing(false)
      audioChunksRef.current = []
    }
  }

  const handleToggleMic = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <div className="complete-screen">
      <div className="complete-card">
        <div className="complete-badge">
          <span>🌿 MISSION COMPLETED</span>
        </div>

        <h1 className="complete-title">Welcome back to the world.</h1>
        <p className="complete-subtitle">{missionTitle}</p>

        {/* Stats Grid */}
        <div className="complete-stats-grid">
          <div className="complete-stat-box">
            <span className="complete-stat-label">Outdoor Duration</span>
            <span className="complete-stat-val">{completedDurationMinutes} min</span>
          </div>

          <div className="complete-stat-box highlight">
            <span className="complete-stat-label">Reward Earned</span>
            <span className="complete-stat-val">+{xpEarned} XP</span>
          </div>
        </div>

        {/* Reflection Field with Mic Dictation */}
        <div className="reflection-section">
          <div className="reflection-header">
            <label htmlFor="reflection-input" className="reflection-label">
              Add a reflection
            </label>

            <button
              type="button"
              className={`mic-btn ${isRecording ? 'recording' : ''} ${isTranscribing ? 'transcribing' : ''}`}
              onClick={handleToggleMic}
              disabled={isTranscribing}
              title={
                isRecording
                  ? 'Click to stop recording and transcribe'
                  : 'Click to dictate reflection with your voice'
              }
            >
              {isTranscribing ? (
                <>
                  <span className="mic-spin">⏳</span>
                  <span>Transcribing...</span>
                </>
              ) : isRecording ? (
                <>
                  <span className="mic-pulse-dot"></span>
                  <span className="mic-icon">⏹</span>
                  <span>Stop recording</span>
                </>
              ) : (
                <>
                  <span className="mic-icon">🎙️</span>
                  <span>Speak reflection</span>
                </>
              )}
            </button>
          </div>

          <div className="reflection-input-wrapper">
            <textarea
              id="reflection-input"
              className={`reflection-textarea ${isRecording ? 'recording-active' : ''}`}
              rows={4}
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder={
                isRecording
                  ? 'Listening to your voice... Speak your thoughts naturally.'
                  : isTranscribing
                  ? 'Converting voice to text with ElevenLabs...'
                  : 'What did you observe? Notice the breeze, the light, or your breathing...'
              }
            />
          </div>
        </div>

        {/* Actions */}
        <div className="complete-actions">
          <button
            type="button"
            className="btn-primary complete-save-btn"
            onClick={handleSave}
            disabled={isSaved || isRecording || isTranscribing}
          >
            {isSaved ? '✓ Saved to Journey' : 'Save reflection'}
          </button>

          <button
            type="button"
            className="btn-secondary complete-next-btn"
            onClick={onNextMission}
          >
            Next mission
          </button>
        </div>
      </div>
    </div>
  )
}
