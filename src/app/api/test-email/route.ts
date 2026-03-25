import { Resend } from 'resend';
import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey || apiKey === 're_xxxxxxxxx') {
    return NextResponse.json({ 
      error: "RESEND_API_KEY is not set or still has the placeholder value. Please update your .env.local or Vercel environment variables." 
    }, { status: 400 });
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: 'FixStay <onboarding@resend.dev>',
      to: 'fixystays@gmail.com',
      subject: 'Hello World - Resend Test',
      html: '<p>Congrats on sending your <strong>first email</strong> from FixStay!</p>'
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Test email sent successfully to fixystays@gmail.com!",
      data 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
