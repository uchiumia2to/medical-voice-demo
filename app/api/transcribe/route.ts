import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    console.log(`[${new Date().toISOString()}] Transcribe request received`)

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'Audio file is required' },
        { status: 400 }
      )
    }

    console.log('Audio file details:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size
    })

    // ファイルサイズチェック（25MB制限）
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Audio file too large (max 25MB)' },
        { status: 400 }
      )
    }

    // OpenAI Whisper APIで音声を文字起こし
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'ja', // 日本語指定
      response_format: 'json',
      temperature: 0.2, // 認識精度を向上させる
    })

    const transcript = transcription.text

    console.log(`[${new Date().toISOString()}] Transcription completed: ${transcript.substring(0, 50)}...`)

    return NextResponse.json({
      success: true,
      transcript: transcript
    })

  } catch (error) {
    console.error('Transcription error:', error)
    
    let errorMessage = 'Internal server error'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    )
  }
}
