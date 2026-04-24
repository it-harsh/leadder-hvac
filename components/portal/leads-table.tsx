'use client'

import { useState, useMemo } from 'react'
import { Lead } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Phone, MapPin, Users, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface LeadsTableProps {
  leads: Lead[]
}

export function LeadsTable({ leads: initialLeads }: LeadsTableProps) {
  const supabase = createClient()
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const filteredLeads = useMemo(() => {
    if (!search.trim()) return leads
    const q = search.toLowerCase()
    return leads.filter(l =>
      `${l.first_name} ${l.last_name}`.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.phone.toLowerCase().includes(q)
    )
  }, [leads, search])

  const allSelected = filteredLeads.length > 0 && filteredLeads.every(l => selectedIds.has(l.id))

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filteredLeads.forEach(l => next.delete(l.id))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filteredLeads.forEach(l => next.add(l.id))
        return next
      })
    }
  }

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setDeleting(true)
    try {
      const ids = [...selectedIds]
      const { error } = await supabase.from('leads').delete().in('id', ids)
      if (error) throw error
      setLeads(prev => prev.filter(l => !selectedIds.has(l.id)))
      setSelectedIds(new Set())
      toast.success(`${ids.length} lead${ids.length > 1 ? 's' : ''} deleted`)
    } catch {
      toast.error('Failed to delete leads')
    } finally {
      setDeleting(false)
    }
  }

  if (leads.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No leads yet</h3>
          <p className="text-muted-foreground text-center max-w-md">
            When customers submit quotes through your widget, they&apos;ll appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base font-semibold text-foreground">
            Leads ({leads.length})
          </CardTitle>
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name, email, phone…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={deleting}
                className="shrink-0"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete {selectedIds.size}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-10 pl-4">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </TableHead>
              <TableHead className="text-muted-foreground">Name</TableHead>
              <TableHead className="text-muted-foreground">Contact</TableHead>
              <TableHead className="text-muted-foreground">System Type</TableHead>
              <TableHead className="text-muted-foreground">Price</TableHead>
              <TableHead className="text-muted-foreground">Date Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                  No leads match your search.
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map(lead => (
                <TableRow key={lead.id} className="border-border">
                  <TableCell className="pl-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lead.id)}
                      onChange={() => toggleOne(lead.id)}
                      className="w-4 h-4 accent-primary cursor-pointer"
                    />
                  </TableCell>

                  {/* Name + capacity subtitle */}
                  <TableCell>
                    <p className="font-medium text-foreground">
                      {lead.first_name} {lead.last_name}
                    </p>
                    {lead.capacity_label && (
                      <p className="text-xs text-muted-foreground mt-0.5">{lead.capacity_label}</p>
                    )}
                  </TableCell>

                  {/* Contact */}
                  <TableCell>
                    <div className="space-y-1">
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        {lead.email}
                      </a>
                      <a
                        href={`tel:${lead.phone}`}
                        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        {lead.phone}
                      </a>
                      {(lead.city || lead.address) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {[lead.address, lead.city, lead.state, lead.zip].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  {/* System type */}
                  <TableCell>
                    <p className="text-sm text-foreground">{lead.product_name || '—'}</p>
                  </TableCell>

                  {/* Price — 3-tier or single */}
                  <TableCell>
                    {lead.price_good || lead.price_better || lead.price_best ? (
                      <div className="space-y-0.5">
                        {lead.price_good != null && (
                          <p className="text-sm font-medium text-green-600">
                            G ${lead.price_good.toLocaleString()}
                          </p>
                        )}
                        {lead.price_better != null && (
                          <p className="text-sm font-medium text-amber-600">
                            B ${lead.price_better.toLocaleString()}
                          </p>
                        )}
                        {lead.price_best != null && (
                          <p className="text-sm font-medium text-blue-600">
                            ★ ${lead.price_best.toLocaleString()}
                          </p>
                        )}
                      </div>
                    ) : lead.quoted_price != null ? (
                      <p className="text-sm font-medium text-foreground">
                        ${lead.quoted_price.toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-muted-foreground">—</p>
                    )}
                  </TableCell>

                  {/* Date */}
                  <TableCell>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                    </p>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
