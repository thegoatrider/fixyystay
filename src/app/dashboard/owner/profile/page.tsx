import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { ArrowLeft, CreditCard, ShieldCheck, Zap, History, ExternalLink, Calendar, CheckCircle2, Home, Users, List, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updatePassword } from '../actions'
import { format } from 'date-fns'
import ChangePasswordForm from './ChangePasswordForm'
import OwnerProfileCard from './OwnerProfileCard'
import GoogleDriveSyncCard from './GoogleDriveSyncCard'
import { ensureOwner } from '@/lib/ensure-owner'
import { reconcileOwnerSubscriptions } from '@/lib/reconciliation'
import { cn } from '@/lib/utils'

export default async function OwnerProfilePage() {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 1. Fetch owner record with self-healing email fallback
  let { data: owner } = await supabaseAdmin
    .from('owners')
    .select('id, name, email, created_at, phone')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!owner && user.email) {
    const { data: matchedOwner } = await supabaseAdmin
      .from('owners')
      .select('id, name, email, created_at, phone')
      .ilike('email', user.email.toLowerCase().trim())
      .maybeSingle()

    if (matchedOwner) {
      owner = matchedOwner
      const { error: linkError } = await supabaseAdmin.from('owners').update({ user_id: user.id }).eq('id', matchedOwner.id)
      if (linkError) {
        console.warn('Error linking owner user_id:', linkError.message)
      }
    }
  }

  if (!owner) {
    const ensured = await ensureOwner(supabaseAdmin, {
      userId: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || 'Partner',
      phone: user.user_metadata?.phone || null,
    })
    owner = ensured.owner as any
  }

  if (!owner) {
    redirect('/onboarding')
  }

  // 1b. Proactive self-healing reconciliation for any unlinked or completed payments
  try {
    await reconcileOwnerSubscriptions(owner.id)
  } catch (reconErr) {
    console.warn('[OwnerProfilePage] Auto-reconciliation check:', reconErr)
  }

  // 2. Fetch property subscriptions & owner properties concurrently
  const [
    { data: propSubs },
    { data: ownerProps },
    { data: subscription },
    { data: activeHub },
    { data: googleToken },
    { data: payments }
  ] = await Promise.all([
    supabaseAdmin
      .from('property_subscriptions')
      .select('id, property_id, plan_name, status, start_date, end_date, room_count, monthly_fee, months')
      .eq('owner_id', owner.id)
      .order('end_date', { ascending: false }),
    supabaseAdmin
      .from('properties')
      .select('id, name, room_count')
      .eq('owner_id', owner.id),
    supabaseAdmin
      .from('owner_subscriptions')
      .select('id, owner_id, plan_name, status, start_date, end_date')
      .eq('owner_id', owner.id)
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('guest_hub_settings')
      .select('id, subscription_status, subscription_end_date, properties!inner(id, owner_id)')
      .eq('properties.owner_id', owner.id)
      .eq('subscription_status', 'active')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('owner_google_tokens')
      .select('google_email')
      .eq('owner_id', owner.id)
      .maybeSingle(),
    supabaseAdmin
      .from('owner_payments')
      .select('id, owner_id, amount, payment_date, payment_method, payment_ref, plan_duration_months, status, room_count, monthly_fee')
      .eq('owner_id', owner.id)
      .order('payment_date', { ascending: false })
  ])

  const propNameMap = new Map<string, string>()
  const propRoomMap = new Map<string, number>()
  if (ownerProps) {
    for (const p of ownerProps) {
      propNameMap.set(p.id, p.name)
      if (p.room_count) propRoomMap.set(p.id, p.room_count)
    }
  }

  const { count: propertiesCount } = await supabaseAdmin.from('properties').select('*', { count: 'exact', head: true }).eq('owner_id', owner.id)
  const { count: leadsCount } = await supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('owner_id', owner.id)
  const { count: guestsCount } = await supabaseAdmin.from('guest_checkins').select('*', { count: 'exact', head: true }).eq('owner_id', owner.id)
  
  const { data: earningsData } = await supabaseAdmin.from('wallet_transactions').select('amount').eq('user_id', user.id).eq('transaction_type', 'earning')
  const earnings = earningsData?.reduce((acc, t) => acc + Number(t.amount), 0) || 0

  const now = new Date()
  const activePropSubs = (propSubs || []).filter(
    (s: any) => s.status === 'active' && s.end_date && new Date(s.end_date) > now
  )
  const isLegacyActive = subscription?.status === 'active' && !!subscription?.end_date && new Date(subscription.end_date) > now
  const isPaid = activePropSubs.length > 0 || isLegacyActive
  const isHubActive = !isPaid && !!activeHub?.subscription_end_date && new Date(activeHub.subscription_end_date) > now

  // Resolve authoritative subscription dates and plan
  let effectiveEndDate: string | null = null
  let effectiveStartDate: string | null = null
  let effectivePlanName = 'FixyStays Partner Plan'

  if (activePropSubs.length > 0) {
    const latest = [...activePropSubs].sort(
      (a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
    )[0]
    effectiveEndDate = latest.end_date
    effectiveStartDate = latest.start_date
    effectivePlanName = latest.plan_name || 'FixyStays Partner Plan'
  } else if (isLegacyActive && subscription) {
    effectiveEndDate = subscription.end_date
    effectiveStartDate = subscription.start_date
    effectivePlanName = subscription.plan_name || 'FixyStays Partner Plan'
  } else {
    const allSubs = [
      ...(propSubs || []).filter((s: any) => s.end_date).map((s: any) => ({ end: s.end_date, start: s.start_date, plan: s.plan_name })),
      ...(subscription?.end_date ? [{ end: subscription.end_date, start: subscription.start_date, plan: subscription.plan_name }] : [])
    ].sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime())

    if (allSubs.length > 0) {
      effectiveEndDate = allSubs[0].end
      effectiveStartDate = allSubs[0].start
      effectivePlanName = allSubs[0].plan || 'FixyStays Partner Plan'
    }
  }

  const daysRemaining = effectiveEndDate && isPaid
    ? Math.max(0, Math.ceil((new Date(effectiveEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  return (
    <main className="min-h-screen bg-gray-50/50 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Link href="/dashboard/owner" className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-blue-600 transition mb-8 w-fit group">
          <div className="p-1.5 bg-white border rounded-lg group-hover:border-blue-200 group-hover:bg-blue-50 transition shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Back to Dashboard
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight italic uppercase">Account & Plan</h1>
            <p className="text-gray-500 font-medium mt-1">Manage your professional partner subscription and security.</p>
          </div>
          <div className="flex items-center gap-4 p-4 bg-white border-2 border-blue-100 rounded-3xl shadow-sm">
             <div className="p-3 bg-blue-600 text-white rounded-2xl">
                <CheckCircle2 className="w-6 h-6" />
             </div>
             <div>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1">Partner Status</p>
                <p className="text-lg font-black text-blue-600 leading-none">Verified Partner</p>
             </div>
          </div>
        </div>

        {/* Stats Quick View */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link href="/dashboard/owner?tab=properties" className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all text-left group">
            <div className="flex items-center gap-3 mb-2 text-gray-500 group-hover:text-blue-600 transition-colors">
              <Home className="w-5 h-5 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider">Properties</span>
            </div>
            <div className="text-2xl font-black text-gray-900">{propertiesCount || 0}</div>
          </Link>
          <Link href="/dashboard/owner?tab=guests" className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-100 transition-all text-left group">
            <div className="flex items-center gap-3 mb-2 text-gray-500 group-hover:text-purple-600 transition-colors">
              <Users className="w-5 h-5 text-purple-600" />
              <span className="text-xs font-bold uppercase tracking-wider">Guests</span>
            </div>
            <div className="text-2xl font-black text-gray-900">{guestsCount || 0}</div>
          </Link>
          <Link href="/dashboard/owner?tab=leads" className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-green-100 transition-all text-left group">
            <div className="flex items-center gap-3 mb-2 text-gray-500 group-hover:text-green-600 transition-colors">
              <List className="w-5 h-5 text-green-600" />
              <span className="text-xs font-bold uppercase tracking-wider">Leads</span>
            </div>
            <div className="text-2xl font-black text-gray-900">{leadsCount || 0}</div>
          </Link>
          <Link href="/dashboard/owner?tab=wallet" className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-amber-100 transition-all text-left group">
            <div className="flex items-center gap-3 mb-2 text-gray-500 group-hover:text-amber-600 transition-colors">
              <Wallet className="w-5 h-5 text-amber-600" />
              <span className="text-xs font-bold uppercase tracking-wider">Earnings</span>
            </div>
            <div className="text-2xl font-black text-gray-900">₹{earnings.toLocaleString()}</div>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Subscription Status */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white border-2 border-white ring-1 ring-gray-100 rounded-[32px] p-8 shadow-xl shadow-blue-900/5 relative overflow-hidden">
               {isPaid && <div className="absolute top-0 right-0 p-8 opacity-5"><Zap className="w-32 h-32 text-blue-600" /></div>}
               
                <div className="flex items-center gap-4 mb-8">
                  <div className={cn("p-4 rounded-2xl", (isPaid || isHubActive) ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>
                    {(isPaid || isHubActive) ? <Zap className="w-6 h-6 font-black" /> : <Zap className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">
                      {isPaid ? 'Active Subscription' : isHubActive ? 'Active Guest Hub Plan' : 'Subscription Expired'}
                    </h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      {isPaid ? effectivePlanName : isHubActive ? 'Standalone Guest Hub Active' : effectiveEndDate ? 'Plan Expired' : 'Renewal Required'}
                    </p>
                  </div>
               </div>

               {isPaid ? (
                 <div className="space-y-6">
                   <div className="grid sm:grid-cols-2 gap-6">
                      <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                         <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 flex items-center gap-1.5"><Calendar className="w-3 h-3 text-blue-600" /> Expiry Date &amp; Time</p>
                         <p className="text-2xl font-black text-gray-900">{effectiveEndDate ? format(new Date(effectiveEndDate), "MMMM dd, yyyy 'at' hh:mm a") : 'N/A'}</p>
                         <p className={cn("text-xs font-bold mt-1", "text-green-600")}>
                            Expires in {daysRemaining} days
                         </p>
                         {effectiveStartDate && (
                           <p className="text-[10px] text-gray-400 mt-2 font-medium">
                             Started on {format(new Date(effectiveStartDate), "MMM dd, yyyy")}
                           </p>
                         )}
                      </div>
                      <div className="p-6 bg-blue-600 text-white rounded-2xl border border-blue-500 shadow-lg shadow-blue-600/20 flex flex-col justify-between">
                         <div>
                           <p className="text-[10px] font-black uppercase text-blue-200 tracking-widest mb-1">Plan Control</p>
                           <p className="text-xl font-black italic uppercase">Manage Plan</p>
                           <p className="text-xs text-blue-100 mt-1">Full premium partner access to leads, bookings, guests, and marketing.</p>
                         </div>
                         <Button asChild variant="secondary" className="w-full mt-4 bg-white text-blue-600 hover:bg-blue-50 font-black uppercase text-[10px] tracking-widest h-10 rounded-xl">
                            <Link href="/renew">Manage / Renew</Link>
                         </Button>
                      </div>
                   </div>

                   {activePropSubs.length > 0 && (
                     <div className="pt-6 border-t border-gray-100">
                       <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3 flex items-center gap-1.5">
                         <Home className="w-3.5 h-3.5 text-blue-600" /> Active Property Plans ({activePropSubs.length})
                       </p>
                       <div className="grid sm:grid-cols-2 gap-3">
                         {activePropSubs.map((ps: any) => {
                           const pName = propNameMap.get(ps.property_id) || 'Property'
                           const pRooms = ps.room_count || propRoomMap.get(ps.property_id) || 1
                           return (
                             <div key={ps.id} className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-100 flex items-center justify-between">
                               <div>
                                 <p className="text-xs font-bold text-gray-900">{pName}</p>
                                 <p className="text-[10px] text-gray-400 font-medium">{pRooms} Room{pRooms > 1 ? 's' : ''} • Active</p>
                               </div>
                               <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-green-100 text-green-700">
                                 Valid till {format(new Date(ps.end_date), 'MMM dd, yyyy')}
                               </span>
                             </div>
                           )
                         })}
                       </div>
                     </div>
                   )}
                 </div>
               ) : isHubActive ? (
                 <div className="grid sm:grid-cols-2 gap-6">
                    <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                       <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-2 flex items-center gap-1.5"><Calendar className="w-3 h-3 text-blue-600" /> Guest Hub Expiry</p>
                       <p className="text-2xl font-black text-gray-900">{activeHub?.subscription_end_date ? format(new Date(activeHub.subscription_end_date), "MMMM dd, yyyy 'at' hh:mm a") : 'N/A'}</p>
                       <p className="text-xs font-bold mt-1 text-blue-600">
                          Expires in {activeHub?.subscription_end_date ? Math.max(0, Math.ceil((new Date(activeHub.subscription_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 0} days
                       </p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl border border-blue-500 shadow-lg shadow-blue-600/20 flex flex-col justify-between">
                       <div>
                         <p className="text-[10px] font-black uppercase text-blue-200 tracking-widest mb-1">Standalone Plan</p>
                         <p className="text-xl font-black italic uppercase">Guest Hub Plan</p>
                       </div>
                       <Button asChild className="w-full mt-4 bg-white text-blue-600 hover:bg-blue-50 font-black uppercase text-[10px] tracking-widest h-10 rounded-xl">
                          <Link href="/renew">Manage Subscriptions</Link>
                       </Button>
                    </div>
                 </div>
               ) : (
                 <div className="grid sm:grid-cols-2 gap-6">
                    <div className="p-6 bg-red-50/60 rounded-2xl border border-red-100">
                       <p className="text-[10px] font-black uppercase text-red-600 tracking-widest mb-2 flex items-center gap-1.5">
                         <Calendar className="w-3 h-3 text-red-600" />
                         {effectiveEndDate ? 'Subscription Expiry Date' : 'Access Status'}
                       </p>
                       <p className="text-xl sm:text-2xl font-black text-gray-900">
                         {effectiveEndDate 
                           ? format(new Date(effectiveEndDate), "MMMM dd, yyyy 'at' hh:mm a") 
                           : 'SUBSCRIPTION EXPIRED'}
                       </p>
                       <p className="text-xs font-semibold text-red-600 mt-1">
                         {effectiveEndDate 
                           ? `Subscription ended on ${format(new Date(effectiveEndDate), "MMM dd, yyyy")}. Renew to keep access active.` 
                           : 'Subscription required to view full lead and guest details.'}
                       </p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-2xl border border-indigo-500 shadow-lg shadow-indigo-600/20 flex flex-col justify-between">
                       <div>
                         <p className="text-[10px] font-black uppercase text-indigo-200 tracking-widest mb-1">Status</p>
                         <p className="text-xl font-black italic uppercase">Renewal Required</p>
                       </div>
                       <Button asChild className="w-full mt-4 bg-white text-indigo-600 hover:bg-indigo-50 font-black uppercase text-[10px] tracking-widest h-10 rounded-xl">
                          <Link href="/renew">Renew Property Access</Link>
                       </Button>
                    </div>
                 </div>
               )}
            </div>

            {/* Payment History */}
            <div className="bg-white border ring-1 ring-gray-100 rounded-[32px] p-8 shadow-sm">
               <div className="flex items-center gap-4 mb-8">
                  <div className="p-4 bg-gray-100 text-gray-600 rounded-2xl">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Payment History</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Manual & Digital Transactions</p>
                  </div>
               </div>

               <div className="space-y-4">
                  {payments && payments.length > 0 ? (
                    payments.map((payment: any) => (
                      <div key={payment.id} className="flex justify-between items-center p-5 bg-gray-50/50 hover:bg-gray-50 rounded-2xl border border-gray-100 transition duration-300 group">
                         <div className="flex items-center gap-5">
                            <div className="p-3 bg-white rounded-xl border text-green-600 group-hover:scale-110 transition">
                               <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                               <p className="text-sm font-black text-gray-900">₹{payment.amount}</p>
                               <p className="text-[10px] font-bold text-gray-400 uppercase">{format(new Date(payment.payment_date), 'MMM dd, yyyy')}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border text-[10px] font-black text-gray-500 uppercase tracking-tighter">
                               {payment.payment_method || 'Online'}
                            </div>
                            {payment.payment_ref && (
                              <p className="text-[10px] text-blue-500 font-bold mt-1 max-w-[120px] truncate" title={payment.payment_ref}>{payment.payment_ref}</p>
                            )}
                            {payment.plan_duration_months ? (
                              <p className="text-[9px] text-gray-400 font-medium">{payment.plan_duration_months} mo plan</p>
                            ) : null}
                         </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-12 text-gray-400 font-medium leading-relaxed italic border-2 border-dashed rounded-3xl">No payment records available.</p>
                  )}
               </div>
            </div>
          </div>

          {/* Right: Profile & Security */}
          <div className="space-y-8">
            <OwnerProfileCard
              initialName={owner.name || user.user_metadata?.name || 'Partner'}
              initialPhone={owner.phone || user.user_metadata?.phone || ''}
              email={owner.email || user.email || ''}
              createdAt={owner.created_at}
            />

            <ChangePasswordForm />

            <Suspense fallback={<div className="p-8 bg-white border rounded-[32px] text-xs text-gray-400">Loading sync settings...</div>}>
              <GoogleDriveSyncCard initialGoogleEmail={googleToken?.google_email || null} />
            </Suspense>

            <div className="bg-blue-50 p-8 rounded-[32px] border border-blue-100 flex flex-col gap-4">
               <div>
                  <h4 className="font-black text-blue-900 italic">Need Help?</h4>
                  <p className="text-xs text-blue-700 font-medium leading-relaxed">Questions about your billing or features? Reach out to our partner support.</p>
               </div>
               <Link href="https://wa.me/917506288907" className="flex items-center justify-between p-4 bg-white rounded-2xl border border-blue-200 group">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-blue-400 leading-none">WhatsApp Support</span>
                    <span className="text-sm font-bold text-blue-900">75062 88907</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-blue-400 group-hover:text-blue-600 transition" />
               </Link>
            </div>

            <div className="bg-red-50 p-8 rounded-[32px] border border-red-100 flex flex-col gap-4">
               <div>
                  <h4 className="font-black text-red-950 italic">Danger Zone</h4>
                  <p className="text-xs text-red-700 font-medium leading-relaxed">Permanently delete your account and all associated properties, leads, and checklists.</p>
               </div>
               <Button asChild variant="destructive" className="w-full font-black uppercase text-[10px] tracking-widest h-12 rounded-2xl">
                  <Link href="/delete-account">Delete Account</Link>
               </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}


