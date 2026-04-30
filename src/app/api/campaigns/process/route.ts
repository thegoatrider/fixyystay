import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { sendWhatsAppTemplate } from '@/lib/whatsapp';

export const maxDuration = 60; // Allow max timeout length for vercel

export async function POST(req: Request) {
  // We don't necessarily need body. We're just processing the queue.
  try {
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

    // Fetch up to 50 queued messages to process in this batch
    const { data: logs, error: logsErr } = await supabase
      .from('campaign_logs')
      .select('*, campaigns ( owner_id, template_name )')
      .eq('status', 'queued')
      .order('timestamp', { ascending: true })
      .limit(50);

    if (logsErr || !logs || logs.length === 0) {
      return NextResponse.json({ message: 'Queue is empty' });
    }

    let processedCount = 0;

    for (const item of logs) {
      if (!item.campaigns?.owner_id || !item.campaigns?.template_name) {
        // Mark failed
        await supabase.from('campaign_logs')
          .update({ status: 'failed', error_message: 'Missing campaign data' })
          .eq('id', item.id);
        continue;
      }

      try {
        const result = await sendWhatsAppTemplate({
          ownerId: item.campaigns.owner_id,
          toPhone: item.phone_number,
          templateName: item.campaigns.template_name,
        });

        // Mark sent
        await supabase.from('campaign_logs')
          .update({ 
            status: 'sent', 
            meta_message_id: result.meta_message_id 
          })
          .eq('id', item.id);

      } catch (sendErr: any) {
        // Mark failed
        await supabase.from('campaign_logs')
          .update({ 
            status: 'failed', 
            error_message: sendErr.message 
          })
          .eq('id', item.id);
      }
      processedCount++;
    }

    // Attempt to trigger the next batch if there might be more
    if (processedCount === 50) {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/campaigns/process`, {
        method: 'POST' 
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, processed: processedCount });

  } catch (err: any) {
    console.error('Process queue error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
