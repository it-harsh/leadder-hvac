'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Building2, ShieldCheck, ExternalLink } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface AdminSidebarProps {
  email: string
  hasBusiness: boolean
}

const navItems = [
  {
    label: 'Clients',
    href: '/admin',
    icon: Building2,
    exact: true,
  },
  {
    label: 'Admins',
    href: '/admin/admins',
    icon: ShieldCheck,
    exact: false,
  },
]

export function AdminSidebar({ hasBusiness }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-sidebar border-r border-sidebar-border flex flex-col z-40">
      {/* Logo */}
      <div className="p-4 flex justify-center">
        <Link href="/admin">
          <Image src="/leadder_logo.svg" alt="Leadder" width={112} height={32} className="h-8 w-auto" />
        </Link>
      </div>

      {/* Section label */}
      <div className="px-4 pb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Admin Panel
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
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
              <item.icon className={cn('w-5 h-5', isActive ? 'text-sidebar-primary' : '')} />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}

        {/* My Portal link — only if admin has their own business */}
        {hasBusiness && (
          <>
            <div className="pt-3 mt-3 border-t border-sidebar-border">
              <p className="px-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                My Account
              </p>
            </div>
            <Link
              href="/portal"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            >
              <ExternalLink className="w-5 h-5" />
              <span className="font-medium">My Portal</span>
            </Link>
          </>
        )}
      </nav>
    </aside>
  )
}
