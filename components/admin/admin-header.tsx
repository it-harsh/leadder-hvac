'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LogOut, Sun, Moon, KeyRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Clients',
  '/admin/admins': 'Admins',
}

interface AdminHeaderProps {
  email: string
}

export function AdminHeader({ email }: AdminHeaderProps) {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  const [showChangePassword, setShowChangePassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const pageTitle = Object.entries(PAGE_TITLES)
    .filter(([path]) => pathname === path || pathname.startsWith(path + '/'))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? 'Admin'

  const initials = email.slice(0, 2).toUpperCase()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('Password updated')
      setShowChangePassword(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error(err)
      toast.error('Failed to update password')
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 h-14 border-b border-border bg-[#f5f6fa] dark:bg-background flex items-center justify-between px-6">
        <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-9 w-9"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-xs leading-none text-muted-foreground">{email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowChangePassword(true)}>
                <KeyRound className="mr-2 h-4 w-4" />
                <span>Change Password</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-foreground">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="bg-input border-border text-foreground"
                disabled={changingPassword}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-foreground">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="bg-input border-border text-foreground"
                disabled={changingPassword}
                onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {changingPassword
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</>
                : 'Update Password'
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
