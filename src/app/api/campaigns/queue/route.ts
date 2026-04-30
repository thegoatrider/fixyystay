import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { ownerId, templateId } = await req.json();

    if (!ownerId || !templateId) {
      return NextResponse.json({ error: 'Missing ownerId or templateId' }, { status: 400 });
    }

    // Server-side supabase client for reliable queueing
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() { return ''; },
          set() {},
          remove() {}
        }
      }
    );

    // Get template
    const { data: template, error: tmplErr } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (tmplErr || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get leads for this owner
    const { data: leads, error: leadsErr } = await supabase
      .from('leads')
      .select('id, phone_number')
      .eq('owner_id', ownerId);

    if (leadsErr || !leads || leads.length === 0) {
      return NextResponse.json({ error: 'No leads found to message' }, { status: 400 });
    }

    // Create Campaign record
    const { data: campaign, error: campErr } = await supabase
      .from('campaigns')
      .insert({
        owner_id: ownerId,
        template_name: template.template_name,
        total_recipients: leads.length,
        status: 'queued'
      })
      .select('id')
      .single();

    if (campErr || !campaign) {
      throw new Error('Failed to create campaign');
    }

    // Create Campaign Logs (The Queue)
    const logsPayload = leads.map(l => ({
      campaign_id: campaign.id,
      lead_id: l.id,
      phone_number: l.phone_number,
      status: 'queued'
    }));

    // Chunk the insert just in case of large payload
    const chunkSize = 1000;
    for (let i = 0; i < logsPayload.length; i += chunkSize) {
      const chunk = logsPayload.slice(i, i + chunkSize);
      const { error: logsErr } = await supabase.from('campaign_logs').insert(chunk);
      if (logsErr) throw new Error('Failed to insert logs: ' + logsErr.message);
    }

    // Update campaign status to processing
    await supabase.from('campaigns').update({ status: 'processing' }).eq('id', campaign.id);

    // *Ideally*, here we would trigger an edge function or Upstash QStash.
    // For MVP, we will rely on a chron job or a manual trigger loop hitting /api/campaigns/process
    // We can fire-and-forget a non-blocking fetch call to /api/campaigns/process
    // NOTE: In Vercel serverless this might get killed before finishing, 
    // but the db state is safe for true chron retries.
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/campaigns/process`, {
       method: 'POST' 
    }).catch(() => {});

    return NextResponse.json({ success: true, campaignId: campaign.id, queued: leads.length });
  } catch (err: any) {
    console.error('Queue error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
