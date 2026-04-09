'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'

export default function ModalPreviewPage() {
  const params = useParams()
  const slug = params.slug as string
  const widgetUrl = `/widget/${slug}`
  const [open, setOpen] = useState(false)

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: '#f3f4f6' }}
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Modal Widget Demo</h1>
      <p className="text-gray-500 text-sm mb-8">Click the button below to open the quote form modal</p>

      <button
        onClick={() => setOpen(true)}
        style={{
          background: '#2563eb',
          color: '#fff',
          padding: '14px 28px',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Get Your Instant Quote &rarr;
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '16px',
              width: '420px',
              maxHeight: '90vh',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              borderBottom: '1px solid #e5e7eb',
            }}>
              <strong style={{ fontSize: '15px', color: '#111827' }}>Get Your Instant Quote</strong>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '24px',
                  color: '#9ca3af',
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                &times;
              </button>
            </div>
            <iframe
              src={widgetUrl}
              width="420"
              height="620"
              style={{ border: 'none', display: 'block' }}
              loading="lazy"
            />
          </div>
        </div>
      )}
    </div>
  )
}
