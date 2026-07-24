'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, CheckCircle, Trash2, Mail, Phone, User, Settings } from 'lucide-react'
import { deleteLoggedInAccountAction, submitPublicDeletionRequestAction } from '../actions/delete-account'

interface DeleteAccountClientProps {
  initialUser: {
    email: string
    id: string
  } | null
}

export default function DeleteAccountClient({ initialUser }: DeleteAccountClientProps) {
  const [user] = useState(initialUser)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Logged-in verification state
  const [confirmCheckbox, setConfirmCheckbox] = useState(false)

  // Public form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    accountType: 'guest',
    reason: '',
  })
  const [publicCheckbox, setPublicCheckbox] = useState(false)

  const router = useRouter()

  const handleLoggedInDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirmCheckbox) {
      setError('Please check the confirmation box.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await deleteLoggedInAccountAction()
      if (res.success) {
        setSuccess(true)
      } else {
        setError(res.error || 'Failed to delete account.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const handlePublicSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.email) {
      setError('Name and Email are required.')
      return
    }
    if (!publicCheckbox) {
      setError('Please check the authorization box.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await submitPublicDeletionRequestAction({
        email: formData.email,
        name: formData.name,
        phone: formData.phone,
        accountType: formData.accountType,
        reason: formData.reason,
      })

      if (res.success) {
        setSuccess(true)
      } else {
        setError(res.error || 'Failed to submit request.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl p-8 text-center">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight italic uppercase">
          {user ? 'Account Deleted' : 'Request Submitted'}
        </h2>
        <p className="text-gray-500 font-medium text-sm leading-relaxed mb-8">
          {user
            ? 'Your account and all associated data have been permanently deleted from our servers. Thank you for using Fixy Stays.'
            : 'Your account deletion request has been submitted. Our support team will process it and verify your identity via email/phone within 24-48 hours.'}
        </p>
        <Button asChild className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-bold rounded-2xl shadow-lg shadow-blue-100">
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl overflow-hidden">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-10 -mt-10"></div>
        <h1 className="text-3xl font-black tracking-tight italic uppercase mb-2">Account Deletion</h1>
        <p className="text-blue-100 font-medium text-sm">
          {user ? 'Instantly delete your account and data' : 'Submit a request to delete your account & data'}
        </p>
      </div>

      <div className="p-8">
        {user ? (
          /* LOGGED IN VIEW */
          <form onSubmit={handleLoggedInDelete} className="space-y-6">
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-black text-red-900 italic">Warning: Irreversible Action</h4>
                <p className="text-xs text-red-700 font-medium leading-relaxed mt-1">
                  Deleting your account will permanently remove your login access, verified owner/partner profile, and all properties, guest checklists, employee profiles, and payment histories. This cannot be undone.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-gray-400 tracking-wider">Logged In Account</Label>
              <div className="flex items-center gap-3 p-4 bg-gray-50 border rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{user.email}</p>
                  <p className="text-[10px] font-black uppercase text-blue-500">Active Session</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50/50 border border-dashed rounded-2xl">
              <input
                type="checkbox"
                id="confirm-delete"
                checked={confirmCheckbox}
                onChange={(e) => setConfirmCheckbox(e.target.checked)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 mt-1 cursor-pointer"
              />
              <label htmlFor="confirm-delete" className="text-xs text-gray-600 font-medium leading-relaxed cursor-pointer select-none">
                I understand that deleting my account is permanent and all my data, including premium subscription statuses and properties, will be deleted forever.
              </label>
            </div>

            {error && (
              <p className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600 text-center">
                {error}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="h-12 flex-1 border-gray-200 text-gray-700 rounded-2xl font-bold"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-12 flex-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-lg shadow-red-100 flex items-center justify-center gap-2"
                disabled={loading || !confirmCheckbox}
              >
                <Trash2 className="w-4 h-4" />
                {loading ? 'Deleting...' : 'Delete Account'}
              </Button>
            </div>
          </form>
        ) : (
          /* PUBLIC REQUEST VIEW */
          <form onSubmit={handlePublicSubmit} className="space-y-5">
            <p className="text-xs text-gray-500 font-medium leading-relaxed mb-4">
              If you have uninstalled the Fixy Stays app or cannot access your account, fill out the form below. Once submitted, our team will review the request and contact you to complete validation.
            </p>

            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gray-400" /> Full Name
                </Label>
                <Input
                  id="name"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-11 rounded-xl bg-gray-50/50 border-gray-200 focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email" className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-400" /> Registered Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-11 rounded-xl bg-gray-50/50 border-gray-200 focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone" className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" /> Phone Number (Optional)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-11 rounded-xl bg-gray-50/50 border-gray-200 focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="accountType" className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-gray-400" /> Account Type
                </Label>
                <select
                  id="accountType"
                  value={formData.accountType}
                  onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                  className="h-11 px-3 w-full rounded-xl bg-gray-50/50 border border-gray-200 focus:border-blue-500 transition-colors text-sm font-medium text-gray-700 outline-none"
                >
                  <option value="guest">Guest / Visitor</option>
                  <option value="owner">Property Owner / Partner</option>
                  <option value="agent">Agent</option>
                  <option value="influencer">Influencer</option>
                  <option value="police">Police Official</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reason" className="text-xs font-bold text-gray-700">
                  Reason for Deletion (Optional)
                </Label>
                <textarea
                  id="reason"
                  rows={3}
                  placeholder="Tell us why you want to delete your account..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="p-3 w-full rounded-xl bg-gray-50/50 border border-gray-200 focus:border-blue-500 transition-colors text-sm outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50/50 border border-dashed rounded-2xl mt-4">
              <input
                type="checkbox"
                id="public-confirm"
                checked={publicCheckbox}
                onChange={(e) => setPublicCheckbox(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1 cursor-pointer"
              />
              <label htmlFor="public-confirm" className="text-[11px] text-gray-600 font-medium leading-relaxed cursor-pointer select-none">
                I authorize Fixy Stays to process the account deletion request for the email address provided above.
              </label>
            </div>

            {error && (
              <p className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600 text-center">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
              disabled={loading || !publicCheckbox}
            >
              {loading ? 'Submitting...' : 'Submit Deletion Request'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
