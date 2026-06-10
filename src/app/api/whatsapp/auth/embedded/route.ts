import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ownerId, wabaId, phoneNumberId, accessToken } = body;

    if (!ownerId || !wabaId || !phoneNumberId || !accessToken) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
    const APP_SECRET = process.env.META_APP_SECRET;

    if (!APP_ID || !APP_SECRET) {
      return new NextResponse('Meta app credentials not configured on server', { status: 500 });
    }

    // 1. Exchange short-lived token for long-lived token
    const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${accessToken}`;
    const tokenRes = await fetch(tokenUrl);
    
    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Failed to exchange token:', err);
      return new NextResponse('Failed to exchange token with Meta', { status: 400 });
    }

    const tokenData = await tokenRes.json();
    const longLivedToken = tokenData.access_token;

    // 2. Fetch Phone Number details to get the display name and actual number
    const phoneUrl = `https://graph.facebook.com/v20.0/${phoneNumberId}`;
    const phoneRes = await fetch(phoneUrl, {
      headers: { 'Authorization': `Bearer ${longLivedToken}` }
    });

    let businessName = 'WhatsApp Business Account';
    let displayPhoneNumber = '';

    if (phoneRes.ok) {
      const phoneData = await phoneRes.json();
      businessName = phoneData.verified_name || businessName;
      displayPhoneNumber = phoneData.display_phone_number || '';
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

    // 3. Upsert to whatsapp_accounts
    const { data: existingAccount } = await supabase
      .from('whatsapp_accounts')
      .select('id')
      .eq('owner_id', ownerId)
      .single();

    if (existingAccount) {
      await supabase
        .from('whatsapp_accounts')
        .update({
          business_name: businessName,
          whatsapp_phone_number: displayPhoneNumber,
          phone_number_id: phoneNumberId,
          waba_id: wabaId,
          access_token: longLivedToken,
          status: 'connected',
          verified: true
        })
        .eq('id', existingAccount.id);
    } else {
      await supabase
        .from('whatsapp_accounts')
        .insert({
          owner_id: ownerId,
          business_name: businessName,
          whatsapp_phone_number: displayPhoneNumber,
          phone_number_id: phoneNumberId,
          waba_id: wabaId,
          access_token: longLivedToken,
          status: 'connected',
          verified: true
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Embedded setup error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
