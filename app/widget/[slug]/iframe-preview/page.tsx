'use client'

import { useParams } from 'next/navigation'

export default function IframePreviewPage() {
  const params = useParams()
  const slug = params.slug as string
  const widgetUrl = `/widget/${slug}`

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
        <nav style={{ display: 'flex', gap: '24px' }}>
          {['Home', 'Services', 'About', 'Contact'].map(item => (
            <span key={item} style={{ fontSize: '14px', color: '#6b7280', cursor: 'default' }}>{item}</span>
          ))}
        </nav>
      </header>

      {/* Mock page hero */}
      <div style={{ padding: '48px 32px 32px', maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
          <div style={{ height: '12px', width: '60px', borderRadius: '4px', background: '#e5e7eb' }} />
          <div style={{ height: '12px', width: '40px', borderRadius: '4px', background: '#e5e7eb' }} />
        </div>
        <div style={{ height: '32px', width: '420px', borderRadius: '6px', background: '#e5e7eb', marginBottom: '12px' }} />
        <div style={{ height: '16px', width: '320px', borderRadius: '4px', background: '#f3f4f6', marginBottom: '6px' }} />
        <div style={{ height: '16px', width: '280px', borderRadius: '4px', background: '#f3f4f6', marginBottom: '40px' }} />

        {/* Embedded widget */}
        <iframe
          src={widgetUrl}
          width="100%"
          height="700"
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
