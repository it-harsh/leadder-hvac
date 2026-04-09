'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Check, Copy, ExternalLink, Code, LayoutPanelTop, Eye } from 'lucide-react'
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
  const [showModalPreview, setShowModalPreview] = useState(false)

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(widgetUrl)
    setCopiedLink(true)
    toast.success('Widget URL copied to clipboard')
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
    <div className="space-y-8 max-w-2xl">
      <Tabs defaultValue="iframe" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted">
          <TabsTrigger value="iframe" className="data-[state=active]:bg-background">
            <Code className="w-3.5 h-3.5 mr-1.5" />
            Iframe Embed
          </TabsTrigger>
          <TabsTrigger value="link" className="data-[state=active]:bg-background">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Direct Link
          </TabsTrigger>
          <TabsTrigger value="modal" className="data-[state=active]:bg-background">
            <LayoutPanelTop className="w-3.5 h-3.5 mr-1.5" />
            Popup Modal
          </TabsTrigger>
        </TabsList>

        {/* Iframe tab */}
        <TabsContent value="iframe" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base text-foreground">Iframe Code</CardTitle>
                  <CardDescription>Copy and paste into your website HTML</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowIframePreview(true)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <CopyBlock code={iframeCode} label="Iframe code" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">Instructions:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Copy the iframe code above</li>
                  <li>Paste it into your website&apos;s HTML</li>
                  <li>Adjust the height if needed</li>
                  <li>Save and publish your changes</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Direct link tab */}
        <TabsContent value="link" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base text-foreground">Direct Link</CardTitle>
              <CardDescription>Share directly with customers or use in marketing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="p-4 bg-muted rounded-lg text-sm text-foreground overflow-x-auto">
                  <code>{widgetUrl}</code>
                </pre>
                <Button size="sm" variant="secondary" className="absolute top-2 right-2" onClick={handleCopyLink}>
                  {copiedLink ? <><Check className="w-4 h-4 mr-1" />Copied</> : <><Copy className="w-4 h-4 mr-1" />Copy</>}
                </Button>
              </div>
              <Button asChild className="w-full" variant="outline">
                <a href={widgetUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Widget Preview
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Popup modal tab */}
        <TabsContent value="modal" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowModalPreview(true)}>
              <Eye className="w-4 h-4 mr-2" />
              Preview Modal
            </Button>
          </div>
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base text-foreground">Step 1 — Button Code</CardTitle>
              <CardDescription>
                Place this where you want the button to appear on your page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CopyBlock code={buttonCode} label="Button code" />
              <p className="text-xs text-muted-foreground mt-3">
                You can change the button text and style to match your website.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base text-foreground">Step 2 — Modal Code</CardTitle>
              <CardDescription>
                Place this once, just before the <code className="bg-muted px-1 rounded">&lt;/body&gt;</code> tag
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CopyBlock code={modalCode} label="Modal code" />
              <div className="text-sm text-muted-foreground mt-3">
                <p className="font-medium text-foreground mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Button click opens the quote form in a centered overlay</li>
                  <li>Click outside the modal or × to close</li>
                  <li>Works on any website — no extra tools needed</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <Code className="w-5 h-5 text-primary" />
            Your Widget ID
          </CardTitle>
        </CardHeader>
        <CardContent>
          <code className="px-3 py-2 bg-muted rounded text-primary font-mono">
            {businessSlug}
          </code>
        </CardContent>
      </Card>

      {/* Iframe Preview Dialog */}
      <Dialog open={showIframePreview} onOpenChange={setShowIframePreview}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Iframe Preview</DialogTitle>
            <DialogDescription>
              This is how the widget looks embedded inline on your webpage.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 border-t border-border">
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
            <div className="p-4 bg-white dark:bg-zinc-900">
              <div className="h-8 bg-muted/60 rounded mb-4 w-1/3" />
              <div className="h-4 bg-muted/40 rounded mb-6 w-2/3" />
              <iframe
                src={widgetUrl}
                width="100%"
                height="580"
                style={{ border: 'none', borderRadius: '8px', display: 'block' }}
                loading="lazy"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Popup Modal Preview — full-screen overlay matching the actual embed */}
      {showModalPreview && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setShowModalPreview(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden w-full shadow-2xl"
            style={{ maxWidth: '680px', maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
              <strong className="text-sm text-gray-900 dark:text-white">Get Your Instant Quote</strong>
              <button
                onClick={() => setShowModalPreview(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none transition-colors"
                aria-label="Close preview"
              >
                ×
              </button>
            </div>
            <iframe
              src={widgetUrl}
              width="100%"
              height="580"
              style={{ border: 'none', display: 'block' }}
              loading="lazy"
            />
          </div>
        </div>
      )}
    </div>
  )
}
