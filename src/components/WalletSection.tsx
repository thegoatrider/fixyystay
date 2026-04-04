'use client'

import { useState } from 'react'
import { Wallet, IndianRupee, ArrowRight, Clock, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Transaction = {
  id: string
  amount: number
  transaction_type: string
  description: string
  created_at: string
}

type PayoutRequest = {
  id: string
  amount: number
  status: string
  created_at: string
}

export default function WalletSection({ 
  transactions, 
  payouts,
  onRequestPayout
}: { 
  transactions: Transaction[],
  payouts: PayoutRequest[],
  onRequestPayout: (amount: number, bankDetails: string) => Promise<void>
}) {
  const [isRequesting, setIsRequesting] = useState(false)
  const [payoutType, setPayoutType] = useState<'upi' | 'bank'>('upi')
  const [upiId, setUpiId] = useState('')
  const [bankAccount, setBankAccount] = useState({ name: '', number: '', ifsc: '' })
  const [amount, setAmount] = useState('')

  const earnings = transactions.filter(t => t.transaction_type === 'earning').reduce((acc, t) => acc + Number(t.amount), 0)
  const withdrawn = transactions.filter(t => t.transaction_type === 'payout').reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0)
  const pendingPayouts = payouts.filter(p => p.status === 'pending').reduce((acc, p) => acc + Number(p.amount), 0)
  
  const availableBalance = earnings - withdrawn - pendingPayouts

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount) return
    
    let details = ''
    if (payoutType === 'upi') {
      if (!upiId) return
      details = `UPI: ${upiId}`
    } else {
      if (!bankAccount.name || !bankAccount.number || !bankAccount.ifsc) return
      details = `Bank: ${bankAccount.name} | A/C: ${bankAccount.number} | IFSC: ${bankAccount.ifsc}`
    }

    if (Number(amount) > availableBalance) {
      alert("Amount exceeds available balance.")
      return
    }
    
    await onRequestPayout(Number(amount), details)
    setIsRequesting(false)
    setAmount('')
    setUpiId('')
    setBankAccount({ name: '', number: '', ifsc: '' })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Wallet className="w-24 h-24" />
          </div>
          <p className="text-blue-100 font-medium mb-1 relative z-10">Available Balance</p>
          <h2 className="text-4xl font-black relative z-10 flex items-center">
            ₹{availableBalance.toLocaleString()}
          </h2>
          {isRequesting ? (
            <div className="mt-6 bg-white/10 p-4 rounded-xl backdrop-blur-sm relative z-10">
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div>
                  <Label className="text-white text-xs">Amount to Withdraw (Min ₹100)</Label>
                  <Input 
                    type="number" max={availableBalance} min="100" 
                    value={amount} onChange={e => setAmount(e.target.value)}
                    className="bg-white/20 border-white/30 text-white placeholder-white/50" 
                    placeholder="₹0.00" autoFocus
                  />
                </div>

                <div className="flex gap-2 p-1 bg-white/10 rounded-lg">
                   <button 
                    type="button"
                    onClick={() => setPayoutType('upi')}
                    className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${payoutType === 'upi' ? 'bg-white text-blue-700' : 'text-white hover:bg-white/10'}`}
                   >UPI</button>
                   <button 
                    type="button"
                    onClick={() => setPayoutType('bank')}
                    className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${payoutType === 'bank' ? 'bg-white text-blue-700' : 'text-white hover:bg-white/10'}`}
                   >Bank Account</button>
                </div>

                {payoutType === 'upi' ? (
                  <div>
                    <Label className="text-white text-xs">UPI ID</Label>
                    <Input 
                      value={upiId} onChange={e => setUpiId(e.target.value)}
                      className="bg-white/20 border-white/30 text-white placeholder-white/50" 
                      placeholder="yourname@upi" 
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input 
                      placeholder="Account Holder Name"
                      value={bankAccount.name}
                      onChange={e => setBankAccount({...bankAccount, name: e.target.value})}
                      className="bg-white/20 border-white/30 text-xs text-white placeholder-white/50"
                    />
                    <Input 
                      placeholder="Account Number"
                      value={bankAccount.number}
                      onChange={e => setBankAccount({...bankAccount, number: e.target.value})}
                      className="bg-white/20 border-white/30 text-xs text-white placeholder-white/50"
                    />
                    <Input 
                      placeholder="IFSC Code"
                      value={bankAccount.ifsc}
                      onChange={e => setBankAccount({...bankAccount, ifsc: e.target.value})}
                      className="bg-white/20 border-white/30 text-xs text-white placeholder-white/50 uppercase"
                    />
                  </div>
                )}

                <div className="flex gap-2 mt-2">
                  <Button type="button" variant="ghost" className="text-white hover:bg-white/10 px-2 h-9 text-xs" onClick={() => setIsRequesting(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1 bg-white text-blue-700 hover:bg-blue-50 font-bold h-9">Submit Request</Button>
                </div>
              </form>
            </div>
          ) : (
            <Button onClick={() => setIsRequesting(true)} disabled={availableBalance <= 0} className="mt-6 bg-white text-blue-700 hover:bg-blue-50 font-black px-6 shadow-md relative z-10">
              Request Payout
            </Button>
          )}
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm flex flex-col justify-center">
          <p className="text-gray-500 font-medium mb-1">Total Lifetime Earnings</p>
          <h3 className="text-3xl font-black text-gray-900">₹{earnings.toLocaleString()}</h3>
        </div>

        <div className="bg-white border text-orange-600 rounded-2xl p-6 shadow-sm flex flex-col justify-center">
          <p className="text-orange-400 font-medium mb-1">Pending Payouts</p>
          <h3 className="text-3xl font-black">₹{pendingPayouts.toLocaleString()}</h3>
        </div>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Recent Transactions</h3>
        </div>
        <div className="divide-y max-h-[400px] overflow-y-auto">
          {transactions.slice().reverse().map(t => (
            <div key={t.id} className="p-4 px-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${t.transaction_type === 'earning' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {t.transaction_type === 'earning' ? <PlusCircle className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{t.description || (t.transaction_type === 'earning' ? 'Credit' : 'Payout Withdrawal')}</p>
                  <p className="text-xs text-gray-500">{new Date(t.created_at).toLocaleDateString()} at {new Date(t.created_at).toLocaleTimeString()}</p>
                </div>
              </div>
              <div className={`font-black tracking-tight ${t.transaction_type === 'earning' ? 'text-green-600' : 'text-gray-900'}`}>
                {t.transaction_type === 'earning' ? '+' : '-'}₹{Math.abs(Number(t.amount)).toLocaleString()}
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No transactions yet. Start earning to see your wallet activity!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
