'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Search, Send, Paperclip, Image as ImageIcon, FileText, User, Tag, Clock, ArrowLeft, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function WhatsAppInbox() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [ownerId, setOwnerId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function loadData() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;
      
      const { data: owner } = await supabase.from('owners').select('id').eq('user_id', userData.user.id).single();
      if (!owner) return;
      setOwnerId(owner.id);

      // Load Conversations
      const { data: convs } = await supabase
        .from('conversations')
        .select(`
          id, 
          last_message_at,
          lead:lead_id ( id, name, phone_number, status )
        `)
        .eq('owner_id', owner.id)
        .order('last_message_at', { ascending: false });

      if (convs) setConversations(convs);
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!activeConv) return;
    const supabase = createClient();
    
    async function loadMessages() {
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_type, content, attachment_url, is_read, created_at')
        .eq('conversation_id', activeConv.id)
        .order('created_at', { ascending: true });
        
      if (msgs) setMessages(msgs);
    }
    loadMessages();

    // Subscribe to new messages
    const channel = supabase.channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConv.id}` },
        (payload: any) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConv]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeConv) return;
    const supabase = createClient();
    
    // In a real app, you would call an API route here (/api/whatsapp/send)
    // For MVP, we insert directly into DB to trigger worker or webhook mock
    const newMsg = {
      conversation_id: activeConv.id,
      lead_id: activeConv.lead.id,
      direction: 'outbound',
      type: 'text',
      content: inputText,
      status: 'pending'
    };

    setInputText('');

    const { data } = await supabase.from('messages').insert(newMsg).select().single();
    if (data) {
      // Optimistic update
      setMessages([...messages, data]);
      
      // Enqueue for background worker
      await supabase.from('message_queue').insert({
        owner_id: ownerId,
        lead_id: activeConv.lead.id,
        type: 'text',
        payload: {
          to: activeConv.lead.phone_number,
          text: inputText
        }
      });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-gray-50 -mx-4 sm:-mx-8">
      <div className="flex items-center gap-4 p-4 bg-white border-b">
        <Link href="/dashboard/owner?tab=marketing">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">WhatsApp Inbox</h1>
          <p className="text-xs text-gray-500">Respond to guests instantly</p>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Chat List */}
        <div className="w-1/3 min-w-[300px] border-r bg-white flex flex-col">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input className="pl-9 bg-gray-50" placeholder="Search guests or messages..." />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map(conv => (
              <div 
                key={conv.id} 
                onClick={() => setActiveConv(conv)}
                className={`p-4 border-b cursor-pointer transition-colors ${activeConv?.id === conv.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}
              >
                <div className="flex justify-between mb-1">
                  <h4 className="font-bold text-gray-900">{conv.lead.name}</h4>
                  <span className="text-xs text-gray-500">
                    {new Date(conv.last_message_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500 truncate">{conv.lead.phone_number}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    conv.lead.status === 'New' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>{conv.lead.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Panel: Chat Window */}
        <div className="flex-1 flex flex-col bg-[#efeae2]">
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white border-b flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    {activeConv.lead.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{activeConv.lead.name}</h3>
                    <p className="text-xs text-gray-500">{activeConv.lead.phone_number}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="hidden lg:flex"><Tag className="w-4 h-4 mr-2" /> Add Tag</Button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      msg.direction === 'outbound' 
                        ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none' 
                        : 'bg-white text-gray-900 shadow-sm rounded-tl-none border border-gray-100'
                    }`}>
                      {msg.type === 'template' && <div className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Template Message</div>}
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <div className="flex justify-end items-center gap-1 mt-1">
                        <span className="text-[10px] text-gray-500">
                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        {msg.direction === 'outbound' && (
                          <span className="text-[10px] text-blue-500 ml-1">
                            {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t flex items-end gap-2">
                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 shrink-0"><Paperclip className="w-5 h-5" /></Button>
                <div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden flex items-end pr-2">
                  <Textarea 
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="Type a message..." 
                    className="border-none focus-visible:ring-0 bg-transparent min-h-[44px] max-h-32 resize-none py-3"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                </div>
                <Button onClick={handleSendMessage} className="bg-[#00a884] hover:bg-[#008f6f] text-white rounded-full w-11 h-11 shrink-0 p-0">
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-gray-300 shadow-sm mb-4">
                <MessageSquare className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">FixyStays Web</h3>
              <p className="text-gray-500 max-w-sm">Select a conversation from the left to start messaging. Send and receive messages without keeping your phone online.</p>
            </div>
          )}
        </div>

        {/* Right Panel: Lead Info (Visible on large screens) */}
        {activeConv && (
          <div className="hidden lg:flex w-1/4 min-w-[280px] bg-white border-l flex-col">
            <div className="p-6 border-b text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-3xl mx-auto mb-4">
                {activeConv.lead.name.charAt(0)}
              </div>
              <h3 className="font-bold text-xl text-gray-900">{activeConv.lead.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{activeConv.lead.phone_number}</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" size="sm" className="rounded-full"><User className="w-4 h-4 mr-2" /> Profile</Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">About</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Status</span>
                    <span className="font-medium">{activeConv.lead.status}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Source</span>
                    <span className="font-medium">WhatsApp</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">VIP</span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">Repeat</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Notes</h4>
                  <Button variant="ghost" size="sm" className="h-6 text-blue-600 px-2 text-xs">Add Note</Button>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-sm text-gray-800">
                  Guest prefers ground floor rooms.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
