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

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'messages' && change.value) {
          const value = change.value;
          
          // 1. Handle Status Updates (Outbound)
          if (value.statuses) {
            for (const status of value.statuses) {
              const resultStatus = status.status;
              const messageId = status.id;
              let errorMessage = null;

              if (resultStatus === 'failed' && status.errors) {
                errorMessage = status.errors[0]?.message || 'Unknown Meta error';
              }

              if (messageId) {
                await supabase
                  .from('campaign_logs')
                  .update({ 
                    status: resultStatus,
                    ...(errorMessage && { error_message: errorMessage })
                  })
                  .eq('meta_message_id', messageId);
                
                await supabase
                  .from('messages')
                  .update({
                    status: resultStatus
                  })
                  .eq('meta_message_id', messageId);
              }
            }
          }

          // 2. Handle Incoming Messages
          if (value.messages) {
            const phoneNumberId = value.metadata?.phone_number_id;
            
            // Find the owner for this WhatsApp number
            const { data: waAccount } = await supabase
              .from('whatsapp_accounts')
              .select('owner_id')
              .eq('phone_number_id', phoneNumberId)
              .single();
              
            if (!waAccount) continue; // Not our account
            const ownerId = waAccount.owner_id;

            for (const message of value.messages) {
              const fromPhone = message.from; // e.g. "919876543210"
              const msgId = message.id;
              const msgType = message.type;
              const msgContent = msgType === 'text' ? message.text?.body : `[${msgType} message]`;
              
              // Find Lead
              let leadId = null;
              let { data: lead } = await supabase
                .from('leads')
                .select('id')
                .eq('owner_id', ownerId)
                .eq('phone_number', fromPhone)
                .single();

              if (!lead) {
                // Auto-create lead
                const guestName = value.contacts?.[0]?.profile?.name || 'Unknown Guest';
                const { data: newLead } = await supabase
                  .from('leads')
                  .insert({
                    owner_id: ownerId,
                    phone_number: fromPhone,
                    name: guestName,
                    status: 'New',
                    source: 'WhatsApp'
                  })
                  .select('id')
                  .single();
                  
                if (newLead) leadId = newLead.id;
              } else {
                leadId = lead.id;
              }

              if (!leadId) continue;

              // Find or create Conversation
              let convId = null;
              let { data: conversation } = await supabase
                .from('conversations')
                .select('id')
                .eq('owner_id', ownerId)
                .eq('lead_id', leadId)
                .single();

              if (!conversation) {
                const { data: newConv } = await supabase
                  .from('conversations')
                  .insert({
                    owner_id: ownerId,
                    lead_id: leadId
                  })
                  .select('id')
                  .single();
                if (newConv) convId = newConv.id;
              } else {
                convId = conversation.id;
                // Update last_message_at
                await supabase
                  .from('conversations')
                  .update({ last_message_at: new Date().toISOString() })
                  .eq('id', convId);
              }

              if (!convId) continue;

              // Insert message
              await supabase
                .from('messages')
                .insert({
                  conversation_id: convId,
                  lead_id: leadId,
                  direction: 'inbound',
                  type: msgType,
                  content: msgContent,
                  meta_message_id: msgId,
                  status: 'received'
                });
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
