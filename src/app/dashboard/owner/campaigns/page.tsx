'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, Send, AlertCircle, BarChart } from 'lucide-react';
import Link from 'next/link';

export default function CampaignsOverviewPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalSent: 0, totalDelivered: 0, totalRead: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function fetchCampaigns() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: owner } = await supabase.from('owners').select('id').eq('user_id', userData.user.id).single();
      if (!owner) return;

      const { data } = await supabase
        .from('campaigns')
        .select('id, owner_id, name, template_name, audience_type, status, total_recipients, total_sent, total_failed, scheduled_at, created_at')
        .eq('owner_id', owner.id)
        .order('created_at', { ascending: false });

      if (data) {
        setCampaigns(data);
        
        let sent = 0;
        data.forEach((c: any) => sent += (c.total_sent || 0));
        setStats(prev => ({ ...prev, totalSent: sent }));
        // Note: For actual delivered/read, we'd need to count from campaign_logs table. MVP keeps it simple.
      }
      setLoading(false);
    }
    fetchCampaigns();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">WhatsApp Campaigns</h1>
          <p className="text-gray-400">Re-engage past guests via WhatsApp.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/owner/leads/import">
            <Button variant="outline" className="border-white/10 text-white hover:bg-white/5">
              <Users className="w-4 h-4 mr-2" /> Import Leads
            </Button>
          </Link>
          <Link href="/dashboard/owner/campaigns/create">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> New Campaign
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-white/10 bg-black/40 backdrop-blur-xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Sent</p>
              <h3 className="text-2xl font-bold text-white">{stats.totalSent}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
        <CardHeader className="border-b border-white/5">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Recent Campaigns</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-gray-400 mb-4">
                <BarChart className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No Campaigns Yet</h3>
              <p className="text-gray-400 max-w-md">Start reviving your past guests by launching your first WhatsApp marketing campaign.</p>
              <Link href="/dashboard/owner/campaigns/create" className="mt-6">
                <Button className="bg-blue-600 text-white">Create Campaign</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-xs uppercase text-gray-400">
                  <tr>
                    <th className="px-6 py-4">Template</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Recipients</th>
                    <th className="px-6 py-4">Sent</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4 font-medium text-white">{c.template_name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          c.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                          c.status === 'processing' ? 'bg-yellow-500/10 text-yellow-400' :
                          'bg-gray-500/10 text-gray-400'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">{c.total_recipients}</td>
                      <td className="px-6 py-4 text-gray-300">{c.total_sent}</td>
                      <td className="px-6 py-4 text-gray-400">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
