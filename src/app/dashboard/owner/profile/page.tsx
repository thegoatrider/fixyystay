import { createClient } from '@/utils/supabase/server'
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
import CreatePropertyForm from '../CreatePropertyForm'
import GoogleDriveSyncCard from './GoogleDriveSyncCard'
import { cn } from '@/lib/utils'

export default async function OwnerProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: owner } = await supabase
    .from('owners')
    .select('id, name, email, created_at')
    .eq('user_id', user.id)
    .single()

  if (!owner) redirect('/guest')

  const { data: subscription } = await supabase
    .from('owner_subscriptions')
    .select('*')
    .eq('owner_id', owner.id)
    .maybeSingle()

  const { data: googleToken } = await supabase
    .from('owner_google_tokens')
    .select('google_email')
    .eq('owner_id', owner.id)
    .maybeSingle()

  const { data: payments } = await supabase
    .from('owner_payments')
    .select('*')
    .eq('owner_id', owner.id)
    .order('payment_date', { ascending: false })

  const { count: propertiesCount } = await supabase.from('properties').select('*', { count: 'exact', head: true }).eq('owner_id', owner.id)
  const { count: leadsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('owner_id', owner.id)
  const { count: guestsCount } = await supabase.from('guest_checkins').select('*', { count: 'exact', head: true }).eq('owner_id', owner.id)
  
  const { data: earningsData } = await supabase.from('wallet_transactions').select('amount').eq('user_id', user.id).eq('transaction_type', 'earning')
  const earnings = earningsData?.reduce((acc, t) => acc + Number(t.amount), 0) || 0

  const isPaid = subscription?.status === 'active' && new Date(subscription.end_date) > new Date()
  
  // 7-day Trial Logic from Owner Creation Date
  const ownerCreatedAt = owner?.created_at ? new Date(owner.created_at) : null
  const trialEndDate = ownerCreatedAt ? new Date(ownerCreatedAt.getTime() + 7 * 24 * 60 * 60 * 1000) : null
  const isTrial = !isPaid && trialEndDate ? trialEndDate > new Date() : false
  const isExpired = !isPaid && trialEndDate ? trialEndDate <= new Date() : false

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
               {(isPaid || isTrial) && <div className="absolute top-0 right-0 p-8 opacity-5"><Zap className="w-32 h-32 text-blue-600" /></div>}
               
                <div className="flex items-center gap-4 mb-8">
                  <div className={cn("p-4 rounded-2xl", isPaid ? "bg-green-100 text-green-600" : isTrial ? "bg-yellow-100 text-yellow-600" : "bg-blue-100 text-blue-600")}>
                    {isTrial ? <History className="w-6 h-6 border-2 rounded-full p-0.5" /> : isPaid ? <Zap className="w-6 h-6 font-black" /> : <Zap className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">
                      {isPaid ? 'Active Subscription' : isTrial ? 'Free Trial Active' : 'Free Tier'}
                    </h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      {isPaid ? (subscription?.plan_name || 'Premium Plan') : isTrial ? '7-Day Free Trial' : 'Trial Expired / Restricted'}
                    </p>
                  </div>
               </div>

               {isPaid ? (
                 <div className="grid sm:grid-cols-2 gap-6">
                    <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                       <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Expiry Date & Time</p>
                       <p className="text-2xl font-black text-gray-900">{subscription?.end_date ? format(new Date(subscription.end_date), "MMMM dd, yyyy 'at' hh:mm a") : 'N/A'}</p>
                       <p className={cn("text-xs font-bold mt-1", "text-green-600")}>
                          Expires in {subscription?.end_date ? Math.ceil((new Date(subscription.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0} days
                       </p>
                    </div>
                    <div className="p-6 bg-blue-600 text-white rounded-2xl border border-blue-500 shadow-lg shadow-blue-600/20 flex flex-col justify-between">
                       <div>
                         <p className="text-[10px] font-black uppercase text-blue-200 tracking-widest mb-1">Plan Control</p>
                         <p className="text-xl font-black italic uppercase">Manage Plan</p>
                       </div>
                       <Button asChild variant="secondary" className="w-full mt-4 bg-white text-blue-600 hover:bg-blue-50 font-black uppercase text-[10px] tracking-widest h-10 rounded-xl">
                          <Link href="/pricing/starter">Upgrade / Renew</Link>
                       </Button>
                    </div>
                 </div>
               ) : isTrial ? (
                <div className="grid sm:grid-cols-2 gap-6">
                   <div className="p-6 bg-yellow-50 rounded-2xl border border-yellow-100">
                      <p className="text-[10px] font-black uppercase text-yellow-600 tracking-widest mb-2 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Trial Ends & Time</p>
                      <p className="text-2xl font-black text-gray-900">{trialEndDate ? format(trialEndDate, "MMMM dd, yyyy 'at' hh:mm a") : 'N/A'}</p>
                      <p className="text-xs font-bold mt-1 text-yellow-600">
                         Ends in {trialEndDate ? Math.ceil((trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0} days
                      </p>
                   </div>
                   <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl border border-blue-500 shadow-lg shadow-blue-600/20 flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase text-blue-200 tracking-widest mb-1">Current Status</p>
                        <p className="text-xl font-black italic uppercase">Enjoy All Features</p>
                      </div>
                      <Button asChild className="w-full mt-4 bg-white text-blue-600 hover:bg-blue-50 font-black uppercase text-[10px] tracking-widest h-10 rounded-xl">
                         <Link href="/pricing/starter">Upgrade Now</Link>
                      </Button>
                   </div>
                </div>
               ) : (
                 <div className="grid sm:grid-cols-2 gap-6">
                    <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                       <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-2">Access Status</p>
                       <p className="text-2xl font-black text-blue-900 italic">LIMITED FREE ACCESS</p>
                       <p className="text-xs font-medium text-blue-600 mt-1">Trial Expired. Upgrade To View Leads & Guests.</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-2xl border border-indigo-500 shadow-lg shadow-indigo-600/20 flex flex-col justify-between">
                       <div>
                         <p className="text-[10px] font-black uppercase text-indigo-200 tracking-widest mb-1">Standard Option</p>
                         <p className="text-xl font-black italic uppercase">Get Premium</p>
                       </div>
                       <Button asChild className="w-full mt-4 bg-yellow-400 text-indigo-900 hover:bg-yellow-300 font-black uppercase text-[10px] tracking-widest h-10 rounded-xl">
                          <Link href="/pricing/starter">Unlock Everything</Link>
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
                               {payment.payment_method}
                            </div>
                            {payment.payment_ref && (
                              <p className="text-[10px] text-blue-500 font-bold mt-1 max-w-[120px] truncate">{payment.payment_ref}</p>
                            )}
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
            <div className="space-y-4">
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Property Management</h3>
              <CreatePropertyForm />
            </div>

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


