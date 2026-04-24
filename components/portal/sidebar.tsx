'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Business } from '@/lib/types/database'
import { Calculator, Users, Settings, Code, Building2, LayoutDashboard, ShieldCheck } from 'lucide-react'
import Image from 'next/image'

interface PortalSidebarProps {
  business: Business
  isAdmin?: boolean
}

const navItems = [
  {
    label: 'Dashboard',
    href: '/portal',
    icon: LayoutDashboard,
    description: 'Overview',
  },
  {
    label: 'Instant Estimator',
    href: '/portal/estimator',
    icon: Calculator,
    description: 'Configure pricing tiers',
  },
  {
    label: 'Leads',
    href: '/portal/leads',
    icon: Users,
    description: 'View captured leads',
  },
  {
    label: 'Widget',
    href: '/portal/widget',
    icon: Code,
    description: 'Get embed code',
  },
  {
    label: 'Settings',
    href: '/portal/settings',
    icon: Settings,
    description: 'Integrations & profile',
  },
]

export function PortalSidebar({ business, isAdmin = false }: PortalSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-sidebar border-r border-sidebar-border flex flex-col z-40">
      {/* Logo */}
      <div className="p-4 flex justify-center">
        <Link href="/portal">
          <Image src="/leadder_logo.svg" alt="Leadder" width={112} height={32} className="h-8 w-auto" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = item.href === '/portal'
            ? pathname === '/portal'
            : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <item.icon className={cn(
                'w-5 h-5',
                isActive ? 'text-sidebar-primary' : ''
              )} />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}

        {/* Admin Panel link — only shown to platform admins in non-impersonation sessions */}
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 mt-4 border-t border-sidebar-border pt-4"
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="font-medium">Admin Panel</span>
          </Link>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-sidebar-accent/50">
          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-sidebar-foreground font-medium truncate">{business.name}</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-sidebar-accent/30">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-muted-foreground">Widget Active</span>
        </div>
      </div>
    </aside>
  )
}
