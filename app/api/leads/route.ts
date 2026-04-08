import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      businessId,
      productId,
      capacityOptionId,
      pricingTierId,
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      zip,
      productName,
      capacityLabel,
      tierSelected,
      quotedPrice,
      priceGood,
      priceBetter,
      priceBest,
    } = body

    if (!businessId || !firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .insert({
        business_id: businessId,
        product_id: productId || null,
        capacity_option_id: capacityOptionId || null,
        pricing_tier_id: pricingTierId || null,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        address: address || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        product_name: productName || null,
        capacity_label: capacityLabel || null,
        tier_selected: tierSelected || null,
        quoted_price: quotedPrice || null,
        price_good: priceGood || null,
        price_better: priceBetter || null,
        price_best: priceBest || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating lead:', error)
      return NextResponse.json(
        { error: 'Failed to create lead' },
        { status: 500 }
      )
    }

    // Fire webhook + GHL — both non-blocking, both always attempted
    void fireWebhookAsync(businessId, lead)
    void fireGHLAsync(businessId, lead)

    return NextResponse.json({ success: true, lead })
  } catch (error) {
    console.error('Error in leads API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function fireGHLAsync(businessId: string, lead: Record<string, unknown>) {
  try {
    const { data: settings, error } = await supabaseAdmin
      .from('business_settings')
      .select('ghl_enabled, ghl_api_key, ghl_location_id, ghl_pipeline_id, ghl_stage_id')
      .eq('business_id', businessId)
      .single()

    if (error || !settings?.ghl_enabled || !settings?.ghl_api_key || !settings?.ghl_location_id || !settings?.ghl_pipeline_id) {
      return // GHL not enabled or not configured — skip silently
    }

    const { ghl_api_key, ghl_location_id, ghl_pipeline_id, ghl_stage_id } = settings

    // Fetch business name for the opportunity
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .single()

    const headers = {
      'Authorization': `Bearer ${ghl_api_key}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json',
    }

    // Step 1 — Create contact
    const contactRes = await fetch('https://services.leadconnectorhq.com/contacts/upsert', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        locationId: ghl_location_id,
        firstName: lead.first_name,
        lastName: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        address1: lead.address,
        city: lead.city,
        state: lead.state,
        postalCode: lead.zip,
        source: 'Leadder',
        tags: ['leadder'],
      }),
    })

    if (!contactRes.ok) {
      console.error('[ghl] Contact creation failed — HTTP', contactRes.status, await contactRes.text().catch(() => ''))
      return
    }

    const { contact } = await contactRes.json()

    // Build opportunity name: "John Smith · Split System · 2 Ton · $3,800–$4,900"
    const priceRange = lead.price_good && lead.price_best
      ? ` · $${Number(lead.price_good).toLocaleString()}–$${Number(lead.price_best).toLocaleString()}`
      : lead.price_good ? ` · $${Number(lead.price_good).toLocaleString()}` : ''

    const oppName = [
      `${lead.first_name} ${lead.last_name}`,
      lead.product_name,
      lead.capacity_label,
    ].filter(Boolean).join(' · ') + priceRange

    // Build note with full quote breakdown
    const addressLine = [lead.address, lead.city, lead.state, lead.zip].filter(Boolean).join(', ')
    const noteLines = [
      'Lead source: Leadder',
      lead.product_name   ? `Product: ${lead.product_name}`               : null,
      lead.capacity_label ? `Capacity: ${lead.capacity_label}`             : null,
      addressLine         ? `Address: ${addressLine}`                      : null,
      lead.price_good     ? `Good:   $${Number(lead.price_good).toLocaleString()}`   : null,
      lead.price_better   ? `Better: $${Number(lead.price_better).toLocaleString()}` : null,
      lead.price_best     ? `Best:   $${Number(lead.price_best).toLocaleString()}`   : null,
    ].filter(Boolean).join('\n')

    // Step 2 — Create opportunity
    const oppBody: Record<string, unknown> = {
      locationId: ghl_location_id,
      pipelineId: ghl_pipeline_id,
      name: oppName,
      contactId: contact.id,
      status: 'open',
      source: 'Leadder',
      ...(business?.name ? { companyName: business.name } : {}),
      ...(lead.price_good ? { monetaryValue: Number(lead.price_good) } : {}),
      ...(ghl_stage_id ? { pipelineStageId: ghl_stage_id } : {}),
    }

    const oppRes = await fetch('https://services.leadconnectorhq.com/opportunities/', {
      method: 'POST',
      headers,
      body: JSON.stringify(oppBody),
    })

    if (!oppRes.ok) {
      console.error('[ghl] Opportunity creation failed — HTTP', oppRes.status, await oppRes.text().catch(() => ''))
      return
    }

    const { opportunity } = await oppRes.json()

    // Step 3 — Add note to contact with full quote breakdown
    await fetch(`https://services.leadconnectorhq.com/contacts/${contact.id}/notes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ body: noteLines }),
    }).catch(err => console.error('[ghl] Note creation failed:', err))

    console.log('[ghl] Lead pushed — contact:', contact.id, 'opportunity:', opportunity?.id)
  } catch (err) {
    console.error('[ghl] Error for business', businessId, err)
  }
}

async function fireWebhookAsync(businessId: string, lead: Record<string, unknown>) {
  try {
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('business_settings')
      .select('webhook_enabled, webhook_url')
      .eq('business_id', businessId)
      .single()

    if (settingsError) {
      console.error('[webhook] Failed to fetch business settings:', settingsError.message)
      return
    }

    if (!settings?.webhook_enabled || !settings?.webhook_url) {
      return // Webhook disabled or not configured — skip silently
    }

    console.log('[webhook] Firing to:', settings.webhook_url)

    const res = await fetch(settings.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'lead.created',
        lead: {
          id: lead.id,
          firstName: lead.first_name,
          lastName: lead.last_name,
          email: lead.email,
          phone: lead.phone,
          address: lead.address,
          city: lead.city,
          state: lead.state,
          zip: lead.zip,
          productName: lead.product_name,
          capacityLabel: lead.capacity_label,
          tierSelected: lead.tier_selected,
          quotedPrice: lead.quoted_price,
          priceGood: lead.price_good,
          priceBetter: lead.price_better,
          priceBest: lead.price_best,
          submittedAt: lead.created_at,
        },
      }),
    })

    if (!res.ok) {
      console.error('[webhook] Delivery failed — HTTP', res.status, await res.text().catch(() => ''))
    } else {
      console.log('[webhook] Delivered successfully — HTTP', res.status)
    }
  } catch (err) {
    console.error('[webhook] Network error for business', businessId, err)
  }
}
