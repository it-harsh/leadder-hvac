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
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseScopeLines(scope: string | null): string[] {
  if (!scope) return []
  const text = stripHtml(scope)
  return text.split('\n').map(l => l.trim()).filter(Boolean)
}

function buildTierCard(tier: TierData, pct: number, financingEnabled: boolean, termMonths: number, apr: number): string {
  const s = TIER_STYLES[tier.tier]
  const priceText = formatPrice(tier.price, pct)
  const isPopular = tier.tier === 'better'
  const scopeLines = parseScopeLines(tier.scopeOfWork)
  const monthly = financingEnabled && tier.price > 0
    ? Math.ceil(calcMonthly(tier.price, termMonths, apr))
    : null

  return `
    <td width="33%" style="vertical-align:top;padding:6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${s.border};border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:${s.bg};padding:14px;text-align:center;">
            ${isPopular ? `<span style="display:inline-block;background:#f59e0b;color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;margin-bottom:6px;">Most Popular</span><br>` : ''}
            <span style="background:${s.badgeBg};color:${s.badgeColor};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:3px 10px;border-radius:999px;">${esc(s.label)}</span>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:16px;">
            <p style="margin:0 0 2px;color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Estimated Price</p>
            <p style="margin:0;color:${s.priceColor};font-size:18px;font-weight:700;line-height:1.2;">${priceText}</p>
            ${tier.warrantyYears != null ? `<p style="margin:4px 0 0;color:#9ca3af;font-size:11px;">${tier.warrantyYears}-yr warranty</p>` : ''}
            ${tier.efficiencyDescription ? `<p style="margin:10px 0 2px;color:#374151;font-size:11px;font-weight:600;">Unit Efficiency</p><p style="margin:0;color:#6b7280;font-size:11px;">${esc(tier.efficiencyDescription)}</p>` : ''}
            ${monthly != null ? `<div style="margin:10px 0 0;background:#f3f4f6;border-radius:8px;padding:8px;text-align:center;"><span style="color:#1a1a3e;font-size:13px;font-weight:700;">$${monthly}/mo</span><br><span style="color:#9ca3af;font-size:10px;">with ${termMonths}-mo financing</span></div>` : ''}
            ${scopeLines.length > 0 ? `<p style="margin:12px 0 6px;color:#374151;font-size:11px;font-weight:600;border-top:1px solid #f3f4f6;padding-top:10px;">What's Included</p><ul style="margin:0;padding-left:16px;">${scopeLines.slice(0, 6).map(l => `<li style="color:#6b7280;font-size:11px;margin-bottom:3px;">${esc(l)}</li>`).join('')}</ul>` : ''}
          </td>
        </tr>
      </table>
    </td>`
}

export function buildQuoteEmailHtml(input: QuoteEmailInput): string {
  const {
    firstName, address, city, state, zip,
    productName, capacityLabel, tiers, priceRangePct,
    financingEnabled, financingTermMonths, financingApr,
    financingLinkText, financingLinkUrl,
    businessName, businessPhone, businessEmail, businessWebsite,
    redirectUrl, redirectButtonText,
  } = input

  const addressLine = [address, city, state, zip].filter(Boolean).join(', ')
  const productLine = [productName, capacityLabel].filter(Boolean).join(' · ')

  const tierCardsHtml = tiers
    .map(t => buildTierCard(t, priceRangePct, financingEnabled, financingTermMonths, financingApr))
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
            <td style="background:#4f46e5;border-radius:12px 12px 0 0;padding:32px;text-align:center;">
              <p style="margin:0 0 6px;color:rgba(255,255,255,0.7);font-size:12px;text-transform:uppercase;letter-spacing:1px;">HVAC Quote</p>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">${esc(businessName)}</h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">Hi ${esc(firstName)}, here's your personalized estimate</p>
            </td>
          </tr>

          ${addressLine ? `<tr><td style="background:#eef2ff;padding:12px 32px;border-left:1px solid #e0e7ff;border-right:1px solid #e0e7ff;"><p style="margin:0;color:#4f46e5;font-size:13px;">&#128205; ${esc(addressLine)}</p></td></tr>` : ''}

          <tr>
            <td style="background:#ffffff;padding:24px 32px 12px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              ${productLine ? `<h2 style="margin:0 0 4px;color:#1a1a3e;font-size:17px;font-weight:700;">${esc(productLine)}</h2>` : ''}
              <p style="margin:0;color:#6b7280;font-size:13px;">Your estimated installation price range</p>
            </td>
          </tr>

          <tr>
            <td style="background:#ffffff;padding:8px 20px 24px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>${tierCardsHtml}</tr>
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
