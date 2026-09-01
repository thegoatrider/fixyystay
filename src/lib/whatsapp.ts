import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Meta Graph API version
const API_VERSION = 'v19.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

interface TemplateComponent {
  type: string;
  parameters: Array<{
    type: string;
    text: string;
  }>;
}

interface SendTemplateParams {
  ownerId: string;
  toPhone: string;
  templateName: string;
  languageCode?: string;
  components?: TemplateComponent[];
}

/**
 * Validates and formats the phone number to E.164 without the '+'
 * e.g., "919876543210"
 */
function formatWhatsAppNumber(phone: string): string {
  // strip all non-digits
  const digits = phone.replace(/\D/g, '');
  // if length is 10, assume India and add 91
  if (digits.length === 10) {
    return '91' + digits;
  }
  return digits;
}

export async function sendWhatsAppTemplate({
  ownerId,
  toPhone,
  templateName,
  languageCode = 'en',
  components = []
}: SendTemplateParams) {
  // Fetch tenant whatsapp configuration
  // Initialize supabase admin client because this might be called in background jobs
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

  const { data: account, error } = await supabase
    .from('whatsapp_accounts')
    .select('phone_number_id, access_token')
    .eq('owner_id', ownerId)
    .single();

  if (error || !account) {
    throw new Error(`WhatsApp account not found for owner_id: ${ownerId}`);
  }

  const { phone_number_id, access_token } = account;

  const url = `${BASE_URL}/${phone_number_id}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    to: formatWhatsAppNumber(toPhone),
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode
      },
      components: components
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error?.message || 'Failed to send WhatsApp message');
  }

  // responseData.messages[0].id is the meta_message_id
  return {
    meta_message_id: responseData.messages?.[0]?.id,
    raw_response: responseData
  };
}
