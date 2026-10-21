import type { Metadata, Viewport } from 'next'
import { Inter, Noto_Sans_JP } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-jp',
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: { default: 'improveTaskOfEnginner', template: '%s | improveTaskOfEnginner' },
  description: 'エンジニアの日々の業務を俯瞰して管理し、生産性を上げるコックピット',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafd' },
    { media: '(prefers-color-scheme: dark)', color: '#12121c' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${inter.variable} ${notoSansJp.variable}`} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
