import { Resend } from 'resend';

interface BookingNotificationParams {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  propertyName: string;
  roomCategory: string;
  amount: number;
  bookingId: string;
}

export async function sendBookingNotifications(params: BookingNotificationParams) {
  const { guestName, guestEmail, guestPhone, propertyName, roomCategory, amount, bookingId } = params;

  console.log(`[Notification] Preparing to notify ${guestName} for booking ${bookingId}`);

  // 1. Send Email via Resend
  await sendEmail(guestEmail, guestName, propertyName, roomCategory, amount, bookingId);

  // 2. Send SMS via Twilio
  await sendSMS(guestPhone, guestName, propertyName, roomCategory, amount);
}

async function sendEmail(email: string, name: string, property: string, room: string, amount: number, id: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Notification] RESEND_API_KEY missing. Skipping email.');
    return;
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: 'FixStay <bookings@fixstay.com>',
      to: [email],
      subject: `Booking Confirmed: ${property}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #2563eb;">Your stay is confirmed!</h2>
          <p>Hi <strong>${name}</strong>,</p>
          <p>Thank you for booking with FixStay. Your reservation at <strong>${property}</strong> is confirmed.</p>
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Booking Details:</p>
            <p style="margin: 5px 0; font-weight: bold;">Room: ${room}</p>
            <p style="margin: 5px 0; font-weight: bold;">Amount Paid: ₹${amount.toLocaleString()}</p>
            <p style="margin: 5px 0; font-size: 12px; color: #9ca3af;">Ref: ${id}</p>
          </div>
          <p>We look forward to hosting you. If you have any questions, reply to this email or contact us via WhatsApp.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">FixStay - Premium Stays Simplified</p>
        </div>
      `,
    });

    if (error) {
      console.error('[Notification] Resend API error:', error);
    } else {
      console.log(`[Notification] Email sent successfully to ${email}. ID: ${data?.id}`);
    }
  } catch (err) {
    console.error('[Notification] Failed to dispatch email:', err);
  }
}

async function sendSMS(phone: string, name: string, property: string, room: string, amount: number) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromPhone) {
    console.warn('[Notification] Twilio credentials missing. Skipping SMS.');
    return;
  }

  try {
    // Twilio Uses Basic Auth and Form-Data
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const body = new URLSearchParams({
      To: phone,
      From: fromPhone,
      Body: `Hi ${name}, your booking at ${property} (${room}) is confirmed! Amount: ₹${amount}. See you soon! - FixStay`,
    });

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('[Notification] Twilio API error:', err);
    } else {
      console.log(`[Notification] SMS sent successfully to ${phone}`);
    }
  } catch (err) {
    console.error('[Notification] Failed to dispatch SMS:', err);
  }
}
