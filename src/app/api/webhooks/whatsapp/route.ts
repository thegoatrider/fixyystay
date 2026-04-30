import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: Request) {
  // Webhook Verification
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // Respond with the challenge token from the request
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }
  return new NextResponse('Not Found', { status: 404 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.object !== 'whatsapp_business_account') {
      return new NextResponse('Not Found', { status: 404 });
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

    // Parse the payload statuses
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'messages' && change.value?.statuses) {
          for (const status of change.value.statuses) {
            // status contains: id (meta_message_id), status ('sent', 'delivered', 'read', 'failed')
            const resultStatus = status.status;
            const messageId = status.id;
            let errorMessage = null;

            if (resultStatus === 'failed' && status.errors) {
              errorMessage = status.errors[0]?.message || 'Unknown Meta error';
            }

            // Update the campaign_logs
            if (messageId) {
              await supabase
                .from('campaign_logs')
                .update({ 
                  status: resultStatus,
                  ...(errorMessage && { error_message: errorMessage })
                })
                .eq('meta_message_id', messageId);
            }
          }
        }
      }
    }

    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('Webhook error:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
