import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createAdminClient()
  const email = 'officialpolice@fixystays.com'
  const password = 'PoliceSecure@2026' // Strong password as requested
  
  try {
    // 1. Create User in Auth
    const { data: userData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'police' }
    })

    if (authError) {
      // If already exists, we might want to update it or just report it
      if (authError.message.includes('already registered')) {
         // Update metadata just in case
         const { data: existingUser } = await supabase.from('auth.users' as any).select('id').eq('email', email).single() as any
         if (existingUser) {
            await supabase.auth.admin.updateUserById(existingUser.id, {
               user_metadata: { role: 'police' }
            })
            return NextResponse.json({ success: true, message: 'Police user updated', userId: existingUser.id })
         }
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Police account created successfully',
      userId: userData.user?.id,
      email: email,
      role: 'police'
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
