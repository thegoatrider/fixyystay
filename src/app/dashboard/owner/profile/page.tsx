import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CreditCard, ShieldCheck, Zap, History, ExternalLink, Calendar, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updatePassword } from '../actions'
import { format } from 'date-fns'
import ChangePasswordForm from './ChangePasswordForm'
import { cn } from '@/lib/utils'

export default async function OwnerProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: owner } = await supabase
    .from('owners')
    .select('id, name, email')
    .eq('user_id', user.id)
    .single()

  if (!owner) redirect('/guest')

  const { data: subscription } = await supabase
    .from('owner_subscriptions')
    .select('*')
    .eq('owner_id', owner.id)
    .maybeSingle()

  const { data: payments } = await supabase
    .from('owner_payments')
    .select('*')
    .eq('owner_id', owner.id)
    .order('payment_date', { ascending: false })

  const isActive = subscription?.status === 'active' && new Date(subscription.end_date) > new Date()

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

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Subscription Status */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white border-2 border-white ring-1 ring-gray-100 rounded-[32px] p-8 shadow-xl shadow-blue-900/5 relative overflow-hidden">
               {isActive && <div className="absolute top-0 right-0 p-8 opacity-5"><Zap className="w-32 h-32 text-blue-600" /></div>}
               
               <div className="flex items-center gap-4 mb-8">
                  <div className={cn("p-4 rounded-2xl", isActive ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>
                    <Zap className="w-6 h-6 font-black" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Current Subscription</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{subscription?.plan_name || 'No Plan Active'}</p>
                  </div>
               </div>

               {subscription ? (
                 <div className="grid sm:grid-cols-2 gap-6">
                    <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                       <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Expiry Date</p>
                       <p className="text-2xl font-black text-gray-900">{format(new Date(subscription.end_date), 'MMMM dd, yyyy')}</p>
                       <p className={cn("text-xs font-bold mt-1", isActive ? "text-green-600" : "text-red-500")}>
                          {isActive ? `Expires in ${Math.ceil((new Date(subscription.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days` : 'Your access is currently restricted'}
                       </p>
                    </div>
                    <div className="p-6 bg-blue-600 text-white rounded-2xl border border-blue-500 shadow-lg shadow-blue-600/20 flex flex-col justify-between">
                       <div>
                         <p className="text-[10px] font-black uppercase text-blue-200 tracking-widest mb-1">Plan Control</p>
                         <p className="text-xl font-black italic uppercase">Manage Plan</p>
                       </div>
                       <Button variant="secondary" className="w-full mt-4 bg-white text-blue-600 hover:bg-blue-50 font-black uppercase text-[10px] tracking-widest h-10 rounded-xl">
                          Upgrade / Renew
                       </Button>
                    </div>
                 </div>
               ) : (
                 <div className="p-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                    <p className="text-gray-500 font-bold mb-4">No active subscription found.</p>
                    <Button className="bg-blue-600 hover:bg-blue-700 h-12 px-8 rounded-xl font-bold">Contact Admin to Activate</Button>
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
            <ChangePasswordForm />

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
          </div>
        </div>
      </div>
    </main>
  )
}


