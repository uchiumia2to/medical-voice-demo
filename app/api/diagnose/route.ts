import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { symptoms } = await request.json()

    if (!symptoms) {
      return NextResponse.json(
        { success: false, error: 'Symptoms are required' },
        { status: 400 }
      )
    }

    console.log(`[${new Date().toISOString()}] Diagnosis request received`)

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `あなたは医師の診断支援AIアシスタントです。

【重要な注意事項】
- これは診断の「参考情報」であり、最終診断は必ず医師が行います
- 患者に直接診断名を伝えることは避け、「〜の可能性」として表現
- 緊急性が疑われる場合は、速やかな医療機関受診を推奨

【出力形式】
推測される疾患: [疾患名]の可能性

根拠:
- [症状1に基づく根拠]
- [症状2に基づく根拠]
- [鑑別診断の考慮点]

推奨事項:
- [推奨される検査や対応]
- [注意すべき症状の変化]

※この情報は診断の参考であり、最終的な診断・治療方針は医師の判断によります。`
        },
        {
          role: 'user',
          content: `以下の症状から考えられる疾患と根拠を教えてください：\n${symptoms}`
        }
      ],
      max_tokens: 600,
      temperature: 0.3,
    })

    const diagnosis = completion.choices[0].message.content

    console.log(`[${new Date().toISOString()}] Diagnosis generated successfully`)

    return NextResponse.json({
      success: true,
      diagnosis: diagnosis
    })

  } catch (error) {
    console.error('Diagnosis error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}
