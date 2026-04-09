'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Check, Copy, ExternalLink, Eye, Info } from 'lucide-react'
import { toast } from 'sonner'

interface WidgetEmbedCodeProps {
  widgetUrl: string
  iframeCode: string
  businessSlug: string
}

function CopyBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success(`${label} copied`)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative">
      <pre className="p-4 bg-muted rounded-lg text-sm text-foreground overflow-x-auto whitespace-pre-wrap break-all">
        <code>{code}</code>
      </pre>
      <Button size="sm" variant="secondary" className="absolute top-2 right-2" onClick={handleCopy}>
        {copied ? <><Check className="w-4 h-4 mr-1" />Copied</> : <><Copy className="w-4 h-4 mr-1" />Copy</>}
      </Button>
    </div>
  )
}

export function WidgetEmbedCode({ widgetUrl, iframeCode, businessSlug }: WidgetEmbedCodeProps) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [showIframePreview, setShowIframePreview] = useState(false)

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(widgetUrl)
    setCopiedLink(true)
    toast.success('URL copied to clipboard')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const buttonCode = `<button onclick="document.getElementById('leadder-modal').style.display='flex'" style="background:#4f46e5;color:#fff;padding:14px 28px;border:none;border-radius:50px;font-size:15px;font-weight:600;cursor:pointer;">
  Get Your Instant Quote →
</button>`

  const modalCode = `<!-- Place this before </body> — only once per page -->
<div id="leadder-modal"
  onclick="if(event.target.id==='leadder-modal')this.style.display='none'"
  style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:999999;align-items:center;justify-content:center;padding:16px;">
  <div style="background:#fff;border-radius:16px;width:100%;max-width:680px;max-height:90vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid #e5e7eb;">
      <strong style="font-size:15px;color:#111827;">Get Your Instant Quote</strong>
      <button onclick="document.getElementById('leadder-modal').style.display='none'" style="background:none;border:none;cursor:pointer;font-size:24px;color:#9ca3af;line-height:1;padding:0;">×</button>
    </div>
    <iframe src="${widgetUrl}" width="100%" height="580" frameborder="0" style="display:block;" loading="lazy"></iframe>
  </div>
</div>`

  return (
    <div className="space-y-10 max-w-3xl">

      {/* ── Section 1: Iframe Embed ────────────────────────── */}
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              Instant Estimator Embed Code
              <Info className="w-4 h-4 text-muted-foreground" />
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Copy and paste this code into your website to embed the unified quote form with both HVAC and service options.
            </p>
          </div>
        </div>

        {/* Preview URL row */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">Preview URL</p>
          <div className="flex gap-2 items-center">
            <div className="flex-1 bg-muted rounded-md px-3 py-2 text-sm text-muted-foreground font-mono truncate border border-border">
              {widgetUrl}
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowIframePreview(true)}>
              <Eye className="w-4 h-4 mr-1.5" />
              Preview
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCopyLink}>
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Embed Code */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">Embed Code</p>
          <CopyBlock code={iframeCode} label="Embed code" />
        </div>

        {/* Helper text */}
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>Add this code to any page on your website where you want the quote form to appear.</p>
          <p>This form includes all your enabled HVAC products and services.</p>
          <p>You can adjust the width and height values to better fit your website&apos;s layout.</p>
        </div>
      </div>

      <Separator />

      {/* ── Section 2: Modal / Popup Embed ───────────────────── */}
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
            <div>
              <h3 className="text-xl font-bold text-foreground">Modal/Popup Embed</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add a button that opens the quote form in a modal overlay —{' '}
                <span className="text-muted-foreground">perfect for headers</span>
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => window.open(`/widget/${businessSlug}/modal-preview`, '_blank')}
          >
            <Eye className="w-4 h-4 mr-1.5" />
            Preview
          </Button>
        </div>

        {/* Simple / Advanced tabs */}
        <Tabs defaultValue="simple" className="w-full">
          <TabsList className="bg-muted">
            <TabsTrigger value="simple" className="data-[state=active]:bg-background">Simple Setup</TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:bg-background">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="simple" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Copy &amp; paste this code where you want the button:</p>
            <CopyBlock code={buttonCode} label="Button code" />
            <p className="text-xs text-muted-foreground">
              You can change the button text and style to match your website.
            </p>
          </TabsContent>

          <TabsContent value="advanced" className="mt-4 space-y-4">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Step 1 — Button</p>
                <p className="text-sm text-muted-foreground mb-2">Place this where you want the button to appear:</p>
                <CopyBlock code={buttonCode} label="Button code" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Step 2 — Modal</p>
                <p className="text-sm text-muted-foreground mb-2">
                  Place this once, just before the <code className="bg-muted px-1 rounded text-xs">&lt;/body&gt;</code> tag:
                </p>
                <CopyBlock code={modalCode} label="Modal code" />
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                <li>Button click opens the quote form in a centered overlay</li>
                <li>Click outside the modal or × to close</li>
                <li>Works on any website — no extra tools needed</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Widget ID ─────────────────────────────────────────── */}
      <Separator />
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">Your Widget ID</p>
        <code className="px-3 py-2 bg-muted rounded text-primary font-mono text-sm">
          {businessSlug}
        </code>
      </div>

      {/* ── Iframe Preview Dialog ─────────────────────────────── */}
      <Dialog open={showIframePreview} onOpenChange={setShowIframePreview}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Iframe Preview</DialogTitle>
            <DialogDescription>
              This is how the widget looks embedded inline on your webpage.
            </DialogDescription>
          </DialogHeader>
          <div className="border-t border-border">
            {/* Mock browser chrome */}
            <div className="bg-muted px-4 py-2 flex items-center gap-2 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 bg-background rounded px-3 py-1 text-xs text-muted-foreground font-mono truncate">
                yourwebsite.com/services
              </div>
            </div>
            {/* Page mock with widget inline */}
            <div className="p-6 bg-white dark:bg-zinc-900">
              <div className="h-7 bg-muted/60 rounded mb-3 w-1/3" />
              <div className="h-4 bg-muted/40 rounded mb-6 w-2/3" />
              <iframe
                src={widgetUrl}
                width="100%"
                height="560"
                style={{ border: 'none', borderRadius: '8px', display: 'block' }}
                loading="lazy"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
