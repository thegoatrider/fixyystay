'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getSupportMessages, sendSupportMessage, markSupportAsRead } from '@/app/dashboard/messages/support-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageSquare, Send, Paperclip, X, Loader2, FileText, AlertCircle, HelpCircle } from 'lucide-react'

export default function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // 1. Initialize user and load messages
  useEffect(() => {
    async function init() {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setOwnerId(user.id)
        const res = await getSupportMessages(user.id)
        if (res.success && res.messages) {
          setMessages(res.messages)
          // Calculate initial unread messages from admin
          const unreads = res.messages.filter(
            (m: any) => m.sender_type === 'admin' && !m.is_read
          ).length
          setUnreadCount(unreads)
        }
      }
      setIsLoading(false)
    }
    init()
  }, [])

  // 2. Real-time message subscription
  useEffect(() => {
    if (!ownerId) return

    const channel = supabase
      .channel('public:support_messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `owner_id=eq.${ownerId}`
      },
      (payload) => {
        const newMsg = payload.new
        setMessages((prev) => {
          // Prevent duplicates from optimistic updates
          if (prev.some((m) => m.id === newMsg.id)) return prev
          return [...prev, newMsg]
        })

        if (newMsg.sender_type === 'admin') {
          if (isOpen) {
            markSupportAsRead(ownerId, 'owner')
          } else {
            setUnreadCount((c) => c + 1)
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [ownerId, isOpen])

  // 3. Mark messages as read when opening widget
  useEffect(() => {
    if (isOpen && ownerId) {
      markSupportAsRead(ownerId, 'owner')
      setUnreadCount(0)
    }
  }, [isOpen, ownerId])

  // 4. Scroll to bottom when messages update or widget is opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 80)
    }
  }, [messages, isOpen])

  // 5. Send message
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if ((!newMessage.trim() && !selectedFile) || !ownerId || isUploading) return

    const content = newMessage.trim() || (selectedFile ? `📄 ${selectedFile.name}` : '')
    setNewMessage('')
    const fileToUpload = selectedFile
    setSelectedFile(null)

    // Generate matching local temp id for optimistic update
    const tempId = Math.random().toString()
    const tempMsg = {
      id: tempId,
      owner_id: ownerId,
      sender_type: 'owner',
      content: content,
      created_at: new Date().toISOString(),
      is_read: false
    }

    // Add optimistic message
    setMessages((prev) => [...prev, tempMsg])

    let attachmentUrl = undefined
    if (fileToUpload) {
      setIsUploading(true)
      try {
        const fileExt = fileToUpload.name.split('.').pop()
        const fileName = `support-owner-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('message_attachments')
          .upload(fileName, fileToUpload)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from('message_attachments').getPublicUrl(fileName)
        attachmentUrl = urlData.publicUrl
      } catch (err: any) {
        alert('Failed to upload file: ' + err.message)
        setIsUploading(false)
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        return
      }
      setIsUploading(false)
    }

    const res = await sendSupportMessage(ownerId, 'owner', content, attachmentUrl)
    if (!res.success) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      alert('Failed to send message: ' + res.error)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds 10MB limit.')
        return
      }
      setSelectedFile(file)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full p-4 shadow-xl hover:shadow-2xl transition-all duration-300 active:scale-95 group focus:outline-none flex items-center justify-center cursor-pointer"
          title="Contact Support"
        >
          <HelpCircle className="w-6 h-6 animate-pulse group-hover:scale-110 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce shadow-md">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Support Chat Dialog */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 w-full sm:w-96 h-full sm:h-[520px] bg-white sm:rounded-2xl border-0 sm:border border-gray-200 shadow-2xl flex flex-col overflow-hidden z-50 transition-all duration-300 ease-out origin-bottom-right">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center justify-between text-white shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white border border-white/10 font-bold text-sm shadow-inner relative">
                F
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full"></span>
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide">Fixy Stays Support</h3>
                <p className="text-[10px] text-blue-100 flex items-center gap-1 font-medium">
                  We reply in a few minutes
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
              title="Close Chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gray-50/50">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                Loading conversation...
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <MessageSquare className="w-10 h-10 mb-3 opacity-20 text-indigo-500" />
                <p className="text-xs font-semibold text-gray-500 mb-1">Need help or want to report an issue?</p>
                <p className="text-[11px] text-gray-400 leading-relaxed max-w-[200px]">Send us a query or complaint here, and our admin team will reply shortly.</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isOwner = msg.sender_type === 'owner'
                return (
                  <div key={msg.id || idx} className={`flex ${isOwner ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl ${
                      isOwner
                        ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                        : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none shadow-sm'
                    }`}>
                      {msg.attachment_url && (
                        <div className="mb-2 rounded-lg overflow-hidden flex justify-center max-w-full">
                          {msg.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                            <img
                              src={msg.attachment_url}
                              alt="Support attachment"
                              className="max-w-full max-h-48 object-contain rounded bg-black/5"
                            />
                          ) : (
                            <a
                              href={msg.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 p-2 rounded hover:bg-black/5 transition-all text-xs font-bold w-full border ${
                                isOwner ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-50 border-gray-200 text-blue-600'
                              }`}
                            >
                              <FileText className="w-6 h-6 shrink-0" />
                              <span className="truncate max-w-[150px] underline">View Document</span>
                            </a>
                          )}
                        </div>
                      )}
                      
                      {msg.content && msg.content !== '📷 Image attached' && !msg.content.startsWith('📄 ') && (
                        <div className="text-xs whitespace-pre-wrap leading-relaxed break-words">{msg.content}</div>
                      )}

                      <div className={`text-[9px] mt-1.5 text-right font-medium opacity-70 ${isOwner ? 'text-blue-100' : 'text-gray-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Attachment Preview */}
          {selectedFile && (
            <div className="px-4 py-2 border-t bg-blue-50/50 flex items-center justify-between text-xs text-blue-700 z-10 shrink-0">
              <div className="flex items-center gap-2 truncate">
                <Paperclip className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="truncate font-semibold max-w-[240px]">{selectedFile.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-blue-400 hover:text-blue-700 hover:bg-blue-100 rounded-full p-0.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Form Input Area */}
          <div className="p-3 border-t bg-white flex items-center gap-2 shrink-0">
            <input
              type="file"
              accept="image/*,application/pdf,.doc,.docx"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700 focus:outline-none shrink-0 disabled:opacity-50 cursor-pointer"
              title="Attach File"
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
            </button>

            <form onSubmit={handleSendMessage} className="flex-1 flex gap-2">
              <Input
                placeholder="Ask support or drop complaint..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="bg-gray-50 border-gray-200 focus:ring-1 focus:ring-blue-500 rounded-xl text-xs py-1.5 h-9 shrink-0"
                disabled={isUploading}
              />
              <Button
                type="submit"
                size="icon"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 w-9 shrink-0 flex items-center justify-center shadow-md cursor-pointer"
                disabled={(!newMessage.trim() && !selectedFile) || isUploading}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
