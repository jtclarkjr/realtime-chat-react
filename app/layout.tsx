import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { AuthProvider } from '@/lib/auth/context'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
})

export const metadata: Metadata = {
  title: 'Realtime Chat App',
  description:
    'A modern, real-time chat application. Features instant messaging, message persistence, and reconnection handling.',
  keywords: ['chat', 'realtime', 'nextjs', 'supabase', 'redis', 'websocket'],
  authors: [{ name: 'James' }],
  openGraph: {
    title: 'Realtime Chat App',
    description:
      'A modern, real-time chat application with instant messaging and message persistence.',
    type: 'website'
  }
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
