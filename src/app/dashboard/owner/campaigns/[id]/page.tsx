'use client';

import { useEffect, useState, use } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, Send, CheckCircle2, Eye, Reply, Banknote, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';

export default function CampaignAnalyticsPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const campaignId = params.id;
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function loadCampaign() {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          campaign_logs ( id, status )
        `)
        .eq('id', campaignId)
        .single();
        
      if (data) {
        // Calculate detailed stats from logs
        const logs = data.campaign_logs || [];
        const stats = {
          sent: logs.filter((l: any) => l.status !== 'queued' && l.status !== 'failed').length,
          delivered: logs.filter((l: any) => l.status === 'delivered' || l.status === 'read').length,
          read: logs.filter((l: any) => l.status === 'read').length,
          failed: logs.filter((l: any) => l.status === 'failed').length,
        };
        
        // Mocking Bookings Revenue (MVP: requires joining bookings with campaign_id)
        const { data: bookings } = await supabase
          .from('bookings')
          .select('amount')
          .eq('campaign_id', campaignId);
          
        let revenue = 0;
        if (bookings) {
          bookings.forEach(b => revenue += Number(b.amount || 0));
        }
        
        const cost = (stats.sent * 0.86);
        const roi = cost > 0 && revenue > 0 ? ((revenue - cost) / cost).toFixed(2) : 0;
        
        setCampaign({ ...data, stats, revenue, cost, roi });
      }
      setLoading(false);
    }
    loadCampaign();
  }, [campaignId, supabase]);

  if (loading) return <DashboardSkeleton />;
  if (!campaign) return <div className="p-12 text-center">Campaign not found.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-8">
      <Link href="/dashboard/owner/campaigns" className="text-gray-400 hover:text-white flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{campaign.name || 'Campaign Report'}</h1>
          <p className="text-gray-400">Template: {campaign.template_name}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          campaign.status === 'completed' ? 'bg-green-500/10 text-green-400' :
          campaign.status === 'processing' ? 'bg-yellow-500/10 text-yellow-400' :
          'bg-gray-500/10 text-gray-400'
        }`}>
          {campaign.status.toUpperCase()}
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Sent" value={campaign.stats.sent} icon={<Send className="w-5 h-5 text-blue-400" />} />
        <StatCard title="Delivered" value={campaign.stats.delivered} icon={<CheckCircle2 className="w-5 h-5 text-green-400" />} />
        <StatCard title="Read" value={campaign.stats.read} icon={<Eye className="w-5 h-5 text-purple-400" />} />
        <StatCard title="Failed" value={campaign.stats.failed} icon={<Reply className="w-5 h-5 text-red-400" />} />
      </div>

      {/* ROI & Booking Attribution */}
      <Card className="border border-white/10 bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Booking Attribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-2">
                <Banknote className="w-4 h-4" /> Campaign Cost
              </p>
              <h3 className="text-3xl font-black text-white">₹{campaign.cost.toFixed(2)}</h3>
              <p className="text-xs text-gray-500 mt-2">Based on ₹0.86 per msg</p>
            </div>
            
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-2">
                <Banknote className="w-4 h-4" /> Revenue Generated
              </p>
              <h3 className="text-3xl font-black text-green-400">₹{campaign.revenue.toLocaleString()}</h3>
              <p className="text-xs text-gray-500 mt-2">Direct bookings from this campaign</p>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30">
              <p className="text-sm font-medium text-blue-300 flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4" /> Return on Investment
              </p>
              <h3 className="text-3xl font-black text-white">{campaign.roi}x</h3>
              <p className="text-xs text-blue-300/70 mt-2">Revenue multiplier</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <Card className="border border-white/10 bg-black/40 backdrop-blur-xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          {icon}
        </div>
        <h3 className="text-2xl font-bold text-white">{value}</h3>
      </CardContent>
    </Card>
  );
}
