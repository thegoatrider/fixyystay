'use client'

import { useState } from 'react'
import { Megaphone, MessageSquare, CheckCircle, XCircle, Clock, User, ExternalLink, Calendar, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { respondToPromotionRequest } from '../influencer/influencer-requests-actions'
import { format } from 'date-fns'

type Request = {
  id: string
  influencer_id: string
  property_id: string
  proposal_text: string
  status: 'pending' | 'accepted' | 'rejected'
  rejection_reason?: string
  created_at: string
  influencers: { id: string; name: string; email: string }
  properties: { id: string; name: string }
}

export default function InfluencerRequestsInbox({ 
  requests: initialRequests 
}: { 
  requests: Request[] 
}) {
  const [requests, setRequests] = useState<Request[]>(initialRequests)
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false)
  const [decision, setDecision] = useState<'accepted' | 'rejected' | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleResponse = async () => {
    if (!selectedRequest || !decision) return
    if (decision === 'rejected' && !rejectionReason) {
      alert('Please provide a reason for rejection.')
      return
    }

    setIsSubmitting(true)
    const res = await respondToPromotionRequest(selectedRequest.id, decision, rejectionReason)
    if (res.success) {
      setRequests(prev => prev.map(r => 
        r.id === selectedRequest.id 
          ? { ...r, status: decision, rejection_reason: rejectionReason } 
          : r
      ))
      setIsDecisionModalOpen(false)
      setSelectedRequest(null)
      setDecision(null)
      setRejectionReason('')
    } else {
      alert(res.error)
    }
    setIsSubmitting(false)
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const historyRequests = requests.filter(r => r.status !== 'pending')

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      
      {/* Pending Requests Section */}
      <section>
        <h2 className="text-xl font-black mb-6 flex items-center gap-3 text-gray-900 px-1">
          <div className="p-2 bg-indigo-50 rounded-lg"><Clock className="w-5 h-5 text-indigo-600" /></div>
          Pending Proposals ({pendingRequests.length})
        </h2>
        
        {pendingRequests.length === 0 ? (
          <div className="p-16 border-2 border-dashed bg-white rounded-[2rem] text-center text-gray-400 flex flex-col items-center gap-4">
             <Megaphone className="w-10 h-10 opacity-20" />
             <p className="font-bold">No new promotion requests at the moment.</p>
             <p className="text-xs">Incoming proposals from influencers will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {pendingRequests.map(req => (
              <div key={req.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col gap-5 group">
                <div className="flex justify-between items-start">
                   <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-100">
                        {req.influencers.name[0]}
                      </div>
                      <div>
                         <p className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{req.influencers.name}</p>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{req.influencers.email}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 mb-1">{req.properties.name}</p>
                      <p className="text-[9px] text-gray-300 font-bold">{format(new Date(req.created_at), 'MMM d, h:mm a')}</p>
                   </div>
                </div>

                <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 italic text-sm text-gray-600 leading-relaxed relative">
                   <MessageSquare className="absolute -top-2 -left-2 w-5 h-5 text-indigo-100" />
                   "{req.proposal_text}"
                </div>

                <div className="flex gap-3 mt-2">
                   <Button 
                    onClick={() => { setSelectedRequest(req); setDecision('rejected'); setIsDecisionModalOpen(true) }}
                    variant="outline" 
                    className="flex-1 h-12 rounded-xl border-red-100 text-red-600 hover:bg-red-50 font-black text-xs uppercase"
                   >
                     Decline
                   </Button>
                   <Button 
                    onClick={() => { setSelectedRequest(req); setDecision('accepted'); setIsDecisionModalOpen(true) }}
                    className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-black text-xs uppercase shadow-lg shadow-indigo-100"
                   >
                     Approve Partner
                   </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History Section */}
      {historyRequests.length > 0 && (
        <section className="mt-4 opacity-80">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-gray-400 px-1">
            <div className="p-2 bg-gray-100 rounded-lg"><Calendar className="w-5 h-5 text-gray-400" /></div>
            Past Decisions
          </h2>
          <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Influencer</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Property</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Feedback Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {historyRequests.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4">
                       <p className="font-bold text-gray-800 text-sm">{req.influencers.name}</p>
                       <p className="text-[10px] text-gray-400 font-medium">{req.influencers.email}</p>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{req.properties.name}</span>
                    </td>
                    <td className="px-6 py-4">
                       {req.status === 'accepted' ? (
                         <span className="inline-flex items-center gap-1 text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-md uppercase tracking-wider">
                           <CheckCircle className="w-3 h-3" /> Approved
                         </span>
                       ) : (
                         <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-md uppercase tracking-wider">
                           <XCircle className="w-3 h-3" /> Declined
                         </span>
                       )}
                    </td>
                    <td className="px-6 py-4">
                       <p className="text-xs text-gray-500 italic max-w-xs truncate">
                         {req.rejection_reason || 'N/A'}
                       </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Decision Modal */}
      {isDecisionModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className={`p-8 text-white ${decision === 'accepted' ? 'bg-indigo-600' : 'bg-red-600'}`}>
                 <h3 className="text-2xl font-black mb-1">{decision === 'accepted' ? 'Approve Partner' : 'Decline Request'}</h3>
                 <p className="text-white/80 font-medium">For: {selectedRequest?.influencers.name}</p>
              </div>
              <div className="p-8 space-y-6">
                 {decision === 'rejected' && (
                   <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Reason for Rejection (Required)</label>
                      <Textarea 
                        placeholder="e.g. Property is currently booked, or influencer niche mismatch..."
                        className="min-h-[120px] rounded-2xl border-gray-200 focus:ring-red-500 font-medium py-4 px-4"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                      />
                   </div>
                 )}
                 
                 {decision === 'accepted' && (
                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex gap-3">
                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-6 h-6 text-indigo-600" />
                       </div>
                       <div>
                          <p className="text-sm font-bold text-indigo-900">Partner Activation</p>
                          <p className="text-xs text-indigo-600 leading-relaxed font-medium">Approving this request will instantly activate their referral link and tracking engine.</p>
                       </div>
                    </div>
                 )}

                 <div className="flex gap-4">
                    <Button variant="ghost" onClick={() => setIsDecisionModalOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-gray-500">Cancel</Button>
                    <Button 
                      onClick={handleResponse}
                      disabled={isSubmitting || (decision === 'rejected' && !rejectionReason)}
                      className={`flex-1 h-14 rounded-2xl font-black text-lg shadow-xl ${decision === 'accepted' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-red-600 hover:bg-red-700 shadow-red-100'}`}
                    >
                      {isSubmitting ? 'Processing...' : (decision === 'accepted' ? 'Approve' : 'Confirm')}
                    </Button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
