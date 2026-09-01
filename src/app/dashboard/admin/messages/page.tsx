'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import {
  getSupportOwners,
  getSupportMessages,
  sendSupportMessage,
  markSupportAsRead,
  sendSupportBroadcast
} from '@/app/dashboard/messages/support-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search,
  Send,
  User,
  Home,
  AlertCircle,
  ChevronLeft,
  Paperclip,
  Loader2,
  X,
  FileText,
  Megaphone,
  CheckSquare,
  Square,
  MessageSquare
} from 'lucide-react'

export default function AdminSupportMessagesPage() {
  const [owners, setOwners] = useState<any[]>([])
  const [filteredOwners, setFilteredOwners] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null)
  
  const [selectedOwnerIdsForBroadcast, setSelectedOwnerIdsForBroadcast] = useState<string[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false)
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastFile, setBroadcastFile] = useState<File | null>(null)
  const [isBroadcastMode, setIsBroadcastMode] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const broadcastFileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // 1. Initial load
  useEffect(() => {
    loadOwners()
  }, [])

  // 2. Search filtering
  useEffect(() => {
    const q = searchQuery.toLowerCase().trim()
    const filtered = owners.filter((owner) => {
      const matchesSearch =
        q === '' ||
        owner.name.toLowerCase().includes(q) ||
        owner.email.toLowerCase().includes(q) ||
        owner.properties.some((p: any) => p.name.toLowerCase().includes(q))
      return matchesSearch
    })
    setFilteredOwners(filtered)
  }, [searchQuery, owners])

  // 3. Real-time message subscription & loading messages
  useEffect(() => {
    if (selectedOwnerId) {
      loadMessages(selectedOwnerId)

      const channel = supabase
        .channel('public:support_messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `owner_id=eq.${selectedOwnerId}`
        },
        (payload: any) => {
          const newMsg = payload.new
          setMessages((prev) => {
            // Prevent duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          
          if (newMsg.sender_type === 'owner') {
            markSupportAsRead(selectedOwnerId, 'admin')
            // Refresh sidebar counts
            refreshSidebarMessage(selectedOwnerId, newMsg, false)
          }
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [selectedOwnerId])

  // 4. Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadOwners() {
    setIsLoading(true)
    const res = await getSupportOwners()
    if (res.success && res.owners) {
      setOwners(res.owners)
      setFilteredOwners(res.owners)
    }
    setIsLoading(false)
  }

  async function loadMessages(ownerId: string) {
    const res = await getSupportMessages(ownerId)
    if (res.success && res.messages) {
      setMessages(res.messages)
      await markSupportAsRead(ownerId, 'admin')
      // Reset unread count for this owner locally
      setOwners((prev) =>
        prev.map((o) => (o.id === ownerId ? { ...o, unreadCount: 0 } : o))
      )
    }
  }

  // Update sidebar message snippet and unread status programmatically
  function refreshSidebarMessage(ownerId: string, msg: any, fromAdmin: boolean) {
    setOwners((prev) =>
      prev.map((o) => {
        if (o.id === ownerId) {
          return {
            ...o,
            latestMessage: msg,
            unreadCount: fromAdmin ? o.unreadCount : o.unreadCount + 1
          }
        }
        return o
      })
    )
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if ((!newMessage.trim() && !selectedFile) || !selectedOwnerId || isUploading) return

    const content = newMessage.trim() || (selectedFile ? `📄 ${selectedFile.name}` : '')
    setNewMessage('')
    const fileToUpload = selectedFile
    setSelectedFile(null)

    const tempId = Math.random().toString()
    const tempMsg = {
      id: tempId,
      owner_id: selectedOwnerId,
      sender_type: 'admin',
      content: content,
      created_at: new Date().toISOString(),
      is_read: false
    }

    setMessages((prev) => [...prev, tempMsg])
    refreshSidebarMessage(selectedOwnerId, tempMsg, true)

    let attachmentUrl = undefined
    if (fileToUpload) {
      setIsUploading(true)
      try {
        const fileExt = fileToUpload.name.split('.').pop()
        const fileName = `support-admin-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`

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

    const res = await sendSupportMessage(selectedOwnerId, 'admin', content, attachmentUrl)
    if (!res.success) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      alert('Failed to send message: ' + res.error)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleBroadcastFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setBroadcastFile(file)
    }
    if (broadcastFileInputRef.current) broadcastFileInputRef.current.value = ''
  }

  async function handleSendBroadcast(e: React.FormEvent) {
    e.preventDefault()
    if ((!broadcastMessage.trim() && !broadcastFile) || selectedOwnerIdsForBroadcast.length === 0 || isSendingBroadcast) return

    const content = broadcastMessage.trim() || (broadcastFile ? `📄 ${broadcastFile.name}` : '')
    setBroadcastMessage('')
    const fileToUpload = broadcastFile
    setBroadcastFile(null)

    setIsSendingBroadcast(true)

    let attachmentUrl = undefined
    if (fileToUpload) {
      try {
        const fileExt = fileToUpload.name.split('.').pop()
        const fileName = `support-admin-broadcast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('message_attachments')
          .upload(fileName, fileToUpload)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from('message_attachments').getPublicUrl(fileName)
        attachmentUrl = urlData.publicUrl
      } catch (err: any) {
        alert('Failed to upload broadcast file: ' + err.message)
        setIsSendingBroadcast(false)
        return
      }
    }

    const res = await sendSupportBroadcast(selectedOwnerIdsForBroadcast, 'admin', content, attachmentUrl)
    setIsSendingBroadcast(false)

    if (res.success) {
      alert(`Broadcast sent to ${selectedOwnerIdsForBroadcast.length} owners!`)
      setSelectedOwnerIdsForBroadcast([])
      setIsBroadcastMode(false)
      loadOwners() // Reload owners list to refresh status
    } else {
      alert('Failed to send broadcast support message: ' + res.error)
    }
  }

  const selectedOwner = owners.find((o) => o.id === selectedOwnerId)
  const isAllOwnersSelectedForBroadcast =
    filteredOwners.length > 0 &&
    filteredOwners.every((o) => selectedOwnerIdsForBroadcast.includes(o.id))

  const handleSelectAllBroadcast = () => {
    if (isAllOwnersSelectedForBroadcast) {
      setSelectedOwnerIdsForBroadcast([])
    } else {
      setSelectedOwnerIdsForBroadcast(filteredOwners.map((o) => o.id))
    }
  }

  const handleOwnerCheckboxToggle = (id: string) => {
    if (selectedOwnerIdsForBroadcast.includes(id)) {
      setSelectedOwnerIdsForBroadcast((prev) => prev.filter((oid) => oid !== id))
    } else {
      setSelectedOwnerIdsForBroadcast((prev) => [...prev, id])
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-sm border overflow-hidden mt-2 md:mt-6">
      {/* Sidebar - Owners List */}
      <div
        className={`w-full md:w-1/3 border-r flex flex-col bg-gray-50 ${
          selectedOwnerId || isBroadcastMode ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b bg-white space-y-3 shadow-sm z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Support Chats</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsBroadcastMode(true)
                setSelectedOwnerId(null)
              }}
              className="text-xs bg-indigo-50 border-indigo-200 text-indigo-700 font-bold hover:bg-indigo-100 flex items-center gap-1.5 h-8 rounded-lg cursor-pointer"
            >
              <Megaphone className="w-3.5 h-3.5" />
              Broadcast
            </Button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Search owner or property..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl bg-gray-50 border-gray-200 text-xs"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="text-center py-10 text-xs text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
              Loading conversations...
            </div>
          ) : filteredOwners.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-500">No support logs found.</div>
          ) : (
            filteredOwners.map((owner) => {
              const isSelected = selectedOwnerId === owner.id
              return (
                <button
                  key={owner.id}
                  onClick={() => {
                    setSelectedOwnerId(owner.id)
                    setIsBroadcastMode(false)
                  }}
                  className={`w-full p-3 rounded-xl border flex items-start gap-3 text-left transition-all duration-200 cursor-pointer focus:outline-none ${
                    isSelected
                      ? 'bg-blue-50/50 border-blue-200/60 shadow-sm'
                      : 'hover:bg-gray-100/50 border-transparent'
                  }`}
                >
                  <div
                    className={`p-2 rounded-full shrink-0 ${
                      isSelected ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    <User className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-gray-900 truncate text-sm">{owner.name}</span>
                      {owner.unreadCount > 0 && (
                        <span className="bg-red-500 text-white font-bold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white shrink-0 animate-pulse">
                          {owner.unreadCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 truncate block mt-0.5">{owner.email}</span>
                    {owner.latestMessage ? (
                      <p className="text-[11px] text-gray-500 truncate mt-1">
                        {owner.latestMessage.sender_type === 'admin' ? 'You: ' : ''}
                        {owner.latestMessage.content}
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-300 italic mt-1">No messages yet</p>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Main Chat / Broadcast Window */}
      <div
        className={`flex-1 flex flex-col bg-white ${
          selectedOwnerId || isBroadcastMode ? 'flex' : 'hidden md:flex'
        }`}
      >
        {isBroadcastMode ? (
          /* Admin Broadcast Control Panel */
          <>
            <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-indigo-900 to-indigo-800 text-white shadow-md z-10">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-xl text-white">
                  <Megaphone className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg tracking-tight">Support Broadcast</h3>
                  <p className="text-xs text-indigo-100 font-medium">
                    Announce to {selectedOwnerIdsForBroadcast.length} selected owners
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 font-bold border border-white/20 rounded-xl cursor-pointer"
                onClick={() => {
                  setIsBroadcastMode(false)
                  setSelectedOwnerIdsForBroadcast([])
                }}
              >
                Cancel
              </Button>
            </div>

            {/* Broadcast Form Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-4">
              <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Select Recipients ({selectedOwnerIdsForBroadcast.length} selected)
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 h-8 cursor-pointer"
                    onClick={handleSelectAllBroadcast}
                  >
                    {isAllOwnersSelectedForBroadcast ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {filteredOwners.map((owner) => {
                    const isChecked = selectedOwnerIdsForBroadcast.includes(owner.id)
                    return (
                      <div
                        key={owner.id}
                        onClick={() => handleOwnerCheckboxToggle(owner.id)}
                        className={`flex items-center gap-2.5 py-1.5 px-2.5 rounded-xl cursor-pointer transition-colors border ${
                          isChecked
                            ? 'bg-indigo-50/40 border-indigo-200 text-indigo-900'
                            : 'hover:bg-gray-100 border-transparent text-gray-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate leading-none mb-0.5">{owner.name}</p>
                          <p className="text-[10px] text-gray-400 truncate leading-none">{owner.email}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-5 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-800 space-y-1">
                  <span className="font-bold block">Important Notice</span>
                  <p className="leading-relaxed">
                    This broadcast message will be inserted individually into the private support message stream of
                    each selected owner. Owners will be able to view and reply directly to this message.
                  </p>
                </div>
              </div>
            </div>

            {/* Input form for Broadcast */}
            <div className="p-4 border-t bg-white border-t-indigo-100 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              {broadcastFile && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-indigo-50 rounded-lg text-xs text-indigo-700 w-fit">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[200px]">{broadcastFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setBroadcastFile(null)}
                    className="text-indigo-400 hover:text-indigo-700 font-bold ml-2 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex gap-2 items-center">
                <input
                  type="file"
                  accept="image/*,application/pdf,.doc,.docx"
                  className="hidden"
                  ref={broadcastFileInputRef}
                  onChange={handleBroadcastFileSelect}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-10 w-10 shrink-0 text-gray-500 hover:bg-gray-100 cursor-pointer"
                  onClick={() => broadcastFileInputRef.current?.click()}
                  disabled={isSendingBroadcast}
                  title="Attach File"
                >
                  {isSendingBroadcast ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                </Button>
                <form onSubmit={handleSendBroadcast} className="flex-1 flex gap-2">
                  <Input
                    placeholder="Type broadcast support message to selected owners..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="rounded-full bg-gray-50 border-indigo-100 focus:border-indigo-500 focus:ring-indigo-500 text-xs"
                    disabled={isSendingBroadcast}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="rounded-full h-10 w-10 shrink-0 bg-indigo-600 hover:bg-indigo-700 shadow-md cursor-pointer"
                    disabled={(!broadcastMessage.trim() && !broadcastFile) || selectedOwnerIdsForBroadcast.length === 0 || isSendingBroadcast}
                  >
                    {isSendingBroadcast ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Send className="w-4 h-4 text-white" />
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </>
        ) : selectedOwnerId ? (
          /* Normal Private support chat pane */
          <>
            <div className="p-4 border-b flex items-center justify-between bg-white shadow-sm z-10">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden cursor-pointer"
                  onClick={() => setSelectedOwnerId(null)}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h3 className="font-bold text-base text-gray-900">{selectedOwner?.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
                    <span className="truncate">{selectedOwner?.email}</span>
                    {selectedOwner?.properties && selectedOwner.properties.length > 0 && (
                      <span className="inline-flex items-center gap-0.5 bg-gray-100 px-1.5 py-0.5 rounded text-[10px] text-gray-600 font-semibold uppercase">
                        <Home className="w-3 h-3" /> {selectedOwner.properties[0].name}
                        {selectedOwner.properties.length > 1 && ` +${selectedOwner.properties.length - 1}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-gray-400 flex flex-col items-center gap-2">
                  <AlertCircle className="w-8 h-8 opacity-45 text-blue-500" />
                  <p className="text-sm">No messages yet. Send a message to start support chat.</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isAdmin = msg.sender_type === 'admin'
                  return (
                    <div key={msg.id || idx} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] p-3.5 rounded-2xl ${
                          isAdmin
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-white border text-gray-800 rounded-bl-sm shadow-sm'
                        }`}
                      >
                        {msg.attachment_url && (
                          <div className="mb-2 rounded-lg overflow-hidden flex justify-center">
                            {msg.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                              <Image
                                src={msg.attachment_url}
                                alt="Attachment"
                                width={400}
                                height={256}
                                className="max-w-full max-h-64 object-contain rounded-md bg-black/5"
                              />
                            ) : (
                              <a
                                href={msg.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-3 bg-white/20 rounded-md hover:bg-white/30 transition-colors w-full border border-black/10 text-xs"
                              >
                                <FileText className="w-7 h-7 shrink-0" />
                                <span className="underline break-all">Download Attachment</span>
                              </a>
                            )}
                          </div>
                        )}
                        {msg.content !== '📷 Image attached' && !msg.content.startsWith('📄 ') && (
                          <div className="text-xs whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                        )}
                        <div
                          className={`text-[9px] mt-1 text-right font-medium ${
                            isAdmin ? 'text-blue-200' : 'text-gray-400'
                          }`}
                        >
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer Panel */}
            <div className="p-4 border-t bg-white">
              {selectedFile && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-700 w-fit">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-blue-400 hover:text-blue-700 font-bold ml-2 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex gap-2 items-center">
                <input
                  type="file"
                  accept="image/*,application/pdf,.doc,.docx"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-10 w-10 shrink-0 text-gray-500 hover:bg-gray-100 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  title="Attach File"
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                </Button>
                <form onSubmit={handleSendMessage} className="flex-1 flex gap-2">
                  <Input
                    placeholder="Type your reply to owner..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="rounded-full bg-gray-50 text-xs h-10"
                    disabled={isUploading}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="rounded-full h-10 w-10 shrink-0 bg-blue-600 hover:bg-blue-700 cursor-pointer"
                    disabled={(!newMessage.trim() && !selectedFile) || isUploading}
                  >
                    <Send className="w-4 h-4 text-white" />
                  </Button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50/50">
            <div className="text-center p-6">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-15 text-indigo-500" />
              <p className="text-sm font-semibold text-gray-500">No chat selected</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[280px]">
                Select an owner from the left panel to start resolving complaints or click broadcast to announce updates.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
