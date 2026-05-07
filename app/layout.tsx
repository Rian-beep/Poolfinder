import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PoolFinder UK',
  description: 'UK Pool Builder Intelligence Platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: '#0A0A0A', height: '100vh', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  )
}
