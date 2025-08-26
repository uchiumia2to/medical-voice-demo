'use client'

import { useState, useEffect, useRef } from 'react'

interface PatientInfo {
  visitType: string
  lastName: string
  firstName: string
  gender: string
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1)
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    visitType: '',
    lastName: '',
    firstName: '',
    gender: ''
  })
  
  // 音声関連の状態
  const [isRecording, setIsRecording] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [summary, setSummary] = useState('')
  const [editableText, setEditableText] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [originalText, setOriginalText] = useState('')
  
  // UI状態
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inputMethod, setInputMethod] = useState<'speech' | 'upload' | 'manual'>('speech')
  
  // 音声認識・録音関連
  const [recognition, setRecognition] = useState<any>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // デバイス・ブラウザ判定
  useEffect(() => {
    const detectEnvironment = () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
      const speechRecognitionSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
      
      if (isIOS && isSafari) {
        setInputMethod('upload')
        setError('iOSのSafariをご利用の場合、音声ファイルのアップロード機能をご利用ください。リアルタイム音声認識にはChromeアプリがおすすめです。')
      } else if (!speechRecognitionSupported) {
        setInputMethod('upload')
        setError('このブラウザでは音声ファイルアップロード機能をご利用ください。')
      } else {
        setInputMethod('speech')
      }
    }

    detectEnvironment()
  }, [])

  // 入力チェック
  const checkInputs = () => {
    return patientInfo.visitType && patientInfo.lastName && patientInfo.firstName && patientInfo.gender
  }

  // 音声認識の初期化
  const initSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const rec = new SpeechRecognition()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'ja-JP'

    rec.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      setOriginalText(finalTranscript)
      setTranscription(finalTranscript + interimTranscript)
    }

    rec.onerror = (event: any) => {
      console.error('音声認識エラー:', event.error)
      let errorMessage = '音声認識エラーが発生しました。'
      
      if (event.error === 'not-allowed') {
        errorMessage = 'マイクへのアクセスが拒否されました。ブラウザの設定でマイクの使用を許可してください。'
      } else if (event.error === 'no-speech') {
        errorMessage = '音声が検出されませんでした。もう一度お試しください。'
      }
      
      setError(errorMessage)
      setIsRecording(false)
    }

    rec.onend = () => {
      setIsRecording(false)
      if (originalText.trim()) {
        processWithAI(originalText)
      }
    }

    setRecognition(rec)
  }

  // 音声録音（アップロード用）
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' })
        await uploadAudioFile(audioBlob)
        
        // ストリーム停止
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setAudioChunks(chunks)
      setIsRecording(true)
      setError('')
    } catch (err) {
      setError('マイクにアクセスできませんでした。ブラウザの設定を確認してください。')
      console.error('録音エラー:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
    }
    setIsRecording(false)
  }

  // 音声ファイルアップロード
  const uploadAudioFile = async (audioBlob: Blob) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'audio.wav')

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (data.success) {
        setOriginalText(data.transcript)
        setTranscription(data.transcript)
        await processWithAI(data.transcript)
      } else {
        setError('音声の処理中にエラーが発生しました。')
      }
    } catch (err) {
      setError('音声ファイルのアップロード中にエラーが発生しました。')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ファイル選択での音声アップロード
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('audio/')) {
      uploadAudioFile(file)
    } else {
      setError('音声ファイルを選択してください。')
    }
  }

  // 音声入力のトグル
  const toggleVoiceInput = () => {
    if (inputMethod === 'speech') {
      // リアルタイム音声認識
      if (!recognition) {
        initSpeechRecognition()
        return
      }

      if (!isRecording) {
        setIsRecording(true)
        setError('')
        recognition.start()
      } else {
        setIsRecording(false)
        recognition.stop()
      }
    } else if (inputMethod === 'upload') {
      // 音声録音・アップロード
      if (!isRecording) {
        startRecording()
      } else {
        stopRecording()
      }
    }
  }

  // AI処理
  const processWithAI = async (text: string) => {
    if (!text.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      const data = await response.json()
      if (data.success) {
        setSummary(data.summary)
        setEditableText(data.summary)
      } else {
        setError('AI処理中にエラーが発生しました。')
      }
    } catch (err) {
      setError('AI処理中にエラーが発生しました。')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 診断生成
  const generateDiagnosis = async (symptoms: string) => {
    if (!symptoms.trim()) return

    try {
      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms }),
      })

      const data = await response.json()
      if (data.success) {
        setDiagnosis(data.diagnosis)
      }
    } catch (err) {
      console.error('診断生成エラー:', err)
    }
  }

  // ステップ遷移
  const goToStep = (step: number) => {
    setCurrentStep(step)
    setError('')
  }

  // リセット
  const resetDemo = () => {
    setCurrentStep(1)
    setPatientInfo({ visitType: '', lastName: '', firstName: '', gender: '' })
    setTranscription('')
    setSummary('')
    setEditableText('')
    setDiagnosis('')
    setOriginalText('')
    setError('')
    setLoading(false)
    setIsRecording(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="medical-card w-full max-w-md">
        
        {/* Step 1: 患者情報入力 */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">🏥 さくら内科クリニック</h1>
              <p className="text-gray-600">音声問診システム</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-gray-700 font-semibold mb-3">診療区分</label>
                <div className="space-y-3">
                  {[
                    { value: 'first', label: '初診', icon: '🆕' },
                    { value: 'return', label: '再診', icon: '🔄' },
                    { value: 'forgot', label: '診察券番号忘れ', icon: '❓' }
                  ].map((option) => (
                    <label key={option.value} className="radio-option">
                      <input
                        type="radio"
                        name="visitType"
                        value={option.value}
                        onChange={(e) => setPatientInfo({...patientInfo, visitType: e.target.value})}
                        className="mr-3 w-4 h-4"
                      />
                      <span className="mr-2">{option.icon}</span>
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-3">👤 お名前</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="姓"
                    value={patientInfo.lastName}
                    onChange={(e) => setPatientInfo({...patientInfo, lastName: e.target.value})}
                    className="medical-input"
                  />
                  <input
                    type="text"
                    placeholder="名"
                    value={patientInfo.firstName}
                    onChange={(e) => setPatientInfo({...patientInfo, firstName: e.target.value})}
                    className="medical-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-3">性別</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'male', label: '男性', icon: '👨' },
                    { value: 'female', label: '女性', icon: '👩' }
                  ].map((option) => (
                    <label key={option.value} className="radio-option justify-center">
                      <input
                        type="radio"
                        name="gender"
                        value={option.value}
                        onChange={(e) => setPatientInfo({...patientInfo, gender: e.target.value})}
                        className="mr-2 w-4 h-4"
                      />
                      <span className="mr-1">{option.icon}</span>
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <button
                disabled
                className="w-full bg-gray-300 text-gray-500 py-4 rounded-full font-semibold cursor-not-allowed"
              >
                📝 問診に回答する（準備中）
              </button>
              <button
                onClick={() => goToStep(2)}
                disabled={!checkInputs()}
                className={`w-full py-4 rounded-full font-semibold transition-all duration-200 ${
                  checkInputs()
                    ? 'medical-button'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                🎤 音声で回答する
              </button>
            </div>
          </div>
        )}

        {/* Step 2: 音声入力 */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">🎤 音声入力</h1>
              <p className="text-gray-600">現在の症状について音声でお話しください</p>
            </div>

            {/* 入力方法の説明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center mb-2">
                <span className="text-blue-600 mr-2">ℹ️</span>
                <span className="font-semibold text-blue-800">
                  {inputMethod === 'speech' && '音声認識モード'}
                  {inputMethod === 'upload' && '音声アップロードモード'}
                  {inputMethod === 'manual' && '手動入力モード'}
                </span>
              </div>
              <p className="text-sm text-blue-700">
                {inputMethod === 'speech' && 'リアルタイムで音声を認識します'}
                {inputMethod === 'upload' && '音声を録音してファイルとして処理します'}
                {inputMethod === 'manual' && 'テキストで直接入力してください'}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* 音声入力エリア */}
            <div className="border-3 border-dashed border-blue-300 rounded-2xl p-8 bg-blue-50 text-center min-h-64 flex flex-col items-center justify-center">
