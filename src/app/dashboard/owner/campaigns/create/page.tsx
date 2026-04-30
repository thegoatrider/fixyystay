'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Rocket, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CreateCampaignPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [leadsCount, setLeadsCount] = useState(0);
  const [ownerId, setOwnerId] = useState('');
  
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function loadData() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: owner } = await supabase.from('owners').select('id').eq('user_id', userData.user.id).single();
      if (!owner) return;
      setOwnerId(owner.id);

      // Total Leads
      const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('owner_id', owner.id);
      setLeadsCount(count || 0);

      // Templates
      const { data: tpData } = await supabase.from('whatsapp_templates').select('*');
      if (tpData) setTemplates(tpData);

      setLoading(false);
    }
    loadData();
  }, [supabase]);

  const handleCreate = async () => {
    if (!selectedTemplate) return alert('Please select a template');
    if (leadsCount === 0) return alert('No leads found. Please import leads first.');

    setSubmitting(true);
    try {
      const resp = await fetch('/api/campaigns/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ownerId,
          templateId: selectedTemplate
        })
      });

      if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.error || 'Failed to queue campaign');
      }

      alert('Campaign queued successfully! Messages will be sent in the background.');
      router.push('/dashboard/owner/campaigns');
    } catch (err: any) {
      alert(err.message);
      setSubmitting(false);
    }
  };

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);
  const estCost = (leadsCount * 0.86).toFixed(2); // Approx INR cost

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-8">
      <Link href="/dashboard/owner/campaigns" className="text-gray-400 hover:text-white flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </Link>

      <Card className="border border-white/10 bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Launch New Campaign</CardTitle>
          <CardDescription>Select a WhatsApp template to send to all your imported leads.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="text-gray-500">Loading campaign data...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm text-gray-400">Total Audience</p>
                  <p className="text-2xl font-bold text-white mt-1">{leadsCount} Guests</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm text-gray-400">Estimated Cost (₹0.86/msg)</p>
                  <p className="text-2xl font-bold text-white mt-1">₹{estCost}</p>
                </div>
              </div>

              {leadsCount === 0 && (
                <div className="p-4 bg-yellow-500/10 text-yellow-500 rounded-lg flex items-start gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>You have 0 leads in your CRM. Please go back and import a CSV list of your past guests before creating a campaign.</p>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-200">Select Template</label>
                <div className="grid gap-3">
                  {templates.map(t => (
                    <div 
                      key={t.id}
                      onClick={() => setSelectedTemplate(t.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedTemplate === t.id 
                          ? 'border-blue-500 bg-blue-500/10' 
                          : 'border-white/10 bg-black hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-white">{t.template_name}</p>
                        <p className="text-xs text-gray-500">{t.language_code.toUpperCase()}</p>
                      </div>
                      <p className="text-sm text-gray-400 mt-2 line-clamp-2">{t.body_text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleCreate} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4"
                disabled={leadsCount === 0 || !selectedTemplate || submitting}
              >
                {submitting ? 'Preparing Campaign...' : (
                  <>
                    <Rocket className="w-4 h-4 mr-2" /> Launch Campaign
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
