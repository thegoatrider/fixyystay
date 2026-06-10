import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function processQueue() {
  console.log('Checking for pending messages...');

  // Fetch up to 50 pending messages
  const { data: messages, error } = await supabase
    .from('message_queue')
    .select('id, owner_id, campaign_id, lead_id, type, payload')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) {
    console.error('Error fetching queue:', error);
    return;
  }

  if (!messages || messages.length === 0) {
    return; // Nothing to process
  }

  console.log(`Processing ${messages.length} messages...`);

  // Process each message
  for (const job of messages) {
    try {
      // 1. Mark as processing
      await supabase
        .from('message_queue')
        .update({ status: 'processing' })
        .eq('id', job.id);

      // 2. Get owner's WhatsApp credentials
      const { data: waAccount } = await supabase
        .from('whatsapp_accounts')
        .select('phone_number_id, access_token')
        .eq('owner_id', job.owner_id)
        .single();

      if (!waAccount || !waAccount.access_token || !waAccount.phone_number_id) {
        throw new Error('WhatsApp account not fully connected');
      }

      // 3. Prepare payload for Meta API
      const metaUrl = `https://graph.facebook.com/v20.0/${waAccount.phone_number_id}/messages`;
      
      const toPhone = job.payload.to;
      let body: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toPhone
      };

      if (job.type === 'template') {
        body.type = 'template';
        body.template = {
          name: job.payload.template_name,
          language: { code: job.payload.language || 'en' }
          // components: job.payload.components (if variables exist)
        };
      } else if (job.type === 'text') {
        body.type = 'text';
        body.text = { body: job.payload.text };
      }

      // 4. Send request to Meta
      const response = await fetch(metaUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waAccount.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to send message via Meta');
      }

      const metaMessageId = result.messages?.[0]?.id;

      // 5. Update campaign_logs or create it
      if (job.campaign_id) {
        await supabase
          .from('campaign_logs')
          .insert({
            campaign_id: job.campaign_id,
            lead_id: job.lead_id,
            phone_number: toPhone,
            status: 'sent',
            meta_message_id: metaMessageId
          });
          
        // Update campaign total_sent (naive approach, better done with DB triggers)
        // Ignoring for now since triggers/webhooks handle most updates
      }

      // 6. Update queue status
      await supabase
        .from('message_queue')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', job.id);

    } catch (err: any) {
      console.error(`Job ${job.id} failed:`, err.message);
      await supabase
        .from('message_queue')
        .update({
          status: 'failed',
          error: err.message,
          processed_at: new Date().toISOString()
        })
        .eq('id', job.id);
    }
  }
}

// Polling interval (e.g., every 5 seconds)
const POLL_INTERVAL = 5000;

console.log('Background worker started. Polling every 5 seconds...');
setInterval(processQueue, POLL_INTERVAL);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Worker shutting down...');
  process.exit();
});
process.on('SIGTERM', () => {
  console.log('Worker shutting down...');
  process.exit();
});
