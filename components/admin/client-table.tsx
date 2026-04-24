'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface BusinessRow {
  id: string
  name: string
  slug: string
  created_at: string
  email: string | null
  isOwn: boolean
  support_access_enabled: boolean
}

interface AdminClientTableProps {
  businesses: BusinessRow[]
}

export function AdminClientTable({ businesses }: AdminClientTableProps) {
  const router = useRouter()
  const [impersonating, setImpersonating] = useState<string | null>(null)

  const handleImpersonate = async (businessId: string) => {
    setImpersonating(businessId)
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to impersonate')
        return
      }
      router.push('/portal')
    } finally {
      setImpersonating(null)
    }
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Business</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Slug</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Support Access</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {businesses.map(biz => (
            <tr key={biz.id} className="bg-card hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-medium text-foreground">
                <span>{biz.name}</span>
                {biz.isOwn && (
                  <span className="ml-2 text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    You
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs">
                {biz.email ?? <span className="italic">—</span>}
              </td>
              <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{biz.slug}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(biz.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                {biz.support_access_enabled ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                    Disabled
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {biz.isOwn ? (
                  <a
                    href="/portal"
                    className="text-xs font-medium px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                  >
                    My Portal
                  </a>
                ) : (
                  <button
                    onClick={() => handleImpersonate(biz.id)}
                    disabled={!biz.support_access_enabled || impersonating === biz.id}
                    title={
                      !biz.support_access_enabled
                        ? 'Client has not enabled support access'
                        : undefined
                    }
                    className="text-xs font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {impersonating === biz.id ? 'Loading...' : 'View as Client'}
                  </button>
                )}
              </td>
            </tr>
          ))}
          {businesses.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                No client businesses found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
