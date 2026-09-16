import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lunara OS | Foundation v1.0',
  description: 'Autonomous Digital Organization Operating System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-lunara-darker text-gray-100 font-sans antialiased">
        {children}
      </body>
    </html>
  )
}