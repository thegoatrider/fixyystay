'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getOwnersWithProperties, getMessages, sendMessage, markAsRead, sendBroadcastMessage } from '@/app/dashboard/messages/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Send, User, Home, AlertCircle, ChevronLeft, Paperclip, Loader2, X, FileText, Filter, Megaphone, CheckSquare, Square } from 'lucide-react'

const ALIBAG_AREAS = [
  "Rewas", "Bodni", "Karmale / Hashivare", "Saral", "Chondhi", "Awas", 
  "Sasawane", "Mandwa", "Kihim", "Zirad", "Thal", "Alibag", "Varsoli", 
  "Akshi", "Nagaon", "Chaul", "Revdanda", "Salav", "Korlai", "Kashid", 
  "Nandgaon", "Murud", "Rajpuri"
]

export default function PoliceMessagesPage() {
  const [owners, setOwners] = useState<any[]>([])
  const [filteredOwners, setFilteredOwners] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [areaFilter, setAreaFilter] = useState('all')
  const [areas, setAreas] = useState<string[]>(ALIBAG_AREAS)
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([])
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null)
  
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false)
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastFile, setBroadcastFile] = useState<File | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const broadcastFileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadOwners()
  }, [])

  useEffect(() => {
    const q = searchQuery.toLowerCase().trim()
    const filtered = owners.map(owner => {
      const filteredProps = owner.properties.filter((p: any) => {
        const matchesArea = areaFilter === 'all' || p.area_name === areaFilter
        const matchesSearch = q === '' || 
          p.name.toLowerCase().includes(q) || 
          owner.name.toLowerCase().includes(q)
        return matchesArea && matchesSearch
      })
      
      return {
        ...owner,
        properties: filteredProps
      }
    }).filter(owner => owner.properties.length > 0)
    
    setFilteredOwners(filtered)
  }, [searchQuery, areaFilter, owners])

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
      
      // Dynamically extract unique area names from properties to include any custom ones
      const dbAreas = Array.from(new Set(
        res.owners.flatMap((o: any) => o.properties.map((p: any) => p.area_name))
      )).filter(Boolean) as string[]
      
      const mergedAreas = Array.from(new Set([...ALIBAG_AREAS, ...dbAreas])).sort()
      setAreas(mergedAreas)
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
    if ((!newMessage.trim() && !selectedFile) || !selectedOwnerId || isUploading) return

    const content = newMessage.trim() || (selectedFile ? `📄 ${selectedFile.name}` : '')
    setNewMessage('')
    const fileToUpload = selectedFile
    setSelectedFile(null)
    
    // Optimistic UI update
    const tempMsg = {
      id: Math.random().toString(),
      owner_id: selectedOwnerId,
      sender_type: 'police',
      content: content,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempMsg])

    let attachmentUrl = undefined
    if (fileToUpload) {
      setIsUploading(true)
      try {
        const fileExt = fileToUpload.name.split('.').pop()
        const fileName = `msg-police-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('message_attachments')
          .upload(fileName, fileToUpload)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from('message_attachments').getPublicUrl(fileName)
        attachmentUrl = urlData.publicUrl
      } catch (err: any) {
        alert('Failed to upload file: ' + err.message)
        setIsUploading(false)
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
        return
      }
      setIsUploading(false)
    }

    const res = await sendMessage(selectedOwnerId, 'police', content, attachmentUrl)
    if (!res.success) {
      // Revert if failed
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
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
    if ((!broadcastMessage.trim() && !broadcastFile) || selectedPropertyIds.length === 0 || isSendingBroadcast) return

    const content = broadcastMessage.trim() || (broadcastFile ? `📄 ${broadcastFile.name}` : '')
    setBroadcastMessage('')
    const fileToUpload = broadcastFile
    setBroadcastFile(null)
    
    setIsSendingBroadcast(true)

    // Upload attachment if any
    let attachmentUrl = undefined
    if (fileToUpload) {
      try {
        const fileExt = fileToUpload.name.split('.').pop()
        const fileName = `msg-police-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('message_attachments')
          .upload(fileName, fileToUpload)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from('message_attachments').getPublicUrl(fileName)
        attachmentUrl = urlData.publicUrl
      } catch (err: any) {
        alert('Failed to upload file: ' + err.message)
        setIsSendingBroadcast(false)
        return
      }
    }

    // Resolve owner IDs for selected properties
    const targetOwnerIds = Array.from(new Set(
      selectedPropertyIds.map(propId => {
        const owner = owners.find(o => o.properties.some((p: any) => p.id === propId))
        return owner?.id
      }).filter(Boolean)
    )) as string[]

    const res = await sendBroadcastMessage(targetOwnerIds, 'police', content, attachmentUrl)
    setIsSendingBroadcast(false)

    if (res.success) {
      alert(`Broadcast message sent successfully to ${targetOwnerIds.length} unique owners!`)
      setSelectedPropertyIds([])
      // Reload current selected owner's chat if any
      if (selectedOwnerId) {
        loadMessages(selectedOwnerId)
      }
    } else {
      alert('Failed to send broadcast: ' + res.error)
    }
  }

  const selectedOwner = owners.find(o => o.id === selectedOwnerId)

  // Get all property IDs currently visible in filteredOwners list
  const visiblePropertyIds = filteredOwners.flatMap(o => o.properties.map((p: any) => p.id))
  
  // Check if all visible properties are currently selected
  const isAllVisibleSelected = visiblePropertyIds.length > 0 && 
    visiblePropertyIds.every(id => selectedPropertyIds.includes(id))

  const handleSelectAll = () => {
    if (isAllVisibleSelected) {
      // Deselect all visible properties
      setSelectedPropertyIds(prev => prev.filter(id => !visiblePropertyIds.includes(id)))
    } else {
      // Select all visible properties
      setSelectedPropertyIds(prev => Array.from(new Set([...prev, ...visiblePropertyIds])))
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-sm border overflow-hidden mt-2 md:mt-6">
      {/* Sidebar - Owners List */}
      <div className={`w-full md:w-1/3 border-r flex flex-col bg-gray-50 ${selectedOwnerId || selectedPropertyIds.length > 0 ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b bg-white space-y-3 shadow-sm z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Messages</h2>
            {selectedPropertyIds.length > 0 && (
              <span className="text-xs bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
                {selectedPropertyIds.length} Selected
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input 
                placeholder="Search property or owner..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl bg-gray-50 border-gray-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Filter className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <select
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer appearance-none animate-none"
                >
                  <option value="all">All Areas</option>
                  {areas.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          {filteredOwners.length > 0 && (
            <div className="pt-1 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-bold py-1 h-8 rounded-lg border-gray-200 hover:bg-gray-100 flex items-center justify-center gap-1.5 cursor-pointer"
                onClick={handleSelectAll}
              >
                {isAllVisibleSelected ? (
                  <>
                    <Square className="w-3.5 h-3.5 text-blue-600" />
                    Deselect All Visible
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-gray-500" />
                    Select All Visible
                  </>
                )}
              </Button>
              {selectedPropertyIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs font-bold py-1 h-8 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer"
                  onClick={() => setSelectedPropertyIds([])}
                >
                  Clear ({selectedPropertyIds.length})
                </Button>
              )}
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="text-center py-10 text-sm text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
              Loading owners...
            </div>
          ) : filteredOwners.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-500">No owners found.</div>
          ) : (
            filteredOwners.map(owner => {
              const isSelectedChat = selectedOwnerId === owner.id
              return (
                <div
                  key={owner.id}
                  className={`w-full p-2.5 rounded-xl border flex flex-col transition-all duration-200 ${isSelectedChat ? 'bg-blue-50/50 border-blue-200/60 shadow-sm' : 'hover:bg-gray-100/50 border-transparent'}`}
                >
                  <button
                    onClick={() => {
                      setSelectedOwnerId(owner.id)
                      setSelectedPropertyIds([])
                    }}
                    className="w-full text-left flex items-start gap-3 group cursor-pointer focus:outline-none"
                  >
                    <div className={`p-2 rounded-full transition-colors ${isSelectedChat ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-200 text-gray-600 group-hover:bg-gray-300'}`}>
                      <User className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 truncate group-hover:text-blue-900 transition-colors">{owner.name}</div>
                      <div className="text-[10px] text-gray-400 truncate mt-0.5">{owner.properties.length} {owner.properties.length === 1 ? 'property' : 'properties'}</div>
                    </div>
                  </button>
                  
                  {owner.properties.length > 0 && (
                    <div className="mt-2.5 ml-2.5 pl-6 border-l border-gray-200/80 space-y-2">
                      {owner.properties.map((p: any) => {
                        const isChecked = selectedPropertyIds.includes(p.id)
                        return (
                          <div 
                            key={p.id} 
                            onClick={(e) => {
                              e.stopPropagation()
                              if (isChecked) {
                                setSelectedPropertyIds(prev => prev.filter(id => id !== p.id))
                              } else {
                                setSelectedPropertyIds(prev => [...prev, p.id])
                                setSelectedOwnerId(null)
                              }
                            }}
                            className={`flex items-center gap-2.5 py-1 px-1.5 rounded-lg cursor-pointer transition-colors hover:bg-gray-200/60 ${isChecked ? 'bg-blue-50/30' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer animate-none"
                            />
                            <div className="flex-1 min-w-0 flex items-center gap-1.5">
                              <Home className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <div className="text-xs text-gray-600 truncate flex-1 leading-none font-medium">
                                {p.name}
                                <span className="text-[10px] text-gray-400 font-normal ml-1">({p.area_name || 'No Area'})</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Chat / Broadcast Window */}
      <div className={`flex-1 flex-col bg-white ${selectedOwnerId || selectedPropertyIds.length > 0 ? 'flex' : 'hidden md:flex'}`}>
        {selectedPropertyIds.length > 0 ? (
          /* Broadcast Composer Panel */
          <>
            <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-md z-10">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-xl text-white">
                  <Megaphone className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg tracking-tight">Official Broadcast Control</h3>
                  <p className="text-xs text-blue-100 font-medium">
                    Targeting {selectedPropertyIds.length} properties ({Array.from(new Set(selectedPropertyIds.map(id => {
                      const owner = owners.find(o => o.properties.some((p: any) => p.id === id))
                      return owner?.id
                    }).filter(Boolean))).length} unique owners)
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white/10 font-bold border border-white/20 rounded-xl cursor-pointer"
                onClick={() => setSelectedPropertyIds([])}
              >
                Cancel Broadcast
              </Button>
            </div>

            {/* List of Targeted Properties */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-4">
              <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-3">
                <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Recipients List</h4>
                <div className="flex flex-wrap gap-2 max-h-[250px] overflow-y-auto pr-1">
                  {selectedPropertyIds.map(propId => {
                    const owner = owners.find(o => o.properties.some((p: any) => p.id === propId))
                    const property = owner?.properties.find((p: any) => p.id === propId)
                    if (!property) return null
                    return (
                      <div 
                        key={propId} 
                        className="flex items-center gap-1.5 bg-blue-50 text-blue-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-100 shadow-sm transition-all hover:bg-blue-100"
                      >
                        <Home className="w-3.5 h-3.5 text-blue-500" />
                        <span>{property.name} ({property.area_name || 'No Area'}) • <span className="font-normal text-blue-600">{owner.name}</span></span>
                        <button 
                          type="button" 
                          onClick={() => setSelectedPropertyIds(prev => prev.filter(id => id !== propId))}
                          className="hover:bg-blue-200 rounded-full p-0.5 text-blue-600 hover:text-blue-900 transition-colors ml-1 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-blue-50/30 border border-blue-100 rounded-2xl p-5 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-blue-700 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 space-y-1">
                  <span className="font-bold block">Important Notice</span>
                  <p className="leading-relaxed">This message will be dispatched individually to all properties/owners selected above. Each owner will receive it in their private chat log and can reply directly to you.</p>
                </div>
              </div>
            </div>

            {/* Input Form for Broadcast */}
            <div className="p-4 border-t bg-white border-t-blue-100 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              {broadcastFile && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 rounded-lg text-sm text-blue-700 w-fit">
                  <Paperclip className="w-4 h-4" />
                  <span className="truncate max-w-[200px]">{broadcastFile.name}</span>
                  <button type="button" onClick={() => setBroadcastFile(null)} className="text-blue-400 hover:text-blue-700 font-bold ml-2 cursor-pointer">
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
                    placeholder="Type broadcast message to all selected properties..." 
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="rounded-full bg-gray-50 border-blue-100 focus:border-blue-500 focus:ring-blue-500"
                    disabled={isSendingBroadcast}
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="rounded-full h-10 w-10 shrink-0 bg-blue-600 hover:bg-blue-700 shadow-md cursor-pointer" 
                    disabled={(!broadcastMessage.trim() && !broadcastFile) || isSendingBroadcast}
                  >
                    {isSendingBroadcast ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
                  </Button>
                </form>
              </div>
            </div>
          </>
        ) : selectedOwnerId ? (
          /* Regular Chat Panel */
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
                          <div className="mb-2 rounded-lg overflow-hidden flex justify-center">
                            {msg.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                              <img src={msg.attachment_url} alt="Attachment" className="max-w-full max-h-64 object-contain rounded-md bg-black/5" />
                            ) : (
                              <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-white/20 rounded-md hover:bg-white/30 transition-colors w-full border border-black/10">
                                <FileText className="w-8 h-8 shrink-0" />
                                <span className="text-sm break-all underline">Download Attachment</span>
                              </a>
                            )}
                          </div>
                        )}
                        {msg.content !== '📷 Image attached' && !msg.content.startsWith('📄 ') && (
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
              {selectedFile && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 rounded-lg text-sm text-blue-700 w-fit">
                  <Paperclip className="w-4 h-4" />
                  <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                  <button type="button" onClick={() => setSelectedFile(null)} className="text-blue-400 hover:text-blue-700 font-bold ml-2 cursor-pointer">
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
                    placeholder="Type your message..." 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="rounded-full bg-gray-50"
                    disabled={isUploading}
                  />
                  <Button type="submit" size="icon" className="rounded-full h-10 w-10 shrink-0 bg-blue-600 hover:bg-blue-700 cursor-pointer" disabled={(!newMessage.trim() && !selectedFile) || isUploading}>
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
              <p>Select an owner or select properties to send a broadcast</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
