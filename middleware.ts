import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // API エンドポイントは認証をスキップ
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const basicAuth = request.headers.get('authorization')
  const url = request.nextUrl

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1]
    const [user, pwd] = atob(authValue).split(':')

    // テスト用ユーザー
    const validUsers: Record<string, string> = {
      'demo': 'medical2024',
      'doctor': 'test123',
      'admin': 'secure456',
      'clinic1': 'interview1',
      'clinic2': 'interview2'
    }

    if (validUsers[user] === pwd) {
      // 認証成功のログ
      console.log(`[${new Date().toISOString()}] 認証成功: ${user}`)
      return NextResponse.next()
    }
  }

  // 認証失敗時
  return new NextResponse('認証が必要です', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="医療音声問診システム - 認証が必要です"',
    },
  })
}

export const config = {
  matcher: [
    /*
     * すべてのリクエストパスにマッチ（以下を除く）:
     * - api (APIルート)
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化)
     * - favicon.ico (ファビコン)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
