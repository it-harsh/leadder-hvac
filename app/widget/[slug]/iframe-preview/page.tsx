'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'

export default function IframePreviewPage() {
  const params = useParams()
  const slug = params.slug as string
  const widgetUrl = `/widget/${slug}`
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop')

  const isMobile = view === 'mobile'

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
      {/* Mock website navbar */}
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 32px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#2563eb' }} />
          <span style={{ fontWeight: 700, fontSize: '16px', color: '#111827' }}>YourBusiness.com</span>
        </div>

        {/* View toggle */}
        <div style={{
          display: 'flex',
          background: '#f3f4f6',
          borderRadius: '8px',
          padding: '3px',
          gap: '2px',
        }}>
          {(['desktop', 'mobile'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '5px 14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                background: view === v ? '#fff' : 'transparent',
                color: view === v ? '#111827' : '#6b7280',
                boxShadow: view === v ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
                textTransform: 'capitalize',
              }}
            >
              {v === 'desktop' ? '🖥 Desktop' : '📱 Mobile'}
            </button>
          ))}
        </div>

        <nav style={{ display: 'flex', gap: '24px' }}>
          {['Home', 'Services', 'About', 'Contact'].map(item => (
            <span key={item} style={{ fontSize: '14px', color: '#6b7280', cursor: 'default' }}>{item}</span>
          ))}
        </nav>
      </header>

      {/* Page content */}
      <div style={{
        padding: isMobile ? '32px 16px' : '48px 32px 32px',
        maxWidth: isMobile ? '430px' : '960px',
        margin: '0 auto',
        transition: 'max-width 0.3s ease',
      }}>
        {/* Placeholder heading/text */}
        <div style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
          <div style={{ height: '12px', width: '60px', borderRadius: '4px', background: '#e5e7eb' }} />
          <div style={{ height: '12px', width: '40px', borderRadius: '4px', background: '#e5e7eb' }} />
        </div>
        <div style={{ height: isMobile ? '24px' : '32px', width: isMobile ? '200px' : '420px', borderRadius: '6px', background: '#e5e7eb', marginBottom: '12px' }} />
        <div style={{ height: '16px', width: isMobile ? '180px' : '320px', borderRadius: '4px', background: '#f3f4f6', marginBottom: '6px' }} />
        <div style={{ height: '16px', width: isMobile ? '140px' : '280px', borderRadius: '4px', background: '#f3f4f6', marginBottom: '40px' }} />

        {/* Embedded widget */}
        <iframe
          src={widgetUrl}
          width="100%"
          height={isMobile ? '680' : '700'}
          style={{
            border: 'none',
            borderRadius: '12px',
            display: 'block',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
          loading="lazy"
        />
      </div>
    </div>
  )
}
