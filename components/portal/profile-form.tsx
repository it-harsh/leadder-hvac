'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Save, Key } from 'lucide-react'
import { toast } from 'sonner'

interface ProfileFormProps {
  user: User
}

export function ProfileForm({ user }: ProfileFormProps) {
  const supabase = createClient()
  const [changingPassword, setChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      toast.success('Password updated successfully')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error('Error changing password:', err)
      toast.error('Failed to update password')
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Account Info */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              value={user.email || ''}
              disabled
              className="bg-muted border-border text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed. Contact support if you need to update it.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="userId" className="text-foreground">User ID</Label>
            <Input
              id="userId"
              value={user.id}
              disabled
              className="bg-muted border-border text-muted-foreground cursor-not-allowed font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-foreground">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="bg-input border-border text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="bg-input border-border text-foreground"
            />
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={changingPassword || !newPassword || !confirmPassword}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {changingPassword ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Key className="w-4 h-4 mr-2" />
                Update Password
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
