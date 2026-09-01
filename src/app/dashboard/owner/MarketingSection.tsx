'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MessageSquare, Send, Users, Activity, BarChart, Zap, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
  }
}

export default function MarketingSection({ ownerId }: { ownerId: string }) {
  const [waAccount, setWaAccount] = useState<any>(null);
  const [stats, setStats] = useState<any>({ leads: 0, sent: 0, campaigns: 0 });
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function loadMarketingData() {
      // Load WhatsApp Account
      const { data: account } = await supabase
        .from('whatsapp_accounts')
        .select('id, owner_id, phone_number_id, waba_id, display_phone_number, verified_name, quality_rating, status')
        .eq('owner_id', ownerId)
        .single();
      
      setWaAccount(account);

      // Load basic stats
      const [{ count: leadsCount }, { count: campaignsCount }] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('owner_id', ownerId),
        supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('owner_id', ownerId)
      ]);

      setStats({
        leads: leadsCount || 0,
        campaigns: campaignsCount || 0,
        sent: 0 // Fetch from sum later
      });
      
      setLoading(false);
    }
    loadMarketingData();
  }, [ownerId, supabase]);

  const launchWhatsAppSetup = () => {
    // Requires Meta FB SDK to be loaded. For MVP, we alert if it's missing or trigger the SDK.
    if (typeof window === 'undefined' || !window.FB) {
      alert('Facebook SDK not loaded. Ensure Meta App ID is configured.');
      return;
    }
    
    window.FB.login(function(response: any) {
      if (response.authResponse) {
        const accessToken = response.authResponse.accessToken;
        
        // Use the FB.api to get setup details (This requires specific Embedded Signup scopes)
        // Since we are mocking the UI for the plan, we'll call our API
        fetch('/api/whatsapp/auth/embedded', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ownerId,
            wabaId: 'MOCK_WABA_ID', // Extracted from FB response in real flow
            phoneNumberId: 'MOCK_PHONE_ID', 
            accessToken
          })
        }).then(res => res.json()).then(data => {
          if (data.success) window.location.reload();
        });
      }
    }, {
      config_id: process.env.NEXT_PUBLIC_META_CONFIG_ID, // WABA setup config
      response_type: 'code',
      override_default_response_type: true,
      extras: { setup: {} }
    });
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading Marketing Dashboard...</div>;
  }

  // 1. SETUP FLOW
  if (!waAccount || !waAccount.verified) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border shadow-sm text-center max-w-3xl mx-auto mt-8">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Connect WhatsApp Business</h2>
        <p className="text-gray-500 mb-8 max-w-md">
          Turn your leads into bookings with our WhatsApp CRM. Connect your WhatsApp Business Account to start sending campaigns and replying to guests.
        </p>
        
        <div className="space-y-4 w-full max-w-sm">
          <Button onClick={launchWhatsAppSetup} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg rounded-xl shadow-lg">
            Connect with Facebook
          </Button>
          <p className="text-xs text-gray-400">
            You will need your Facebook account with Business Manager access.
          </p>
        </div>
      </div>
    );
  }

  // 2. MARKETING DASHBOARD (CRM + Campaigns)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">WhatsApp Marketing</h2>
        <div className="flex items-center gap-2">
          <span className="flex items-center text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            {waAccount.whatsapp_phone_number} Connected
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total Leads</p>
                <h3 className="text-2xl font-black text-gray-900">{stats.leads}</h3>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Campaigns</p>
                <h3 className="text-2xl font-black text-gray-900">{stats.campaigns}</h3>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Send className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Messages Sent</p>
                <h3 className="text-2xl font-black text-gray-900">{stats.sent}</h3>
              </div>
              <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                <Activity className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Est. ROI</p>
                <h3 className="text-2xl font-black text-gray-900">--</h3>
              </div>
              <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                <BarChart className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="bg-white border shadow-sm rounded-2xl col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link href="/dashboard/owner/whatsapp/inbox">
              <Button variant="outline" className="w-full justify-start h-12 text-md font-semibold border-gray-200 hover:bg-gray-50">
                <MessageSquare className="w-5 h-5 mr-3 text-blue-600" />
                Open Inbox
              </Button>
            </Link>
            <Link href="/dashboard/owner/campaigns/create">
              <Button variant="outline" className="w-full justify-start h-12 text-md font-semibold border-gray-200 hover:bg-gray-50">
                <Send className="w-5 h-5 mr-3 text-indigo-600" />
                Launch Campaign
              </Button>
            </Link>
            <Link href="/dashboard/owner/leads/import">
              <Button variant="outline" className="w-full justify-start h-12 text-md font-semibold border-gray-200 hover:bg-gray-50">
                <Users className="w-5 h-5 mr-3 text-green-600" />
                Import Leads CSV
              </Button>
            </Link>
            <Button variant="outline" className="w-full justify-start h-12 text-md font-semibold border-gray-200 hover:bg-gray-50" onClick={() => {
              fetch('/api/whatsapp/templates/sync', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ ownerId })
              }).then(() => alert('Templates Synced!'))
            }}>
              <Zap className="w-5 h-5 mr-3 text-orange-600" />
              Sync Meta Templates
            </Button>
          </CardContent>
        </Card>

        {/* Recent Campaigns */}
        <Card className="bg-white border shadow-sm rounded-2xl col-span-2">
          <CardHeader>
            <CardTitle>Recent Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center p-8 text-gray-500">
              <BarChart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>Your recent WhatsApp campaigns will appear here.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
