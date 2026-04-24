import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Leadder',
  description: 'Instant HVAC quotes for your business',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
        <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
