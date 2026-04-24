'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, UserPlus } from 'lucide-react'

export function CreateAdminForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create admin')
        return
      }
      setSuccess(true)
      setEmail('')
      setPassword('')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-card border-border max-w-md">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Create New Admin
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email" className="text-foreground">Email</Label>
            <Input
              id="admin-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@leadder.io"
              className="bg-input border-border text-foreground"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password" className="text-foreground">Password</Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="bg-input border-border text-foreground"
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Admin created successfully.
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Admin'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
