'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getOwnersWithProperties, getMessages, sendMessage, markAsRead } from '@/app/dashboard/messages/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Send, User, Home, AlertCircle, ChevronLeft, Paperclip, Loader2 } from 'lucide-react'

export default function PoliceMessagesPage() {
  const [owners, setOwners] = useState<any[]>([])
  const [filteredOwners, setFilteredOwners] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null)
  
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadOwners()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredOwners(owners)
    } else {
      const q = searchQuery.toLowerCase()
      const filtered = owners.filter(o => 
        o.name.toLowerCase().includes(q) || 
        o.properties.some((p: any) => p.name.toLowerCase().includes(q))
      )
      setFilteredOwners(filtered)
    }
  }, [searchQuery, owners])

  useEffect(() => {
    if (selectedOwnerId) {
      loadMessages(selectedOwnerId)
      
      const channel = supabase
        .channel('public:messages')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `owner_id=eq.${selectedOwnerId}` 
          }, 
          (payload) => {
            setMessages((prev) => [...prev, payload.new])
            if (payload.new.sender_type === 'owner') {
              markAsRead(selectedOwnerId, 'police')
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [selectedOwnerId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadOwners() {
    setIsLoading(true)
    const res = await getOwnersWithProperties()
    if (res.success && res.owners) {
      setOwners(res.owners)
      setFilteredOwners(res.owners)
    }
    setIsLoading(false)
  }

  async function loadMessages(ownerId: string) {
    const res = await getMessages(ownerId)
    if (res.success && res.messages) {
      setMessages(res.messages)
      markAsRead(ownerId, 'police')
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !selectedOwnerId) return

    const content = newMessage
    setNewMessage('')
    
    // Optimistic UI update
    const tempMsg = {
      id: Math.random().toString(),
      owner_id: selectedOwnerId,
      sender_type: 'police',
      content: content,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempMsg])

    const res = await sendMessage(selectedOwnerId, 'police', content)
    if (!res.success) {
      // Revert if failed
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
      alert('Failed to send message: ' + res.error)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedOwnerId) return

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `msg-police-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('message_attachments')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('message_attachments').getPublicUrl(fileName)
      
      const res = await sendMessage(selectedOwnerId, 'police', '📷 Image attached', urlData.publicUrl)
      if (!res.success) throw new Error(res.error)
      
    } catch (err: any) {
      alert('Failed to upload image: ' + err.message)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const selectedOwner = owners.find(o => o.id === selectedOwnerId)

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-sm border overflow-hidden mt-2 md:mt-6">
      {/* Sidebar - Owners List */}
      <div className={`w-full md:w-1/3 border-r flex-col bg-gray-50 ${selectedOwnerId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b bg-white">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Messages</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <Input 
              placeholder="Search property or owner..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl bg-gray-50"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="text-center py-10 text-sm text-gray-500">Loading owners...</div>
          ) : filteredOwners.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-500">No owners found.</div>
          ) : (
            filteredOwners.map(owner => (
              <button
                key={owner.id}
                onClick={() => setSelectedOwnerId(owner.id)}
                className={`w-full text-left p-3 rounded-xl mb-1 flex items-start gap-3 transition-colors ${selectedOwnerId === owner.id ? 'bg-blue-100 border-blue-200 border' : 'hover:bg-gray-100 border border-transparent'}`}
              >
                <div className={`p-2 rounded-full ${selectedOwnerId === owner.id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 truncate">{owner.name}</div>
                  {owner.properties.length > 0 ? (
                    <div className="text-xs text-gray-500 mt-1 space-y-1">
                      {owner.properties.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-1 truncate">
                          <Home className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 mt-1">No properties listed</div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`flex-1 flex-col bg-white ${selectedOwnerId ? 'flex' : 'hidden md:flex'}`}>
        {selectedOwnerId ? (
          <>
            <div className="p-4 border-b flex items-center justify-between bg-white shadow-sm z-10">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedOwnerId(null)}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{selectedOwner?.name}</h3>
                  <p className="text-xs text-gray-500">Property Owner</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
              {messages.length === 0 ? (
                <div className="text-center py-10 text-gray-400 flex flex-col items-center gap-2">
                  <AlertCircle className="w-8 h-8 opacity-50" />
                  <p>No messages yet. Send a message to start the conversation.</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isPolice = msg.sender_type === 'police'
                  return (
                    <div key={msg.id || idx} className={`flex ${isPolice ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-3 rounded-2xl ${isPolice ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border text-gray-800 rounded-bl-sm shadow-sm'}`}>
                        {msg.attachment_url && (
                          <div className="mb-2 rounded-lg overflow-hidden bg-black/5 flex justify-center">
                            <img src={msg.attachment_url} alt="Attachment" className="max-w-full max-h-64 object-contain rounded-md" />
                          </div>
                        )}
                        {msg.content !== '📷 Image attached' && (
                          <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                        )}
                        <div className={`text-[10px] mt-1 text-right ${isPolice ? 'text-blue-200' : 'text-gray-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-white">
              <div className="flex gap-2 items-center">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full h-10 w-10 shrink-0 text-gray-500 hover:bg-gray-100"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  title="Attach Photo"
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                </Button>
                <form onSubmit={handleSendMessage} className="flex-1 flex gap-2">
                  <Input 
                    placeholder="Type your message..." 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="rounded-full bg-gray-50"
                  />
                  <Button type="submit" size="icon" className="rounded-full h-10 w-10 shrink-0 bg-blue-600 hover:bg-blue-700" disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4 text-white" />
                  </Button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50/50">
            <div className="text-center">
              <User className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Select an owner to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
