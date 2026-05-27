'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getMessages, sendMessage, markAsRead } from '@/app/dashboard/messages/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, ShieldAlert, AlertCircle } from 'lucide-react'

export default function OwnerMessagesPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    if (ownerId) {
      const channel = supabase
        .channel('public:messages')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `owner_id=eq.${ownerId}` 
          }, 
          (payload) => {
            setMessages((prev) => [...prev, payload.new])
            if (payload.new.sender_type === 'police') {
              markAsRead(ownerId, 'owner')
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [ownerId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function init() {
    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setOwnerId(user.id)
      await loadMessages(user.id)
    }
    setIsLoading(false)
  }

  async function loadMessages(id: string) {
    const res = await getMessages(id)
    if (res.success && res.messages) {
      setMessages(res.messages)
      markAsRead(id, 'owner')
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !ownerId) return

    const content = newMessage
    setNewMessage('')
    
    // Optimistic update
    const tempMsg = {
      id: Math.random().toString(),
      owner_id: ownerId,
      sender_type: 'owner',
      content: content,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempMsg])

    const res = await sendMessage(ownerId, 'owner', content)
    if (!res.success) {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
      alert('Failed to send message: ' + res.error)
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading messages...</div>
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] mt-6 flex flex-col bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="p-4 border-b bg-white flex items-center gap-3 z-10 shadow-sm">
        <div className="p-2 bg-blue-100 text-blue-700 rounded-full">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Police Department</h2>
          <p className="text-xs text-gray-500 font-medium">Official Communication Channel</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gray-50/50">
        {messages.length === 0 ? (
          <div className="text-center py-10 text-gray-400 flex flex-col items-center gap-2">
            <AlertCircle className="w-8 h-8 opacity-50" />
            <p>No messages yet. You can use this channel to communicate with the local police department regarding verifications or queries.</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isOwner = msg.sender_type === 'owner'
            return (
              <div key={msg.id || idx} className={`flex ${isOwner ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] md:max-w-[60%] p-3.5 rounded-2xl ${isOwner ? 'bg-blue-600 text-white rounded-br-sm shadow-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'}`}>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  <div className={`text-[10px] mt-1.5 text-right font-medium ${isOwner ? 'text-blue-200' : 'text-gray-400'}`}>
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
        <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto">
          <Input 
            placeholder="Type your message to the police..." 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="rounded-full bg-gray-50 h-12 px-6"
          />
          <Button type="submit" size="icon" className="rounded-full h-12 w-12 shrink-0 bg-blue-600 hover:bg-blue-700 shadow-md" disabled={!newMessage.trim()}>
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  )
}
