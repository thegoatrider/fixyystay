'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createBrowserClient } from '@supabase/ssr';
import { UploadCloud, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LeadsImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{name: string, phone: string}[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const leads: {name: string, phone: string}[] = [];
      const seenPhones = new Set<string>();
      let duplicates = 0;

      // Skip header row if it contains 'name' or 'phone'
      const startIdx = (lines[0] && lines[0].toLowerCase().includes('name')) ? 1 : 0;

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Handle common CSV separators like comma or pipe
        const columns = line.split(/[|,]/);
        if (columns.length >= 2) {
          const rawName = columns[0].trim();
          let rawPhone = columns[1].trim().replace(/\D/g, ''); // Extract only digits
          
          if (rawPhone.length >= 10 && rawName) {
            // Take the last 10 digits as the base number to deduplicate simply
            const phoneBase = rawPhone.slice(-10);
            
            if (seenPhones.has(phoneBase)) {
              duplicates++;
            } else {
              seenPhones.add(phoneBase);
              leads.push({ name: rawName, phone: rawPhone });
            }
          }
        }
      }
      setPreview(leads);
      setDuplicateCount(duplicates);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (preview.length === 0) return;
    setLoading(true);
    
    // Get current owner id
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      alert("Please login again");
      setLoading(false);
      return;
    }

    const { data: owner } = await supabase.from('owners').select('id').eq('user_id', userData.user.id).single();
    if (!owner) {
      alert("Owner profile not found");
      setLoading(false);
      return;
    }

    // Format leads for DB payload
    const payload = preview.map(l => ({
      owner_id: owner.id,
      name: l.name,
      phone_number: l.phone,
      status: 'Imported',
      source: 'CSV Upload'
    }));

    // In a real production app we'd do batch inserts. Since this is MVP, we just do one large insert 
    // supabase REST limits to 1000 rows. Assuming < 1000 for mvp.
    const chunks = [];
    for (let i=0; i<payload.length; i+=500) {
      chunks.push(payload.slice(i, i+500));
    }

    try {
      for (const chunk of chunks) {
        const { error } = await supabase.from('leads').insert(chunk);
        if (error) throw error;
      }
      setSuccess(true);
      setTimeout(() => router.push('/dashboard/owner/campaigns'), 2000);
    } catch (err: any) {
      alert(`Error importing leads: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      <Link href="/dashboard/owner/campaigns" className="text-gray-400 hover:text-white flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </Link>

      <Card className="border border-white/10 bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Import Leads</CardTitle>
          <CardDescription>Upload a CSV file containing your past guests' data. Format: Name, Phone Number.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!success ? (
            <>
              <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-blue-500/50 transition-colors">
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileChange} 
                  className="hidden" 
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Click to upload CSV</p>
                    <p className="text-gray-400 text-sm mt-1">.csv files only</p>
                  </div>
                </label>
              </div>

              {preview.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{preview.length} valid leads found</span>
                    </div>
                    {duplicateCount > 0 && (
                      <div className="flex items-center gap-2 text-yellow-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{duplicateCount} duplicates skipped</span>
                      </div>
                    )}
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-white/10 rounded-lg">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs uppercase bg-white/5 sticky top-0">
                        <tr>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Phone Number</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.slice(0, 100).map((l, i) => (
                          <tr key={i} className="border-b border-white/5">
                            <td className="px-4 py-2 text-white">{l.name}</td>
                            <td className="px-4 py-2 text-gray-400">{l.phone}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {preview.length > 100 && (
                      <div className="p-2 text-center text-xs text-gray-500 bg-black/40">
                        Showing first 100 rows...
                      </div>
                    )}
                  </div>

                  <Button 
                    onClick={handleUpload} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                    disabled={loading}
                  >
                    {loading ? "Importing Data..." : `Import ${preview.length} Leads to CRM`}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 space-y-4">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-400">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-semibold text-white">Import Successful!</h2>
              <p className="text-gray-400">Your leads are now available in the CRM.</p>
              <p className="text-sm text-gray-500">Redirecting to campaigns...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
