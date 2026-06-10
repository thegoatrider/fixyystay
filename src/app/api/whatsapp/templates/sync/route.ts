import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ownerId } = body;

    if (!ownerId) {
      return new NextResponse('Owner ID is required', { status: 400 });
    }

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

    // 1. Get WABA ID and Token
    const { data: waAccount } = await supabase
      .from('whatsapp_accounts')
      .select('waba_id, access_token')
      .eq('owner_id', ownerId)
      .single();

    if (!waAccount || !waAccount.waba_id || !waAccount.access_token) {
      return new NextResponse('WhatsApp account not fully connected', { status: 400 });
    }

    // 2. Fetch templates from Meta
    const metaUrl = `https://graph.facebook.com/v20.0/${waAccount.waba_id}/message_templates?limit=100`;
    const response = await fetch(metaUrl, {
      headers: {
        'Authorization': `Bearer ${waAccount.access_token}`
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Meta API error:', errText);
      return new NextResponse('Failed to fetch templates from Meta', { status: 500 });
    }

    const data = await response.json();
    const templates = data.data || [];

    // 3. Upsert templates to DB
    for (const template of templates) {
      const { name, language, category, components, status } = template;

      const { data: existing } = await supabase
        .from('whatsapp_templates')
        .select('id')
        .eq('owner_id', ownerId)
        .eq('template_name', name)
        .eq('language_code', language)
        .single();

      if (existing) {
        await supabase
          .from('whatsapp_templates')
          .update({
            category,
            components,
            status
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('whatsapp_templates')
          .insert({
            owner_id: ownerId,
            template_name: name,
            language_code: language,
            category,
            components,
            status
          });
      }
    }

    return NextResponse.json({ success: true, count: templates.length });
  } catch (error) {
    console.error('Template sync error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
