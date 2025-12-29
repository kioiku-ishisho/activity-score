import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/lib/theme-context'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: '活動計分管理系統',
  description: '管理活動和參加者計分',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <ThemeProvider>
          <div className="flex-1">
            {children}
          </div>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}

