import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '医療音声問診システム - デモ',
  description: '音声入力による効率的な医療問診システムのデモンストレーション',
  keywords: ['医療', '問診', '音声認識', 'AI', '診断支援'],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
