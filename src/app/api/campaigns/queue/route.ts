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
        name: `Campaign ${new Date().toISOString().split('T')[0]}`,
        template_name: template.template_name,
        total_recipients: leads.length,
        status: 'queued'
      })
      .select('id')
      .single();

    if (campErr || !campaign) {
      throw new Error('Failed to create campaign');
    }

    // Insert into message_queue for the background worker
    const queuePayload = leads.map(l => ({
      owner_id: ownerId,
      campaign_id: campaign.id,
      lead_id: l.id,
      type: 'template',
      payload: {
        to: l.phone_number,
        template_name: template.template_name,
        language: template.language_code || 'en'
      },
      status: 'pending'
    }));

    // Chunk the insert just in case of large payload
    const chunkSize = 500;
    for (let i = 0; i < queuePayload.length; i += chunkSize) {
      const chunk = queuePayload.slice(i, i + chunkSize);
      const { error: queueErr } = await supabase.from('message_queue').insert(chunk);
      if (queueErr) throw new Error('Failed to insert into queue: ' + queueErr.message);
    }

    // Update campaign status to processing (the worker will handle the rest)
    await supabase.from('campaigns').update({ status: 'processing' }).eq('id', campaign.id);

    return NextResponse.json({ success: true, campaignId: campaign.id, queued: leads.length });
  } catch (err: any) {
    console.error('Queue error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
