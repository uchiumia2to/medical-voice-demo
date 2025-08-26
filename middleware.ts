import { NextRequest, NextResponse } from 'next/server'

// テストアカウント情報
const VALID_CREDENTIALS = [
  { username: 'demo', password: 'medical2024' },          // 基本デモ用
  { username: 'doctor', password: 'test123' },            // 医療関係者用
  { username: 'admin', password: 'secure456' },           // 管理者用
  { username: 'clinic1', password: 'interview1' },        // インタビュー用1
  { username: 'clinic2', password: 'interview2' },        // インタビュー用2
]

export function middleware(request: NextRequest) {
  // Basic認証のチェック
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    // 認証ヘッダーがない場合、認証ダイアログを表示
    return new NextResponse('認証が必要です', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Medical Voice System"',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  }

  // Base64でエンコードされた認証情報をデコード
  const base64Credentials = authHeader.replace('Basic ', '')
  let credentials: string
  
  try {
    credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8')
  } catch (error) {
    console.error('認証情報のデコードに失敗:', error)
    return new NextResponse('認証情報が無効です', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Medical Voice System"',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  }

  const [username, password] = credentials.split(':')

  // 認証情報の検証
  const isValidCredential = VALID_CREDENTIALS.some(
    (cred) => cred.username === username && cred.password === password
  )

  if (!isValidCredential) {
    console.log(`認証失敗: ${username} からのアクセス`)
    return new NextResponse('認証に失敗しました', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Medical Voice System"',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  }

  // 認証成功
  console.log(`[${new Date().toISOString()}] 認証成功: ${username}`)
  
  // 次の処理に進む
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * すべてのパスにマッチ、ただし以下を除く:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
