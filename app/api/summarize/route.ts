import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 }
      )
    }

    console.log(`[${new Date().toISOString()}] Summarize request received: ${text.substring(0, 100)}...`)

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `あなたは医療従事者向けの問診内容要約AIです。
          
【指示】
- 患者の話した内容を医師が理解しやすく要約してください
- 症状、期間、程度、関連する情報を整理して記載
- 専門用語は適切に使用し、重要な情報は漏らさない
- 簡潔で分かりやすい日本語で出力

【出力形式】
症状：[主要症状]
期間：[発症からの期間]
程度：[症状の程度・頻度]
関連情報：[その他の関連症状や状況]`
        },
        {
          role: 'user',
          content: `以下の患者の訴えを要約してください：\n${text}`
        }
      ],
      max_tokens: 400,
      temperature: 0.3,
    })

    const summary = completion.choices[0].message.content

    console.log(`[${new Date().toISOString()}] Text summarized successfully`)

    return NextResponse.json({
      success: true,
      summary: summary
    })

  } catch (error) {
    console.error('Summarization error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}
