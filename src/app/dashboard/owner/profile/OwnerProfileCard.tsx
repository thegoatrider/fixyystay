'use client'

import React, { useState } from 'react'
import { User, Mail, Phone, Edit3, CheckCircle2, AlertCircle, Loader2, X, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateOwnerProfile } from '../actions'

interface OwnerProfileCardProps {
  initialName: string
  initialPhone: string
  email: string
  createdAt?: string | null
}

export default function OwnerProfileCard({
  initialName,
  initialPhone,
  email,
  createdAt,
}: OwnerProfileCardProps) {
  const [name, setName] = useState(initialName || 'Partner')
  const [phone, setPhone] = useState(initialPhone || '')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editName, setEditName] = useState(initialName || '')
  const [editPhone, setEditPhone] = useState(initialPhone || '')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleOpenModal = () => {
    setEditName(name)
    setEditPhone(phone)
    setErrorMsg('')
    setSuccessMsg('')
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    const clean = editPhone.replace(/\D/g, '')
    if (!editName.trim()) {
      setErrorMsg('Full name cannot be empty.')
      setLoading(false)
      return
    }

    if (clean.length < 10) {
      setErrorMsg('Please enter a valid phone number with at least 10 digits.')
      setLoading(false)
      return
    }

    const formData = new FormData()
    formData.append('name', editName.trim())
    formData.append('phone', editPhone.trim())

    try {
      const res = await updateOwnerProfile(formData)
      if (res.success) {
        setName(editName.trim())
        setPhone(clean.length === 10 ? `+91${clean}` : `+${clean}`)
        setSuccessMsg('Profile updated successfully!')
        setTimeout(() => {
          setIsModalOpen(false)
          setSuccessMsg('')
        }, 1200)
      } else {
        setErrorMsg(res.error || 'Failed to update profile.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border ring-1 ring-gray-100 rounded-[32px] p-6 sm:p-8 shadow-sm">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg uppercase shadow-md shadow-blue-500/20">
            {name.charAt(0) || 'P'}
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight leading-snug">{name}</h3>
            <p className="text-xs font-semibold text-blue-600 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              Verified Partner Account
            </p>
          </div>
        </div>
        <Button
          onClick={handleOpenModal}
          variant="outline"
          size="sm"
          className="rounded-xl border-gray-200 text-xs font-bold gap-1.5 h-9 hover:border-blue-300 hover:text-blue-600"
        >
          <Edit3 className="w-3.5 h-3.5" />
          Edit Profile
        </Button>
      </div>

      {/* Details List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3.5 bg-gray-50/70 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white rounded-xl border text-gray-500 shrink-0">
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Email Address</p>
              <p className="text-xs font-bold text-gray-800 truncate">{email}</p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">
            Login
          </span>
        </div>

        <div className="flex items-center justify-between p-3.5 bg-gray-50/70 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white rounded-xl border text-gray-500 shrink-0">
              <Phone className="w-4 h-4 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">WhatsApp Phone</p>
              <p className="text-xs font-bold text-gray-800 truncate">
                {phone || <span className="text-amber-600 font-semibold italic">Missing WhatsApp number</span>}
              </p>
            </div>
          </div>
          {phone ? (
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 shrink-0 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Verified
            </span>
          ) : (
            <button
              onClick={handleOpenModal}
              className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 shrink-0"
            >
              + Add Phone
            </button>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Edit Partner Profile</h3>
              <p className="text-xs text-gray-500 mt-1">
                Keep your partner details up to date for guest communications and notifications.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-xs font-bold text-gray-700">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                  className="rounded-xl h-11"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone" className="text-xs font-bold text-gray-700">WhatsApp Phone Number</Label>
                <Input
                  id="edit-phone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                  className="rounded-xl h-11"
                  disabled={loading}
                />
                <p className="text-[11px] text-gray-400">
                  Mandatory for booking alerts, guest OTP verification, and instant WhatsApp updates.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500">Account Email</Label>
                <Input
                  value={email}
                  disabled
                  className="rounded-xl h-11 bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-[10px] text-gray-400">Account email is managed through security credentials.</p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={loading}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold min-w-[120px]"
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
