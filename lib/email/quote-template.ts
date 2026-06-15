export interface TierData {
  tier: 'good' | 'better' | 'best'
  price: number
  warrantyYears: number | null
  efficiencyDescription: string | null
  scopeOfWork: string | null
}

export interface QuoteEmailInput {
  firstName: string
  lastName: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  productName: string | null
  capacityLabel: string | null
  tiers: TierData[]
  priceRangePct: number
  financingEnabled: boolean
  financingTermMonths: number
  financingApr: number
  financingLinkText: string | null
  financingLinkUrl: string | null
  businessName: string
  businessPhone: string | null
  businessEmail: string | null
  businessWebsite: string | null
  redirectUrl: string | null
  redirectButtonText: string | null
  specs: { label: string; value: string }[]
}

const TIER_STYLES = {
  good:   { border: '#16a34a', bg: '#f0fdf4', badgeBg: '#dcfce7', badgeColor: '#15803d', priceColor: '#16a34a', label: 'Good' },
  better: { border: '#d97706', bg: '#fffbeb', badgeBg: '#fef3c7', badgeColor: '#b45309', priceColor: '#d97706', label: 'Better' },
  best:   { border: '#2563eb', bg: '#eff6ff', badgeBg: '#dbeafe', badgeColor: '#1d4ed8', priceColor: '#2563eb', label: 'Best' },
}

function esc(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safeUrl(u: string | null | undefined): string {
  if (!u) return '#'
  return /^https?:\/\//i.test(u) ? u.replace(/"/g, '%22') : '#'
}

function formatPrice(price: number, pct: number): string {
  if (pct > 0) {
    const high = Math.round(price * (1 + pct / 100))
    return `$${price.toLocaleString()} – $${high.toLocaleString()}`
  }
  return `$${price.toLocaleString()}`
}

function calcMonthly(price: number, termMonths: number, apr: number): number {
  if (apr <= 0) return price / termMonths
  const r = apr / 100 / 12
  return price * (r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1)
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseScopeLines(scope: string | null): string[] {
  if (!scope) return []
  const text = stripHtml(scope)
  return text.split('\n').map(l => l.trim()).filter(Boolean)
}

function buildSpecGrid(specs: { label: string; value: string }[]): string {
  if (!specs.length) return ''
  const pairs: string[] = []
  for (let i = 0; i < specs.length; i += 2) {
    const a = specs[i]
    const b = specs[i + 1]
    pairs.push(`
      <tr>
        <td style="width:50%;padding:5px 0;vertical-align:top;">
          <p style="margin:0;color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">${esc(a.label)}</p>
          <p style="margin:2px 0 0;color:#1a1a3e;font-size:13px;font-weight:600;">${esc(a.value)}</p>
        </td>
        ${b ? `<td style="width:50%;padding:5px 0;vertical-align:top;">
          <p style="margin:0;color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">${esc(b.label)}</p>
          <p style="margin:2px 0 0;color:#1a1a3e;font-size:13px;font-weight:600;">${esc(b.value)}</p>
        </td>` : '<td></td>'}
      </tr>`)
  }
  return `
    <tr>
      <td style="background:#ffffff;padding:0 32px 20px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f3f4f6;padding-top:12px;">
          ${pairs.join('')}
        </table>
      </td>
    </tr>`
}

function buildTierRow(tier: TierData, pct: number, financingEnabled: boolean, termMonths: number, apr: number): string {
  const s = TIER_STYLES[tier.tier]
  const priceText = formatPrice(tier.price, pct)
  const isPopular = tier.tier === 'better'
  const monthly = financingEnabled && tier.price > 0
    ? Math.ceil(calcMonthly(tier.price, termMonths, apr))
    : null

  const popularBanner = isPopular
    ? `<tr><td colspan="2" style="background:#f59e0b;padding:4px 20px;text-align:center;"><span style="color:#fff;font-size:11px;font-weight:700;letter-spacing:0.5px;">&#9733; Most Popular</span></td></tr>`
    : ''

  return `
    <tr><td style="padding:6px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${s.border};border-radius:12px;overflow:hidden;">
        ${popularBanner}
        <tr>
          <td style="background:${s.bg};padding:16px 20px;width:55%;vertical-align:top;">
            <span style="background:${s.badgeBg};color:${s.badgeColor};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:3px 12px;border-radius:999px;">${esc(s.label)}</span>
            ${tier.warrantyYears != null ? `<span style="margin-left:8px;color:#9ca3af;font-size:11px;">${tier.warrantyYears}-yr warranty</span>` : ''}
            ${tier.efficiencyDescription ? `<p style="margin:8px 0 0;color:#6b7280;font-size:12px;line-height:1.5;">${esc(tier.efficiencyDescription)}</p>` : ''}
          </td>
          <td style="background:#ffffff;padding:16px 20px;text-align:right;vertical-align:middle;width:45%;">
            <p style="margin:0;color:${s.priceColor};font-size:22px;font-weight:800;line-height:1.2;">${priceText}</p>
            ${monthly != null ? `<p style="margin:6px 0 0;color:#6b7280;font-size:12px;"><strong style="color:#374151;">$${monthly}/mo</strong> &middot; ${termMonths}-mo financing</p>` : ''}
          </td>
        </tr>
      </table>
    </td></tr>`
}

export function buildQuoteEmailHtml(input: QuoteEmailInput): string {
  const {
    firstName, address, city, state, zip,
    productName, capacityLabel, tiers, priceRangePct,
    financingEnabled, financingTermMonths, financingApr,
    financingLinkText, financingLinkUrl,
    businessName, businessPhone, businessEmail, businessWebsite,
    redirectUrl, redirectButtonText, specs,
  } = input

  const addressLine = [address, city, state, zip].filter(Boolean).join(', ')
  const capacityLine = capacityLabel ?? null

  const specGridHtml = buildSpecGrid(specs)

  const tierCardsHtml = tiers
    .map(t => buildTierRow(t, priceRangePct, financingEnabled, financingTermMonths, financingApr))
    .join('')

  const financingCtaHtml = financingEnabled && financingLinkUrl && financingLinkText
    ? `<tr><td style="background:#ffffff;padding:0 32px 16px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;text-align:center;"><p style="margin:0 0 8px;color:#6b7280;font-size:12px;">Flexible financing available</p><a href="${safeUrl(financingLinkUrl)}" style="display:inline-block;border:2px solid #4f46e5;color:#4f46e5;font-size:13px;font-weight:600;padding:8px 24px;border-radius:999px;text-decoration:none;">${esc(financingLinkText)}</a></td></tr>`
    : ''

  const ctaHtml = redirectUrl && redirectButtonText
    ? `<tr><td style="background:#ffffff;padding:0 32px 28px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;text-align:center;"><a href="${safeUrl(redirectUrl)}" style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:999px;text-decoration:none;">${esc(redirectButtonText)}</a></td></tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your HVAC Quote from ${esc(businessName)}</title>
</head>
<body style="margin:0;padding:0;background:#f7f8fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fc;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">

          <tr>
            <td style="background:linear-gradient(135deg,#047857 0%,#10b981 100%);border-radius:12px 12px 0 0;padding:44px 40px 38px;text-align:center;">
              <p style="margin:0 0 12px;color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:2.5px;font-weight:600;">HVAC Installation Quote</p>
              <h1 style="margin:0;color:#ffffff;font-size:34px;font-weight:800;letter-spacing:-0.5px;line-height:1.1;">${esc(businessName)}</h1>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:22px 0 24px;"><div style="height:1px;background:rgba(255,255,255,0.2);"></div></td></tr></table>
              <p style="margin:0 0 10px;color:rgba(255,255,255,0.95);font-size:16px;font-weight:500;">Hi ${esc(firstName)}, here&rsquo;s your personalized estimate</p>
              ${addressLine ? `<span style="display:inline-block;background:rgba(255,255,255,0.95);border-radius:999px;padding:5px 16px;color:#065f46;font-size:12px;font-weight:500;">&#128205;&nbsp;${esc(addressLine)}</span>` : ''}
            </td>
          </tr>

          <tr>
            <td style="background:#ffffff;padding:24px 32px 12px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              ${productName ? `<h2 style="margin:0 0 4px;color:#047857;font-size:19px;font-weight:800;letter-spacing:-0.3px;">${esc(productName)}</h2>` : ''}
              ${capacityLine ? `<p style="margin:0;color:#6b7280;font-size:13px;font-weight:500;">${esc(capacityLine)}</p>` : ''}
            </td>
          </tr>

          ${specGridHtml}

          <tr>
            <td style="background:#ffffff;padding:4px 32px 8px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">Your estimated installation price range</p>
            </td>
          </tr>

          <tr>
            <td style="background:#ffffff;padding:0 24px 24px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${tierCardsHtml}
              </table>
            </td>
          </tr>

          ${financingCtaHtml}
          ${ctaHtml}

          <tr>
            <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px 32px;">
              <p style="margin:0 0 10px;color:#374151;font-size:14px;font-weight:600;">Questions? Get in touch:</p>
              ${businessPhone ? `<p style="margin:0 0 5px;color:#4b5563;font-size:13px;">&#128222; ${esc(businessPhone)}</p>` : ''}
              ${businessEmail ? `<p style="margin:0 0 5px;color:#4b5563;font-size:13px;">&#9993; ${esc(businessEmail)}</p>` : ''}
              ${businessWebsite ? `<p style="margin:0;font-size:13px;"><a href="${safeUrl(businessWebsite)}" style="color:#4f46e5;text-decoration:none;">&#127760; ${esc(businessWebsite)}</a></p>` : ''}
              <p style="margin:20px 0 0;color:#d1d5db;font-size:11px;text-align:center;">Powered by Leadder &middot; This is an automated message</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
