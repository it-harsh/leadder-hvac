'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, X } from 'lucide-react'

interface ImpersonationBannerProps {
  businessName: string
}

export function ImpersonationBanner({ businessName }: ImpersonationBannerProps) {
  const router = useRouter()
  const [exiting, setExiting] = useState(false)

  const handleExit = async () => {
    setExiting(true)
    try {
      await fetch('/api/admin/exit', { method: 'POST' })
      router.push('/admin')
    } catch {
      setExiting(false)
    }
  }

  return (
    <div className="w-full bg-amber-400 dark:bg-amber-500 text-amber-950 dark:text-amber-950">
      <div className="flex items-center justify-between px-4 py-2 gap-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            You are viewing as: <strong>{businessName}</strong>
          </span>
        </div>
        <button
          onClick={handleExit}
          disabled={exiting}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-amber-950/10 hover:bg-amber-950/20 transition-colors disabled:opacity-60"
        >
          <X className="w-3.5 h-3.5" />
          {exiting ? 'Exiting...' : 'Exit Impersonation'}
        </button>
      </div>
    </div>
  )
}
