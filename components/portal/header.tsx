'use client'

import { User } from '@supabase/supabase-js'
import { Business } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LogOut, User as UserIcon, Building, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'

const supabase = createClient()

interface PortalHeaderProps {
  user: User
  business: Business
}

const PAGE_TITLES: Record<string, string> = {
  '/portal': 'Dashboard',
  '/portal/estimator': 'Instant Estimator',
  '/portal/leads': 'Leads',
  '/portal/widget': 'Widget',
  '/portal/settings': 'Settings',
}

export function PortalHeader({ user, business }: PortalHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  const pageTitle = Object.entries(PAGE_TITLES)
    .filter(([path]) => pathname === path || pathname.startsWith(path + '/'))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? 'Dashboard'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const initials = business.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="h-14 border-b border-border bg-[#f5f6fa] dark:bg-background backdrop-blur flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
      </div>

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
                <p className="text-sm font-medium leading-none">{business.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/portal/profile')}>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/portal/settings')}>
              <Building className="mr-2 h-4 w-4" />
              <span>Business Settings</span>
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
  )
}
