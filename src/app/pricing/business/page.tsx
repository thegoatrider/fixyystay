import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function BusinessPricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/renew')
  } else {
    redirect('/onboarding')
  }
}
