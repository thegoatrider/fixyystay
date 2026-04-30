'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function WhatsAppOnboardingPage() {
  const [owners, setOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedOwner, setSelectedOwner] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchOwners() {
      const { data } = await supabase.from('owners').select('id, name, email');
      if (data) setOwners(data);
      setLoading(false);
    }
    fetchOwners();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwner) return alert('Select an owner');

    const { error } = await supabase.from('whatsapp_accounts').upsert({
      owner_id: selectedOwner,
      business_name: businessName,
      whatsapp_phone_number: phoneNumber,
      phone_number_id: phoneNumberId,
      waba_id: wabaId,
      access_token: accessToken,
    });

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      alert('WhatsApp account successfully connected!');
      setSelectedOwner('');
      setBusinessName('');
      setPhoneNumber('');
      setPhoneNumberId('');
      setWabaId('');
      setAccessToken('');
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Card className="border border-white/10 bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>WhatsApp Onboarding</CardTitle>
          <CardDescription>Manually connect property owners to their WhatsApp Meta Cloud accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Select Owner</Label>
              <select 
                className="w-full rounded-md border border-white/10 bg-black p-2 text-white"
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                required
              >
                <option value="">-- Choose Tenant --</option>
                {owners.map(o => (
                  <option key={o.id} value={o.id}>{o.name} ({o.email})</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label>WhatsApp Business Name</Label>
              <Input 
                required 
                value={businessName} 
                onChange={(e) => setBusinessName(e.target.value)} 
                placeholder="e.g. FixyStays Alibag" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>WhatsApp Phone Number</Label>
                <Input 
                  required 
                  value={phoneNumber} 
                  onChange={(e) => setPhoneNumber(e.target.value)} 
                  placeholder="+919876543210" 
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number ID</Label>
                <Input 
                  required 
                  value={phoneNumberId} 
                  onChange={(e) => setPhoneNumberId(e.target.value)} 
                  placeholder="Meta Phone Number ID" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>WABA ID (Business Account ID)</Label>
              <Input 
                required 
                value={wabaId} 
                onChange={(e) => setWabaId(e.target.value)} 
                placeholder="Meta WABA ID" 
              />
            </div>

            <div className="space-y-2">
              <Label>Permanent Access Token</Label>
              <Input 
                required 
                type="password"
                value={accessToken} 
                onChange={(e) => setAccessToken(e.target.value)} 
                placeholder="EAA..." 
              />
            </div>

            <Button type="submit" className="w-full mt-4" disabled={loading}>
              {loading ? "Loading UI..." : "Connect WhatsApp Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
